import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { IconPlus } from "../components/icons";
import { ProjectEditorModal } from "./projects/ProjectEditorModal";
import {
  PROJECT_CATEGORIES,
  type AppSettings,
  type Customer,
  type Package,
  type Project,
  type ProjectItem,
  type Service,
  type StatusDefinition,
} from "@shared/domain";
import type { ProjectItemInput } from "@shared/ipc";
import { customerDisplayName } from "./Customers";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const categoryLabel = (value: string) =>
  PROJECT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

/** Detailseite eines Projekts: Kopfdaten, Paket-Kacheln, Positionsliste, Summe. */
export function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadProject = useCallback(() => {
    window.orweo.projects
      .get(projectId)
      .then((p) => {
        setProject(p);
        return window.orweo.customers.get(p.customerId).catch(() => null);
      })
      .then((c) => setCustomer(c))
      .catch(() => setProject(null));
    window.orweo.projects.listItems(projectId).then(setItems).catch(() => setItems([]));
  }, [projectId]);

  useEffect(() => {
    loadProject();
    window.orweo.customers.list().then(setAllCustomers).catch(() => setAllCustomers([]));
    window.orweo.packages.list().then(setPackages).catch(() => setPackages([]));
    window.orweo.services.list().then(setServices).catch(() => setServices([]));
    window.orweo.status.list().then(setStatuses).catch(() => setStatuses([]));
    window.orweo.settings.get().then(setSettings).catch(() => setSettings(null));
  }, [loadProject]);

  const smallBusiness = settings?.smallBusiness ?? true;

  const packagesForCategory = useMemo(
    () => (project ? packages.filter((p) => p.category === project.category && p.active) : []),
    [packages, project],
  );

  const total = useMemo(
    () => items.filter((i) => i.active).reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [items],
  );

  const persist = async (next: ProjectItem[]) => {
    setItems(next);
    setDirty(false);
    const payload: ProjectItemInput[] = next.map((i) => ({
      serviceId: i.serviceId,
      label: i.label,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
      active: i.active,
    }));
    const saved = await window.orweo.projects.setItems(projectId, payload);
    setItems(saved);
  };

  const applyPackage = async (pkg: Package) => {
    const saved = await window.orweo.projects.addPackage(projectId, pkg.id);
    setItems(saved);
  };

  const createQuote = async () => {
    // Ungespeicherte Positionsänderungen zuerst sichern, damit das Angebot
    // den aktuellen Stand als Snapshot übernimmt.
    if (dirty) await persist(items);
    const quote = await window.orweo.quotes.createFromProject(projectId);
    navigate(`/angebote/${quote.id}`);
  };

  const addFree = () => {
    setItems((prev) => [
      ...prev,
      {
        id: -Date.now(),
        projectId,
        serviceId: null,
        label: "",
        description: null,
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        active: true,
        sortOrder: prev.length,
      },
    ]);
    setDirty(true);
  };

  const addService = (serviceId: number) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setItems((prev) => [
      ...prev,
      {
        id: -Date.now(),
        projectId,
        serviceId: svc.id,
        label: svc.name,
        description: null,
        quantity: 1,
        unitPrice: svc.price,
        taxRate: smallBusiness ? 0 : svc.taxRate,
        active: true,
        sortOrder: prev.length,
      },
    ]);
    setDirty(true);
  };

  const patchItem = (index: number, patch: Partial<ProjectItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  if (!project) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Projekt" subtitle="Wird geladen …" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <button
        type="button"
        onClick={() => navigate("/projekte")}
        className="mb-4 text-xs underline-offset-2 hover:underline"
        style={{ color: "var(--app-text-muted)" }}
      >
        ← Zurück zur Übersicht
      </button>

      <PageHeader
        title={project.name}
        subtitle={`${project.projectNumber} · ${categoryLabel(project.category)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} statuses={statuses} />
            <button type="button" className="btn-secondary" onClick={() => setEditorOpen(true)}>
              Bearbeiten
            </button>
            <button type="button" className="btn-primary" onClick={createQuote}>
              Angebot erstellen
            </button>
          </div>
        }
      />

      {/* Kopfdaten */}
      <GlassCard className="mb-6 p-5">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <Info label="Kunde" value={customer ? customerDisplayName(customer) : "–"} />
          <Info label="Ort" value={project.location ?? "–"} />
          <Info label="Produktionsdatum" value={project.productionDate ?? "–"} />
          <Info label="Ansprechpartner" value={project.contactPerson ?? "–"} />
        </div>
        {project.description && (
          <p className="mt-4 text-sm" style={{ color: "var(--app-text-muted)" }}>
            {project.description}
          </p>
        )}
      </GlassCard>

      {/* Paket-Kacheln der Projektart */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Pakete für {categoryLabel(project.category)}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {packagesForCategory.map((pkg) => (
            <GlassCard key={pkg.id} onClick={() => applyPackage(pkg)} className="p-4">
              <div className="text-sm font-medium">{pkg.name}</div>
              <div className="mt-2 text-lg font-light" style={{ color: "var(--color-champagne)" }}>
                {euro(pkg.price)}
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--app-text-muted)" }}>
                Klicken zum Hinzufügen
              </div>
            </GlassCard>
          ))}
          {packagesForCategory.length === 0 && (
            <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
              Keine Pakete für diese Projektart. Du kannst Positionen manuell hinzufügen.
            </p>
          )}
        </div>
      </section>

      {/* Positionsliste */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
            Positionen
          </h2>
          {dirty && (
            <button type="button" className="btn-primary !py-2 !px-4 text-xs" onClick={() => persist(items)}>
              Änderungen speichern
            </button>
          )}
        </div>

        <GlassCard className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: "var(--app-text-muted)" }}>
                <th className="px-3 py-2 font-normal">Aktiv</th>
                <th className="px-3 py-2 font-normal">Bezeichnung</th>
                <th className="px-3 py-2 text-right font-normal">Menge</th>
                <th className="px-3 py-2 text-right font-normal">Einzel</th>
                <th className="px-3 py-2 text-right font-normal">Summe</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, index) => (
                <tr
                  key={it.id}
                  className="border-t"
                  style={{ borderColor: "var(--app-border)", opacity: it.active ? 1 : 0.5 }}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={it.active}
                      onChange={(e) => patchItem(index, { active: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={it.label}
                      onChange={(e) => patchItem(index, { label: e.target.value })}
                      className="w-full rounded border bg-transparent px-2 py-1 text-sm outline-none focus:border-[color:var(--color-champagne)]"
                      style={inputStyle}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={it.quantity}
                      onChange={(e) => patchItem(index, { quantity: Number(e.target.value) })}
                      className="w-16 rounded border bg-transparent px-2 py-1 text-right text-sm outline-none focus:border-[color:var(--color-champagne)]"
                      style={inputStyle}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) => patchItem(index, { unitPrice: Number(e.target.value) })}
                      className="w-24 rounded border bg-transparent px-2 py-1 text-right text-sm outline-none focus:border-[color:var(--color-champagne)]"
                      style={inputStyle}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">{euro(it.quantity * it.unitPrice)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label="Position entfernen"
                      className="px-1 text-lg leading-none"
                      style={{ color: "#B87A7A" }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                    Noch keine Positionen. Klicke ein Paket an oder füge manuell hinzu.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: "var(--app-border)" }}>
                <td colSpan={4} className="px-3 py-3 text-right text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
                  Gesamt{smallBusiness ? " (§ 19 UStG, keine USt)" : ""}
                </td>
                <td className="px-3 py-3 text-right text-lg font-light" style={{ color: "var(--color-champagne)" }}>
                  {euro(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </GlassCard>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={addFree}>
            <IconPlus width={14} height={14} />
            Freie Position
          </button>
          <select
            defaultValue=""
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val) addService(val);
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
          {dirty && (
            <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>
              Nicht gespeicherte Änderungen
            </span>
          )}
        </div>
      </section>

      <ProjectEditorModal
        open={editorOpen}
        project={project}
        customers={allCustomers}
        statuses={statuses}
        onClose={() => setEditorOpen(false)}
        onSaved={() => loadProject()}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
