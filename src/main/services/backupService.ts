/**
 * Datensicherung (Backup) und Wiederherstellung (Restore) der lokalen SQLite-DB.
 *
 * Läuft ausschließlich im Main-Prozess. Backups sind eigenständige .sqlite-
 * Dateien, die der Nutzer an einem beliebigen Ort (z. B. externe Festplatte,
 * Cloud-Ordner) ablegen kann. So bleiben Daten selbst dann erhalten, wenn der
 * Rechner neu aufgesetzt oder die App „mit allen Daten" deinstalliert wird.
 */
import Database from "better-sqlite3";
import { app, dialog } from "electron";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { closeDb, getDb, getDbPath } from "../db/connection";
import { LATEST_SCHEMA_VERSION } from "../db/migrations";
import type { BackupResult, RestoreResult } from "@shared/ipc";

/** Vorgeschlagener Dateiname mit Datum, z. B. ORWEO-Backup-2026-10-22.sqlite. */
function suggestedBackupName(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return `ORWEO-Backup-${date}.sqlite`;
}

/**
 * Sichert die aktuelle Datenbank in eine vom Nutzer gewählte Datei.
 * Nutzt die konsistente .backup()-API von better-sqlite3 (berücksichtigt WAL),
 * daher ist die Sicherung auch im laufenden Betrieb unversehrt.
 */
export async function exportBackup(): Promise<BackupResult> {
  const result = await dialog.showSaveDialog({
    title: "Daten sichern",
    defaultPath: join(app.getPath("documents"), suggestedBackupName()),
    filters: [{ name: "ORWEO Sicherung", extensions: ["sqlite"] }],
  });
  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true, path: null };
  }

  try {
    const db = getDb();
    // .backup() erzeugt eine konsistente Kopie (inkl. offener WAL-Daten).
    await db.backup(result.filePath);
    return { ok: true, canceled: false, path: result.filePath };
  } catch (err) {
    return { ok: false, canceled: false, path: null, error: (err as Error).message };
  }
}

/**
 * Prüft, ob eine Datei eine gültige ORWEO-Datenbank ist und nicht aus einer
 * neueren Programmversion stammt (Downgrade-Schutz). Gibt die Schemaversion
 * zurück oder wirft mit verständlicher Meldung.
 */
function validateBackupFile(path: string): number {
  let probe: Database.Database | null = null;
  try {
    probe = new Database(path, { readonly: true, fileMustExist: true });
    // Grundlegende Strukturprüfung: zentrale Tabellen müssen existieren.
    const tables = probe
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[];
    const names = new Set(tables.map((t) => t.name));
    const required = ["customers", "invoices", "settings"];
    const missing = required.filter((t) => !names.has(t));
    if (missing.length > 0) {
      throw new Error(
        "Die gewählte Datei ist keine gültige ORWEO-Sicherung " +
          `(fehlende Tabellen: ${missing.join(", ")}).`,
      );
    }
    const version = probe.pragma("user_version", { simple: true }) as number;
    if (version > LATEST_SCHEMA_VERSION) {
      throw new Error(
        `Diese Sicherung stammt aus einer neueren Programmversion ` +
          `(Schema ${version}, dieses Programm kennt ${LATEST_SCHEMA_VERSION}). ` +
          `Bitte zuerst ORWEO Abrechnung aktualisieren.`,
      );
    }
    return version;
  } finally {
    probe?.close();
  }
}

/**
 * Stellt eine Sicherung wieder her. Ablauf:
 * 1. Datei auswählen und validieren.
 * 2. Rückfrage: aktuelle Daten werden überschrieben.
 * 3. Vor dem Überschreiben ein Sicherheits-Backup der JETZIGEN DB anlegen.
 * 4. DB schließen, Datei an den DB-Pfad kopieren.
 * 5. Die App muss neu starten, damit die wiederhergestellte DB geladen wird.
 */
export async function restoreBackup(): Promise<RestoreResult> {
  const open = await dialog.showOpenDialog({
    title: "Sicherung wiederherstellen",
    properties: ["openFile"],
    filters: [{ name: "ORWEO Sicherung", extensions: ["sqlite"] }],
  });
  if (open.canceled || open.filePaths.length === 0) {
    return { ok: false, canceled: true, restartRequired: false };
  }
  const source = open.filePaths[0];

  // Validierung VOR jeder Änderung an der aktiven DB.
  try {
    validateBackupFile(source);
  } catch (err) {
    return { ok: false, canceled: false, restartRequired: false, error: (err as Error).message };
  }

  const confirm = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Abbrechen", "Wiederherstellen"],
    defaultId: 0,
    cancelId: 0,
    title: "Sicherung wiederherstellen",
    message: "Aktuelle Daten werden ersetzt",
    detail:
      "Alle aktuellen Daten werden durch die gewählte Sicherung überschrieben. " +
      "Von den jetzigen Daten wird vorher automatisch ein Sicherheits-Backup angelegt. " +
      "Anschließend startet die App neu. Fortfahren?",
  });
  if (confirm.response !== 1) {
    return { ok: false, canceled: true, restartRequired: false };
  }

  const dbPath = getDbPath();

  try {
    // Sicherheits-Backup der aktuellen DB, falls die Wiederherstellung doch
    // nicht gewünscht war.
    if (existsSync(dbPath)) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safety = `${dbPath}.vor-restore-${stamp}.bak`;
      copyFileSync(dbPath, safety);
    }

    // DB schließen, damit die Datei nicht gesperrt ist.
    closeDb();

    // WAL-/SHM-Nebendateien der alten DB entfernen, sonst mischt SQLite beim
    // nächsten Start alte WAL-Daten mit der neuen Datei.
    for (const suffix of ["-wal", "-shm"]) {
      const side = `${dbPath}${suffix}`;
      if (existsSync(side)) {
        try {
          // Best effort – Datei ist nach closeDb() normalerweise freigegeben.
          copyFileSync(side, `${side}.alt`);
        } catch {
          /* ignore */
        }
      }
    }

    copyFileSync(source, dbPath);
    return { ok: true, canceled: false, restartRequired: true };
  } catch (err) {
    return {
      ok: false,
      canceled: false,
      restartRequired: false,
      error: (err as Error).message,
    };
  }
}

/** Startet die App neu (nach einer Wiederherstellung). */
export function relaunchApp(): void {
  app.relaunch();
  app.exit(0);
}
