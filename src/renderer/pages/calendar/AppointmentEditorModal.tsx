import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type { Customer } from "@shared/domain";
import type { AppointmentInput, AppointmentListRow } from "@shared/ipc";

const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };
const inputClass =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]";

interface ProjectOption {
  id: number;
  label: string;
}

/** Leeres Formular für einen neuen Termin, optional mit vorbelegtem Datum. */
function emptyForm(date?: string): AppointmentInput {
  return {
    projectId: null,
    customerId: null,
    title: "",
    date: date ?? new Date().toISOString().slice(0, 10),
    time: null,
    durationMinutes: null,
    location: null,
    contactPerson: null,
    notes: null,
  };
}

/**
 * Modal zum Anlegen/Bearbeiten eines Termins. Projekt und Kunde sind optional
 * verknüpfbar; ein verknüpftes Projekt zieht beim Anlegen den Projekt-Workflow
 * auf „termin_geplant" (Logik im Main-Prozess).
 */
export function AppointmentEditorModal({
  open,
  appointment,
  defaultDate,
  customers,
  projects,
  onClose,
  onSaved,
}: {
  open: boolean;
  appointment: AppointmentListRow | null;
  defaultDate?: string;
  customers: Customer[];
  projects: ProjectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AppointmentInput>(emptyForm(defaultDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setForm({
        projectId: appointment.projectId,
        customerId: appointment.customerId,
        title: appointment.title,
        date: appointment.date,
        time: appointment.time,
        durationMinutes: appointment.durationMinutes,
        location: appointment.location,
        contactPerson: appointment.contactPerson,
        notes: appointment.notes,
      });
    } else {
      setForm(emptyForm(defaultDate));
    }
  }, [open, appointment, defaultDate]);

  const patch = (p: Partial<AppointmentInput>) => setForm((prev) => ({ ...prev, ...p }));

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      if (appointment) {
        await window.orweo.appointments.update(appointment.id, form);
      } else {
        await window.orweo.appointments.create(form);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!appointment) return;
    if (!window.confirm(`Termin „${appointment.title}" wirklich löschen?`)) return;
    await window.orweo.appointments.remove(appointment.id);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      title={appointment ? "Termin bearbeiten" : "Neuer Termin"}
      onClose={onClose}
      footer={
        <>
          {appointment && (
            <button
              type="button"
              onClick={remove}
              className="mr-auto text-xs underline-offset-2 hover:underline"
              style={{ color: "#B87A7A" }}
            >
              Löschen
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={saving || !form.title.trim() || !form.date}
          >
            Speichern
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Titel *
          </span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            className={inputClass}
            style={inputStyle}
            placeholder="z. B. Drohnenflug Baustelle"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Datum *
          </span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => patch({ date: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Uhrzeit
          </span>
          <input
            type="time"
            value={form.time ?? ""}
            onChange={(e) => patch({ time: e.target.value || null })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Dauer (Min)
          </span>
          <input
            type="number"
            min={0}
            step="15"
            value={form.durationMinutes ?? ""}
            onChange={(e) =>
              patch({ durationMinutes: e.target.value ? Number(e.target.value) : null })
            }
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Ort
          </span>
          <input
            type="text"
            value={form.location ?? ""}
            onChange={(e) => patch({ location: e.target.value || null })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Projekt
          </span>
          <select
            value={form.projectId ?? ""}
            onChange={(e) => patch({ projectId: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">– kein Projekt –</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Kunde
          </span>
          <select
            value={form.customerId ?? ""}
            onChange={(e) => patch({ customerId: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">– kein Kunde –</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.customerNumber}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Ansprechpartner
          </span>
          <input
            type="text"
            value={form.contactPerson ?? ""}
            onChange={(e) => patch({ contactPerson: e.target.value || null })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="col-span-2 block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Notizen
          </span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || null })}
            rows={3}
            className={inputClass}
            style={inputStyle}
          />
        </label>
      </div>
    </Modal>
  );
}
