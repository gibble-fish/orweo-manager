import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import {
  PROJECT_CATEGORIES,
  type Customer,
  type Project,
  type ProjectCategory,
  type StatusDefinition,
  type WorkflowStatus,
} from "@shared/domain";
import type { ProjectInput } from "@shared/ipc";
import { customerDisplayName } from "../Customers";

interface Props {
  open: boolean;
  project: Project | null;
  customers: Customer[];
  statuses: StatusDefinition[];
  onClose: () => void;
  onSaved: (saved: Project) => void;
}

const emptyDraft = (): ProjectInput => ({
  customerId: 0,
  category: "architektur",
  name: "",
  description: "",
  location: "",
  productionDate: "",
  contactPerson: "",
  status: "angebot_erstellt",
  notes: "",
  folderPath: "",
});

const labelStyle = { color: "var(--app-text-muted)" };
const inputClass =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]";
const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

/** Legt ein Projekt an oder bearbeitet dessen Kopfdaten (Positionen: Detailseite). */
export function ProjectEditorModal({
  open,
  project,
  customers,
  statuses,
  onClose,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<ProjectInput>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (project) {
      setDraft({
        customerId: project.customerId,
        category: project.category,
        name: project.name,
        description: project.description ?? "",
        location: project.location ?? "",
        productionDate: project.productionDate ?? "",
        contactPerson: project.contactPerson ?? "",
        status: project.status,
        notes: project.notes ?? "",
        folderPath: project.folderPath ?? "",
      });
    } else {
      setDraft({ ...emptyDraft(), customerId: customers[0]?.id ?? 0 });
    }
  }, [open, project, customers]);

  const set = (patch: Partial<ProjectInput>) => setDraft((d) => ({ ...d, ...patch }));

  const canSave = draft.name.trim().length > 0 && draft.customerId > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ProjectInput = {
        ...draft,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        location: draft.location?.trim() || null,
        productionDate: draft.productionDate?.trim() || null,
        contactPerson: draft.contactPerson?.trim() || null,
        notes: draft.notes?.trim() || null,
      };
      const saved = project
        ? await window.orweo.projects.update(project.id, payload)
        : await window.orweo.projects.create(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={project ? `Projekt bearbeiten – ${project.projectNumber}` : "Neues Projekt"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!canSave}>
            {saving ? "Speichert …" : "Speichern"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Kunde *
          </span>
          <select
            value={draft.customerId || ""}
            onChange={(e) => set({ customerId: Number(e.target.value) })}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">– Kunde wählen –</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {customerDisplayName(c)} ({c.customerNumber})
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <span className="mt-1 block text-xs" style={{ color: "#B87A7A" }}>
              Noch keine Kunden vorhanden. Lege zuerst einen Kunden an.
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Projektname *
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Projektart
            </span>
            <select
              value={draft.category}
              onChange={(e) => set({ category: e.target.value as ProjectCategory })}
              className={inputClass}
              style={inputStyle}
            >
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Status
            </span>
            <select
              value={draft.status}
              onChange={(e) => set({ status: e.target.value as WorkflowStatus })}
              className={inputClass}
              style={inputStyle}
            >
              {statuses.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Ort
            </span>
            <input
              type="text"
              value={draft.location ?? ""}
              onChange={(e) => set({ location: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Produktionsdatum
            </span>
            <input
              type="date"
              value={draft.productionDate ?? ""}
              onChange={(e) => set({ productionDate: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Ansprechpartner
          </span>
          <input
            type="text"
            value={draft.contactPerson ?? ""}
            onChange={(e) => set({ contactPerson: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Beschreibung
          </span>
          <textarea
            rows={2}
            value={draft.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Notizen
          </span>
          <textarea
            rows={2}
            value={draft.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: "#B87A7A" }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
