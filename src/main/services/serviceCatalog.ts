import { getDb } from "../db/connection";
import type { Service } from "@shared/domain";
import type { ServiceInput } from "@shared/ipc";

interface ServiceRow extends Omit<Service, "active"> {
  active: number;
}

function mapService(row: ServiceRow): Service {
  return { ...row, active: row.active === 1 };
}

export function listServices(): Service[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM services ORDER BY category, name")
    .all() as ServiceRow[];
  return rows.map(mapService);
}

function getServiceById(id: number): Service {
  const db = getDb();
  const row = db.prepare("SELECT * FROM services WHERE id = ?").get(id) as
    | ServiceRow
    | undefined;
  if (!row) throw new Error(`Leistung ${id} nicht gefunden.`);
  return mapService(row);
}

/** Nächste Leistungsnummer im Format LST-NNNN. */
function nextServiceNumber(): string {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT serviceNumber FROM services WHERE serviceNumber LIKE 'LST-%' ORDER BY serviceNumber DESC LIMIT 1",
    )
    .get() as { serviceNumber: string } | undefined;
  const last = row ? Number(row.serviceNumber.replace("LST-", "")) : 0;
  return `LST-${String(last + 1).padStart(4, "0")}`;
}

export function createService(input: ServiceInput): Service {
  const db = getDb();
  const serviceNumber = input.serviceNumber?.trim() || nextServiceNumber();
  const result = db
    .prepare(
      `INSERT INTO services (serviceNumber, name, category, description, unit, price, taxRate, active)
       VALUES (@serviceNumber, @name, @category, @description, @unit, @price, @taxRate, @active)`,
    )
    .run({
      serviceNumber,
      name: input.name,
      category: input.category ?? null,
      description: input.description ?? null,
      unit: input.unit,
      price: input.price,
      taxRate: input.taxRate,
      active: input.active ? 1 : 0,
    });
  return getServiceById(Number(result.lastInsertRowid));
}

export function updateService(id: number, patch: Partial<ServiceInput>): Service {
  const db = getDb();
  const allowed: (keyof ServiceInput)[] = [
    "name",
    "category",
    "description",
    "unit",
    "price",
    "taxRate",
    "active",
    "serviceNumber",
  ];
  const entries = Object.entries(patch).filter(([k]) =>
    allowed.includes(k as keyof ServiceInput),
  );
  if (entries.length > 0) {
    const setClause = entries.map(([k]) => `${k} = @${k}`).join(", ");
    const params: Record<string, unknown> = { id };
    for (const [k, v] of entries) {
      params[k] = k === "active" ? (v ? 1 : 0) : (v as unknown);
    }
    db.prepare(
      `UPDATE services SET ${setClause}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  return getServiceById(id);
}

export function removeService(id: number): void {
  getDb().prepare("DELETE FROM services WHERE id = ?").run(id);
}
