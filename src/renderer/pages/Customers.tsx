import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { IconPlus, IconSearch } from "../components/icons";
import { CustomerEditorModal } from "./customers/CustomerEditorModal";
import type { Customer } from "@shared/domain";

/** Anzeigename eines Kunden (Firma bevorzugt, sonst Name). */
export function customerDisplayName(c: Customer): string {
  if (c.company) return c.company;
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return name || c.customerNumber;
}

/**
 * Kundenverwaltung: Liste mit Sofort-Suche, Anlegen/Bearbeiten/Löschen.
 * Vorgangs-Tabs (Anfragen/Angebote/Aufträge/Rechnungen/Termine) folgen in
 * den jeweiligen Modulen und werden dann in der Akte verlinkt.
 */
export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback((term: string) => {
    window.orweo.customers
      .list(term)
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  // Live-Suche mit kleiner Entprellung.
  useEffect(() => {
    const t = setTimeout(() => load(search), 200);
    return () => clearTimeout(t);
  }, [search, load]);

  // Topbar-Schnellaktion „Neuer Kunde" (?new=1): Formular automatisch öffnen.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setEditorOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setEditorOpen(true);
  };

  const remove = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Kunde „${customerDisplayName(customer)}" (${customer.customerNumber}) wirklich löschen? ` +
        `Zugehörige Projekte werden ebenfalls entfernt.`,
    );
    if (!confirmed) return;
    await window.orweo.customers.remove(customer.id);
    load(search);
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Kunden"
        subtitle="Kundenakten und Stammdaten"
        actions={
          <button type="button" className="btn-primary" onClick={openNew}>
            <IconPlus width={16} height={16} />
            Neuer Kunde
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <IconSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--app-text-muted)" }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche: Firma, Name, E-Mail, Telefon, Ort, Kundennr. …"
          className="w-full rounded-lg border bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[color:var(--color-champagne)]"
          style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
        />
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: "var(--app-text-muted)" }}>
              <th className="px-4 py-3 font-normal">Kundennr.</th>
              <th className="px-4 py-3 font-normal">Name / Firma</th>
              <th className="px-4 py-3 font-normal">Ort</th>
              <th className="px-4 py-3 font-normal">E-Mail</th>
              <th className="px-4 py-3 font-normal">Telefon</th>
              <th className="px-4 py-3 text-right font-normal">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                className="border-t transition-colors hover:bg-[rgba(212,195,161,0.05)]"
                style={{ borderColor: "var(--app-border)" }}
              >
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {c.customerNumber}
                </td>
                <td className="cursor-pointer px-4 py-3" onClick={() => openEdit(c)}>
                  {customerDisplayName(c)}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {c.city ?? "–"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {c.email ?? "–"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {c.phone ?? "–"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="mr-3 text-xs underline-offset-2 hover:underline"
                    style={{ color: "var(--color-champagne)" }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="text-xs underline-offset-2 hover:underline"
                    style={{ color: "#B87A7A" }}
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                  {search ? "Keine Treffer." : "Noch keine Kunden angelegt."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      <CustomerEditorModal
        open={editorOpen}
        customer={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => load(search)}
      />
    </div>
  );
}
