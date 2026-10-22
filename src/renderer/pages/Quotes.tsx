import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import type { StatusDefinition, WorkflowStatus } from "@shared/domain";
import type { QuoteListRow } from "@shared/ipc";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE");
};

/** Angebotsliste mit Suche und Statusfilter. Angebote entstehen aus Projekten. */
export function Quotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteListRow[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WorkflowStatus | "">("");

  const load = useCallback((term: string, status: WorkflowStatus | "") => {
    window.orweo.quotes
      .list(term || undefined, status || undefined)
      .then(setQuotes)
      .catch(() => setQuotes([]));
  }, []);

  useEffect(() => {
    window.orweo.status.list().then(setStatuses).catch(() => setStatuses([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, filter), 200);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Angebote"
        subtitle={'Angebote werden aus einem Projekt erstellt (Projekt öffnen → „Angebot erstellen“)'}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche: Angebotsnr., Kunde …"
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
              <th className="px-4 py-3 font-normal">Angebotsnr.</th>
              <th className="px-4 py-3 font-normal">Kunde</th>
              <th className="px-4 py-3 font-normal">Datum</th>
              <th className="px-4 py-3 font-normal">Gültig bis</th>
              <th className="px-4 py-3 text-right font-normal">Summe</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr
                key={q.id}
                onClick={() => navigate(`/angebote/${q.id}`)}
                className="cursor-pointer border-t transition-colors hover:bg-[rgba(212,195,161,0.05)]"
                style={{ borderColor: "var(--app-border)" }}
              >
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {q.quoteNumber}
                </td>
                <td className="px-4 py-3">{q.customerName || "–"}</td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {formatDate(q.date)}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {formatDate(q.validUntil)}
                </td>
                <td className="px-4 py-3 text-right">{euro(q.grossTotal)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={q.status} statuses={statuses} />
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                  {search || filter ? "Keine Treffer." : "Noch keine Angebote. Erstelle eines aus einem Projekt."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
