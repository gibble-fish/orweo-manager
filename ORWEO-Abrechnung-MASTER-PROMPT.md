# MASTER-PROMPT — ORWEO Abrechnungssystem (lokale Windows-App)

> **Anleitung für mich (den Nutzer):** Neues Kiro-Projekt im Ordner `d:\ORWEO\orweo-billing` starten und den kompletten Inhalt dieser Datei unter „PROMPT AN KIRO" als erste Nachricht einwerfen. Kiro weiß dann sofort, was zu tun ist, welchen Stack es nutzt und wie die App auszusehen hat.

---

## PROMPT AN KIRO

Du bist Kiro und baust für mein Unternehmen **ORWEO** (Foto-/Videografie: Architektur, Immobilien, Automotive, Sport, Luftaufnahmen, 360°-Panorama) eine **eigenständige lokale Windows-Anwendung** zur Verwaltung von Anfragen, Kunden, Projekten, Angeboten, Terminen und Rechnungen.

Die App ist ein **separates Projekt**, teilt aber das Look-and-Feel meiner bestehenden ORWEO-Website, damit alles zusammenpasst.

### 0. VERBINDLICHER TECH-STACK (nicht abweichen)

Die App muss eine **echte lokale Windows-Anwendung** sein (kein reiner Cloud-Webdienst), mit lokaler Datenbank und Zugriff auf Outlook. Gleichzeitig soll sie exakt so aussehen wie die ORWEO-Website. Deshalb:

