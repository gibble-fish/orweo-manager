import { getDb } from "../db/connection";
import { createCustomer, findCustomerByEmail } from "./customerService";
import { createProject } from "./projectService";
import type { Inquiry, Project, ProjectCategory, WorkflowStatus } from "@shared/domain";
import type { ConvertResult, InquiryInput } from "@shared/ipc";

/** Felder, die per Input gesetzt/aktualisiert werden dürfen. */
const FIELDS: (keyof InquiryInput)[] = [
  "customerId",
  "name",
  "company",
  "email",
  "phone",
  "category",
  "location",
  "timeframe",
  "message",
  "status",
  "source",
];

function getInquiryById(id: number): Inquiry {
  const db = getDb();
  const row = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as Inquiry | undefined;
  if (!row) throw new Error(`Anfrage ${id} nicht gefunden.`);
  return row;
}

/** Listet Anfragen, optional nach Status gefiltert, neueste zuerst. */
export function listInquiries(status?: WorkflowStatus): Inquiry[] {
  const db = getDb();
  if (status) {
    return db
      .prepare("SELECT * FROM inquiries WHERE status = ? ORDER BY createdAt DESC")
      .all(status) as Inquiry[];
  }
  return db.prepare("SELECT * FROM inquiries ORDER BY createdAt DESC").all() as Inquiry[];
}

export function createInquiry(input: InquiryInput): Inquiry {
  const db = getDb();
  const params: Record<string, unknown> = {};
  for (const f of FIELDS) params[f] = input[f] ?? null;
  // Sinnvolle Defaults, falls nicht gesetzt.
  params.status = input.status ?? "neue_anfrage";
  params.source = input.source ?? "manuell";
  const result = db
    .prepare(
      `INSERT INTO inquiries
         (customerId, name, company, email, phone, category, location, timeframe, message, status, source)
       VALUES
         (@customerId, @name, @company, @email, @phone, @category, @location, @timeframe, @message, @status, @source)`,
    )
    .run(params);
  return getInquiryById(Number(result.lastInsertRowid));
}

export function updateInquiry(id: number, patch: Partial<InquiryInput>): Inquiry {
  const db = getDb();
  const entries = Object.entries(patch).filter(([k]) => FIELDS.includes(k as keyof InquiryInput));
  if (entries.length > 0) {
    const setClause = entries.map(([k]) => `${k} = @${k}`).join(", ");
    const params: Record<string, unknown> = { id };
    for (const [k, v] of entries) params[k] = v ?? null;
    db.prepare(
      `UPDATE inquiries SET ${setClause}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  return getInquiryById(id);
}

export function removeInquiry(id: number): void {
  getDb().prepare("DELETE FROM inquiries WHERE id = ?").run(id);
}

export function setInquiryStatus(id: number, status: WorkflowStatus): Inquiry {
  getDb()
    .prepare("UPDATE inquiries SET status = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(status, id);
  return getInquiryById(id);
}

/**
 * Erzeugt aus einer Anfrage einen Kunden – ohne Daten doppelt einzugeben.
 * Existiert bereits ein Kunde mit derselben E-Mail, wird dieser verknüpft
 * (linked=true) statt einen Dublette anzulegen. Die Anfrage merkt sich den
 * verknüpften Kunden über customerId und wechselt in „Anfrage in Bearbeitung",
 * sofern sie noch im Status „Neue Anfrage" war.
 */
export function convertInquiryToCustomer(id: number): ConvertResult {
  const inquiry = getInquiryById(id);

  const existing = inquiry.email ? findCustomerByEmail(inquiry.email) : null;
  const linked = existing !== null;
  const customer =
    existing ??
    createCustomer({
      company: inquiry.company,
      firstName: null,
      lastName: inquiry.name,
      street: null,
      zip: null,
      city: inquiry.location,
      email: inquiry.email,
      phone: inquiry.phone,
      website: null,
      contactPerson: null,
      notes: inquiry.message,
      billingAddress: null,
      shippingAddress: null,
    });

  const db = getDb();
  const nextStatus: WorkflowStatus =
    inquiry.status === "neue_anfrage" ? "anfrage_in_bearbeitung" : inquiry.status;
  db.prepare(
    "UPDATE inquiries SET customerId = ?, status = ?, updatedAt = datetime('now') WHERE id = ?",
  ).run(customer.id, nextStatus, id);

  return { customer, linked };
}

/** Projektkategorie aus der Anfrage ableiten (Fallback: architektur). */
function resolveCategory(inquiry: Inquiry): ProjectCategory {
  const valid: ProjectCategory[] = [
    "architektur",
    "immobilien",
    "automotive",
    "sport",
    "luftaufnahmen",
    "panorama360",
  ];
  return inquiry.category && valid.includes(inquiry.category)
    ? inquiry.category
    : "architektur";
}

/**
 * Erzeugt aus einer Anfrage in einem Schritt einen Auftrag (Projekt):
 * 1. Kunde übernehmen oder verknüpfen (gleiche Logik wie convertInquiryToCustomer).
 * 2. Projekt mit vorbefüllten Daten aus der Anfrage anlegen (Kunde, Projektart,
 *    Standort, Name, Nachricht als Notiz).
 * 3. Anfrage mit dem Kunden verknüpfen und Status auf „angebot_erstellt" setzen,
 *    damit klar ist, dass sie weiterverarbeitet wurde.
 *
 * Gibt das angelegte Projekt zurück, damit der Renderer direkt dorthin springen kann.
 */
export function createProjectFromInquiry(id: number): Project {
  const inquiry = getInquiryById(id);

  const existing = inquiry.email ? findCustomerByEmail(inquiry.email) : null;
  const customer =
    existing ??
    createCustomer({
      company: inquiry.company,
      firstName: null,
      lastName: inquiry.name,
      street: null,
      zip: null,
      city: inquiry.location,
      email: inquiry.email,
      phone: inquiry.phone,
      website: null,
      contactPerson: null,
      notes: inquiry.message,
      billingAddress: null,
      shippingAddress: null,
    });

  // Vollständiger Name: Name und (falls vorhanden) Firma zusammen, damit nicht
  // nur ein Teil wie „Hinz" erscheint. Beispiel: „Anfrage von Marvin Hinz".
  const fullName = [inquiry.name, inquiry.company]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const projectName = `Anfrage von ${fullName || inquiry.name}`.trim();

  const project = createProject({
    customerId: customer.id,
    category: resolveCategory(inquiry),
    name: projectName,
    description: inquiry.message,
    location: inquiry.location,
    productionDate: null,
    contactPerson: inquiry.name,
    status: "angebot_erstellt",
    notes: inquiry.timeframe ? `Gewünschter Zeitraum: ${inquiry.timeframe}` : null,
    folderPath: null,
  });

  getDb()
    .prepare(
      "UPDATE inquiries SET customerId = ?, status = ?, updatedAt = datetime('now') WHERE id = ?",
    )
    .run(customer.id, "angebot_erstellt", id);

  return project;
}
