import { getDb } from "../db/connection";
import type { StatusDefinition } from "@shared/domain";

export function listStatuses(): StatusDefinition[] {
  return getDb()
    .prepare("SELECT * FROM status_definitions ORDER BY sortOrder")
    .all() as StatusDefinition[];
}

/**
 * Aktualisiert nur die anpassbaren Felder eines Status: Label und Farbe.
 * Der Schlüssel (key) bleibt fest, da die Workflow-Automatik daran hängt.
 */
export function updateStatus(
  key: string,
  patch: { label?: string; color?: string | null },
): StatusDefinition[] {
  const db = getDb();
  const sets: string[] = [];
  const params: Record<string, unknown> = { key };
  if (patch.label !== undefined) {
    sets.push("label = @label");
    params.label = patch.label;
  }
  if (patch.color !== undefined) {
    sets.push("color = @color");
    params.color = patch.color;
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE status_definitions SET ${sets.join(", ")} WHERE key = @key`).run(params);
  }
  return listStatuses();
}

/**
 * Setzt die Reihenfolge anhand einer key-Liste neu (Index = sortOrder).
 * Unbekannte Keys werden ignoriert.
 */
export function reorderStatuses(orderedKeys: string[]): StatusDefinition[] {
  const db = getDb();
  const upd = db.prepare("UPDATE status_definitions SET sortOrder = ? WHERE key = ?");
  const tx = db.transaction(() => {
    orderedKeys.forEach((key, index) => upd.run(index, key));
  });
  tx();
  return listStatuses();
}