- **Electron** (Desktop-Shell, echtes `.exe`, offline lauffähig)
- **React 19 + TypeScript** im Renderer (gleiche Sprache/Struktur wie die Website)
- **Vite** als Build-Tool für den Renderer (Electron-freundlicher als Next.js; Next.js ist für Server gedacht, hier nicht nötig)
- **Tailwind CSS v4** mit `@theme inline` in einer `globals.css` — **identische Design-Tokens wie die Website** (siehe Abschnitt „DESIGN-SYSTEM")
- **Montserrat** als Font (Weights 200–600, Fließtext 300) — lokal gebündelt, kein CDN nötig
- **SQLite** als lokale Datenbank über `better-sqlite3` (synchron, schnell, dateibasiert, keine Cloud)
- **Datenzugriff/Geschäftslogik im Electron-Main-Prozess**, Kommunikation zum Renderer ausschließlich über **typisierte IPC** (`contextBridge`, `ipcMain/ipcRenderer`) — UI und Datenlogik strikt getrennt
- **PDF-Erzeugung** für Angebote/Rechnungen (z. B. `@react-pdf/renderer` oder Puppeteer-freies HTML→PDF; wähle die zuverlässigere Variante und begründe kurz)
- **Outlook-Anbindung über die lokale Outlook-Desktop-Installation** unter Windows (COM/`powershell`-Automation oder MAPI). Falls kein Outlook vorhanden ist, sauberer Fallback über SMTP/IMAP (analog zur Website, die Nodemailer nutzt).
- **Sicherheit:** `contextIsolation: true`, `nodeIntegration: false`, kein Remote-Modul. Keine Geschäftsdaten an Dritte senden.

Wenn eine Bibliothek nicht verfügbar ist, wähle die nächstbeste etablierte Alternative und begründe die Wahl kurz — aber weiche nicht vom Grundprinzip (Electron + React + lokale SQLite) ab.

### DESIGN-SYSTEM (1:1 von der ORWEO-Website übernehmen)

Übernimm diese Tokens exakt in `globals.css` (`@theme inline`):

```css
--color-near-black: #0B0B0D;
--color-off-white: #F3F3F0;
--color-mid-grey: #77777A;
--color-champagne: #D4C3A1;
--color-champagne-light: #E0D4B8;
--color-champagne-dark: #B8A882;
--color-dark-surface: #111113;
--color-dark-card: #161618;
--color-dark-border: #222225;
--color-warm-dark: #1A1A1C;
--color-light-section: #F8F7F4;
--color-light-card: #EEEEE9;
--font-sans: var(--font-montserrat);
```

Design-Regeln (aus dem ORWEO-Brand-Guide):
- **Champagne-Gold `#D4C3A1`** ist der einzige Akzent (CTAs, Linien, aktive Zustände). Kein Gelb, kein Orange, kein Metallic.
- Grundfläche dunkel (`#0B0B0D` / `#111113`), Karten `#161618` mit dezentem Border `rgba(212,195,161,0.08)`.
- **Glass Cards** (`background: rgba(22,22,24,0.7); backdrop-filter: blur(20px)`), **Champagne-Gradient-Text**, `.btn-primary` (Champagne-Fläche, schwarze Schrift) / `.btn-secondary` (Champagne-Border).
- Großzügiges Letterspacing bei Headlines, leichte Font-Weights, dezente Scroll-/Fade-Animationen (`fadeInUp`, `scaleIn`).
- **Dunkles Standard-Design, umschaltbar auf helles Design** (Light-Tokens sind oben vorhanden).
- Modern, hochwertig, ruhig — wie eine Premium-Business-App, nicht wie eine Buchhaltungssoftware.
- ORWEO-Logo: charakteristisches „E" aus drei horizontalen Balken (oben/unten Off-White, Mitte kürzer in Champagne). Als React-Komponente `OrweoLogo` nachbauen (analog zur Website).

### KERNPRINZIP (roter Faden der ganzen App)

`ANFRAGE → ANGEBOT → AUFTRAG → PRODUKTION → LIEFERUNG → RECHNUNG → ZAHLUNG → ABGESCHLOSSEN`

Daten dürfen **nie doppelt** eingegeben werden. Sie fließen automatisch von Anfrage → Kunde → Projekt → Angebot → Auftrag → Rechnung. Möglichst wenige Klicks, große klickbare Kacheln, klare Icons, globale Sofort-Suche.

### HAUPTBEREICHE (Navigation)

Dashboard · Anfragen · Kunden · Projekte/Aufträge · Angebote · Rechnungen · Leistungen & Pakete · Kalender/Termine · Einstellungen.

**Dashboard:** Kacheln für neue Anfragen, Anfragen in Bearbeitung, offene/angenommene Angebote, bevorstehende Termine, laufende Produktionen, offene/überfällige/unbezahlte Rechnungen, Umsatzübersicht. Schnellaktionen oben: „+ Neue Anfrage / Neuer Kunde / Neues Angebot / Neuer Auftrag / Neue Rechnung". Darunter eine Liste aktueller Vorgänge (Vorgang · Kunde · Projektart · Zeit/Status).

### STATUS-WORKFLOW (zentral)

Status (in Einstellungen editierbar): Neue Anfrage → Anfrage in Bearbeitung → Angebot erstellt → Angebot versendet → Angebot angenommen → Termin geplant → Produktion → Produktion abgeschlossen → Nachbearbeitung → Lieferung erfolgt → Rechnung erstellt → Rechnung versendet → Bezahlt → Abgeschlossen (+ Storniert).

Statuswechsel passieren möglichst automatisch durch Aktionen (E-Mail erkannt → Neue Anfrage; Angebot per Outlook gesendet → Angebot versendet; Rechnung gesendet → Rechnung versendet; usw.). Bewusst **manuell** bestätigt werden: „Angebot angenommen", „Produktion abgeschlossen", „Zahlung erhalten".

### ANFRAGEN & E-MAIL

Die ORWEO-Website verschickt Kontaktanfragen per E-Mail (Projektart wählbar: Architektur/Immobilien/Automotive/Sport/Luftaufnahmen/360°). Die App prüft das Postfach regelmäßig, erkennt Anfrage-Mails und legt automatisch eine Anfrage an (Kunde, E-Mail, Telefon, Projektart, Nachricht, Status „Neue Anfrage"). Erwartetes strukturiertes E-Mail-Format dokumentieren, damit das Parsen zuverlässig ist.

Outlook-Funktionen: Angebot senden, Rechnung senden, Kunde aus Outlook-Mail übernehmen, eingehende Anfragen erkennen. Nach Versand Status automatisch aktualisieren.

### KUNDEN

Kundenakte: Kundennummer, Firma, Vor-/Nachname, Straße, PLZ, Ort, E-Mail, Telefon, Website, Ansprechpartner, Notizen, Rechnungsadresse, optional abweichende Lieferadresse. In der Akte alle Vorgänge sichtbar: Anfragen, Angebote, Aufträge, Rechnungen, Termine, Zahlungen.

### PROJEKTE / AUFTRÄGE

Projektnummer (Format `PRO-JJJJ-NNNN`), Kunde, Projektart, Projektname, Beschreibung, Leistungen, Pakete, Zusatzleistungen, Anfahrt, Produktionsdatum, Ort, Ansprechpartner, Status, Notizen, Dateien.

### PAKETE (klickbare Kacheln) & LEISTUNGSKATALOG

Bei Wahl der Projektart erscheinen die passenden Pakete als **große klickbare Kacheln**. Klick fügt alle enthaltenen Leistungen dem Auftrag hinzu; enthaltene Positionen sind einzeln an-/abwählbar und editierbar.

**Paketeditor:** Pakete erstellen/umbenennen, Preis ändern, Leistungen hinzufügen/entfernen/aktivieren, Beschreibung ändern, Projektart zuordnen.

**Leistung** hat: Leistungsnummer, Bezeichnung, Kategorie, Beschreibung, Einheit (Paket/Stück/Stunde/angefangene 30 Min/Entfernungszone/Projekt/Video), Preis, Steuerstatus, aktiv/inaktiv.

**PREISE NIEMALS HARDCODIEREN.** Alle Preise kommen aus der lokalen DB/Einstellungen und sind jederzeit änderbar. **Bereits erstellte Angebote/Rechnungen bleiben unverändert** (Preise/Positionen werden beim Erstellen als Snapshot in das Dokument kopiert).

### STARTDATEN (einmalig als Seed in die DB, danach frei editierbar)

Lege diese Pakete/Leistungen als **Seed-Daten** an (nicht im Code fest verdrahtet — als DB-Einträge, die der Nutzer ändern kann):

- **Architektur:** Basic 299 € · Standard 499 € · Premium 749 € · Production ab 990 €
- **Automotive:** Basic 299 € · Cinematic 499 € · Neon 699 € · Ultimate ab 999 €
- **Sport:** Action Starter 199 € · Action Plus 349 € · Action Day ab 699 € (sportartenunabhängig)
- **Immobilien:** Basic 249 € · Standard 399 € · Premium 549 €
- **Luftaufnahmen:** Luftbild Basic 99 € · Standard 149 € · Premium 199 € · Top-Down 59 € · Top-Down Set 99 € · Luftvideo 10–15 s 99 € · 15–30 s 149 € · 30–60 s 249 € · weitere 15 s 49 €
- **360° Panorama:** Außenpanorama 99 € (nur Datei-Lieferung, KEIN Hosting/Link/Web-Einbindung)

**Zusatzleistungen:** zusätzliches bearbeitetes Foto 25 €/Stück (inkl. Bearbeitung, Farbkorrektur, Color Grading, digitale Lieferung); zusätzliche Produktionszeit 59 € je angefangene 30 Min; aufwendige Retusche 49 €/Bild; extrem aufwendige Retusche = individuelle Kalkulation. **Keine Expressbearbeitung anlegen.**

**Anfahrt** (einfache Strecke Standort → Einsatzort, NICHT Hin+Rück): 0–10 km 0 € · 10–20 km 25 € · 20–50 km 49 € · 50–100 km 99 € · über 100 km nach Absprache. Entfernung möglichst automatisch ermitteln, sonst manuell eintragbar.

**Video:** kein einheitliches Video-Preissystem — Video-Leistungen **je Projektbereich individuell** definierbar. Automotive/Carporn-Videolängen mindestens: 10 s (kleinste), 10–15 s, 15–30 s, 30 s–1 Min, über 1 Min, weitere 15 s. Preise separat und frei änderbar.

Paketinhalte (Beispiel Immobilien) korrekt als Positionslisten hinterlegen (Basic: Außenaufnahmen + 10 Fotos; Standard: Außen+Innen + 20 Fotos + Luftbild Standard; Premium: 30+ Fotos + Luftbild Premium + Top-Down + 5-s-Reel). Automotive ≈ 50 % Foto / 50 % Video, Sport ≈ 50/50, Luftaufnahmen ≈ 50/50, Immobilien & Architektur fotoorientiert.

### ANGEBOTE

Aus einem Projekt mit wenigen Klicks erzeugbar. Enthält: ORWEO-Logo, Unternehmensdaten, Kundendaten, Angebotsnummer, Datum, Gültigkeit, Projektbeschreibung, Positionen, Mengen, Einzelpreise, Zwischensummen, optionaler Rabatt, Netto, USt, Brutto, Bedingungen. **Als PDF** im ORWEO-Design.

### RECHNUNGEN

Aus angenommenem Auftrag automatisch erstellbar; übernimmt Kunde, Projekt, Leistungen, Mengen, Preise, Anfahrt, Zusatzleistungen, Rechnungsnummer. Lokal gespeichert + PDF. Status: erstellt → versendet → bezahlt → abgeschlossen. Zahlungseingang zunächst manuell bestätigen.

### TERMINE

Nach Angebotsannahme anlegbar: Datum, Uhrzeit, Kunde, Projekt, Ort, Dauer, Ansprechpartner, Hinweise. Nach Anlage Status automatisch „Termin geplant". Optional später Outlook-Kalender-Integration.

### DATEN, DATEIEN & BACKUP

- Vollständig lokal, keine Cloud-DB, keine Pflicht-Online-Anmeldung.
- Pro Projekt ein lokaler Ordner, Speicherort in Einstellungen frei wählbar:
  ```
  ORWEO/
  ├── Kunden/
  ├── Projekte/
  │   └── PRO-2026-0001/
  │       ├── Anfrage/ Angebot/ Auftrag/ Produktion/ Lieferung/ Rechnung/
  └── Backups/
  ```
- Backup-Funktion: „Backup erstellen" / „Backup wiederherstellen". Regelmäßige lokale Sicherung möglich.
- Fehlerbehandlung + Logging wichtiger Systemvorgänge.

### GLOBALE SUCHE

Sofort-Suche (während der Eingabe) über Kunden, Projekte, Angebote, Rechnungen, Projektnummern, E-Mails, Telefonnummern.

### UI/UX

Modern, dunkel (umschaltbar hell), klare Typografie, dezente Animationen, große Kacheln, übersichtliche Tabellen, klare Icons, keine überladenen Menüs. Muss auch auf kleineren Windows-Bildschirmen funktionieren.

### VORGEHEN (in dieser Reihenfolge, nach jedem Modul testen)

1. Systemarchitektur + Ordnerstruktur (Electron-Main / Preload / Renderer) 2. Datenmodell 3. SQLite-Schema + Migrationen + Seed 4. Design-System/`globals.css` + `OrweoLogo` 5. Navigation + App-Shell 6. Leistungskatalog 7. Paketverwaltung + Paketeditor 8. Kundenverwaltung 9. Anfrageverwaltung 10. Statusworkflow 11. Angebote 12. Outlook-Anbindung 13. Aufträge 14. Termine 15. Rechnungen 16. PDF-Erzeugung 17. Backup-System 18. Tests + Windows-Build (`.exe`).

Nicht das ganze System blind auf einmal implementieren. Erst Architektur/Datenmodell/DB/UI-Konzept vorschlagen und mit mir abstimmen, dann Modul für Modul bauen. Keine Funktionen nur simulieren, keine Platzhalter wenn echte Implementierung möglich ist. Modular und erweiterbar bauen, Datenlogik strikt von der UI trennen.

### GRUNDSÄTZE

Die App soll meine Arbeit vereinfachen, nicht verkomplizieren. Lokal. Keine Cloud-DB. Keine unnötige Komplexität. Professionelles, hochwertiges Auftreten wie eine moderne Business-App — passend zur ORWEO-Marke. Preise und Pakete jederzeit änderbar, bestehende Dokumente bleiben unverändert.

---

## REFERENZ: bestehende ORWEO-Website (nur zur Design-Orientierung)

- Pfad: `d:\ORWEO\ORWEO\orweo-website`
- Stack dort: Next.js 16, React 19, Tailwind v4, TypeScript, Vercel Blob, Nodemailer
- Design-Tokens: `src/app/globals.css` · Logo: `src/components/OrweoLogo.tsx` · Auth-Muster (HMAC-Cookie): `src/lib/auth.ts` · Brand-Guide: `public/brand/ORWEO-Brand-Guide.md`
- Das Abrechnungssystem ist ein **eigenständiges Projekt** und teilt nur Optik/Marke, keinen Code-Zwang.
```
