import { getDb } from "../db/connection";
import { applyEvent } from "./workflowService";
import type { Appointment } from "@shared/domain";
import type { AppointmentInput, AppointmentListRow } from "@shared/ipc";

function getRow(id: number): Appointment {
  const row = getDb().prepare("SELECT * FROM appointments WHERE id = ?").get(id) as
    | Appointment
    | undefined;
  if (!row) throw new Error(`Termin ${id} nicht gefunden.`);
  return row;
}

/**
 * Listet Termine, optional eingegrenzt auf einen Datumsbereich [from, to]
 * (ISO-Datum YYYY-MM-DD). Liefert Projekt- und Kundenname für die Anzeige mit.
 */
export function listAppointments(from?: string, to?: string): AppointmentListRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (from) {
    clauses.push("a.date >= @from");
    params.from = from;
  }
  if (to) {
    clauses.push("a.date <= @to");
    params.to = to;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT a.*,
              p.name AS projectName,
              COALESCE(c.company, TRIM(COALESCE(c.firstName,'') || ' ' || COALESCE(c.lastName,''))) AS customerName
       FROM appointments a
       LEFT JOIN projects p ON p.id = a.projectId
       LEFT JOIN customers c ON c.id = a.customerId
       ${where}
       ORDER BY a.date, a.time`,
    )
    .all(params) as AppointmentListRow[];
}

/**
 * Legt einen Termin an. Ist ein Projekt verknüpft, wird dessen Workflow auf
 * „termin_geplant" gezogen (nur vorwärts – applyEvent setzt den Status direkt).
 */
export function createAppointment(input: AppointmentInput): Appointment {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO appointments
         (projectId, customerId, title, date, time, durationMinutes, location, contactPerson, notes)
       VALUES (@projectId, @customerId, @title, @date, @time, @durationMinutes, @location, @contactPerson, @notes)`,
    )
    .run({
      projectId: input.projectId ?? null,
      customerId: input.customerId ?? null,
      title: input.title,
      date: input.date,
      time: input.time ?? null,
      durationMinutes: input.durationMinutes ?? null,
      location: input.location ?? null,
      contactPerson: input.contactPerson ?? null,
      notes: input.notes ?? null,
    });
  const id = Number(result.lastInsertRowid);
  if (input.projectId) applyEvent("projects", input.projectId, "appointment_scheduled");
  return getRow(id);
}

export function updateAppointment(
  id: number,
  patch: Partial<AppointmentInput>,
): Appointment {
  const db = getDb();
  const allowed: (keyof AppointmentInput)[] = [
    "projectId",
    "customerId",
    "title",
    "date",
    "time",
    "durationMinutes",
    "location",
    "contactPerson",
    "notes",
  ];
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = @${key}`);
      params[key] = patch[key] ?? null;
    }
  }
  if (sets.length > 0) {
    db.prepare(
      `UPDATE appointments SET ${sets.join(", ")}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  return getRow(id);
}

export function removeAppointment(id: number): void {
  getDb().prepare("DELETE FROM appointments WHERE id = ?").run(id);
}
