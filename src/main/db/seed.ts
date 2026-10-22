import type Database from "better-sqlite3";
import type { ProjectCategory, ServiceUnit, WorkflowStatus } from "@shared/domain";

/**
 * Einmaliger Seed der Startdaten (Pakete, Leistungen, Zusatzleistungen,
 * Anfahrtszonen, Status). ALLE Werte sind danach in der DB frei editierbar –
 * nichts ist im Code fest verdrahtet. Preise stammen 1:1 aus dem Master-Prompt.
 *
 * seedIfEmpty läuft nur, wenn die zentralen Tabellen leer sind, damit
 * Nutzeränderungen bei App-Neustarts nicht überschrieben werden.
 */

const STATUSES: { key: WorkflowStatus; label: string; color: string }[] = [
  { key: "neue_anfrage", label: "Neue Anfrage", color: "#D4C3A1" },
  { key: "anfrage_in_bearbeitung", label: "Anfrage in Bearbeitung", color: "#E0D4B8" },
  { key: "angebot_erstellt", label: "Angebot erstellt", color: "#B8A882" },
  { key: "angebot_versendet", label: "Angebot versendet", color: "#B8A882" },
  { key: "angebot_angenommen", label: "Angebot angenommen", color: "#8FB88A" },
  { key: "termin_geplant", label: "Termin geplant", color: "#8AA9B8" },
  { key: "produktion", label: "Produktion", color: "#8AA9B8" },
  { key: "produktion_abgeschlossen", label: "Produktion abgeschlossen", color: "#8AA9B8" },
  { key: "nachbearbeitung", label: "Nachbearbeitung", color: "#A98AB8" },
  { key: "lieferung_erfolgt", label: "Lieferung erfolgt", color: "#A98AB8" },
  { key: "rechnung_erstellt", label: "Rechnung erstellt", color: "#B8A882" },
  { key: "rechnung_versendet", label: "Rechnung versendet", color: "#B8A882" },
  { key: "bezahlt", label: "Bezahlt", color: "#8FB88A" },
  { key: "abgeschlossen", label: "Abgeschlossen", color: "#77777A" },
  { key: "storniert", label: "Storniert", color: "#B87A7A" },
];

interface SeedService {
  name: string;
  category: string;
  unit: ServiceUnit;
  price: number;
  description?: string;
}

// Zusatzleistungen (Prompt: keine Expressbearbeitung).
const ADDITIONAL_SERVICES: SeedService[] = [
  {
    name: "Zusätzliches bearbeitetes Foto",
    category: "Zusatzleistung",
    unit: "stueck",
    price: 25,
    description: "Inkl. Bearbeitung, Farbkorrektur, Color Grading, digitale Lieferung",
  },
  {
    name: "Zusätzliche Produktionszeit",
    category: "Zusatzleistung",
    unit: "halbe_stunde",
    price: 59,
    description: "Je angefangene 30 Minuten",
  },
  {
    name: "Aufwendige Retusche",
    category: "Zusatzleistung",
    unit: "stueck",
    price: 49,
    description: "Pro Bild",
  },
  {
    name: "Extrem aufwendige Retusche",
    category: "Zusatzleistung",
    unit: "stueck",
    price: 0,
    description: "Individuelle Kalkulation",
  },
];

// Anfahrt: einfache Strecke Standort → Einsatzort (NICHT Hin+Rück).
const TRAVEL_SERVICES: SeedService[] = [
  { name: "Anfahrt 0–10 km", category: "Anfahrt", unit: "entfernungszone", price: 0 },
  { name: "Anfahrt 10–20 km", category: "Anfahrt", unit: "entfernungszone", price: 25 },
  { name: "Anfahrt 20–50 km", category: "Anfahrt", unit: "entfernungszone", price: 49 },
  { name: "Anfahrt 50–100 km", category: "Anfahrt", unit: "entfernungszone", price: 99 },
  {
    name: "Anfahrt über 100 km",
    category: "Anfahrt",
    unit: "entfernungszone",
    price: 0,
    description: "Nach Absprache",
  },
];

