import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import {
  PROJECT_CATEGORIES,
  type Inquiry,
  type ProjectCategory,
  type StatusDefinition,
  type WorkflowStatus,
} from "@shared/domain";
import type { InquiryInput } from "@shared/ipc";

interface Props {
  open: boolean;
  inquiry: Inquiry | null;
  statuses: StatusDefinition[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyDraft = (): InquiryInput => ({
  customerId: null,
  name: "",
  company: "",
  email: "",
  phone: "",
  category: null,
  location: "",
  timeframe: "",
  message: "",
  status: "neue_anfrage",
  source: "manuell",
});

const labelStyle = { color: "var(--app-text-muted)" };
const inputClass =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]";
const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

/**
 * Anfrage anlegen/bearbeiten. Die Felder entsprechen dem strukturierten
 * E-Mail-Format des ORWEO-Website-Kontaktformulars (Name, Firma, E-Mail,
 * Telefon, Projektart, Standort, Zeitraum, Nachricht), damit die spätere
 * automatische E-Mail-Erkennung dieselbe Struktur befüllt.
 */
export function InquiryEditorModal({ open, inquiry, statuses, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<InquiryInput>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (inquiry) {
      setDraft({
        customerId: inquiry.customerId,
        name: inquiry.name,
        company: inquiry.company ?? "",
        email: inquiry.email ?? "",
        phone: inquiry.phone ?? "",
        category: inquiry.category,
        location: inquiry.location ?? "",
        timeframe: inquiry.timeframe ?? "",
        message: inquiry.message ?? "",
        status: inquiry.status,
        source: inquiry.source,
      });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, inquiry]);

  const set = (patch: Partial<InquiryInput>) => setDraft((d) => ({ ...d, ...patch }));

  const canSave = (draft.name ?? "").trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload: InquiryInput = {
        ...draft,
        name: draft.name.trim(),
        company: draft.company?.trim() || null,
        email: draft.email?.trim() || null,
        phone: draft.phone?.trim() || null,
        location: draft.location?.trim() || null,
        timeframe: draft.timeframe?.trim() || null,
        message: draft.message?.trim() || null,
      };
      if (inquiry) {
        await window.orweo.inquiries.update(inquiry.id, payload);
      } else {
        await window.orweo.inquiries.create(payload);
      }
      onSaved();
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
      title={inquiry ? "Anfrage bearbeiten" : "Neue Anfrage"}
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
      <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Name *
            </span>
            <input
              autoFocus
              type="text"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Firma
            </span>
            <input
              type="text"
              value={draft.company ?? ""}
              onChange={(e) => set({ company: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              E-Mail
            </span>
            <input
              type="email"
              value={draft.email ?? ""}
              onChange={(e) => set({ email: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Telefon
            </span>
            <input
              type="text"
              value={draft.phone ?? ""}
              onChange={(e) => set({ phone: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Projektart
            </span>
            <select
              value={draft.category ?? ""}
              onChange={(e) =>
                set({ category: (e.target.value || null) as ProjectCategory | null })
              }
              className={inputClass}
              style={inputStyle}
            >
              <option value="">– keine –</option>
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
              Standort
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
              Gewünschter Zeitraum
            </span>
            <input
              type="text"
              value={draft.timeframe ?? ""}
              onChange={(e) => set({ timeframe: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Nachricht
          </span>
          <textarea
            rows={4}
            value={draft.message ?? ""}
            onChange={(e) => set({ message: e.target.value })}
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
