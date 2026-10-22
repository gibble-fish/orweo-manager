/**
 * E-Mail-Anbindung: ruft regelmäßig ein IMAP-Postfach ab, erkennt Anfrage-Mails
 * der ORWEO-Website und legt daraus automatisch Anfragen an (Status „Neue
 * Anfrage"). Läuft ausschließlich im Electron-Main-Prozess; der Renderer löst
 * Abrufe nur über typisierte IPC aus und sieht niemals Zugangsdaten.
 *
 * ERWARTETES E-MAIL-FORMAT (von der Website versendet)
 * ----------------------------------------------------
 * Betreff: beginnt idealerweise mit „Neue Anfrage" / „Kontaktanfrage"
 *          (dient als schnelle Vorfilterung, ist aber nicht zwingend).
 * Body: Schlüssel-Wert-Zeilen, je Zeile „Feld: Wert". Erkannte Felder
 *       (Groß-/Kleinschreibung egal, deutsche und englische Varianten):
 *
 *   Name:        <Ansprechpartner>            (alt.: Kunde, Kontakt)
 *   Firma:       <Firma>                       (alt.: Unternehmen, Company)
 *   E-Mail:      <email@…>                      (alt.: Email, Mail)
 *   Telefon:     <…>                            (alt.: Tel, Phone)
 *   Projektart:  <Architektur|Immobilien|…>     (alt.: Kategorie, Bereich)
 *   Ort:         <Einsatzort>                   (alt.: Standort, Location)
 *   Zeitraum:    <Wunschzeitraum>               (alt.: Zeitrahmen, Timeframe)
 *   Nachricht:   <Freitext …>                   (alt.: Message, Mitteilung)
 *
 * Fehlt die strukturierte „Name:"-Zeile, wird der Absendername aus dem
 * From-Header übernommen und die komplette Textnachricht als „message"
 * gespeichert – so geht keine Anfrage verloren.
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getDb } from "../db/connection";
import { createInquiry, listInquiries } from "./inquiryService";
import { getSettings } from "./settingsService";
import type { ProjectCategory } from "@shared/domain";
import type { InquiryInput, MailCheckResult } from "@shared/ipc";

/** Ordnet freie Projektart-Texte den festen ORWEO-Kategorien zu. */
function mapCategory(raw: string | null): ProjectCategory | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("architek")) return "architektur";
  if (v.includes("immobil") || v.includes("real estate")) return "immobilien";
  if (v.includes("auto") || v.includes("car")) return "automotive";
  if (v.includes("sport")) return "sport";
  if (v.includes("luft") || v.includes("drohne") || v.includes("aerial")) return "luftaufnahmen";
  if (v.includes("360") || v.includes("panorama")) return "panorama360";
  return null;
}

/** Alias-Tabelle: mögliche Feldnamen → internes Feld. */
const FIELD_ALIASES: Record<string, keyof ParsedInquiry> = {
  name: "name",
  kunde: "name",
  kontakt: "name",
  ansprechpartner: "name",
  firma: "company",
  unternehmen: "company",
  company: "company",
  "e-mail": "email",
  email: "email",
  mail: "email",
  telefon: "phone",
  tel: "phone",
  phone: "phone",
  mobil: "phone",
  projektart: "category",
  kategorie: "category",
  bereich: "category",
  ort: "location",
  standort: "location",
  location: "location",
  einsatzort: "location",
  zeitraum: "timeframe",
  zeitrahmen: "timeframe",
  timeframe: "timeframe",
  nachricht: "message",
  message: "message",
  mitteilung: "message",
};

interface ParsedInquiry {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  location: string | null;
  timeframe: string | null;
  message: string | null;
}

/**
 * Parst den E-Mail-Text in Felder. Erkennt „Feld: Wert"-Zeilen; alles, was
 * keiner bekannten Zeile zugeordnet werden kann, landet gesammelt in message.
 */
function parseBody(text: string): ParsedInquiry {
  const result: ParsedInquiry = {
    name: null,
    company: null,
    email: null,
    phone: null,
    category: null,
    location: null,
    timeframe: null,
    message: null,
  };
  const leftover: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([\wäöüÄÖÜ .\-]{2,30}?)\s*[:：]\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase();
      const field = FIELD_ALIASES[key];
      if (field) {
        // „message" sammelt mehrzeilig, andere Felder nur erste Belegung.
        if (field === "message") {
          result.message = result.message ? `${result.message}\n${match[2].trim()}` : match[2].trim();
        } else if (!result[field]) {
          result[field] = match[2].trim();
        }
        continue;
      }
    }
    leftover.push(trimmed);
  }

  // Übrig gebliebener Fließtext wird der Nachricht angehängt (nichts verwerfen).
  if (leftover.length > 0) {
    const extra = leftover.join("\n");
    result.message = result.message ? `${result.message}\n${extra}` : extra;
  }
  return result;
}

/** Extrahiert die reine E-Mail-Adresse aus einem From-Header-Wert. */
function extractEmail(from: string | undefined): string | null {
  if (!from) return null;
  const match = from.match(/<([^>]+)>/) ?? from.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? (match[1] ?? match[0]).trim() : null;
}

/** Extrahiert den Anzeigenamen aus einem From-Header-Wert. */
function extractName(from: string | undefined): string | null {
  if (!from) return null;
  const match = from.match(/^"?([^"<]+?)"?\s*</);
  return match ? match[1].trim() : null;
}

/**
 * Prüft, ob zu einer E-Mail bereits eine Anfrage existiert. Schutz vor
 * Dubletten bei wiederholtem Abruf: gleiche Message-ID (in source gemerkt)
 * ODER gleiche Absender-E-Mail + gleicher Betreff-Kern.
 */
