import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { IconPlus } from "../components/icons";
import { exportInvoicePdf } from "../pdf/exportPdf";
import type {
  AppSettings,
  DocumentItem,
  Invoice,
  Payment,
  StatusDefinition,
  WorkflowStatus,
} from "@shared/domain";
import type { DocumentItemInput } from "@shared/ipc";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE");
};

const inputStyle = { borderColor: "var(--app-border)", color: "var(--app-text)" };

/**
 * Rechnungs-Detailseite: editierbare Positionen (Snapshot), Rabatt, Fälligkeit,
 * Status, Zahlungs-Erfassung und PDF-Export.
 */
export function InvoiceDetail() {
  const { id } = useParams();
  const invoiceId = Number(id);
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Zahlungs-Eingabefelder.
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState("Überweisung");

  const applyResult = useCallback(
    (res: { invoice: Invoice; items: DocumentItem[]; payments: Payment[]; paidTotal: number }) => {
      setInvoice(res.invoice);
      setItems(res.items);
      setPayments(res.payments);
      setPaidTotal(res.paidTotal);
    },
    [],
  );

  const load = useCallback(() => {
    window.orweo.invoices
      .get(invoiceId)
      .then(applyResult)
      .catch(() => setInvoice(null));
  }, [invoiceId, applyResult]);

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
  const discount = invoice?.discount ?? 0;
  const netTotal = Math.max(0, lineSum - discount);
  const openAmount = invoice ? Math.max(0, Math.round((invoice.grossTotal - paidTotal) * 100) / 100) : 0;

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
        documentId: invoiceId,
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
    const res = await window.orweo.invoices.setItems(invoiceId, payload);
    applyResult(res);
    setDirty(false);
  };

  const changeDiscount = async (value: number) => {
    applyResult(await window.orweo.invoices.update(invoiceId, { discount: value }));
  };

  const changeDueDate = async (value: string) => {
    applyResult(await window.orweo.invoices.update(invoiceId, { dueDate: value || null }));
  };

  const changeStatus = async (status: WorkflowStatus) => {
    const updated = await window.orweo.invoices.setStatus(invoiceId, status);
    setInvoice(updated);
  };

  const addPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    const res = await window.orweo.invoices.addPayment(invoiceId, {
      amount,
      date: payDate || null,
      method: payMethod || null,
    });
    applyResult(res);
    setPayAmount("");
  };

  const removePayment = async (paymentId: number) => {
    applyResult(await window.orweo.invoices.removePayment(invoiceId, paymentId));
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const path = await exportInvoicePdf(invoiceId);
      if (path) window.alert(`PDF gespeichert:\n${path}`);
    } catch (err) {
      window.alert(`PDF konnte nicht erstellt werden: ${String(err)}`);
    } finally {
      setPdfBusy(false);
    }
  };

  const remove = async () => {
    if (!invoice) return;
    if (!window.confirm(`Rechnung ${invoice.invoiceNumber} wirklich löschen?`)) return;
    await window.orweo.invoices.remove(invoiceId);
    navigate("/rechnungen");
  };

  if (!invoice) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Rechnung" subtitle="Wird geladen …" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <button
        type="button"
        onClick={() => navigate("/rechnungen")}
        className="mb-4 text-xs underline-offset-2 hover:underline"
        style={{ color: "var(--app-text-muted)" }}
      >
        ← Zurück zur Übersicht
      </button>

      <PageHeader
        title={`Rechnung ${invoice.invoiceNumber}`}
        subtitle={`Datum ${formatDate(invoice.date)}`}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={invoice.status}
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
            <StatusBadge status={invoice.status} statuses={statuses} />
            <button
              type="button"
              className="btn-secondary !py-1.5 !px-3 text-xs"
              onClick={exportPdf}
              disabled={pdfBusy}
            >
              {pdfBusy ? "PDF …" : "PDF exportieren"}
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
            Fällig bis
          </span>
          <input
            type="date"
            value={invoice.dueDate ?? ""}
            onChange={(e) => changeDueDate(e.target.value)}
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
            <Row label="USt" value={euro(invoice.taxTotal)} />
          )}
          <div className="my-2 h-px" style={{ background: "var(--app-border)" }} />
          <Row label={smallBusiness ? "Gesamt" : "Brutto"} value={euro(invoice.grossTotal)} strong />
          <div className="my-2 h-px" style={{ background: "var(--app-border)" }} />
          <Row label="Bezahlt" value={euro(paidTotal)} />
          <Row label="Offen" value={euro(openAmount)} strong={openAmount > 0} />
        </GlassCard>
      </div>

      {/* Zahlungen */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Zahlungen
        </h2>

        <GlassCard className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: "var(--app-text-muted)" }}>
                <th className="px-4 py-2 font-normal">Datum</th>
                <th className="px-4 py-2 font-normal">Methode</th>
                <th className="px-4 py-2 text-right font-normal">Betrag</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: "var(--app-border)" }}>
                  <td className="px-4 py-2" style={{ color: "var(--app-text-muted)" }}>
                    {formatDate(p.date)}
                  </td>
                  <td className="px-4 py-2">{p.method || "–"}</td>
                  <td className="px-4 py-2 text-right">{euro(p.amount)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removePayment(p.id)}
                      aria-label="Zahlung entfernen"
                      className="px-1 text-lg leading-none"
                      style={{ color: "#B87A7A" }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center" style={{ color: "var(--app-text-muted)" }}>
                    Noch keine Zahlungen erfasst.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>

        <GlassCard className="mt-3 flex flex-wrap items-end gap-4 p-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Betrag (€)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={payAmount}
              placeholder={String(openAmount)}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-32 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
              style={inputStyle}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Datum
            </span>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
              style={inputStyle}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
              Methode
            </span>
            <input
              type="text"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-40 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--color-champagne)]"
              style={inputStyle}
            />
          </label>
          <button type="button" className="btn-primary !py-2 !px-4 text-xs" onClick={addPayment}>
            Zahlung erfassen
          </button>
          {openAmount > 0 && (
            <button
              type="button"
              className="btn-secondary !py-2 !px-4 text-xs"
              onClick={() => setPayAmount(String(openAmount))}
            >
              Offenen Betrag einsetzen
            </button>
          )}
        </GlassCard>
      </section>
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
