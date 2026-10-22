import type Database from "better-sqlite3";

/**
 * Versionierte Migrationen. user_version steuert, welche Schritte noch fehlen.
 * Neue Schemaänderungen werden als weitere Einträge im MIGRATIONS-Array ergänzt –
 * bestehende Einträge NIE verändern, damit produktive DBs sauber weiterlaufen.
 */
type Migration = { version: number; up: (db: Database.Database) => void };

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customerNumber TEXT NOT NULL UNIQUE,
          company TEXT,
          firstName TEXT,
          lastName TEXT,
          street TEXT,
          zip TEXT,
          city TEXT,
          email TEXT,
          phone TEXT,
          website TEXT,
          contactPerson TEXT,
          notes TEXT,
          billingAddress TEXT,
          shippingAddress TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE inquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customerId INTEGER REFERENCES customers(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          company TEXT,
          email TEXT,
          phone TEXT,
          category TEXT,
          location TEXT,
          timeframe TEXT,
          message TEXT,
          status TEXT NOT NULL DEFAULT 'neue_anfrage',
          source TEXT NOT NULL DEFAULT 'manuell',
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectNumber TEXT NOT NULL UNIQUE,
          customerId INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          location TEXT,
          productionDate TEXT,
          contactPerson TEXT,
          status TEXT NOT NULL DEFAULT 'angebot_erstellt',
          notes TEXT,
          folderPath TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          serviceNumber TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          category TEXT,
          description TEXT,
          unit TEXT NOT NULL DEFAULT 'stueck',
          price REAL NOT NULL DEFAULT 0,
          taxRate REAL NOT NULL DEFAULT 19,
          active INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE package_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          packageId INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
          serviceId INTEGER REFERENCES services(id) ON DELETE SET NULL,
          label TEXT NOT NULL,
          quantity REAL NOT NULL DEFAULT 1,
          active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quoteNumber TEXT NOT NULL UNIQUE,
          customerId INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          projectId INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          date TEXT NOT NULL DEFAULT (date('now')),
          validUntil TEXT,
          description TEXT,
          discount REAL NOT NULL DEFAULT 0,
          netTotal REAL NOT NULL DEFAULT 0,
          taxTotal REAL NOT NULL DEFAULT 0,
          grossTotal REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'angebot_erstellt',
          pdfPath TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE quote_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          documentId INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          description TEXT,
          quantity REAL NOT NULL DEFAULT 1,
          unitPrice REAL NOT NULL DEFAULT 0,
          taxRate REAL NOT NULL DEFAULT 19,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoiceNumber TEXT NOT NULL UNIQUE,
          customerId INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          projectId INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          quoteId INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
          date TEXT NOT NULL DEFAULT (date('now')),
          dueDate TEXT,
          description TEXT,
          discount REAL NOT NULL DEFAULT 0,
          netTotal REAL NOT NULL DEFAULT 0,
          taxTotal REAL NOT NULL DEFAULT 0,
          grossTotal REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'rechnung_erstellt',
          pdfPath TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          documentId INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          description TEXT,
          quantity REAL NOT NULL DEFAULT 1,
          unitPrice REAL NOT NULL DEFAULT 0,
          taxRate REAL NOT NULL DEFAULT 19,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          customerId INTEGER REFERENCES customers(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT,
          durationMinutes INTEGER,
          location TEXT,
          contactPerson TEXT,
          notes TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoiceId INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          amount REAL NOT NULL DEFAULT 0,
          date TEXT NOT NULL DEFAULT (date('now')),
          method TEXT,
          notes TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE status_definitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          color TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE counters (
          name TEXT PRIMARY KEY,
          year INTEGER NOT NULL,
          value INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX idx_projects_customer ON projects(customerId);
        CREATE INDEX idx_inquiries_status ON inquiries(status);
        CREATE INDEX idx_quotes_customer ON quotes(customerId);
        CREATE INDEX idx_invoices_customer ON invoices(customerId);
        CREATE INDEX idx_package_items_package ON package_items(packageId);
      `);
    },
  },
  {
    // Positionsliste eines Projekts/Auftrags. Wird später beim Angebot/der
    // Rechnung als Snapshot in quote_items/invoice_items kopiert.
    version: 2,
    up: (db) => {
      db.exec(`
        CREATE TABLE project_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          serviceId INTEGER REFERENCES services(id) ON DELETE SET NULL,
          label TEXT NOT NULL,
          description TEXT,
          quantity REAL NOT NULL DEFAULT 1,
          unitPrice REAL NOT NULL DEFAULT 0,
          taxRate REAL NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX idx_project_items_project ON project_items(projectId);
      `);
    },
  },
];

/** Höchste im Code bekannte Schemaversion. */
export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);

/**
 * Signalisiert, dass die vorhandene Datenbank von einer NEUEREN App-Version
 * stammt, als der aktuell laufende Code kennt (Downgrade-Szenario). Das darf
 * NIE stillschweigend passieren, weil eine ältere App ein neueres Schema nicht
 * korrekt interpretieren kann und Daten beschädigen würde.
 */
export class DatabaseDowngradeError extends Error {
  constructor(
    public readonly dbVersion: number,
    public readonly codeVersion: number,
  ) {
    super(
      `Die Datenbank wurde mit einer neueren Programmversion erstellt ` +
        `(Datenbank-Schema ${dbVersion}, dieses Programm kennt ${codeVersion}). ` +
        `Bitte installiere die neueste Version von ORWEO Abrechnung, um deine Daten zu öffnen.`,
    );
    this.name = "DatabaseDowngradeError";
  }
}

/**
 * Führt ausstehende Migrationen aus. Vor dem ersten Schritt wird – sofern ein
 * backupFn übergeben ist – eine Sicherungskopie erstellt, damit ein fehlerhaftes
 * Update die produktive DB nicht unrettbar verändert.
 *
 * @param db       Offene Datenbank.
 * @param backupFn Optionaler Rückruf, der VOR den Migrationen ein Backup anlegt.
 *                 Bekommt die aktuelle (alte) Schemaversion übergeben.
 */
export function runMigrations(
  db: Database.Database,
  backupFn?: (fromVersion: number) => void,
): void {
  const current = db.pragma("user_version", { simple: true }) as number;

  // Downgrade-Schutz: DB-Schema ist neuer als der Code → abbrechen.
  if (current > LATEST_SCHEMA_VERSION) {
    throw new DatabaseDowngradeError(current, LATEST_SCHEMA_VERSION);
  }

  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );
  if (pending.length === 0) return;

  // Vor jeder Schemaänderung eine Sicherung ablegen (nur wenn schon Daten da sind,
  // also current > 0 – eine frisch erzeugte DB braucht kein Backup).
  if (backupFn && current > 0) {
    try {
      backupFn(current);
    } catch (err) {
      console.error("[db] Pre-Migration-Backup fehlgeschlagen:", err);
      // Backup-Fehler darf die Migration nicht verhindern, wird aber geloggt.
    }
  }

  for (const migration of pending) {
    const tx = db.transaction(() => {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    });
    tx();
  }
}
