import { getDb } from "../db/connection";
import type { Package, PackageItem } from "@shared/domain";
import type { PackageInput, PackageItemInput } from "@shared/ipc";

interface PackageRow extends Omit<Package, "active"> {
  active: number;
}
interface PackageItemRow extends Omit<PackageItem, "active"> {
  active: number;
}

function mapPackage(row: PackageRow): Package {
  return { ...row, active: row.active === 1 };
}

export function listPackages(): Package[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM packages ORDER BY category, price")
    .all() as PackageRow[];
  return rows.map(mapPackage);
}

function getPackageById(id: number): Package {
  const db = getDb();
  const row = db.prepare("SELECT * FROM packages WHERE id = ?").get(id) as
    | PackageRow
    | undefined;
  if (!row) throw new Error(`Paket ${id} nicht gefunden.`);
  return mapPackage(row);
}

export function listPackageItems(packageId: number): PackageItem[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM package_items WHERE packageId = ? ORDER BY id")
    .all(packageId) as PackageItemRow[];
  return rows.map((r) => ({ ...r, active: r.active === 1 }));
}

export function createPackage(input: PackageInput): Package {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO packages (name, category, description, price, active)
       VALUES (@name, @category, @description, @price, @active)`,
    )
    .run({
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      price: input.price,
      active: input.active ? 1 : 0,
    });
  return getPackageById(Number(result.lastInsertRowid));
}

export function updatePackage(id: number, patch: Partial<PackageInput>): Package {
  const db = getDb();
  const allowed: (keyof PackageInput)[] = [
    "name",
    "category",
    "description",
    "price",
    "active",
  ];
  const entries = Object.entries(patch).filter(([k]) =>
    allowed.includes(k as keyof PackageInput),
  );
  if (entries.length > 0) {
    const setClause = entries.map(([k]) => `${k} = @${k}`).join(", ");
    const params: Record<string, unknown> = { id };
    for (const [k, v] of entries) {
      params[k] = k === "active" ? (v ? 1 : 0) : (v as unknown);
    }
    db.prepare(
      `UPDATE packages SET ${setClause}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  return getPackageById(id);
}

export function removePackage(id: number): void {
  // package_items werden per ON DELETE CASCADE mitentfernt.
  getDb().prepare("DELETE FROM packages WHERE id = ?").run(id);
}

/**
 * Ersetzt die Positionsliste eines Pakets vollständig durch die übergebene.
 * Bewusst „set" statt einzelner Add/Remove-Calls: der Editor schickt die
 * komplette Liste, das hält Renderer-Logik und Transaktion einfach.
 */
export function setPackageItems(
  packageId: number,
  items: PackageItemInput[],
): PackageItem[] {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM package_items WHERE packageId = ?").run(packageId);
    const ins = db.prepare(
      `INSERT INTO package_items (packageId, serviceId, label, quantity, active)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const item of items) {
      ins.run(
        packageId,
        item.serviceId ?? null,
        item.label,
        item.quantity,
        item.active ? 1 : 0,
      );
    }
  });
  tx();
  return listPackageItems(packageId);
}
