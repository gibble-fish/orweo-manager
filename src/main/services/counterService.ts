import type Database from "better-sqlite3";
import { getDb } from "../db/connection";

/**
 * Vergibt fortlaufende, jahresbezogene Nummern (z. B. KD-2026-0001).
 * Die Zählerstände liegen in der Tabelle `counters` (name, year, value).
 * Muss innerhalb einer Transaktion aufgerufen werden, wenn die Nummer
 * zusammen mit dem Datensatz atomar vergeben werden soll.
 */
export function nextNumber(
  db: Database.Database,
  name: string,
  prefix: string,
  year = new Date().getFullYear(),
): string {
  const row = db
    .prepare("SELECT value FROM counters WHERE name = ? AND year = ?")
    .get(name, year) as { value: number } | undefined;

  const next = (row?.value ?? 0) + 1;

  db.prepare(
    `INSERT INTO counters (name, year, value) VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET year = excluded.year, value = excluded.value`,
  ).run(name, year, next);

  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

/** Bequemer Wrapper mit Standard-DB-Handle. */
export function nextNumberDefault(name: string, prefix: string): string {
  return nextNumber(getDb(), name, prefix);
}
