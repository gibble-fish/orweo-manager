/**
 * Geteilte Domänen-Typen für ORWEO Abrechnung.
 * Werden sowohl im Main-Prozess (Datenlogik) als auch im Renderer (UI) verwendet.
 * Diese Datei enthält KEINE Laufzeit-Abhängigkeiten (nur Typen), damit sie
 * gefahrlos in beiden Prozessen importiert werden kann.
 */

/** Projektbereiche / Projektarten von ORWEO. */
export type ProjectCategory =
  | "architektur"
  | "immobilien"
  | "automotive"
  | "sport"
  | "luftaufnahmen"
  | "panorama360";

export const PROJECT_CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: "architektur", label: "Architektur" },
  { value: "immobilien", label: "Immobilien" },
  { value: "automotive", label: "Automotive" },
  { value: "sport", label: "Sport" },
  { value: "luftaufnahmen", label: "Luftaufnahmen" },
  { value: "panorama360", label: "360° Panorama" },
];

/**
 * Statuswerte des zentralen Workflows.
 * ANFRAGE → ANGEBOT → AUFTRAG → PRODUKTION → LIEFERUNG → RECHNUNG → ZAHLUNG → ABGESCHLOSSEN
 * In den Einstellungen editierbar (daher zusätzlich als DB-Tabelle gepflegt).
 */
export type WorkflowStatus =
  | "neue_anfrage"
  | "anfrage_in_bearbeitung"
  | "angebot_erstellt"
  | "angebot_versendet"
  | "angebot_angenommen"
  | "termin_geplant"
  | "produktion"
  | "produktion_abgeschlossen"
  | "nachbearbeitung"
  | "lieferung_erfolgt"
  | "rechnung_erstellt"
  | "rechnung_versendet"
  | "bezahlt"
  | "abgeschlossen"
  | "storniert";

/** Abrechnungseinheit einer Leistung. */
export type ServiceUnit =
  | "paket"
  | "stueck"
  | "stunde"
  | "halbe_stunde"
  | "entfernungszone"
  | "projekt"
  | "video";

/** Anzeige-Labels der Einheiten (fixe Auswahl im Leistungskatalog). */
export const SERVICE_UNITS: { value: ServiceUnit; label: string }[] = [
  { value: "paket", label: "Paket" },
  { value: "stueck", label: "Stück" },
  { value: "stunde", label: "Stunde" },
  { value: "halbe_stunde", label: "angefangene 30 Min" },
  { value: "entfernungszone", label: "Entfernungszone" },
  { value: "projekt", label: "Projekt" },
  { value: "video", label: "Video" },
];

export function serviceUnitLabel(unit: ServiceUnit): string {
  return SERVICE_UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export interface Customer {
  id: number;
  customerNumber: string;
  company: string | null;
  firstName: string | null;
  lastName: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  contactPerson: string | null;
  notes: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inquiry {
  id: number;
  customerId: number | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  category: ProjectCategory | null;
  location: string | null;
  timeframe: string | null;
  message: string | null;
  status: WorkflowStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  projectNumber: string;
  customerId: number;
  category: ProjectCategory;
  name: string;
  description: string | null;
  location: string | null;
  productionDate: string | null;
  contactPerson: string | null;
  status: WorkflowStatus;
  notes: string | null;
  folderPath: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Position eines Projekts/Auftrags (editierbare Leistungsliste). */
export interface ProjectItem {
  id: number;
  projectId: number;
  serviceId: number | null;
  label: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  active: boolean;
  sortOrder: number;
}

export interface Service {
  id: number;
  serviceNumber: string;
  name: string;
  category: string | null;
  description: string | null;
  unit: ServiceUnit;
  price: number;
  taxRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: number;
  name: string;
  category: ProjectCategory;
  description: string | null;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackageItem {
  id: number;
  packageId: number;
  serviceId: number | null;
  label: string;
  quantity: number;
  active: boolean;
}

/** Positions-Snapshot in Angeboten/Rechnungen (Preise eingefroren). */
export interface DocumentItem {
  id: number;
  documentId: number;
  label: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  sortOrder: number;
}

export interface Quote {
  id: number;
  quoteNumber: string;
  customerId: number;
  projectId: number | null;
  date: string;
  validUntil: string | null;
  description: string | null;
  discount: number;
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  status: WorkflowStatus;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  projectId: number | null;
  quoteId: number | null;
  date: string;
  dueDate: string | null;
  description: string | null;
  discount: number;
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  status: WorkflowStatus;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: number;
  projectId: number | null;
  customerId: number | null;
  title: string;
  date: string;
  time: string | null;
  durationMinutes: number | null;
  location: string | null;
  contactPerson: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  invoiceId: number;
  amount: number;
  date: string;
  method: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StatusDefinition {
  id: number;
  key: string;
  label: string;
  color: string | null;
  sortOrder: number;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  vatId: string;
  dataRootPath: string;
  theme: "dark" | "light";
  defaultTaxRate: number;
  /** Kleinunternehmerregelung nach § 19 UStG: wenn true, wird keine USt ausgewiesen. */
  smallBusiness: boolean;

  /** Automatischer Abruf von Anfrage-Mails aktivieren. */
  mailEnabled: boolean;
  /** IMAP-Server (z. B. imap.ionos.de / imap.gmail.com). */
  mailImapHost: string;
  /** IMAP-Port (TLS üblicherweise 993). */
  mailImapPort: number;
  /** IMAP benutzt TLS (empfohlen: true). */
  mailImapSecure: boolean;
  /** Postfach-Benutzer (meist die E-Mail-Adresse). */
  mailUser: string;
  /** Postfach-Passwort bzw. App-Passwort. Liegt lokal in der SQLite-DB. */
  mailPassword: string;
  /** Zu überwachender Ordner (Standard: INBOX). */
  mailFolder: string;
  /** Abrufintervall in Minuten (0 = nur manueller Abruf). */
  mailPollMinutes: number;
}
