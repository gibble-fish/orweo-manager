/**
 * Typisierter IPC-Vertrag zwischen Renderer (UI) und Main (Datenlogik).
 *
 * - IPC_CHANNELS: alle erlaubten Kanalnamen (single source of truth).
 * - OrweoApi: die Form der über contextBridge freigegebenen API (window.orweo).
 *
 * Der Renderer ruft ausschließlich diese Methoden auf und nie direkt die DB.
 */
import type {
  AppSettings,
  Appointment,
  Customer,
  DocumentItem,
  Inquiry,
  Invoice,
  Package,
  PackageItem,
  Payment,
  Project,
  ProjectItem,
  Quote,
  Service,
  StatusDefinition,
  WorkflowStatus,
} from "./domain";

export const IPC_CHANNELS = {
  app: {
    getVersion: "app:getVersion",
  },
  dialog: {
    selectFolder: "dialog:selectFolder",
  },
  settings: {
    get: "settings:get",
    update: "settings:update",
  },
  services: {
    list: "services:list",
    create: "services:create",
    update: "services:update",
    remove: "services:remove",
  },
  packages: {
    list: "packages:list",
    listItems: "packages:listItems",
    create: "packages:create",
    update: "packages:update",
    remove: "packages:remove",
    setItems: "packages:setItems",
  },
  customers: {
    list: "customers:list",
    get: "customers:get",
    create: "customers:create",
    update: "customers:update",
    remove: "customers:remove",
  },
  inquiries: {
    list: "inquiries:list",
    create: "inquiries:create",
    update: "inquiries:update",
    remove: "inquiries:remove",
    setStatus: "inquiries:setStatus",
    convertToCustomer: "inquiries:convertToCustomer",
    createProject: "inquiries:createProject",
  },
  projects: {
    list: "projects:list",
    get: "projects:get",
    create: "projects:create",
    update: "projects:update",
    remove: "projects:remove",
    listItems: "projects:listItems",
    setItems: "projects:setItems",
    addPackage: "projects:addPackage",
  },
  quotes: {
    list: "quotes:list",
    get: "quotes:get",
    createFromProject: "quotes:createFromProject",
    update: "quotes:update",
    remove: "quotes:remove",
    setItems: "quotes:setItems",
    setStatus: "quotes:setStatus",
  },
  invoices: {
    list: "invoices:list",
    get: "invoices:get",
    createFromQuote: "invoices:createFromQuote",
    createForCustomer: "invoices:createForCustomer",
    update: "invoices:update",
    remove: "invoices:remove",
    setItems: "invoices:setItems",
    setStatus: "invoices:setStatus",
    addPayment: "invoices:addPayment",
    removePayment: "invoices:removePayment",
  },
  appointments: {
    list: "appointments:list",
    create: "appointments:create",
    update: "appointments:update",
    remove: "appointments:remove",
  },
  pdf: {
    save: "pdf:save",
    saveAuto: "pdf:saveAuto",
  },
  status: {
    list: "status:list",
    update: "status:update",
    reorder: "status:reorder",
  },
  dashboard: {
    stats: "dashboard:stats",
  },
  mail: {
    checkNow: "mail:checkNow",
    testConnection: "mail:testConnection",
  },
  backup: {
    export: "backup:export",
    restore: "backup:restore",
    relaunch: "backup:relaunch",
  },
  update: {
    getState: "update:getState",
    check: "update:check",
    install: "update:install",
  },
} as const;

/** Ergebnis einer Datensicherung. */
export interface BackupResult {
  ok: boolean;
  /** true, wenn der Nutzer den Dialog abgebrochen hat. */
  canceled: boolean;
  /** Pfad der geschriebenen Sicherungsdatei (oder null). */
  path: string | null;
  error?: string;
}

/** Ergebnis einer Wiederherstellung. */
export interface RestoreResult {
  ok: boolean;
  canceled: boolean;
  /** true, wenn die App neu gestartet werden muss, damit die Daten geladen werden. */
  restartRequired: boolean;
  error?: string;
}

/** Phasen des Update-Vorgangs. */
export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error"
  | "disabled";