// Luftaufnahmen-Einzelleistungen.
const AERIAL_SERVICES: SeedService[] = [
  { name: "Luftbild Basic", category: "Luftaufnahmen", unit: "paket", price: 99 },
  { name: "Luftbild Standard", category: "Luftaufnahmen", unit: "paket", price: 149 },
  { name: "Luftbild Premium", category: "Luftaufnahmen", unit: "paket", price: 199 },
  { name: "Top-Down", category: "Luftaufnahmen", unit: "stueck", price: 59 },
  { name: "Top-Down Set", category: "Luftaufnahmen", unit: "paket", price: 99 },
  { name: "Luftvideo 10–15 s", category: "Luftaufnahmen", unit: "video", price: 99 },
  { name: "Luftvideo 15–30 s", category: "Luftaufnahmen", unit: "video", price: 149 },
  { name: "Luftvideo 30–60 s", category: "Luftaufnahmen", unit: "video", price: 249 },
  { name: "Luftvideo weitere 15 s", category: "Luftaufnahmen", unit: "video", price: 49 },
];

// Automotive/Carporn-Videolängen (individuell, frei änderbar).
const AUTOMOTIVE_VIDEO_SERVICES: SeedService[] = [
  { name: "Automotive Video 10 s", category: "Video Automotive", unit: "video", price: 0 },
  { name: "Automotive Video 10–15 s", category: "Video Automotive", unit: "video", price: 0 },
  { name: "Automotive Video 15–30 s", category: "Video Automotive", unit: "video", price: 0 },
  { name: "Automotive Video 30 s–1 Min", category: "Video Automotive", unit: "video", price: 0 },
  { name: "Automotive Video über 1 Min", category: "Video Automotive", unit: "video", price: 0 },
  { name: "Automotive Video weitere 15 s", category: "Video Automotive", unit: "video", price: 0 },
];

interface SeedPackage {
  name: string;
  category: ProjectCategory;
  price: number;
  description?: string;
  items: { label: string; quantity?: number }[];
}

const PACKAGES: SeedPackage[] = [
  // Architektur (fotoorientiert)
  {
    name: "Architektur Basic",
    category: "architektur",
    price: 299,
    items: [{ label: "Architektur-Fotografie Basic" }, { label: "10 bearbeitete Fotos" }],
  },
  {
    name: "Architektur Standard",
    category: "architektur",
    price: 499,
    items: [{ label: "Architektur-Fotografie Standard" }, { label: "20 bearbeitete Fotos" }],
  },
  {
    name: "Architektur Premium",
    category: "architektur",
    price: 749,
    items: [
      { label: "Architektur-Fotografie Premium" },
      { label: "30+ bearbeitete Fotos" },
      { label: "Luftbild Premium" },
    ],
  },
  {
    name: "Architektur Production",
    category: "architektur",
    price: 990,
    description: "ab 990 €",
    items: [{ label: "Individuelle Produktion" }],
  },

  // Immobilien (fotoorientiert)
  {
    name: "Immobilien Basic",
    category: "immobilien",
    price: 249,
    items: [{ label: "Außenaufnahmen" }, { label: "10 bearbeitete Fotos" }],
  },
  {
    name: "Immobilien Standard",
    category: "immobilien",
    price: 399,
    items: [
      { label: "Außen- und Innenaufnahmen" },
      { label: "20 bearbeitete Fotos" },
      { label: "Luftbild Standard" },
    ],
  },
  {
    name: "Immobilien Premium",
    category: "immobilien",
    price: 549,
    items: [
      { label: "Außen- und Innenaufnahmen" },
      { label: "30+ bearbeitete Fotos" },
      { label: "Luftbild Premium" },
      { label: "Top-Down" },
      { label: "5-Sekunden-Reel" },
    ],
  },

  // Automotive (~50 % Foto / 50 % Video)
  {
    name: "Automotive Basic",
    category: "automotive",
    price: 299,
    items: [{ label: "Automotive-Fotografie Basic" }, { label: "Kurzes Video" }],
  },
  {
    name: "Automotive Cinematic",
    category: "automotive",
    price: 499,
    items: [{ label: "Cinematic-Fotografie" }, { label: "Cinematic-Video" }],
  },
  {
    name: "Automotive Neon",
    category: "automotive",
    price: 699,
    items: [{ label: "Neon-Fotografie" }, { label: "Neon-Video" }],
  },
  {
    name: "Automotive Ultimate",
    category: "automotive",
    price: 999,
    description: "ab 999 €",
    items: [{ label: "Ultimate-Foto-/Videoproduktion" }],
  },

  // Sport (~50/50, sportartenunabhängig)
  {
    name: "Action Starter",
    category: "sport",
    price: 199,
    items: [{ label: "Sport-Fotografie Starter" }, { label: "Kurzes Action-Video" }],
  },
  {
    name: "Action Plus",
    category: "sport",
    price: 349,
    items: [{ label: "Sport-Fotografie Plus" }, { label: "Action-Video" }],
  },
  {
    name: "Action Day",
    category: "sport",
    price: 699,
    description: "ab 699 €",
    items: [{ label: "Ganztägige Foto-/Videoproduktion" }],
  },

  // Luftaufnahmen (~50/50) – als Kachel-Pakete
  { name: "Luftbild Basic", category: "luftaufnahmen", price: 99, items: [{ label: "Luftbild Basic" }] },
  { name: "Luftbild Standard", category: "luftaufnahmen", price: 149, items: [{ label: "Luftbild Standard" }] },
  { name: "Luftbild Premium", category: "luftaufnahmen", price: 199, items: [{ label: "Luftbild Premium" }] },

  // 360° Panorama – nur Datei-Lieferung, KEIN Hosting/Link/Web-Einbindung
  {
    name: "Außenpanorama",
    category: "panorama360",
    price: 99,
    description: "Nur Datei-Lieferung, kein Hosting/Link/Web-Einbindung",
    items: [{ label: "360°-Außenpanorama (Datei-Lieferung)" }],
  },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  companyName: "ORWEO",
  companyAddress: "",
  companyEmail: "kontakt@orweo.de",
  companyPhone: "",
  companyWebsite: "orweo.de",
  vatId: "",
  dataRootPath: "",
  theme: "dark",
  defaultTaxRate: "0",
  smallBusiness: "1",
};

