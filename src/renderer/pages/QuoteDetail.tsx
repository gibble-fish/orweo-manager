import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { IconPlus } from "../components/icons";
import { exportQuotePdf } from "../pdf/exportPdf";
import type {
  AppSettings,
  DocumentItem,
  Quote,
  StatusDefinition,
  WorkflowStatus,
} from "@shared/domain";
import type { DocumentItemInput } from "@shared/ipc";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

/** Angebots-Detailseite: editierbare Positionen (Snapshot), Rabatt, Summen, Status. */
export function QuoteDetail() {
  const { id } = useParams();
  const quoteId = Number(id);
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(() => {
    window.orweo.quotes
      .get(quoteId)
      .then((res) => {
        setQuote(res.quote);
        setItems(res.items);
      })
      .catch(() => setQuote(null));
  }, [quoteId]);

  useEffect(() => {
    load();
    window.orweo.status.list().then(setStatuses).catch(() => setStatuses([]));
    window.orweo.settings.get().then(setSettings).catch(() => setSettings(null));
  }, [load]);

  const smallBusiness = settings?.smallBusiness ?? true;

  const lineSum = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [items],
  );
  const discount = quote?.discount ?? 0;
  const netTotal = Math.max(0, lineSum - discount);

  const patchItem = (index: number, patch: Partial<DocumentItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addFree = () => {
    setItems((prev) => [
      ...prev,
      {
        id: -Date.now(),
        documentId: quoteId,
        label: "",
        description: null,
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        sortOrder: prev.length,
      },
    ]);
    setDirty(true);
  };

  const saveItems = async () => {
    const payload: DocumentItemInput[] = items.map((i) => ({
      label: i.label,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
    }));
    const res = await window.orweo.quotes.setItems(quoteId, payload);
    setQuote(res.quote);
    setItems(res.items);
    setDirty(false);
  };

  const changeDiscount = async (value: number) => {
    const res = await window.orweo.quotes.update(quoteId, { discount: value });
    setQuote(res.quote);
    setItems(res.items);
  };

  const changeValidUntil = async (value: string) => {
    const res = await window.orweo.quotes.update(quoteId, { validUntil: value || null });
    setQuote(res.quote);
  };

  const changeStatus = async (status: WorkflowStatus) => {
    const updated = await window.orweo.quotes.setStatus(quoteId, status);
    setQuote(updated);
  };

  const remove = async () => {
    if (!quote) return;
    if (!window.confirm(`Angebot ${quote.quoteNumber} wirklich löschen?`)) return;
    await window.orweo.quotes.remove(quoteId);
    navigate("/angebote");
  };

  const [pdfBusy, setPdfBusy] = useState(false);

  const createInvoice = async () => {
    if (!quote) return;
    if (dirty) await saveItems();
    const invoice = await window.orweo.invoices.createFromQuote(quoteId);
    navigate(`/rechnungen/${invoice.id}`);
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const path = await exportQuotePdf(quoteId);
      if (path) window.alert(`PDF gespeichert:\n${path}`);
    } catch (err) {
      window.alert(`PDF konnte nicht erstellt werden: ${String(err)}`);
    } finally {
      setPdfBusy(false);
    }
  };

  if (!quote) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Angebot" subtitle="Wird geladen …" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <button
        type="button"
        onClick={() => navigate("/angebote")}
        className="mb-4 text-xs underline-offset-2 hover:underline"
        style={{ color: "var(--app-text-muted)" }}
      >
        ← Zurück zur Übersicht
      </button>

      <PageHeader
        title={`Angebot ${quote.quoteNumber}`}
        subtitle={`Datum ${new Date(quote.date).toLocaleDateString("de-DE")}`}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={quote.status}
              onChange={(e) => changeStatus(e.target.value as WorkflowStatus)}
              className="rounded-lg border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-[color:var(--color-champagne)]"
              style={inputStyle}
              title="Status ändern"
            >
              {statuses.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <StatusBadge status={quote.status} statuses={statuses} />
            <button
              type="button"
              className="btn-secondary !py-1.5 !px-3 text-xs"
              onClick={exportPdf}
              disabled={pdfBusy}
            >
              {pdfBusy ? "PDF …" : "PDF exportieren"}
            </button>
            <button type="button" className="btn-primary !py-1.5 !px-3 text-xs" onClick={createInvoice}>
              Rechnung erstellen
            </button>
            <button
              type="button"
              onClick={remove}
              className="text-xs underline-offset-2 hover:underline"
              style={{ color: "#B87A7A" }}
            >
              Löschen
            </button>
          </div>
        }
      />

      <GlassCard className="mb-6 flex flex-wrap items-end gap-6 p-5">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Gültig bis
          </span>
          <input
            type="date"
            value={quote.validUntil ?? ""}
            onChange={(e) => changeValidUntil(e.target.value)}
            className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
            style={inputStyle}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            Rabatt (€)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => changeDiscount(Number(e.target.value))}
            className="w-32 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
            style={inputStyle}
          />
        </label>
      </GlassCard>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Positionen
        </h2>
        {dirty && (
          <button type="button" className="btn-primary !py-2 !px-4 text-xs" onClick={saveItems}>
            Positionen speichern
          </button>
        )}
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: "var(--app-text-muted)" }}>
              <th className="px-3 py-2 font-normal">Bezeichnung</th>
              <th className="px-3 py-2 text-right font-normal">Menge</th>
              <th className="px-3 py-2 text-right font-normal">Einzel</th>
              {!smallBusiness && <th className="px-3 py-2 text-right font-normal">USt %</th>}
              <th className="px-3 py-2 text-right font-normal">Summe</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, index) => (
              <tr key={it.id} className="border-t" style={{ borderColor: "var(--app-border)" }}>
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
                {!smallBusiness && (
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={it.taxRate}
                      onChange={(e) => patchItem(index, { taxRate: Number(e.target.value) })}
                      className="w-16 rounded border bg-transparent px-2 py-1 text-right text-sm outline-none focus:border-[color:var(--color-champagne)]"
                      style={inputStyle}
                    />
                  </td>
                )}
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
                <td colSpan={smallBusiness ? 5 : 6} className="px-3 py-6 text-center" style={{ color: "var(--app-text-muted)" }}>
                  Keine Positionen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      <div className="mt-3 flex items-start justify-between gap-4">
        <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={addFree}>
          <IconPlus width={14} height={14} />
          Position hinzufügen
        </button>

        <GlassCard className="w-64 p-4 text-sm">
          <Row label="Zwischensumme" value={euro(lineSum)} />
          {discount > 0 && <Row label="Rabatt" value={`− ${euro(discount)}`} />}
          <Row label="Netto" value={euro(netTotal)} />
          {smallBusiness ? (
            <p className="mt-2 text-xs" style={{ color: "var(--app-text-muted)" }}>
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
            </p>
          ) : (
            <>
              <Row label="USt" value={euro(quote.taxTotal)} />
              <div className="my-2 h-px" style={{ background: "var(--app-border)" }} />
              <Row label="Brutto" value={euro(quote.grossTotal)} strong />
            </>
          )}
          {smallBusiness && (
            <>
              <div className="my-2 h-px" style={{ background: "var(--app-border)" }} />
              <Row label="Gesamt" value={euro(netTotal)} strong />
            </>
          )}
        </GlassCard>
      </div>

    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span style={{ color: "var(--app-text-muted)" }}>{label}</span>
      <span style={strong ? { color: "var(--color-champagne)", fontSize: "1.05rem" } : undefined}>
        {value}
      </span>
    </div>
  );
}
