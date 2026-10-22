import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { SERVICE_UNITS, type Service, type ServiceUnit } from "@shared/domain";
import type { ServiceInput } from "@shared/ipc";

interface Props {
  open: boolean;
  /** Zu bearbeitende Leistung; null = neue Leistung anlegen. */
  service: Service | null;
  /** Ob § 19 UStG aktiv ist (dann kein Steuersatz-Feld). */
  smallBusiness: boolean;
  /** Kategorie-Vorschläge aus vorhandenen Leistungen. */
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyDraft = (): ServiceInput => ({
  name: "",
  category: "",
  description: "",
  unit: "stueck",
  price: 0,
  taxRate: 0,
  active: true,
});

/**
 * Modal-Editor für eine einzelne Leistung. Legt neu an oder aktualisiert.
 * Steuersatz-Feld erscheint nur, wenn NICHT Kleinunternehmer (§ 19 UStG).
 */
export function ServiceEditorModal({
  open,
  service,
  smallBusiness,
  categorySuggestions,
  onClose,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<ServiceInput>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (service) {
      setDraft({
        name: service.name,
        category: service.category ?? "",
        description: service.description ?? "",
        unit: service.unit,
        price: service.price,
        taxRate: service.taxRate,
        active: service.active,
      });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, service]);

  const listId = useMemo(() => `cat-suggest-${Math.random().toString(36).slice(2)}`, []);

  const canSave = draft.name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ServiceInput = {
        ...draft,
        name: draft.name.trim(),
        category: draft.category?.trim() || null,
        description: draft.description?.trim() || null,
        // Kleinunternehmer: Steuersatz immer 0 erzwingen.
        taxRate: smallBusiness ? 0 : draft.taxRate,
      };
      if (service) {
        await window.orweo.services.update(service.id, payload);
      } else {
        await window.orweo.services.create(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { color: "var(--app-text-muted)" };
  const inputClass =
    "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]";
  const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

  return (
    <Modal
      open={open}
      title={service ? "Leistung bearbeiten" : "Neue Leistung"}
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
            Bezeichnung *
          </span>
          <input
            autoFocus
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Kategorie
            </span>
            <input
              type="text"
              list={listId}
              value={draft.category ?? ""}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
            <datalist id={listId}>
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Einheit
            </span>
            <select
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value as ServiceUnit })}
              className={inputClass}
              style={inputStyle}
            >
              {SERVICE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Beschreibung
          </span>
          <textarea
            rows={2}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
              Preis (€)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className={inputClass}
              style={inputStyle}
            />
          </label>

          {!smallBusiness && (
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
                Steuersatz (%)
              </span>
              <input
                type="number"
                min={0}
                step="1"
                value={draft.taxRate}
                onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) })}
                className={inputClass}
                style={inputStyle}
              />
            </label>
          )}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          <span className="text-sm">Aktiv</span>
        </label>

        {smallBusiness && (
          <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
            Kleinunternehmerregelung (§ 19 UStG) aktiv – es wird keine Umsatzsteuer ausgewiesen.
          </p>
        )}

        {error && (
          <p className="text-sm" style={{ color: "#B87A7A" }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