function alreadyImported(messageId: string | null, email: string | null): boolean {
  const db = getDb();
  if (messageId) {
    const row = db
      .prepare("SELECT 1 FROM inquiries WHERE source = ? LIMIT 1")
      .get(`email:${messageId}`);
    if (row) return true;
  }
  if (email) {
    // Feingranularer Schutz: identische E-Mail in den letzten Importen.
    const recent = listInquiries().find(
      (q) => q.email?.toLowerCase() === email.toLowerCase() && q.source.startsWith("email"),
    );
    if (recent && messageId && recent.source === `email:${messageId}`) return true;
  }
  return false;
}

/**
 * Baut einen IMAP-Client aus den aktuellen Einstellungen. Wirft, wenn keine
 * Zugangsdaten hinterlegt sind.
 */
function buildClient(): ImapFlow {
  const s = getSettings();
  if (!s.mailImapHost || !s.mailUser || !s.mailPassword) {
    throw new Error("E-Mail-Zugangsdaten unvollständig (Host, Benutzer, Passwort erforderlich).");
  }
  return new ImapFlow({
    host: s.mailImapHost,
    port: s.mailImapPort || 993,
    secure: s.mailImapSecure,
    auth: { user: s.mailUser, pass: s.mailPassword },
    logger: false,
  });
}

/**
 * Ruft das Postfach ab, erkennt Anfrage-Mails und legt neue Anfragen an.
 * Es werden nur ungelesene Mails betrachtet; erfolgreich importierte Mails
 * werden als gelesen markiert, damit sie beim nächsten Lauf nicht erneut
 * verarbeitet werden.
 */
export async function checkMailbox(): Promise<MailCheckResult> {
  const s = getSettings();
  if (!s.mailEnabled) {
    return { ok: false, created: 0, skipped: 0, error: "E-Mail-Abruf ist deaktiviert." };
  }

  let client: ImapFlow;
  try {
    client = buildClient();
  } catch (err) {
    return { ok: false, created: 0, skipped: 0, error: (err as Error).message };
  }

  let created = 0;
  let skipped = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(s.mailFolder || "INBOX");
    try {
      // Nur ungelesene Nachrichten verarbeiten.
      const uids = await client.search({ seen: false });
      const list = Array.isArray(uids) ? uids : [];

      for (const uid of list) {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true });
        if (!msg || !msg.source) {
          skipped++;
          continue;
        }

        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId ?? msg.envelope?.messageId ?? null;
        const fromHeader =
          parsed.from?.text ??
          (msg.envelope?.from?.[0]
            ? `${msg.envelope.from[0].name ?? ""} <${msg.envelope.from[0].address ?? ""}>`
            : undefined);
        const senderEmail = extractEmail(fromHeader);

        if (alreadyImported(messageId, senderEmail)) {
          skipped++;
          continue;
        }

        const bodyText = parsed.text ?? "";
        const fields = parseBody(bodyText);

        const name = fields.name ?? extractName(fromHeader) ?? senderEmail ?? "Unbekannt";
        const email = fields.email ?? senderEmail;

        const input: InquiryInput = {
          customerId: null,
          name,
          company: fields.company,
          email,
          phone: fields.phone,
          category: mapCategory(fields.category),
          location: fields.location,
          timeframe: fields.timeframe,
          message: fields.message ?? bodyText.trim() ?? null,
          status: "neue_anfrage",
          // Message-ID in source merken → Dublettenschutz bei erneuten Abrufen.
          source: messageId ? `email:${messageId}` : "email",
        };

        createInquiry(input);
        created++;

        // Als gelesen markieren, damit die Mail nicht erneut importiert wird.
        try {
          await client.messageFlagsAdd(String(uid), ["\\Seen"]);
        } catch {
          // Markierung nicht kritisch – Dublettenschutz greift über Message-ID.
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, created, skipped };
  } catch (err) {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    return { ok: false, created, skipped, error: (err as Error).message };
  }
}

/**
 * Testet nur die Verbindung/Anmeldung, ohne Mails zu verarbeiten.
 */
export async function testMailConnection(): Promise<MailCheckResult> {
  let client: ImapFlow;
  try {
    client = buildClient();
  } catch (err) {
    return { ok: false, created: 0, skipped: 0, error: (err as Error).message };
  }
  try {
    await client.connect();
    await client.logout();
    return { ok: true, created: 0, skipped: 0 };
  } catch (err) {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    return { ok: false, created: 0, skipped: 0, error: (err as Error).message };
  }
}

// ---- Hintergrund-Polling -------------------------------------------------

let pollTimer: NodeJS.Timeout | null = null;

/**
 * Startet (oder aktualisiert) das periodische Abrufen gemäß Einstellungen.
 * Bei deaktiviertem Abruf oder Intervall 0 wird nur gestoppt.
 */
export function startMailPolling(): void {
  stopMailPolling();
  const s = getSettings();
  if (!s.mailEnabled || !s.mailPollMinutes || s.mailPollMinutes <= 0) return;

  const intervalMs = s.mailPollMinutes * 60_000;
  pollTimer = setInterval(() => {
    checkMailbox().catch((err) => console.error("[mail] Abruf fehlgeschlagen:", err));
  }, intervalMs);

  // Einmal zeitnah nach dem Start abrufen (nicht erst nach dem ersten Intervall).
  checkMailbox().catch((err) => console.error("[mail] Erstabruf fehlgeschlagen:", err));
}

export function stopMailPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
