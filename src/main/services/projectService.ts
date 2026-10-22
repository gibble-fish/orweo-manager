import { getDb } from "../db/connection";
import { nextNumber } from "./counterService";
import { listPackageItems } from "./packageService";
import type { Project, ProjectItem } from "@shared/domain";
import type { ProjectInput, ProjectItemInput } from "@shared/ipc";

const FIELDS: (keyof ProjectInput)[] = [
  "customerId",
  "category",
  "name",
  "description",
  "location",
  "productionDate",
  "contactPerson",
  "status",
  "notes",
  "folderPath",
];

interface ProjectItemRow extends Omit<ProjectItem, "active"> {
  active: number;
}

function mapItem(row: ProjectItemRow): ProjectItem {
  return { ...row, active: row.active === 1 };
}

function getProjectById(id: number): Project {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
  if (!row) throw new Error(`Projekt ${id} nicht gefunden.`);
  return row;
}

/** Projektliste mit Kundennamen, optional gefiltert nach Suchbegriff/Status. */
export interface ProjectListRow extends Project {
  customerName: string | null;
}

export function listProjects(search?: string, status?: string): ProjectListRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (search?.trim()) {
    clauses.push(
      `(p.projectNumber LIKE @like OR p.name LIKE @like OR p.location LIKE @like
        OR c.company LIKE @like OR c.lastName LIKE @like OR c.firstName LIKE @like)`,
    );
    params.like = `%${search.trim()}%`;
  }
  if (status) {
    clauses.push("p.status = @status");
    params.status = status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT p.*, COALESCE(c.company, TRIM(COALESCE(c.firstName,'') || ' ' || COALESCE(c.lastName,''))) AS customerName
       FROM projects p
       LEFT JOIN customers c ON c.id = p.customerId
       ${where}
       ORDER BY p.createdAt DESC`,
    )
    .all(params) as ProjectListRow[];
}

export function getProject(id: number): Project {
  return getProjectById(id);
}

export function createProject(input: ProjectInput): Project {
  const db = getDb();
  const tx = db.transaction(() => {
    const projectNumber = nextNumber(db, "project", "PRO");
    const params: Record<string, unknown> = { projectNumber };
    for (const f of FIELDS) params[f] = input[f] ?? null;
    params.status = input.status ?? "angebot_erstellt";
    const result = db
      .prepare(
        `INSERT INTO projects
           (projectNumber, customerId, category, name, description, location,
            productionDate, contactPerson, status, notes, folderPath)
         VALUES
           (@projectNumber, @customerId, @category, @name, @description, @location,
            @productionDate, @contactPerson, @status, @notes, @folderPath)`,
      )
      .run(params);
    return Number(result.lastInsertRowid);
  });
  return getProjectById(tx());
}

export function updateProject(id: number, patch: Partial<ProjectInput>): Project {
  const db = getDb();
  const entries = Object.entries(patch).filter(([k]) => FIELDS.includes(k as keyof ProjectInput));
  if (entries.length > 0) {
    const setClause = entries.map(([k]) => `${k} = @${k}`).join(", ");
    const params: Record<string, unknown> = { id };
    for (const [k, v] of entries) params[k] = v ?? null;
    db.prepare(
      `UPDATE projects SET ${setClause}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  return getProjectById(id);
}

export function removeProject(id: number): void {
  getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
}

// ----- Positionen -----

export function listProjectItems(projectId: number): ProjectItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM project_items WHERE projectId = ? ORDER BY sortOrder, id")
    .all(projectId) as ProjectItemRow[];
  return rows.map(mapItem);
}

/** Ersetzt die komplette Positionsliste eines Projekts. */
export function setProjectItems(projectId: number, items: ProjectItemInput[]): ProjectItem[] {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM project_items WHERE projectId = ?").run(projectId);
    const ins = db.prepare(
      `INSERT INTO project_items
         (projectId, serviceId, label, description, quantity, unitPrice, taxRate, active, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    items.forEach((it, index) => {
      ins.run(
        projectId,
        it.serviceId ?? null,
        it.label,
        it.description ?? null,
        it.quantity,
        it.unitPrice,
        it.taxRate,
        it.active ? 1 : 0,
        index,
      );
    });
  });
  tx();
  return listProjectItems(projectId);
}

/**
 * Fügt die Positionen eines Pakets zum Projekt hinzu.
 * Die enthaltenen Paket-Positionen werden als Projekt-Positionen angehängt;
 * verknüpfte Katalog-Leistungen liefern Preis/Steuersatz, freie Positionen 0.
 * Der Paket-Festpreis wird als eigene Position „Paket: <Name>" ergänzt, damit
 * die Auftragssumme dem Paketpreis entspricht (Positionen dienen als Inhalt).
 */
export function addPackageToProject(projectId: number, packageId: number): ProjectItem[] {
  const db = getDb();
  const pkg = db.prepare("SELECT * FROM packages WHERE id = ?").get(packageId) as
    | { id: number; name: string; price: number }
    | undefined;
  if (!pkg) throw new Error(`Paket ${packageId} nicht gefunden.`);

  const pkgItems = listPackageItems(packageId).filter((i) => i.active);

  const existing = listProjectItems(projectId);
  let sort = existing.length;

  const tx = db.transaction(() => {
    const ins = db.prepare(
      `INSERT INTO project_items
         (projectId, serviceId, label, description, quantity, unitPrice, taxRate, active, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    );
    // Paketpreis als Sammelposition.
    ins.run(projectId, null, `Paket: ${pkg.name}`, null, 1, pkg.price, 0, sort++);
    // Enthaltene Leistungen als 0-€-Inhaltspositionen (Preis steckt im Paket).
    for (const item of pkgItems) {
      ins.run(projectId, item.serviceId, item.label, null, item.quantity, 0, 0, sort++);
    }
  });
  tx();
  return listProjectItems(projectId);
}
