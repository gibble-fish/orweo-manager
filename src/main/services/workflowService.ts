import type Database from "better-sqlite3";
import { getDb } from "../db/connection";
// Relativer Pfad statt @shared-Alias: EVENT_TO_STATUS ist ein LAUFZEIT-Wert.
// tsc löst Pfad-Aliase nicht auf, sonst schlägt require() zur Laufzeit fehl.
import { EVENT_TO_STATUS, type WorkflowEvent } from "../../shared/workflow";
import type { WorkflowStatus } from "../../shared/domain";

/** Tabellen mit einer status-Spalte, deren Workflow zentral gesteuert wird. */
type WorkflowTable = "inquiries" | "projects" | "quotes" | "invoices";

const ALLOWED_TABLES: WorkflowTable[] = ["inquiries", "projects", "quotes", "invoices"];

/**
 * Setzt den Status eines Datensatzes anhand eines Geschäftsereignisses.
 * Zentrale Stelle für automatische Statuswechsel: spätere Module rufen
 * applyEvent auf, statt Status-Strings verstreut zu setzen.
 *
 * table wird gegen eine feste Allowlist geprüft (kein SQL-Injection-Risiko
 * durch den Tabellennamen).
 */
export function applyEvent(
  table: WorkflowTable,
  id: number,
  event: WorkflowEvent,
  db: Database.Database = getDb(),
): WorkflowStatus {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error(`Unzulässige Workflow-Tabelle: ${table}`);
  }
  const status = EVENT_TO_STATUS[event];
  db.prepare(
    `UPDATE ${table} SET status = ?, updatedAt = datetime('now') WHERE id = ?`,
  ).run(status, id);
  return status;
}
