import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { IconPlus } from "../components/icons";
import { ProjectEditorModal } from "./projects/ProjectEditorModal";
import {
  PROJECT_CATEGORIES,
  type Customer,
  type StatusDefinition,
  type WorkflowStatus,
} from "@shared/domain";
import type { ProjectListRow } from "@shared/ipc";

const categoryLabel = (value: string) =>
  PROJECT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

/** Projekt-/Auftragsliste mit Suche und Statusfilter. */
export function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WorkflowStatus | "">("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback((term: string, status: WorkflowStatus | "") => {
    window.orweo.projects
      .list(term || undefined, status || undefined)
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    window.orweo.customers.list().then(setCustomers).catch(() => setCustomers([]));
    window.orweo.status.list().then(setStatuses).catch(() => setStatuses([]));
  }, []);

  // Topbar-Schnellaktion „Neuer Auftrag" (?new=1): Formular automatisch öffnen.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditorOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => load(search, filter), 200);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Projekte / Aufträge"
        subtitle="Produktionen von Anfrage bis Lieferung"
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditorOpen(true)}>
            <IconPlus width={16} height={16} />
            Neues Projekt
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche: Projektnr., Name, Ort, Kunde …"
          className="w-full max-w-sm rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
          style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as WorkflowStatus | "")}
          className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
          style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
        >
          <option value="">Alle Status</option>
          {statuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: "var(--app-text-muted)" }}>
              <th className="px-4 py-3 font-normal">Projektnr.</th>
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Kunde</th>
              <th className="px-4 py-3 font-normal">Projektart</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/projekte/${p.id}`)}
                className="cursor-pointer border-t transition-colors hover:bg-[rgba(212,195,161,0.05)]"
                style={{ borderColor: "var(--app-border)" }}
              >
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {p.projectNumber}
                </td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {p.customerName || "–"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {categoryLabel(p.category)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} statuses={statuses} />
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                  {search || filter ? "Keine Treffer." : "Noch keine Projekte vorhanden."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      <ProjectEditorModal
        open={editorOpen}
        project={null}
        customers={customers}
        statuses={statuses}
        onClose={() => setEditorOpen(false)}
        onSaved={(saved) => navigate(`/projekte/${saved.id}`)}
      />
    </div>
  );
}
