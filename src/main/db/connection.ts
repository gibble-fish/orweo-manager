import Database from "better-sqlite3";
import { app } from "electron";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runMigrations } from "./migrations";
import { seedIfEmpty } from "./seed";

let db: Database.Database | null = null;

/**
 * Kleinunternehmerregelung (§ 19 UStG): Ist der Schalter aktiv, wird im
 * LEISTUNGSKATALOG kein USt-Satz geführt (0 %). Betrifft NUR den Katalog –
 * bereits erstellte Angebote/Rechnungen (Positions-Snapshots) bleiben
 * unverändert. Idempotent: setzt nur Werte, die noch nicht 0 sind.
 */
function applySmallBusinessTaxRule(database: Database.Database): void {
  const row = database
    .prepare("SELECT value FROM settings WHERE key = 'smallBusiness'")
    .get() as { value: string | null } | undefined;
  const smallBusiness = row ? row.value === "1" || row.value === "true" : true;
  if (!smallBusiness) return;
  database.prepare("UPDATE services SET taxRate = 0 WHERE taxRate <> 0").run();
}

/**
 * Ermittelt das lokale Datenverzeichnis. Standard: userData/data.
 * (Der frei wählbare ORWEO-Ablageordner für Projektdateien wird separat
 * in den Einstellungen gepflegt; die SQLite-DB liegt immer lokal in userData.)
 */
function resolveDataDir(): string {
  const dir = join(app.getPath("userData"), "data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function resolveDbPath(): string {
  return join(resolveDataDir(), "orweo.sqlite");
}

/** Absoluter Pfad zur SQLite-Datei (für Backup/Restore). */
export function getDbPath(): string {
  return resolveDbPath();
}

/** Verzeichnis für automatische Pre-Migration-Backups. */
function resolveBackupDir(): string {
  const dir = join(resolveDataDir(), "backups");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Legt vor einer Schema-Migration eine Sicherungskopie der DB-Datei an.
 * Dateiname enthält die alte Schemaversion und einen Zeitstempel, damit
 * mehrere Sicherungen nebeneinander bestehen können.
 */
function backupBeforeMigration(dbPath: string, fromVersion: number): void {
  if (!existsSync(dbPath)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(resolveBackupDir(), `orweo-pre-v${fromVersion}-${stamp}.sqlite`);
  copyFileSync(dbPath, target);
  console.log(`[db] Pre-Migration-Backup erstellt: ${target}`);
}

/** Öffnet (einmalig) die DB, führt Migrationen und Seed aus. */
export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Vor ausstehenden Migrationen automatisch sichern (Downgrade-Schutz ist in
  // runMigrations enthalten und wirft bei zu neuer DB eine aussagekräftige Fehlermeldung).
  runMigrations(db, (fromVersion) => backupBeforeMigration(dbPath, fromVersion));
  seedIfEmpty(db);
  applySmallBusinessTaxRule(db);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
