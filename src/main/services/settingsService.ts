import { getDb } from "../db/connection";
import type { AppSettings } from "@shared/domain";

const DEFAULTS: AppSettings = {
  companyName: "ORWEO",
  companyAddress: "",
  companyEmail: "kontakt@orweo.de",
  companyPhone: "",
  companyWebsite: "orweo.de",
  vatId: "",
  dataRootPath: "",
  theme: "dark",
  // Kleinunternehmer (§ 19 UStG) ist Standard → kein USt-Ausweis, Steuersatz 0 %.
  defaultTaxRate: 0,
  smallBusiness: true,

  // E-Mail-Anbindung (Anfrage-Erkennung). Standard: aus, bis konfiguriert.
  mailEnabled: false,
  mailImapHost: "",
  mailImapPort: 993,
  mailImapSecure: true,
  mailUser: "",
  mailPassword: "",
  mailFolder: "INBOX",
  mailPollMinutes: 5,
};

/** Settings werden in SQLite als Text abgelegt; Booleans als "1"/"0". */
function toStored(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

function toBool(value: string | null | undefined, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback;
  return value === "1" || value === "true";
}

/** Liest alle Settings als typisiertes Objekt (mit Defaults für fehlende Keys). */
export function getSettings(): AppSettings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string | null;
  }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    companyName: map.get("companyName") ?? DEFAULTS.companyName,
    companyAddress: map.get("companyAddress") ?? DEFAULTS.companyAddress,
    companyEmail: map.get("companyEmail") ?? DEFAULTS.companyEmail,
    companyPhone: map.get("companyPhone") ?? DEFAULTS.companyPhone,
    companyWebsite: map.get("companyWebsite") ?? DEFAULTS.companyWebsite,
    vatId: map.get("vatId") ?? DEFAULTS.vatId,
    dataRootPath: map.get("dataRootPath") ?? DEFAULTS.dataRootPath,
    theme: (map.get("theme") as AppSettings["theme"]) ?? DEFAULTS.theme,
    defaultTaxRate: Number(map.get("defaultTaxRate") ?? DEFAULTS.defaultTaxRate),
    smallBusiness: toBool(map.get("smallBusiness"), DEFAULTS.smallBusiness),

    mailEnabled: toBool(map.get("mailEnabled"), DEFAULTS.mailEnabled),
    mailImapHost: map.get("mailImapHost") ?? DEFAULTS.mailImapHost,
    mailImapPort: Number(map.get("mailImapPort") ?? DEFAULTS.mailImapPort),
    mailImapSecure: toBool(map.get("mailImapSecure"), DEFAULTS.mailImapSecure),
    mailUser: map.get("mailUser") ?? DEFAULTS.mailUser,
    mailPassword: map.get("mailPassword") ?? DEFAULTS.mailPassword,
    mailFolder: map.get("mailFolder") ?? DEFAULTS.mailFolder,
    mailPollMinutes: Number(map.get("mailPollMinutes") ?? DEFAULTS.mailPollMinutes),
  };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      upsert.run(key, toStored(value));
    }
  });
  tx();
  return getSettings();
}
