import { getDb } from "../db/connection";
import { nextNumber } from "./counterService";
import { getSettings } from "./settingsService";
import { applyEvent } from "./workflowService";
import type { DocumentItem, Quote, WorkflowStatus } from "@shared/domain";
import type {
  DocumentItemInput,
  QuoteListRow,
  QuoteUpdateInput,
  QuoteWithItems,
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
 * keine USt ausgewiesen (taxTotal = 0, brutto = netto).
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

  // Rabatt anteilig auf die Positionen umlegen, dann USt je Satz.
  const factor = lineSum > 0 ? netTotal / lineSum : 1;
  const taxTotal = round(
    items.reduce((s, i) => s + i.quantity * i.unitPrice * factor * (i.taxRate / 100), 0),
  );
  return { netTotal, taxTotal, grossTotal: round(netTotal + taxTotal) };
}

function getQuoteRow(id: number): Quote {
  const row = getDb().prepare("SELECT * FROM quotes WHERE id = ?").get(id) as Quote | undefined;
  if (!row) throw new Error(`Angebot ${id} nicht gefunden.`);
  return row;
}

function listItems(quoteId: number): DocumentItem[] {
  return getDb()
    .prepare("SELECT * FROM quote_items WHERE documentId = ? ORDER BY sortOrder, id")
    .all(quoteId) as DocumentItem[];
}

/** Schreibt die berechneten Summen in den Angebotskopf zurück. */
function refreshTotals(quoteId: number): void {
  const db = getDb();
  const quote = getQuoteRow(quoteId);
  const items = listItems(quoteId);
  const { netTotal, taxTotal, grossTotal } = computeTotals(items, quote.discount);
  db.prepare(
    "UPDATE quotes SET netTotal = ?, taxTotal = ?, grossTotal = ?, updatedAt = datetime('now') WHERE id = ?",
  ).run(netTotal, taxTotal, grossTotal, quoteId);
}

function withItems(id: number): QuoteWithItems {
  return { quote: getQuoteRow(id), items: listItems(id) };
}

export function listQuotes(search?: string, status?: WorkflowStatus): QuoteListRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (search?.trim()) {
    clauses.push(
      `(q.quoteNumber LIKE @like OR c.company LIKE @like OR c.lastName LIKE @like OR c.firstName LIKE @like)`,
    );
    params.like = `%${search.trim()}%`;
  }
  if (status) {
    clauses.push("q.status = @status");
    params.status = status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT q.*, COALESCE(c.company, TRIM(COALESCE(c.firstName,'') || ' ' || COALESCE(c.lastName,''))) AS customerName
       FROM quotes q
       LEFT JOIN customers c ON c.id = q.customerId
       ${where}
       ORDER BY q.createdAt DESC`,
    )
    .all(params) as QuoteListRow[];
}

export function getQuote(id: number): QuoteWithItems {
  return withItems(id);
}

/**
 * Erzeugt ein Angebot aus einem Projekt. Die aktiven Projekt-Positionen werden
 * als Snapshot in quote_items kopiert (eingefroren – spätere Preisänderungen
 * am Projekt/Katalog verändern das Angebot NICHT). Gültigkeit: 14 Tage.
 */
export function createQuoteFromProject(projectId: number): Quote {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as
    | { id: number; customerId: number; name: string; description: string | null }
    | undefined;
  if (!project) throw new Error(`Projekt ${projectId} nicht gefunden.`);

  const projectItems = db
    .prepare("SELECT * FROM project_items WHERE projectId = ? AND active = 1 ORDER BY sortOrder, id")
    .all(projectId) as {
    label: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];

  const tx = db.transaction(() => {
    const quoteNumber = nextNumber(db, "quote", "AN");
    const date = new Date().toISOString().slice(0, 10);
    const validUntil = addDaysISO(14);

    const result = db
      .prepare(
        `INSERT INTO quotes
           (quoteNumber, customerId, projectId, date, validUntil, description, discount,
            netTotal, taxTotal, grossTotal, status)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'angebot_erstellt')`,
      )
      .run(quoteNumber, project.customerId, projectId, date, validUntil, project.description);
    const quoteId = Number(result.lastInsertRowid);

    const ins = db.prepare(
      `INSERT INTO quote_items (documentId, label, description, quantity, unitPrice, taxRate, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    projectItems.forEach((it, index) =>
      ins.run(quoteId, it.label, it.description, it.quantity, it.unitPrice, it.taxRate, index),
    );
    return quoteId;
  });

  const quoteId = tx();
  refreshTotals(quoteId);
  return getQuoteRow(quoteId);
}

export function updateQuote(id: number, patch: QuoteUpdateInput): QuoteWithItems {
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
  if (patch.validUntil !== undefined) {
    sets.push("validUntil = @validUntil");
    params.validUntil = patch.validUntil;
  }
  if (sets.length > 0) {
    db.prepare(
      `UPDATE quotes SET ${sets.join(", ")}, updatedAt = datetime('now') WHERE id = @id`,
    ).run(params);
  }
  refreshTotals(id);
  return withItems(id);
}

export function setQuoteItems(id: number, items: DocumentItemInput[]): QuoteWithItems {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM quote_items WHERE documentId = ?").run(id);
    const ins = db.prepare(
      `INSERT INTO quote_items (documentId, label, description, quantity, unitPrice, taxRate, sortOrder)
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

export function removeQuote(id: number): void {
  getDb().prepare("DELETE FROM quotes WHERE id = ?").run(id);
}

/** Setzt den Angebotsstatus direkt (Statuswerte des Workflows). */
export function setQuoteStatus(id: number, status: WorkflowStatus): Quote {
  getDb()
    .prepare("UPDATE quotes SET status = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(status, id);
  return getQuoteRow(id);
}

/** Referenz für spätere Module: markiert das Angebot als versendet (Workflow-Ereignis). */
export function markQuoteSent(id: number): Quote {
  applyEvent("quotes", id, "quote_sent");
  return getQuoteRow(id);
}
