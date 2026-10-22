import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type { Customer } from "@shared/domain";
import type { CustomerInput } from "@shared/ipc";

interface Props {
  open: boolean;
  /** Zu bearbeitender Kunde; null = neuer Kunde. */
  customer: Customer | null;
  onClose: () => void;
  onSaved: (saved: Customer) => void;
}

const emptyDraft = (): CustomerInput => ({
  company: "",
  firstName: "",
  lastName: "",
  street: "",
  zip: "",
  city: "",
  email: "",
  phone: "",
  website: "",
  contactPerson: "",
  notes: "",
  billingAddress: "",
  shippingAddress: "",
});

const labelStyle = { color: "var(--app-text-muted)" };
const inputClass =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]";
const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        style={inputStyle}
      />
    </label>
  );
}

/**
 * Kundenakte anlegen/bearbeiten. Die Kundennummer wird beim Anlegen
 * automatisch vergeben (KD-JJJJ-NNNN) und ist schreibgeschützt.
 */
export function CustomerEditorModal({ open, customer, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<CustomerInput>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (customer) {
      setDraft({
        company: customer.company ?? "",
        firstName: customer.firstName ?? "",
        lastName: customer.lastName ?? "",
        street: customer.street ?? "",
        zip: customer.zip ?? "",
        city: customer.city ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        website: customer.website ?? "",
        contactPerson: customer.contactPerson ?? "",
        notes: customer.notes ?? "",
        billingAddress: customer.billingAddress ?? "",
        shippingAddress: customer.shippingAddress ?? "",
      });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, customer]);

  const set = (patch: Partial<CustomerInput>) => setDraft((d) => ({ ...d, ...patch }));

  // Mindestens ein Name/Firma muss gesetzt sein.
  const canSave =
    ((draft.company ?? "").trim() ||
      (draft.lastName ?? "").trim() ||
      (draft.firstName ?? "").trim()) &&
    !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      // Leere Strings zu null normalisieren.
      const payload: CustomerInput = Object.fromEntries(
        Object.entries(draft).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]),
      ) as CustomerInput;

      const saved = customer
        ? await window.orweo.customers.update(customer.id, payload)
        : await window.orweo.customers.create(payload);
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
      title={customer ? `Kunde bearbeiten – ${customer.customerNumber}` : "Neuer Kunde"}
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
        <Field label="Firma" value={draft.company ?? ""} onChange={(v) => set({ company: v })} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Vorname" value={draft.firstName ?? ""} onChange={(v) => set({ firstName: v })} />
          <Field label="Nachname" value={draft.lastName ?? ""} onChange={(v) => set({ lastName: v })} />
        </div>

        <Field label="Straße" value={draft.street ?? ""} onChange={(v) => set({ street: v })} />

        <div className="grid grid-cols-3 gap-4">
          <Field label="PLZ" value={draft.zip ?? ""} onChange={(v) => set({ zip: v })} />
          <div className="col-span-2">
            <Field label="Ort" value={draft.city ?? ""} onChange={(v) => set({ city: v })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="E-Mail" type="email" value={draft.email ?? ""} onChange={(v) => set({ email: v })} />
          <Field label="Telefon" value={draft.phone ?? ""} onChange={(v) => set({ phone: v })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Website" value={draft.website ?? ""} onChange={(v) => set({ website: v })} />
          <Field
            label="Ansprechpartner"
            value={draft.contactPerson ?? ""}
            onChange={(v) => set({ contactPerson: v })}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Rechnungsadresse (falls abweichend)
          </span>
          <textarea
            rows={2}
            value={draft.billingAddress ?? ""}
            onChange={(e) => set({ billingAddress: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Lieferadresse (falls abweichend)
          </span>
          <textarea
            rows={2}
            value={draft.shippingAddress ?? ""}
            onChange={(e) => set({ shippingAddress: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Notizen
          </span>
          <textarea
            rows={3}
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
