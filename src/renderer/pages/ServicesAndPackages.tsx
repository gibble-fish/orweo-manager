import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { IconPlus } from "../components/icons";
import { ServiceEditorModal } from "./services/ServiceEditorModal";
import { PackageEditorModal } from "./services/PackageEditorModal";
import {
  PROJECT_CATEGORIES,
  serviceUnitLabel,
  type AppSettings,
  type Package,
  type ProjectCategory,
  type Service,
} from "@shared/domain";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

/**
 * Leistungskatalog (mit Editor-Modal) und Paketübersicht.
 * Preise/Leistungen sind jederzeit änderbar; bestehende Angebote/Rechnungen
 * bleiben unberührt (Snapshot-Prinzip in den Dokument-Modulen).
 */
export function ServicesAndPackages() {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const [pkgEditorOpen, setPkgEditorOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [pkgDefaultCategory, setPkgDefaultCategory] = useState<ProjectCategory>("architektur");

  const loadServices = useCallback(() => {
    window.orweo.services.list().then(setServices).catch(() => setServices([]));
  }, []);

  const loadPackages = useCallback(() => {
    window.orweo.packages.list().then(setPackages).catch(() => setPackages([]));
  }, []);

  useEffect(() => {
    loadServices();
    loadPackages();
    window.orweo.settings.get().then(setSettings).catch(() => setSettings(null));
  }, [loadServices, loadPackages]);

  const smallBusiness = settings?.smallBusiness ?? true;

  const categorySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) if (s.category) set.add(s.category);
    return [...set].sort();
  }, [services]);

  const packagesByCategory = useMemo(() => {
    const map = new Map<string, Package[]>();
    for (const p of packages) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [packages]);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setEditorOpen(true);
  };

  const remove = async (service: Service) => {
    const confirmed = window.confirm(
      `Leistung „${service.name}" wirklich löschen? Bestehende Angebote/Rechnungen bleiben unverändert.`,
    );
    if (!confirmed) return;
    await window.orweo.services.remove(service.id);
    loadServices();
  };

  const openNewPackage = (category: ProjectCategory) => {
    setEditingPkg(null);
    setPkgDefaultCategory(category);
    setPkgEditorOpen(true);
  };

  const openEditPackage = (pkg: Package) => {
    setEditingPkg(pkg);
    setPkgEditorOpen(true);
  };

  const removePackage = async (pkg: Package) => {
    const confirmed = window.confirm(
      `Paket „${pkg.name}" wirklich löschen? Bestehende Angebote/Rechnungen bleiben unverändert.`,
    );
    if (!confirmed) return;
    await window.orweo.packages.remove(pkg.id);
    loadPackages();
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Leistungen & Pakete"
        subtitle="Katalog und Pakete – Preise jederzeit änderbar, bestehende Dokumente bleiben unverändert"
        actions={
          <button type="button" className="btn-primary" onClick={openNew}>
            <IconPlus width={16} height={16} />
            Neue Leistung
          </button>
        }
      />

      <section className="mb-10">
        <h2 className="mb-3 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Pakete
        </h2>
        {PROJECT_CATEGORIES.map((cat) => {
          const list = packagesByCategory.get(cat.value) ?? [];
          return (
            <div key={cat.value} className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-champagne)" }}>
                  {cat.label}
                </span>
                <button
                  type="button"
                  onClick={() => openNewPackage(cat.value)}
                  className="text-xs underline-offset-2 hover:underline"
                  style={{ color: "var(--app-text-muted)" }}
                >
                  + Neues Paket
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {list.map((p) => (
                  <GlassCard
                    key={p.id}
                    onClick={() => openEditPackage(p)}
                    className="group relative p-4"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePackage(p);
                      }}
                      aria-label="Paket löschen"
                      className="absolute right-2 top-2 hidden text-lg leading-none group-hover:block"
                      style={{ color: "#B87A7A" }}
                    >
                      ×
                    </button>
                    <div className="pr-4 text-sm font-medium">
                      {p.name}
                      {!p.active && (
                        <span className="ml-2 text-xs" style={{ color: "var(--app-text-muted)" }}>
                          (inaktiv)
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <div className="mt-1 text-xs" style={{ color: "var(--app-text-muted)" }}>
                        {p.description}
                      </div>
                    )}
                    <div className="mt-3 text-xl font-light" style={{ color: "var(--color-champagne)" }}>
                      {euro(p.price)}
                    </div>
                  </GlassCard>
                ))}
                {list.length === 0 && (
                  <button
                    type="button"
                    onClick={() => openNewPackage(cat.value)}
                    className="glass-card flex min-h-[92px] items-center justify-center rounded-xl text-xs transition-transform hover:-translate-y-0.5"
                    style={{ color: "var(--app-text-muted)" }}
                  >
                    + Paket für {cat.label} anlegen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Leistungskatalog
        </h2>
        <GlassCard className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: "var(--app-text-muted)" }}>
                <th className="px-4 py-3 font-normal">Nr.</th>
                <th className="px-4 py-3 font-normal">Bezeichnung</th>
                <th className="px-4 py-3 font-normal">Kategorie</th>
                <th className="px-4 py-3 font-normal">Einheit</th>
                <th className="px-4 py-3 text-right font-normal">Preis</th>
                <th className="px-4 py-3 text-right font-normal">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr
                  key={s.id}
                  className="border-t transition-colors hover:bg-[rgba(212,195,161,0.05)]"
                  style={{ borderColor: "var(--app-border)", opacity: s.active ? 1 : 0.5 }}
                >
                  <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                    {s.serviceNumber}
                  </td>
                  <td className="cursor-pointer px-4 py-3" onClick={() => openEdit(s)}>
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 text-xs" style={{ color: "var(--app-text-muted)" }}>
                        (inaktiv)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                    {s.category ?? "–"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                    {serviceUnitLabel(s.unit)}
                  </td>
                  <td className="px-4 py-3 text-right">{euro(s.price)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="mr-3 text-xs underline-offset-2 hover:underline"
                      style={{ color: "var(--color-champagne)" }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s)}
                      className="text-xs underline-offset-2 hover:underline"
                      style={{ color: "#B87A7A" }}
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                    Keine Leistungen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>

      <ServiceEditorModal
        open={editorOpen}
        service={editing}
        smallBusiness={smallBusiness}
        categorySuggestions={categorySuggestions}
        onClose={() => setEditorOpen(false)}
        onSaved={loadServices}
      />

      <PackageEditorModal
        open={pkgEditorOpen}
        pkg={editingPkg}
        defaultCategory={pkgDefaultCategory}
        services={services}
        onClose={() => setPkgEditorOpen(false)}
        onSaved={loadPackages}
      />
    </div>
  );
}
