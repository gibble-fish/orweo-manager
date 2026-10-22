import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { IconPlus } from "../components/icons";
import { InquiryEditorModal } from "./inquiries/InquiryEditorModal";
import {
  PROJECT_CATEGORIES,
  type Inquiry,
  type StatusDefinition,
  type WorkflowStatus,
} from "@shared/domain";

const categoryLabel = (value: string | null) =>
  value ? PROJECT_CATEGORIES.find((c) => c.value === value)?.label ?? value : "–";

const formatDate = (iso: string) => {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE");
};

/**
 * Anfrageverwaltung: Liste mit Statusfilter, Anlegen/Bearbeiten/Löschen,
 * schneller Statuswechsel und Übernahme als Kunde (mit Dubletten-Check).
 * Die automatische E-Mail-Erkennung dockt später (Outlook-Modul) an dieselbe
 * Struktur an – hier erfolgt die Erfassung manuell.
 */
export function Inquiries() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [filter, setFilter] = useState<WorkflowStatus | "">("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback((status: WorkflowStatus | "") => {
    window.orweo.inquiries
      .list(status || undefined)
      .then(setInquiries)
      .catch(() => setInquiries([]));
  }, []);

  // Über die Topbar-Schnellaktion „Neue Anfrage" (?new=1) das Anlegen-Formular
  // automatisch öffnen und den Parameter danach entfernen.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setEditorOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    window.orweo.status.list().then(setStatuses).catch(() => setStatuses([]));
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (inquiry: Inquiry) => {
    setEditing(inquiry);
    setEditorOpen(true);
  };

  const changeStatus = async (inquiry: Inquiry, status: WorkflowStatus) => {
    await window.orweo.inquiries.setStatus(inquiry.id, status);
    load(filter);
  };

  const remove = async (inquiry: Inquiry) => {
    if (!window.confirm(`Anfrage von „${inquiry.name}" wirklich löschen?`)) return;
    await window.orweo.inquiries.remove(inquiry.id);
    load(filter);
  };

  const convert = async (inquiry: Inquiry) => {
    const result = await window.orweo.inquiries.convertToCustomer(inquiry.id);
    const name = result.customer.company || result.customer.lastName || result.customer.customerNumber;
    window.alert(
      result.linked
        ? `Mit bestehendem Kunden verknüpft: ${name} (${result.customer.customerNumber}).`
        : `Neuer Kunde angelegt: ${name} (${result.customer.customerNumber}).`,
    );
    load(filter);
  };

  // Aus der Anfrage direkt einen Auftrag (Projekt) erstellen und zur
  // Projekt-Detailseite springen, um dort Leistungen/Angebot zu erfassen.
  const createOrder = async (inquiry: Inquiry) => {
    // Schutz: Ein Auftrag ist erst möglich, wenn der Kunde übernommen/verknüpft
    // wurde (damit der Kunde sicher in der Datenbank steht).
    if (!inquiry.customerId) {
      window.alert('Bitte zuerst „Kunde übernehmen" drücken, bevor ein Auftrag angelegt wird.');
      return;
    }
    try {
      const project = await window.orweo.inquiries.createProject(inquiry.id);
      navigate(`/projekte/${project.id}`);
    } catch (e) {
      window.alert(
        "Auftrag konnte nicht angelegt werden: " +
          (e instanceof Error ? e.message : "unbekannter Fehler"),
      );
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Anfragen"
        subtitle="Eingehende Projektanfragen verwalten"
        actions={
          <button type="button" className="btn-primary" onClick={openNew}>
            <IconPlus width={16} height={16} />
            Neue Anfrage
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
          Filter
        </span>
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
              <th className="px-4 py-3 font-normal">Datum</th>
              <th className="px-4 py-3 font-normal">Name / Firma</th>
              <th className="px-4 py-3 font-normal">Projektart</th>
              <th className="px-4 py-3 font-normal">Kontakt</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 text-right font-normal">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((q) => (
              <tr
                key={q.id}
                className="border-t align-top transition-colors hover:bg-[rgba(212,195,161,0.05)]"
                style={{ borderColor: "var(--app-border)" }}
              >
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {formatDate(q.createdAt)}
                </td>
                <td className="cursor-pointer px-4 py-3" onClick={() => openEdit(q)}>
                  <div>{q.name}</div>
                  {q.company && (
                    <div className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                      {q.company}
                    </div>
                  )}
                  {q.customerId && (
                    <div className="text-xs" style={{ color: "var(--color-champagne)" }}>
                      Kunde verknüpft
                    </div>
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  {categoryLabel(q.category)}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--app-text-muted)" }}>
                  <div>{q.email ?? "–"}</div>
                  {q.phone && <div className="text-xs">{q.phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={q.status}
                    onChange={(e) => changeStatus(q, e.target.value as WorkflowStatus)}
                    className="mb-1 rounded border bg-transparent px-1.5 py-1 text-xs outline-none focus:border-[color:var(--color-champagne)]"
                    style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
                    title="Status ändern"
                  >
                    {statuses.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    <StatusBadge status={q.status} statuses={statuses} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-5">
                    <button
                      type="button"
                      onClick={() => openEdit(q)}
                      className="text-sm underline-offset-2 hover:underline"
                      style={{ color: "var(--app-text)" }}
                      title="Anfrage ansehen: Nachricht und Details des Kunden anzeigen"
                    >
                      Anfrage ansehen
                    </button>
                    <button
                      type="button"
                      onClick={() => createOrder(q)}
                      disabled={!q.customerId}
                      className="text-sm underline-offset-2 enabled:hover:underline disabled:cursor-not-allowed"
                      style={{
                        color: q.customerId ? "var(--color-champagne)" : "var(--app-text-muted)",
                        opacity: q.customerId ? 1 : 0.5,
                      }}
                      title={
                        q.customerId
                          ? "Aus dieser Anfrage einen Auftrag (Projekt) erstellen und zum Angebot übergehen"
                          : "Bitte zuerst Kunde übernehmen drücken, dann ist das Anlegen eines Auftrags möglich."
                      }
                    >
                      Auftrag anlegen
                    </button>
                    <button
                      type="button"
                      onClick={() => convert(q)}
                      className="text-sm underline-offset-2 hover:underline"
                      style={{ color: "var(--app-text)" }}
                      title="Aus dieser Anfrage einen Kunden erzeugen oder verknüpfen"
                    >
                      Kunde übernehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(q)}
                      className="text-sm underline-offset-2 hover:underline"
                      style={{ color: "var(--app-text)" }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(q)}
                      className="text-sm underline-offset-2 hover:underline"
                      style={{ color: "#B87A7A" }}
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                  {filter ? "Keine Anfragen mit diesem Status." : "Noch keine Anfragen vorhanden."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      <InquiryEditorModal
        open={editorOpen}
        inquiry={editing}
        statuses={statuses}
        onClose={() => setEditorOpen(false)}
        onSaved={() => load(filter)}
      />
    </div>
  );
}
