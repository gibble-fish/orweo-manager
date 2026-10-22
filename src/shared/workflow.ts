/**
 * Zentrale Definition des ORWEO-Statusworkflows.
 *
 * Roter Faden:
 * ANFRAGE → ANGEBOT → AUFTRAG → PRODUKTION → LIEFERUNG → RECHNUNG → ZAHLUNG → ABGESCHLOSSEN
 *
 * Diese Datei enthält nur Daten/Typen (keine Laufzeit-Abhängigkeiten) und wird
 * von Main (Statuswechsel ausführen) und Renderer (Anzeige) gemeinsam genutzt.
 * Die spätere Angebots-/Rechnungs-/Outlook-Logik ruft die hier definierten
 * Ereignisse auf, statt Status-Strings verstreut zu setzen.
 */
import type { WorkflowStatus } from "./domain";

/** Reihenfolge des Hauptworkflows (ohne Sonderfall „storniert"). */
export const WORKFLOW_ORDER: WorkflowStatus[] = [
  "neue_anfrage",
  "anfrage_in_bearbeitung",
  "angebot_erstellt",
  "angebot_versendet",
  "angebot_angenommen",
  "termin_geplant",
  "produktion",
  "produktion_abgeschlossen",
  "nachbearbeitung",
  "lieferung_erfolgt",
  "rechnung_erstellt",
  "rechnung_versendet",
  "bezahlt",
  "abgeschlossen",
];

/**
 * Geschäftsereignisse, die einen automatischen Statuswechsel auslösen.
 * Werden von den jeweiligen Modulen ausgelöst (z. B. beim PDF-Versand).
 */
export type WorkflowEvent =
  | "inquiry_received" // E-Mail-Anfrage erkannt
  | "inquiry_in_progress" // Anfrage in Bearbeitung genommen
  | "quote_created" // Angebot erstellt
  | "quote_sent" // Angebot versendet (z. B. per Outlook)
  | "quote_accepted" // MANUELL bestätigt
  | "appointment_scheduled" // Termin angelegt
  | "production_started" // Produktion begonnen
  | "production_finished" // MANUELL bestätigt
  | "postprocessing" // Nachbearbeitung
  | "delivered" // Lieferung erfolgt
  | "invoice_created" // Rechnung erstellt
  | "invoice_sent" // Rechnung versendet
  | "payment_received" // MANUELL bestätigt
  | "completed" // abgeschlossen
  | "cancelled"; // storniert

/** Zielstatus je Ereignis. */
export const EVENT_TO_STATUS: Record<WorkflowEvent, WorkflowStatus> = {
  inquiry_received: "neue_anfrage",
  inquiry_in_progress: "anfrage_in_bearbeitung",
  quote_created: "angebot_erstellt",
  quote_sent: "angebot_versendet",
  quote_accepted: "angebot_angenommen",
  appointment_scheduled: "termin_geplant",
  production_started: "produktion",
  production_finished: "produktion_abgeschlossen",
  postprocessing: "nachbearbeitung",
  delivered: "lieferung_erfolgt",
  invoice_created: "rechnung_erstellt",
  invoice_sent: "rechnung_versendet",
  payment_received: "bezahlt",
  completed: "abgeschlossen",
  cancelled: "storniert",
};

/**
 * Ereignisse, die bewusst NUR manuell bestätigt werden (keine Automatik).
 * Dient der UI zur Kennzeichnung und der Logik als Referenz.
 */
export const MANUAL_EVENTS: WorkflowEvent[] = [
  "quote_accepted",
  "production_finished",
  "payment_received",
];

/** Prüft, ob ein Zielstatus im Hauptworkflow nach dem aktuellen liegt (Vorwärtsschritt). */
export function isForward(current: WorkflowStatus, target: WorkflowStatus): boolean {
  const c = WORKFLOW_ORDER.indexOf(current);
  const t = WORKFLOW_ORDER.indexOf(target);
  if (c === -1 || t === -1) return true; // Sonderfälle (z. B. storniert) immer erlauben
  return t >= c;
}
