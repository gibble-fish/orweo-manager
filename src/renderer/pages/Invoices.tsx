import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import type { StatusDefinition, WorkflowStatus } from "@shared/domain";
import type { InvoiceListRow } from "@shared/ipc";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE");
};

/** True, wenn die Rechnung offen und überfällig ist (Fälligkeit in der Vergangenheit). */
function isOverdue(row: InvoiceListRow): boolean {
  if (!row.dueDate) return false;
  const open = row.status === "rechnung_erstellt" || row.status === "rechnung_versendet";
  return open && row.dueDate < new Date().toISOString().slice(0, 10);
}

/**
 * Rechnungsliste mit Suche und Statusfilter. Rechnungen entstehen aus einem
 * angenommenen Angebot (Angebot öffnen → „Rechnung erstellen") oder direkt für
 * einen Kunden.
 */
export function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WorkflowStatus | "">("");

  const load = useCallback((term: string, status: WorkflowStatus | "") => {
    window.orweo.invoices
      .list(term || undefined, status || undefined)
      .then(setInvoices)
      .catch(() => setInvoices([]));
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
        title="Rechnungen"
        subtitle={'Rechnungen entstehen aus einem Angebot (Angebot öffnen → „Rechnung erstellen")'}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche: Rechnungsnr., Kunde …"
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
              <th className="px-4 py-3 font-normal">Rechnungsnr.</th>
              <th className="px-4 py-3 font-normal">Kunde</th>
              <th className="px-4 py-3 font-normal">Datum</th>
              <th className="px-4 py-3 font-normal">Fällig</th>
              <th className="px-4 py-3 text-right font-normal">Betrag</th>
              <th className="px-4 py-3 text-right font-normal">Bezahlt</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const overdue = isOverdue(inv);
              return (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/rechnungen/${inv.id}`)}
                  className="cursor-pointer border-t transition-colors hover:bg-[rgba(212,195,161,0.05)]"
                  style={{ borderColor: "var(--app-border)" }}
                >
                  <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">{inv.customerName || "–"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                    {formatDate(inv.date)}
                  </td>
                  <td className="px-4 py-3" style={{ color: overdue ? "#C98A8A" : "var(--app-text-muted)" }}>
                    {formatDate(inv.dueDate)}
                    {overdue && <span className="ml-1 text-xs">(überfällig)</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{euro(inv.grossTotal)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--app-text-muted)" }}>
                    {euro(inv.paidTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} statuses={statuses} />
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                  {search || filter
                    ? "Keine Treffer."
                    : "Noch keine Rechnungen. Erstelle eine aus einem Angebot."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
