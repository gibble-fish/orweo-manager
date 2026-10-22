import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { AppSettings, Customer, DocumentItem } from "@shared/domain";

/** ORWEO-Farben (dunkles Champagner-Akzent auf hellem PDF-Grund). */
const CHAMPAGNE = "#9A7B3F";
const INK = "#1A1A1A";
const MUTED = "#666666";
const LINE = "#DDDDDD";

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE");
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  brand: { fontSize: 22, letterSpacing: 2, color: INK, fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  companyBlock: { fontSize: 8, color: MUTED, textAlign: "right", maxWidth: 220 },
  addressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  addressLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  docTitle: { fontSize: 16, color: CHAMPAGNE, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  metaRow: { flexDirection: "row", gap: 24, marginTop: 6 },
  metaLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 10, color: INK },
  description: { marginTop: 16, marginBottom: 12, fontSize: 10, color: INK },
  table: { marginTop: 8 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    paddingVertical: 5,
  },
  colPos: { width: "6%", fontSize: 9, color: MUTED },
  colLabel: { width: "50%", fontSize: 9 },
  colQty: { width: "12%", fontSize: 9, textAlign: "right" },
  colPrice: { width: "16%", fontSize: 9, textAlign: "right" },
  colSum: { width: "16%", fontSize: 9, textAlign: "right" },
  headText: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  totals: { marginTop: 14, marginLeft: "auto", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { fontSize: 9, color: MUTED },
  totalValue: { fontSize: 9, color: INK },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: INK,
    marginTop: 4,
    paddingTop: 4,
  },
  grandLabel: { fontSize: 11, color: INK, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 11, color: CHAMPAGNE, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 24, fontSize: 8, color: MUTED },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: MUTED,
  },
});

export interface DocumentPdfProps {
  kind: "quote" | "invoice";
  number: string;
  date: string;
  /** Angebot: Gültigkeit; Rechnung: Fälligkeit. */
  secondaryDateLabel: string;
  secondaryDate: string | null;
  description: string | null;
  discount: number;
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  items: DocumentItem[];
  customer: Customer | null;
  settings: AppSettings;
}

function customerAddress(c: Customer | null): string[] {
  if (!c) return ["—"];
  const name = c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  const lines = [name];
  if (c.street) lines.push(c.street);
  const cityLine = [c.zip, c.city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines.length ? lines : ["—"];
}

/** Gemeinsame PDF-Vorlage für Angebot und Rechnung im ORWEO-Design. */
export function DocumentPdf(props: DocumentPdfProps) {
  const { settings, customer } = props;
  const smallBusiness = settings.smallBusiness;
  const title = props.kind === "quote" ? "Angebot" : "Rechnung";
  const lineSum = props.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <Document title={`${title} ${props.number}`} author={settings.companyName || "ORWEO"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{settings.companyName || "ORWEO"}</Text>
            <Text style={styles.brandSub}>{settings.companyWebsite || "orweo.de"}</Text>
          </View>
          <View style={styles.companyBlock}>
            {settings.companyAddress ? <Text>{settings.companyAddress}</Text> : null}
            {settings.companyEmail ? <Text>{settings.companyEmail}</Text> : null}
            {settings.companyPhone ? <Text>{settings.companyPhone}</Text> : null}
            {settings.vatId ? <Text>USt-IdNr.: {settings.vatId}</Text> : null}
          </View>
        </View>

        <View style={styles.addressRow}>
          <View>
            <Text style={styles.addressLabel}>Rechnungsempfänger</Text>
            {customerAddress(customer).map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.metaValue}>{props.number}</Text>
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.metaLabel}>Datum</Text>
                <Text style={styles.metaValue}>{formatDate(props.date)}</Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>{props.secondaryDateLabel}</Text>
                <Text style={styles.metaValue}>{formatDate(props.secondaryDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        {props.description ? <Text style={styles.description}>{props.description}</Text> : null}

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.colPos, styles.headText]}>Pos</Text>
            <Text style={[styles.colLabel, styles.headText]}>Bezeichnung</Text>
            <Text style={[styles.colQty, styles.headText]}>Menge</Text>
            <Text style={[styles.colPrice, styles.headText]}>Einzel</Text>
            <Text style={[styles.colSum, styles.headText]}>Summe</Text>
          </View>
          {props.items.map((it, index) => (
            <View key={it.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colPos}>{index + 1}</Text>
              <View style={styles.colLabel}>
                <Text>{it.label}</Text>
                {it.description ? (
                  <Text style={{ fontSize: 8, color: MUTED }}>{it.description}</Text>
                ) : null}
              </View>
              <Text style={styles.colQty}>{it.quantity}</Text>
              <Text style={styles.colPrice}>{euro(it.unitPrice)}</Text>
              <Text style={styles.colSum}>{euro(it.quantity * it.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Zwischensumme</Text>
            <Text style={styles.totalValue}>{euro(lineSum)}</Text>
          </View>
          {props.discount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Rabatt</Text>
              <Text style={styles.totalValue}>− {euro(props.discount)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Netto</Text>
            <Text style={styles.totalValue}>{euro(props.netTotal)}</Text>
          </View>
          {!smallBusiness ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>zzgl. USt</Text>
              <Text style={styles.totalValue}>{euro(props.taxTotal)}</Text>
            </View>
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>{smallBusiness ? "Gesamt" : "Brutto"}</Text>
            <Text style={styles.grandValue}>{euro(props.grossTotal)}</Text>
          </View>
        </View>

        {smallBusiness ? (
          <Text style={styles.note}>
            Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
          </Text>
        ) : null}

        {props.kind === "invoice" ? (
          <Text style={styles.note}>
            Zahlbar ohne Abzug bis {formatDate(props.secondaryDate)}. Bitte geben Sie bei der
            Überweisung die Rechnungsnummer {props.number} an.
          </Text>
        ) : (
          <Text style={styles.note}>
            Dieses Angebot ist gültig bis {formatDate(props.secondaryDate)}.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>{settings.companyName || "ORWEO"}</Text>
          <Text>{settings.companyEmail || ""}</Text>
          <Text>{settings.companyWebsite || "orweo.de"}</Text>
        </View>
      </Page>
    </Document>
  );
}
