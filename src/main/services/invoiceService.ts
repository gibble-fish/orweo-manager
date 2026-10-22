import { getDb } from "../db/connection";
import { nextNumber } from "./counterService";
import { getSettings } from "./settingsService";
import { applyEvent } from "./workflowService";
import type { DocumentItem, Invoice, Payment, WorkflowStatus } from "@shared/domain";
import type {
  DocumentItemInput,
  InvoiceListRow,
  InvoiceUpdateInput,
  InvoiceWithItems,
  PaymentInput,
} from "@shared/ipc";

/** Datum + n Tage als ISO-Datum (YYYY-MM-DD). */
function addDaysISO(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Berechnet Netto/USt/Brutto aus den Positionen und einem Rabatt (absoluter
 * Euro-Betrag auf den Netto). Bei Kleinunternehmerregelung (§ 19 UStG) wird
 * keine USt ausgewiesen (taxTotal = 0, brutto = netto). Identisch zur
 * Angebotslogik, damit ein aus dem Angebot übernommenes Dokument gleich rechnet.
 */
function computeTotals(
  items: { quantity: number; unitPrice: number; taxRate: number }[],
  discount: number,
): { netTotal: number; taxTotal: number; grossTotal: number } {
  const smallBusiness = getSettings().smallBusiness;
  const round = (n: number) => Math.round(n * 100) / 100;

  const lineSum = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const netTotal = round(Math.max(0, lineSum - (discount || 0)));

  if (smallBusiness) {
    return { netTotal, taxTotal: 0, grossTotal: netTotal };
  }

  const factor = lineSum > 0 ? netTotal / lineSum : 1;
  const taxTotal = round(
    items.reduce((s, i) => s + i.quantity * i.unitPrice * factor * (i.taxRate / 100), 0),
  );
  return { netTotal, taxTotal, grossTotal: round(netTotal + taxTotal) };
}

function getInvoiceRow(id: number): Invoice {
  const row = getDb().prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Invoice | undefined;
  if (!row) throw new Error(`Rechnung ${id} nicht gefunden.`);
  return row;
}

function listItems(invoiceId: number): DocumentItem[] {
  return getDb()
    .prepare("SELECT * FROM invoice_items WHERE documentId = ? ORDER BY sortOrder, id")
    .all(invoiceId) as DocumentItem[];
}

function listPaymentsRows(invoiceId: number): Payment[] {
  return getDb()
    .prepare("SELECT * FROM payments WHERE invoiceId = ? ORDER BY date, id")
    .all(invoiceId) as Payment[];
}

/** Summe aller erfassten Zahlungen einer Rechnung. */
function paidAmount(invoiceId: number): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE invoiceId = ?")
    .get(invoiceId) as { s: number };
  return Math.round(row.s * 100) / 100;
}

/** Schreibt die berechneten Summen in den Rechnungskopf zurück. */
function refreshTotals(invoiceId: number): void {
  const db = getDb();
  const invoice = getInvoiceRow(invoiceId);
  const items = listItems(invoiceId);
  const { netTotal, taxTotal, grossTotal } = computeTotals(items, invoice.discount);
  db.prepare(
    "UPDATE invoices SET netTotal = ?, taxTotal = ?, grossTotal = ?, updatedAt = datetime('now') WHERE id = ?",
  ).run(netTotal, taxTotal, grossTotal, invoiceId);
}

function withItems(id: number): InvoiceWithItems {
  return {
    invoice: getInvoiceRow(id),
    items: listItems(id),
    payments: listPaymentsRows(id),
    paidTotal: paidAmount(id),
  };
}

export function listInvoices(search?: string, status?: WorkflowStatus): InvoiceListRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (search?.trim()) {
    clauses.push(
      `(i.invoiceNumber LIKE @like OR c.company LIKE @like OR c.lastName LIKE @like OR c.firstName LIKE @like)`,
    );
    params.like = `%${search.trim()}%`;
  }
  if (status) {
    clauses.push("i.status = @status");
    params.status = status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT i.*,
              COALESCE(c.company, TRIM(COALESCE(c.firstName,'') || ' ' || COALESCE(c.lastName,''))) AS customerName,
              (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoiceId = i.id) AS paidTotal
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customerId
       ${where}
       ORDER BY i.createdAt DESC`,
    )
    .all(params) as InvoiceListRow[];
}

export function getInvoice(id: number): InvoiceWithItems {
  return withItems(id);
}

/**
 * Erzeugt eine Rechnung aus einem Angebot. Die Positionen werden als Snapshot
 * in invoice_items kopiert (eingefroren). Rabatt, Beschreibung und Kunde werden
 * übernommen. Zahlungsziel: 14 Tage. Das Angebot bleibt unverändert bestehen.
 */
export function createInvoiceFromQuote(quoteId: number): Invoice {
  const db = getDb();
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(quoteId) as
    | {
        id: number;
        customerId: number;
        projectId: number | null;
        description: string | null;
        discount: number;
      }
    | undefined;
  if (!quote) throw new Error(`Angebot ${quoteId} nicht gefunden.`);

  const quoteItems = db
    .prepare("SELECT * FROM quote_items WHERE documentId = ? ORDER BY sortOrder, id")
    .all(quoteId) as {
    label: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];

  const tx = db.transaction(() => {
    const invoiceNumber = nextNumber(db, "invoice", "RE");
    const date = new Date().toISOString().slice(0, 10);
    const dueDate = addDaysISO(14);

    const result = db
      .prepare(
        `INSERT INTO invoices
           (invoiceNumber, customerId, projectId, quoteId, date, dueDate, description, discount,
            netTotal, taxTotal, grossTotal, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'rechnung_erstellt')`,
      )
      .run(
        invoiceNumber,
        quote.customerId,
        quote.projectId,
        quoteId,
        date,
        dueDate,
        quote.description,
        quote.discount || 0,
      );
    const invoiceId = Number(result.lastInsertRowid);

    const ins = db.prepare(
      `INSERT INTO invoice_items (documentId, label, description, quantity, unitPrice, taxRate, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    quoteItems.forEach((it, index) =>
      ins.run(invoiceId, it.label, it.description, it.quantity, it.unitPrice, it.taxRate, index),
    );
    return invoiceId;
  });

  const invoiceId = tx();
  refreshTotals(invoiceId);
  // Projekt-Workflow nachziehen, falls ein Projekt verknüpft ist.
  if (quote.projectId) applyEvent("projects", quote.projectId, "invoice_created");
  return getInvoiceRow(invoiceId);
}