export function seedIfEmpty(db: Database.Database): void {
  const statusCount = db.prepare("SELECT COUNT(*) AS c FROM status_definitions").get() as {
    c: number;
  };
  if (statusCount.c === 0) {
    const insStatus = db.prepare(
      "INSERT INTO status_definitions (key, label, color, sortOrder) VALUES (?, ?, ?, ?)",
    );
    STATUSES.forEach((s, i) => insStatus.run(s.key, s.label, s.color, i));
  }

  const settingsCount = db.prepare("SELECT COUNT(*) AS c FROM settings").get() as { c: number };
  if (settingsCount.c === 0) {
    const insSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);
  }

  const serviceCount = db.prepare("SELECT COUNT(*) AS c FROM services").get() as { c: number };
  const packageCount = db.prepare("SELECT COUNT(*) AS c FROM packages").get() as { c: number };

  const seedData = db.transaction(() => {
    let serviceSeq = 0;
    const insService = db.prepare(
      `INSERT INTO services (serviceNumber, name, category, description, unit, price, taxRate, active)
       VALUES (@serviceNumber, @name, @category, @description, @unit, @price, 0, 1)`,
    );
    const addService = (s: SeedService) => {
      serviceSeq += 1;
      const serviceNumber = `LST-${String(serviceSeq).padStart(4, "0")}`;
      insService.run({
        serviceNumber,
        name: s.name,
        category: s.category,
        description: s.description ?? null,
        unit: s.unit,
        price: s.price,
      });
    };

    if (serviceCount.c === 0) {
      [
        ...ADDITIONAL_SERVICES,
        ...TRAVEL_SERVICES,
        ...AERIAL_SERVICES,
        ...AUTOMOTIVE_VIDEO_SERVICES,
      ].forEach(addService);
    }

    if (packageCount.c === 0) {
      const insPackage = db.prepare(
        `INSERT INTO packages (name, category, description, price, active)
         VALUES (?, ?, ?, ?, 1)`,
      );
      const insItem = db.prepare(
        `INSERT INTO package_items (packageId, serviceId, label, quantity, active)
         VALUES (?, NULL, ?, ?, 1)`,
      );
      for (const p of PACKAGES) {
        const result = insPackage.run(p.name, p.category, p.description ?? null, p.price);
        const packageId = Number(result.lastInsertRowid);
        for (const item of p.items) {
          insItem.run(packageId, item.label, item.quantity ?? 1);
        }
      }
    }
  });

  seedData();
}