/** Aktueller Zustand der Update-Prüfung für die UI. */
export interface UpdateState {
  phase: UpdatePhase;
  /** Aktuell laufende App-Version. */
  currentVersion: string;
  /** Verfügbare neue Version (falls vorhanden). */
  newVersion?: string;
  /** Download-Fortschritt in Prozent (0–100) während „downloading". */
  percent?: number;
  /** Fehlertext bei phase === "error". */
  error?: string;
}

/** Ergebnis eines E-Mail-Abrufs (manuell oder per Intervall). */
export interface MailCheckResult {
  /** true, wenn der Abruf technisch erfolgreich war. */
  ok: boolean;
  /** Anzahl neu angelegter Anfragen aus erkannten Mails. */
  created: number;
  /** Anzahl geprüfter, aber übersprungener Mails (bereits bekannt / kein Anfrageformat). */
  skipped: number;
  /** Fehlertext, falls ok=false. */
  error?: string;
}

/** Aggregierte Kennzahlen fürs Dashboard. */
export interface DashboardStats {
  newInquiries: number;
  inquiriesInProgress: number;
  openQuotes: number;
  acceptedQuotes: number;
  upcomingAppointments: number;
  runningProductions: number;
  openInvoices: number;
  overdueInvoices: number;
  revenueThisYear: number;
}

/** Eingabe zum Anlegen/Ändern einer Leistung (ohne generierte Felder). */
export type ServiceInput = Omit<
  Service,
  "id" | "serviceNumber" | "createdAt" | "updatedAt"
> & { serviceNumber?: string };

/** Eingabe zum Anlegen/Ändern eines Pakets (ohne generierte Felder). */
export type PackageInput = Omit<Package, "id" | "createdAt" | "updatedAt">;

/**
 * Eingabe einer Paket-Position. serviceId verknüpft optional mit einer
 * Katalog-Leistung; label ist die (freie oder aus der Leistung übernommene)
 * Bezeichnung. Positionen sind einzeln an-/abwählbar (active).
 */
export interface PackageItemInput {
  serviceId: number | null;
  label: string;
  quantity: number;
  active: boolean;
}

/** Eingabe zum Anlegen/Ändern eines Kunden (Kundennummer wird automatisch vergeben). */
export type CustomerInput = Omit<
  Customer,
  "id" | "customerNumber" | "createdAt" | "updatedAt"
>;

/** Eingabe zum Anlegen/Ändern einer Anfrage (ohne generierte Felder). */
export type InquiryInput = Omit<Inquiry, "id" | "createdAt" | "updatedAt">;

/** Eingabe zum Anlegen/Ändern eines Projekts (Projektnummer wird automatisch vergeben). */
export type ProjectInput = Omit<
  Project,
  "id" | "projectNumber" | "createdAt" | "updatedAt"
>;

/** Eingabe einer Projekt-Position. */
export interface ProjectItemInput {
  serviceId: number | null;
  label: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  active: boolean;
}

/** Projektzeile für Listenansichten inkl. abgeleitetem Kundennamen. */
export type ProjectListRow = Project & { customerName: string | null };