/**
 * Erzeugt eine leere Rechnung direkt für einen Kunden (ohne Angebot).
 * Für Fälle, in denen ohne vorheriges Angebot abgerechnet wird.
 */
export function createInvoiceForCustomer(customerId: number): Invoice {
  const db = getDb();
  const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(customerId) as
    | { id: number }
    | undefined;
  if (!customer) throw new Error(`Kunde ${customerId} nicht gefunden.`);

  const tx = db.transaction(() => {
    const invoiceNumber = nextNumber(db, "invoice", "RE");
    const date = new Date().toISOString().slice(0, 10);
    const dueDate = addDaysISO(14);
    const result = db
      .prepare(
        `INSERT INTO invoices
           (invoiceNumber, customerId, date, dueDate, discount, netTotal, taxTotal, grossTotal, status)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, 'rechnung_erstellt')`,
      )
      .run(invoiceNumber, customerId, date, dueDate);
    return Number(result.lastInsertRowid);
  });

  return getInvoiceRow(tx());
}

export function updateInvoice(id: number, patch: InvoiceUpdateInput): InvoiceWithItems {
  const db = getDb();
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.description !== undefined) {
    sets.push("description = @description");
    params.description = patch.description;
  }
  if (patch.discount !== undefined) {
    sets.push("discount = @discount");
    params.discount = patch.discount;
  }
  if (patch.dueDate !== undefined) {
    sets.push("dueDate = @dueDate");
    params.dueDate = patch.dueDate;
  }
  if (sets.length > 0) {
    db.prepare(
      `UPDATE invoices SET ${sets.join(", ")}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  refreshTotals(id);
  return withItems(id);
}

export function setInvoiceItems(id: number, items: DocumentItemInput[]): InvoiceWithItems {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM invoice_items WHERE documentId = ?").run(id);
    const ins = db.prepare(
      `INSERT INTO invoice_items (documentId, label, description, quantity, unitPrice, taxRate, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    items.forEach((it, index) =>
      ins.run(id, it.label, it.description ?? null, it.quantity, it.unitPrice, it.taxRate, index),
    );
  });
  tx();
  refreshTotals(id);
  return withItems(id);
}

export function removeInvoice(id: number): void {
  getDb().prepare("DELETE FROM invoices WHERE id = ?").run(id);
}

/** Setzt den Rechnungsstatus direkt (Statuswerte des Workflows). */
export function setInvoiceStatus(id: number, status: WorkflowStatus): Invoice {
  getDb()
    .prepare("UPDATE invoices SET status = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(status, id);
  return getInvoiceRow(id);
}

/** Markiert die Rechnung als versendet (Workflow-Ereignis). */
export function markInvoiceSent(id: number): Invoice {
  applyEvent("invoices", id, "invoice_sent");
  return getInvoiceRow(id);
}

/**
 * Erfasst eine Zahlung. Deckt die Summe aller Zahlungen den Brutto-Betrag
 * (minus 1 Cent Toleranz) ab, wird die Rechnung automatisch auf „bezahlt"
 * gesetzt – sonst bleibt der bisherige Status erhalten.
 */
export function addPayment(invoiceId: number, input: PaymentInput): InvoiceWithItems {
  const db = getDb();
  const invoice = getInvoiceRow(invoiceId);
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO payments (invoiceId, amount, date, method, notes)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      invoiceId,
      input.amount,
      input.date ?? new Date().toISOString().slice(0, 10),
      input.method ?? null,
      input.notes ?? null,
    );
  });
  tx();

  const paid = paidAmount(invoiceId);
  if (paid + 0.01 >= invoice.grossTotal && invoice.grossTotal > 0) {
    applyEvent("invoices", invoiceId, "payment_received");
  }
  return withItems(invoiceId);
}

export function removePayment(invoiceId: number, paymentId: number): InvoiceWithItems {
  getDb().prepare("DELETE FROM payments WHERE id = ? AND invoiceId = ?").run(paymentId, invoiceId);
  return withItems(invoiceId);
}

/** Speichert den erzeugten PDF-Pfad am Rechnungskopf. */
export function setInvoicePdfPath(id: number, pdfPath: string): Invoice {
  getDb()
    .prepare("UPDATE invoices SET pdfPath = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(pdfPath, id);
  return getInvoiceRow(id);
}
