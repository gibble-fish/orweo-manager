import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { DocumentPdf, type DocumentPdfProps } from "./DocumentPdf";
import type { Customer } from "@shared/domain";

/** Lädt den Kunden robust (null bei Fehler, damit der Export nie hart scheitert). */
async function loadCustomer(customerId: number): Promise<Customer | null> {
  try {
    return await window.orweo.customers.get(customerId);
  } catch {
    return null;
  }
}

/**
 * Rendert ein Dokument zu PDF-Bytes und speichert es AUTOMATISCH im
 * konfigurierten Datenablage-Ordner unter dem Unterordner `subDir`
 * ("Angebote" / "Rechnungen"). Kein Dialog mehr.
 */
async function renderAndSave(
  props: DocumentPdfProps,
  subDir: string,
  fileName: string,
): Promise<string | null> {
  // DocumentPdf rendert stets ein <Document> an der Wurzel; der Cast überbrückt
  // nur die Wrapper-Typisierung für die pdf()-Signatur (ReactElement<DocumentProps>).
  const element = createElement(DocumentPdf, props) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(element).toBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const res = await window.orweo.pdf.saveAuto({ subDir, fileName, bytes });
  return res.path;
}

/** Entfernt Zeichen, die in Windows-Dateinamen nicht erlaubt sind. */
function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim();
}

/**
 * Baut den Dateinamen aus Kundennummer und Belegnummer:
 * z. B. "KD-2026-0001_AN-2026-0001.pdf". Fehlt die Kundennummer, wird nur die
 * Belegnummer verwendet.
 */
function buildFileName(customer: Customer | null, documentNumber: string): string {
  const customerPart = customer?.customerNumber ? `${safeName(customer.customerNumber)}_` : "";
  return `${customerPart}${safeName(documentNumber)}.pdf`;
}

/** Erzeugt und speichert das PDF eines Angebots. Gibt den Dateipfad zurück (oder null). */
export async function exportQuotePdf(quoteId: number): Promise<string | null> {
  const [{ quote, items }, settings] = await Promise.all([
    window.orweo.quotes.get(quoteId),
    window.orweo.settings.get(),
  ]);
  const customer = await loadCustomer(quote.customerId);

  return renderAndSave(
    {
      kind: "quote",
      number: quote.quoteNumber,
      date: quote.date,
      secondaryDateLabel: "Gültig bis",
      secondaryDate: quote.validUntil,
      description: quote.description,
      discount: quote.discount,
      netTotal: quote.netTotal,
      taxTotal: quote.taxTotal,
      grossTotal: quote.grossTotal,
      items,
      customer,
      settings,
    },
    "Angebote",
    buildFileName(customer, quote.quoteNumber),
  );
}

/** Erzeugt und speichert das PDF einer Rechnung. Gibt den Dateipfad zurück (oder null). */
export async function exportInvoicePdf(invoiceId: number): Promise<string | null> {
  const [{ invoice, items }, settings] = await Promise.all([
    window.orweo.invoices.get(invoiceId),
    window.orweo.settings.get(),
  ]);
  const customer = await loadCustomer(invoice.customerId);

  return renderAndSave(
    {
      kind: "invoice",
      number: invoice.invoiceNumber,
      date: invoice.date,
      secondaryDateLabel: "Fällig bis",
      secondaryDate: invoice.dueDate,
      description: invoice.description,
      discount: invoice.discount,
      netTotal: invoice.netTotal,
      taxTotal: invoice.taxTotal,
      grossTotal: invoice.grossTotal,
      items,
      customer,
      settings,
    },
    "Rechnungen",
    buildFileName(customer, invoice.invoiceNumber),
  );
}
