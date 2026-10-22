import { getDb } from "../db/connection";
import type { DashboardStats } from "@shared/ipc";

/**
 * Aggregierte Dashboard-Kennzahlen. Da Anfragen/Angebote/Rechnungen im
 * Gerüststadium noch leer sein können, liefern alle Zähler robuste Nullwerte.
 */
export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const count = (sql: string, ...params: unknown[]): number => {
    const row = db.prepare(sql).get(...params) as { c: number } | undefined;
    return row?.c ?? 0;
  };
  const sum = (sql: string, ...params: unknown[]): number => {
    const row = db.prepare(sql).get(...params) as { s: number | null } | undefined;
    return row?.s ?? 0;
  };

  const year = new Date().getFullYear();

  return {
    newInquiries: count("SELECT COUNT(*) AS c FROM inquiries WHERE status = 'neue_anfrage'"),
    inquiriesInProgress: count(
      "SELECT COUNT(*) AS c FROM inquiries WHERE status = 'anfrage_in_bearbeitung'",
    ),
    openQuotes: count(
      "SELECT COUNT(*) AS c FROM quotes WHERE status IN ('angebot_erstellt','angebot_versendet')",
    ),
    acceptedQuotes: count("SELECT COUNT(*) AS c FROM quotes WHERE status = 'angebot_angenommen'"),
    upcomingAppointments: count(
      "SELECT COUNT(*) AS c FROM appointments WHERE date >= date('now')",
    ),
    runningProductions: count("SELECT COUNT(*) AS c FROM projects WHERE status = 'produktion'"),
    openInvoices: count(
      "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('rechnung_erstellt','rechnung_versendet')",
    ),
    overdueInvoices: count(
      "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('rechnung_erstellt','rechnung_versendet') AND dueDate IS NOT NULL AND dueDate < date('now')",
    ),
    revenueThisYear: sum(
      "SELECT COALESCE(SUM(grossTotal), 0) AS s FROM invoices WHERE status IN ('bezahlt','abgeschlossen') AND strftime('%Y', date) = ?",
      String(year),
    ),
  };
}
