import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import { IconPlus } from "../../components/icons";
import { PROJECT_CATEGORIES, type Package, type ProjectCategory, type Service } from "@shared/domain";
import type { PackageInput, PackageItemInput } from "@shared/ipc";

interface Props {
  open: boolean;
  /** Zu bearbeitendes Paket; null = neues Paket. */
  pkg: Package | null;
  /** Vorbelegte Projektart beim Anlegen (aus der Bereichs-Kachel). */
  defaultCategory?: ProjectCategory;
  /** Katalog-Leistungen für die Positions-Verknüpfung. */
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const emptyDraft = (category: ProjectCategory): PackageInput => ({
  name: "",
  category,
  description: "",
  price: 0,
  active: true,
});

const labelStyle = { color: "var(--app-text-muted)" };
const inputClass =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]";
const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

/**
 * Editor für ein Paket inkl. Positionsliste.
 * Positionen können frei (nur Text) oder mit einer Katalog-Leistung verknüpft
 * sein. Der Paketpreis ist ein eigener Festpreis (unabhängig von den Positionen).
 */
export function PackageEditorModal({
  open,
  pkg,
  defaultCategory = "architektur",
  services,
  onClose,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<PackageInput>(emptyDraft(defaultCategory));
  const [items, setItems] = useState<PackageItemInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (pkg) {
      setDraft({
        name: pkg.name,
        category: pkg.category,
        description: pkg.description ?? "",
        price: pkg.price,
        active: pkg.active,
      });
      window.orweo.packages
        .listItems(pkg.id)
        .then((rows) =>
          setItems(
            rows.map((r) => ({
              serviceId: r.serviceId,
              label: r.label,
              quantity: r.quantity,
              active: r.active,
            })),
          ),
        )
        .catch(() => setItems([]));
    } else {
      setDraft(emptyDraft(defaultCategory));
      setItems([]);
    }
  }, [open, pkg, defaultCategory]);

  const canSave = draft.name.trim().length > 0 && !saving;

  const addFreeItem = () => {
    setItems((prev) => [...prev, { serviceId: null, label: "", quantity: 1, active: true }]);
  };

  const addServiceItem = (serviceId: number) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setItems((prev) => [
      ...prev,
      { serviceId: svc.id, label: svc.name, quantity: 1, active: true },
    ]);
  };

  const updateItem = (index: number, patch: Partial<PackageItemInput>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload: PackageInput = {
        ...draft,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
      };
      const cleanItems = items
        .map((it) => ({ ...it, label: it.label.trim() }))
        .filter((it) => it.label.length > 0);

      let packageId: number;
      if (pkg) {
        const updated = await window.orweo.packages.update(pkg.id, payload);
        packageId = updated.id;
      } else {
        const created = await window.orweo.packages.create(payload);
        packageId = created.id;
      }
      await window.orweo.packages.setItems(packageId, cleanItems);
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
      title={pkg ? "Paket bearbeiten" : "Neues Paket"}
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
            Paketname *
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
              Projektart
            </span>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as ProjectCategory })}
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
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={labelStyle}>
            Beschreibung
          </span>
          <input
            type="text"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </label>

        {/* Positionsliste */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider" style={labelStyle}>
              Enthaltene Leistungen
            </span>
          </div>

          <div className="grid gap-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border px-2 py-2"
                style={{ borderColor: "var(--app-border)", opacity: item.active ? 1 : 0.5 }}
              >
                <input
                  type="checkbox"
                  checked={item.active}
                  title="In diesem Paket aktiv"
                  onChange={(e) => updateItem(index, { active: e.target.checked })}
                />
                <input
                  type="text"
                  value={item.label}
                  placeholder="Bezeichnung der Position"
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                  className="flex-1 rounded border bg-transparent px-2 py-1 text-sm outline-none focus:border-[color:var(--color-champagne)]"
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={item.quantity}
                  title="Menge"
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  className="w-16 rounded border bg-transparent px-2 py-1 text-sm outline-none focus:border-[color:var(--color-champagne)]"
                  style={inputStyle}
                />
                {item.serviceId !== null && (
                  <span
                    className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    style={{ background: "rgba(212,195,161,0.12)", color: "var(--color-champagne)" }}
                    title="Mit Katalog-Leistung verknüpft"
                  >
                    Katalog
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  aria-label="Position entfernen"
                  className="px-1 text-lg leading-none"
                  style={{ color: "#B87A7A" }}
                >
                  ×
                </button>
              </div>
            ))}

            {items.length === 0 && (
              <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                Noch keine Positionen. Füge freien Text oder eine Katalog-Leistung hinzu.
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={addFreeItem}>
              <IconPlus width={14} height={14} />
              Freie Position
            </button>

            <select
              defaultValue=""
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) addServiceItem(val);
                e.target.value = "";
              }}
              className="rounded-lg border bg-transparent px-3 py-2 text-xs outline-none focus:border-[color:var(--color-champagne)]"
              style={inputStyle}
            >
              <option value="">+ Katalog-Leistung …</option>
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({euro(s.price)})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          <span className="text-sm">Paket aktiv</span>
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
