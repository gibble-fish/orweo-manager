import { getDb } from "../db/connection";
import { nextNumber } from "./counterService";
import type { Customer } from "@shared/domain";
import type { CustomerInput } from "@shared/ipc";

/** Felder, die per Input gesetzt/aktualisiert werden dürfen. */
const FIELDS: (keyof CustomerInput)[] = [
  "company",
  "firstName",
  "lastName",
  "street",
  "zip",
  "city",
  "email",
  "phone",
  "website",
  "contactPerson",
  "notes",
  "billingAddress",
  "shippingAddress",
];

function getCustomerById(id: number): Customer {
  const db = getDb();
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as
    | Customer
    | undefined;
  if (!row) throw new Error(`Kunde ${id} nicht gefunden.`);
  return row;
}

/**
 * Listet Kunden, optional gefiltert über einen Suchbegriff.
 * Sucht in Firma, Vor-/Nachname, E-Mail, Telefon, Ort und Kundennummer.
 */
export function listCustomers(search?: string): Customer[] {
  const db = getDb();
  const term = search?.trim();
  if (!term) {
    return db
      .prepare("SELECT * FROM customers ORDER BY COALESCE(company, lastName, firstName)")
      .all() as Customer[];
  }
  const like = `%${term}%`;
  return db
    .prepare(
      `SELECT * FROM customers
       WHERE company LIKE @like OR firstName LIKE @like OR lastName LIKE @like
          OR email LIKE @like OR phone LIKE @like OR city LIKE @like
          OR customerNumber LIKE @like
       ORDER BY COALESCE(company, lastName, firstName)`,
    )
    .all({ like }) as Customer[];
}

export function getCustomer(id: number): Customer {
  return getCustomerById(id);
}

/** Findet einen Kunden anhand der E-Mail (case-insensitive), falls vorhanden. */
export function findCustomerByEmail(email: string): Customer | null {
  const term = email.trim();
  if (!term) return null;
  const row = getDb()
    .prepare("SELECT * FROM customers WHERE email IS NOT NULL AND LOWER(email) = LOWER(?) LIMIT 1")
    .get(term) as Customer | undefined;
  return row ?? null;
}

export function createCustomer(input: CustomerInput): Customer {
  const db = getDb();
  const tx = db.transaction(() => {
    const customerNumber = nextNumber(db, "customer", "KD");
    const params: Record<string, unknown> = { customerNumber };
    for (const f of FIELDS) params[f] = input[f] ?? null;
    const result = db
      .prepare(
        `INSERT INTO customers
           (customerNumber, company, firstName, lastName, street, zip, city,
            email, phone, website, contactPerson, notes, billingAddress, shippingAddress)
         VALUES
           (@customerNumber, @company, @firstName, @lastName, @street, @zip, @city,
            @email, @phone, @website, @contactPerson, @notes, @billingAddress, @shippingAddress)`,
      )
      .run(params);
    return Number(result.lastInsertRowid);
  });
  return getCustomerById(tx());
}

export function updateCustomer(id: number, patch: Partial<CustomerInput>): Customer {
  const db = getDb();
  const entries = Object.entries(patch).filter(([k]) =>
    FIELDS.includes(k as keyof CustomerInput),
  );
  if (entries.length > 0) {
    const setClause = entries.map(([k]) => `${k} = @${k}`).join(", ");
    const params: Record<string, unknown> = { id };
    for (const [k, v] of entries) params[k] = v ?? null;
    db.prepare(
      `UPDATE customers SET ${setClause}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  return getCustomerById(id);
}

export function removeCustomer(id: number): void {
  getDb().prepare("DELETE FROM customers WHERE id = ?").run(id);
}