/** Position eines Dokuments (Angebot/Rechnung) als Eingabe. */
export interface DocumentItemInput {
  label: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

/** Editierbare Kopf-Felder eines Angebots. */
export interface QuoteUpdateInput {
  description?: string | null;
  discount?: number;
  validUntil?: string | null;
}

/** Angebotszeile für Listen inkl. Kundenname. */
export type QuoteListRow = Quote & { customerName: string | null };

/** Angebot mit Positionen für die Detailansicht. */
export interface QuoteWithItems {
  quote: Quote;
  items: DocumentItem[];
}

/** Editierbare Kopf-Felder einer Rechnung. */
export interface InvoiceUpdateInput {
  description?: string | null;
  discount?: number;
  dueDate?: string | null;
}

/** Rechnungszeile für Listen inkl. Kundenname und bereits gezahltem Betrag. */
export type InvoiceListRow = Invoice & {
  customerName: string | null;
  paidTotal: number;
};

/** Rechnung mit Positionen und Zahlungen für die Detailansicht. */
export interface InvoiceWithItems {
  invoice: Invoice;
  items: DocumentItem[];
  payments: Payment[];
  paidTotal: number;
}

/** Eingabe zum Erfassen einer Zahlung. */
export interface PaymentInput {
  amount: number;
  date?: string | null;
  method?: string | null;
  notes?: string | null;
}

/** Eingabe zum Anlegen/Ändern eines Termins (ohne generierte Felder). */
export type AppointmentInput = Omit<Appointment, "id" | "createdAt" | "updatedAt">;

/** Termin für Listenansichten inkl. abgeleitetem Projekt-/Kundennamen. */
export type AppointmentListRow = Appointment & {
  projectName: string | null;
  customerName: string | null;
};

/** Ergebnis einer PDF-Erzeugung. */
export interface PdfResult {
  /** Absoluter Pfad der gespeicherten PDF-Datei (oder null bei Abbruch). */
  path: string | null;
}

/**
 * Eingabe zum Speichern eines im Renderer erzeugten PDFs. Die Bytes werden als
 * Uint8Array über IPC an den Main-Prozess gereicht, der einen Speichern-Dialog
 * zeigt und die Datei lokal schreibt.
 */
export interface PdfSaveInput {
  /** Vorgeschlagener Dateiname inkl. Endung, z. B. "Rechnung_RE-2026-0001.pdf". */
  suggestedName: string;
  /** PDF-Inhalt als Byte-Array. */
  bytes: Uint8Array;
}

/**
 * Eingabe zum AUTOMATISCHEN Speichern eines PDFs in den konfigurierten
 * Datenablage-Ordner – ohne Dialog. Die Datei landet im Unterordner `subDir`
 * (z. B. "Angebote" oder "Rechnungen") unter dem Namen `fileName`. Bestehende
 * Dateien werden überschrieben (immer aktueller Stand).
 */
export interface PdfAutoSaveInput {
  /** Unterordner im Datenablageordner, z. B. "Angebote" oder "Rechnungen". */
  subDir: string;
  /** Dateiname inkl. Endung, z. B. "KD-2026-0001_AN-2026-0001.pdf". */
  fileName: string;
  /** PDF-Inhalt als Byte-Array. */
  bytes: Uint8Array;
}

/**
 * Ergebnis der Kundenübernahme aus einer Anfrage.
 * linked = true: ein bestehender Kunde (gleiche E-Mail) wurde verknüpft;
 * linked = false: ein neuer Kunde wurde angelegt.
 */
export interface ConvertResult {
  customer: Customer;
  linked: boolean;
}

export interface OrweoApi {
  app: {
    getVersion: () => Promise<string>;
  };
  dialog: {
    /** Öffnet einen Ordner-Auswahldialog. Gibt den Pfad zurück oder null bei Abbruch. */
    selectFolder: (defaultPath?: string) => Promise<string | null>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  };
  mail: {
    /** Ruft das Postfach sofort ab und legt neue Anfragen an. */
    checkNow: () => Promise<MailCheckResult>;
    /** Prüft die IMAP-Verbindung mit den aktuellen Einstellungen. */
    testConnection: () => Promise<MailCheckResult>;
  };
  backup: {
    /** Sichert die Datenbank in eine vom Nutzer gewählte Datei. */
    export: () => Promise<BackupResult>;
    /** Stellt eine Sicherung wieder her (erfordert anschließend Neustart). */
    restore: () => Promise<RestoreResult>;
    /** Startet die App neu (nach erfolgreicher Wiederherstellung). */
    relaunch: () => Promise<void>;
  };
  update: {
    /** Aktuellen Update-Zustand abfragen. */
    getState: () => Promise<UpdateState>;
    /** Manuell nach Updates suchen. */
    check: () => Promise<UpdateState>;
    /** Heruntergeladenes Update installieren (App startet neu). */
    install: () => Promise<void>;
    /** Abonniert Zustandsänderungen (Fortschritt etc.). Gibt eine Abmeldefunktion zurück. */
    onState: (callback: (state: UpdateState) => void) => () => void;
  };
  services: {
    list: () => Promise<Service[]>;
    create: (input: ServiceInput) => Promise<Service>;
    update: (id: number, patch: Partial<ServiceInput>) => Promise<Service>;
    remove: (id: number) => Promise<void>;
  };
  packages: {
    list: () => Promise<Package[]>;
    listItems: (packageId: number) => Promise<PackageItem[]>;
    create: (input: PackageInput) => Promise<Package>;
    update: (id: number, patch: Partial<PackageInput>) => Promise<Package>;
    remove: (id: number) => Promise<void>;
    setItems: (packageId: number, items: PackageItemInput[]) => Promise<PackageItem[]>;
  };
  customers: {
    list: (search?: string) => Promise<Customer[]>;
    get: (id: number) => Promise<Customer>;
    create: (input: CustomerInput) => Promise<Customer>;
    update: (id: number, patch: Partial<CustomerInput>) => Promise<Customer>;
    remove: (id: number) => Promise<void>;
  };
  inquiries: {
    list: (status?: WorkflowStatus) => Promise<Inquiry[]>;
    create: (input: InquiryInput) => Promise<Inquiry>;
    update: (id: number, patch: Partial<InquiryInput>) => Promise<Inquiry>;
    remove: (id: number) => Promise<void>;
    setStatus: (id: number, status: WorkflowStatus) => Promise<Inquiry>;
    convertToCustomer: (id: number) => Promise<ConvertResult>;
    /** Legt aus der Anfrage direkt einen Auftrag (Projekt) an und gibt ihn zurück. */
    createProject: (id: number) => Promise<Project>;
  };
  projects: {
    list: (search?: string, status?: WorkflowStatus) => Promise<ProjectListRow[]>;
    get: (id: number) => Promise<Project>;
    create: (input: ProjectInput) => Promise<Project>;
    update: (id: number, patch: Partial<ProjectInput>) => Promise<Project>;
    remove: (id: number) => Promise<void>;
    listItems: (projectId: number) => Promise<ProjectItem[]>;
    setItems: (projectId: number, items: ProjectItemInput[]) => Promise<ProjectItem[]>;
    addPackage: (projectId: number, packageId: number) => Promise<ProjectItem[]>;
  };
  quotes: {
    list: (search?: string, status?: WorkflowStatus) => Promise<QuoteListRow[]>;
    get: (id: number) => Promise<QuoteWithItems>;
    createFromProject: (projectId: number) => Promise<Quote>;
    update: (id: number, patch: QuoteUpdateInput) => Promise<QuoteWithItems>;
    remove: (id: number) => Promise<void>;
    setItems: (id: number, items: DocumentItemInput[]) => Promise<QuoteWithItems>;
    setStatus: (id: number, status: WorkflowStatus) => Promise<Quote>;
  };
  invoices: {
    list: (search?: string, status?: WorkflowStatus) => Promise<InvoiceListRow[]>;
    get: (id: number) => Promise<InvoiceWithItems>;
    createFromQuote: (quoteId: number) => Promise<Invoice>;
    createForCustomer: (customerId: number) => Promise<Invoice>;
    update: (id: number, patch: InvoiceUpdateInput) => Promise<InvoiceWithItems>;
    remove: (id: number) => Promise<void>;
    setItems: (id: number, items: DocumentItemInput[]) => Promise<InvoiceWithItems>;
    setStatus: (id: number, status: WorkflowStatus) => Promise<Invoice>;
    addPayment: (id: number, payment: PaymentInput) => Promise<InvoiceWithItems>;
    removePayment: (id: number, paymentId: number) => Promise<InvoiceWithItems>;
  };
  appointments: {
    list: (from?: string, to?: string) => Promise<AppointmentListRow[]>;
    create: (input: AppointmentInput) => Promise<Appointment>;
    update: (id: number, patch: Partial<AppointmentInput>) => Promise<Appointment>;
    remove: (id: number) => Promise<void>;
  };
  pdf: {
    /** Speichert ein im Renderer erzeugtes PDF über einen Datei-Dialog. */
    save: (input: PdfSaveInput) => Promise<PdfResult>;
    /** Speichert ein PDF automatisch in den konfigurierten Ablageordner (ohne Dialog). */
    saveAuto: (input: PdfAutoSaveInput) => Promise<PdfResult>;
  };
  status: {
    list: () => Promise<StatusDefinition[]>;
    update: (
      key: string,
      patch: { label?: string; color?: string | null },
    ) => Promise<StatusDefinition[]>;
    reorder: (orderedKeys: string[]) => Promise<StatusDefinition[]>;
  };
  dashboard: {
    stats: () => Promise<DashboardStats>;
  };
}

declare global {
  interface Window {
    orweo: OrweoApi;
  }
}
