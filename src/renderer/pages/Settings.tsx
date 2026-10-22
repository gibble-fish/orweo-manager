import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusEditor } from "./settings/StatusEditor";
import type { AppSettings } from "@shared/domain";
import type { UpdateState } from "@shared/ipc";

const BASE_FIELDS: { key: keyof AppSettings; label: string }[] = [
  { key: "companyName", label: "Unternehmensname" },
  { key: "companyAddress", label: "Adresse" },
  { key: "companyEmail", label: "E-Mail" },
  { key: "companyPhone", label: "Telefon" },
  { key: "companyWebsite", label: "Website" },
];

/**
 * Einstellungen (Gerüst): Unternehmensdaten und Datenablage bearbeiten.
 * Statusverwaltung, Backup und E-Mail-Konfiguration folgen in eigenen Modulen.
 */
export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [mailStatus, setMailStatus] = useState<string | null>(null);
  const [mailBusy, setMailBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [update, setUpdate] = useState<UpdateState | null>(null);

  useEffect(() => {
    window.orweo.settings.get().then(setSettings).catch(() => setSettings(null));
  }, []);

  // Update-Zustand laden und Live-Änderungen (Download-Fortschritt etc.) abonnieren.
  useEffect(() => {
    window.orweo.update.getState().then(setUpdate).catch(() => setUpdate(null));
    const unsubscribe = window.orweo.update.onState(setUpdate);
    return unsubscribe;
  }, []);

  if (!settings) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Einstellungen" subtitle="Unternehmensdaten und App-Konfiguration" />
        <GlassCard className="p-8 text-center">
          <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
            Einstellungen werden geladen …
          </p>
        </GlassCard>
      </div>
    );
  }

  const save = async () => {
    const updated = await window.orweo.settings.update(settings);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Ordner-Auswahldialog öffnen und den Pfad ins Feld übernehmen.
  const chooseFolder = async () => {
    const path = await window.orweo.dialog.selectFolder(settings.dataRootPath || undefined);
    if (path) setSettings({ ...settings, dataRootPath: path });
  };

  // Einstellungen erst speichern, dann Postfach testen/abrufen – sonst greift
  // der Abruf noch die alten Zugangsdaten ab.
  const testMail = async () => {
    setMailBusy(true);
    setMailStatus("Teste Verbindung …");
    await window.orweo.settings.update(settings);
    const res = await window.orweo.mail.testConnection();
    setMailStatus(res.ok ? "Verbindung erfolgreich ✓" : `Fehler: ${res.error ?? "unbekannt"}`);
    setMailBusy(false);
  };

  const checkMailNow = async () => {
    setMailBusy(true);
    setMailStatus("Rufe Postfach ab …");
    await window.orweo.settings.update(settings);
    const res = await window.orweo.mail.checkNow();
    setMailStatus(
      res.ok
        ? `Abruf erfolgreich: ${res.created} neue Anfrage(n), ${res.skipped} übersprungen.`
        : `Fehler: ${res.error ?? "unbekannt"}`,
    );
    setMailBusy(false);
  };

  // Datensicherung in eine Datei schreiben.
  const doBackup = async () => {
    setBackupBusy(true);
    setBackupStatus("Sicherung wird erstellt …");
    const res = await window.orweo.backup.export();
    if (res.canceled) {
      setBackupStatus(null);
    } else if (res.ok) {
      setBackupStatus(`Sicherung gespeichert: ${res.path}`);
    } else {
      setBackupStatus(`Fehler: ${res.error ?? "unbekannt"}`);
    }
    setBackupBusy(false);
  };

  // Sicherung wiederherstellen; bei Erfolg App neu starten.
  const doRestore = async () => {
    setBackupBusy(true);
    setBackupStatus("Wiederherstellung läuft …");
    const res = await window.orweo.backup.restore();
    if (res.canceled) {
      setBackupStatus(null);
      setBackupBusy(false);
      return;
    }
    if (res.ok && res.restartRequired) {
      setBackupStatus("Wiederhergestellt. App wird neu gestartet …");
      await window.orweo.backup.relaunch();
      return;
    }
    setBackupStatus(`Fehler: ${res.error ?? "unbekannt"}`);
    setBackupBusy(false);
  };

  const checkUpdate = async () => {
    const res = await window.orweo.update.check();
    setUpdate(res);
  };

  const installUpdate = async () => {
    await window.orweo.update.install();
  };

  // Lesbare Beschreibung des Update-Zustands.
  const updateLabel = (): string => {
    if (!update) return "Update-Status wird geladen …";
    switch (update.phase) {
      case "checking":
        return "Suche nach Updates …";
      case "available":
        return `Neue Version ${update.newVersion ?? ""} gefunden – wird geladen …`;
      case "downloading":
        return `Update wird geladen … ${update.percent ?? 0} %`;
      case "downloaded":
        return `Version ${update.newVersion ?? ""} ist bereit zur Installation.`;
      case "not-available":
        return "Du verwendest die neueste Version.";
      case "error":
        return `Update-Prüfung fehlgeschlagen: ${update.error ?? "unbekannt"}`;
      case "disabled":
        return "Automatische Updates sind in dieser Umgebung nicht aktiv (nur in der installierten App).";
      default:
        return "Bereit.";
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Einstellungen"
        subtitle="Unternehmensdaten und App-Konfiguration"
        actions={
          <button type="button" className="btn-primary" onClick={save}>
            {saved ? "Gespeichert ✓" : "Speichern"}
          </button>
        }
      />

      <GlassCard className="max-w-2xl p-6">
        <div className="grid gap-4">
          {BASE_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
                {field.label}
              </span>
              <input
                type="text"
                value={String(settings[field.key] ?? "")}
                onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
                style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
              />
            </label>
          ))}

          {/* Datenablage-Ordner mit echtem Ordner-Auswahldialog. */}
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Speicherort (Datenablage)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.dataRootPath ?? ""}
                onChange={(e) => setSettings({ ...settings, dataRootPath: e.target.value })}
                placeholder="z. B. D:\ORWEO\Ablage"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
                style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
              />
              <button type="button" className="btn-secondary whitespace-nowrap" onClick={chooseFolder}>
                Ordner wählen
              </button>
            </div>
            <span className="mt-1 block text-xs" style={{ color: "var(--app-text-muted)" }}>
              Hier werden PDFs und Projektdateien abgelegt. Die Datenbank selbst liegt
              weiterhin lokal im App-Datenverzeichnis.
            </span>
          </label>
        </div>
      </GlassCard>

      <GlassCard className="mt-6 max-w-2xl p-6">
        <h2 className="mb-1 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          E-Mail-Anfragen (automatisch)
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--app-text-muted)" }}>
          Die App prüft das angegebene Postfach regelmäßig und legt aus eingehenden
          Anfrage-Mails automatisch neue Anfragen an (Status „Neue Anfrage").
        </p>

        <label className="mb-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.mailEnabled}
            onChange={(e) => setSettings({ ...settings, mailEnabled: e.target.checked })}
            className="mt-1"
          />
          <span>
            <span className="block text-sm">Automatischen E-Mail-Abruf aktivieren</span>
            <span className="mt-1 block text-xs" style={{ color: "var(--app-text-muted)" }}>
              Nach dem Speichern wird das Postfach im eingestellten Intervall geprüft.
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              IMAP-Server
            </span>
            <input
              type="text"
              value={settings.mailImapHost}
              onChange={(e) => setSettings({ ...settings, mailImapHost: e.target.value })}
              placeholder="z. B. imap.ionos.de"
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Port
            </span>
            <input
              type="number"
              value={settings.mailImapPort}
              onChange={(e) => setSettings({ ...settings, mailImapPort: Number(e.target.value) })}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={settings.mailImapSecure}
              onChange={(e) => setSettings({ ...settings, mailImapSecure: e.target.checked })}
            />
            <span className="text-sm">TLS/SSL (empfohlen)</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Benutzer / E-Mail
            </span>
            <input
              type="text"
              value={settings.mailUser}
              onChange={(e) => setSettings({ ...settings, mailUser: e.target.value })}
              placeholder="anfragen@orweo.de"
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Passwort / App-Passwort
            </span>
            <input
              type="password"
              value={settings.mailPassword}
              onChange={(e) => setSettings({ ...settings, mailPassword: e.target.value })}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Ordner
            </span>
            <input
              type="text"
              value={settings.mailFolder}
              onChange={(e) => setSettings({ ...settings, mailFolder: e.target.value })}
              placeholder="INBOX"
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Abruf alle (Minuten)
            </span>
            <input
              type="number"
              min={0}
              value={settings.mailPollMinutes}
              onChange={(e) => setSettings({ ...settings, mailPollMinutes: Number(e.target.value) })}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={testMail} disabled={mailBusy}>
            Verbindung testen
          </button>
          <button type="button" className="btn-secondary" onClick={checkMailNow} disabled={mailBusy}>
            Jetzt abrufen
          </button>
          {mailStatus && (
            <span className="text-sm" style={{ color: "var(--app-text-muted)" }}>
              {mailStatus}
            </span>
          )}
        </div>
      </GlassCard>

      <GlassCard className="mt-6 max-w-2xl p-6">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Steuer
        </h2>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.smallBusiness}
            onChange={(e) => setSettings({ ...settings, smallBusiness: e.target.checked })}
            className="mt-1"
          />
          <span>
            <span className="block text-sm">Kleinunternehmer (§ 19 UStG)</span>
            <span className="mt-1 block text-xs" style={{ color: "var(--app-text-muted)" }}>
              Es wird keine Umsatzsteuer ausgewiesen. Angebote und Rechnungen enthalten den
              Hinweis „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." und keine USt-Zeile.
            </span>
          </span>
        </label>

        {!settings.smallBusiness && (
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
                USt-IdNr.
              </span>
              <input
                type="text"
                value={settings.vatId ?? ""}
                onChange={(e) => setSettings({ ...settings, vatId: e.target.value })}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
                style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
                Standard-Steuersatz (%)
              </span>
              <input
                type="number"
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: Number(e.target.value) })}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
                style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
              />
            </label>
          </div>
        )}
      </GlassCard>

      <GlassCard className="mt-6 max-w-2xl p-6">
        <h2 className="mb-1 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Datensicherung
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--app-text-muted)" }}>
          Deine Daten liegen lokal auf diesem Rechner und bleiben bei Programm-Updates
          erhalten. Lege zusätzlich regelmäßig eine Sicherung an (z. B. auf einer externen
          Festplatte oder in einem Cloud-Ordner), damit nichts verloren geht.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={doBackup} disabled={backupBusy}>
            Daten sichern
          </button>
          <button type="button" className="btn-secondary" onClick={doRestore} disabled={backupBusy}>
            Sicherung wiederherstellen
          </button>
          {backupStatus && (
            <span className="text-sm" style={{ color: "var(--app-text-muted)" }}>
              {backupStatus}
            </span>
          )}
        </div>
      </GlassCard>

      <GlassCard className="mt-6 max-w-2xl p-6">
        <h2 className="mb-1 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Programm-Updates
        </h2>
        <p className="mb-1 text-xs" style={{ color: "var(--app-text-muted)" }}>
          Aktuelle Version: {update?.currentVersion ?? "–"}
        </p>
        <p className="mb-4 text-sm" style={{ color: "var(--app-text)" }}>
          {updateLabel()}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={checkUpdate}
            disabled={update?.phase === "checking" || update?.phase === "downloading"}
          >
            Nach Updates suchen
          </button>
          {update?.phase === "downloaded" && (
            <button type="button" className="btn-primary" onClick={installUpdate}>
              Jetzt installieren &amp; neu starten
            </button>
          )}
        </div>
      </GlassCard>

      <StatusEditor />
    </div>
  );
}
