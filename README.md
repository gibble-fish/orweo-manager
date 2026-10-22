# ORWEO Abrechnung

Lokale Windows-Anwendung zur Verwaltung von Anfragen, Kunden, Projekten, Angeboten, Terminen und Rechnungen für ORWEO.

## Stack

- **Electron** (Desktop-Shell, echtes `.exe`, offline)
- **React 19 + TypeScript** im Renderer, gebaut mit **Vite**
- **Tailwind CSS v4** mit den ORWEO-Design-Tokens (1:1 aus der Website)
- **SQLite** über `better-sqlite3` (lokal, dateibasiert)
- **@react-pdf/renderer** für Angebots-/Rechnungs-PDFs (folgt in Modul 16)
- Datenlogik ausschließlich im **Main-Prozess**, UI-Kommunikation über **typisierte IPC**

## Architektur

```
electron/          Electron Main, Preload, IPC-Handler (Adapter auf Services)
src/main/          Geschäftslogik im Main-Prozess (DB, Services)
  db/              better-sqlite3: Verbindung, Migrationen, Seed
  services/        Domänen-Services (Settings, Leistungen, Pakete, Dashboard …)
src/renderer/      React-UI (Seiten, Komponenten, Design-System)
src/shared/        Geteilte Typen + IPC-Vertrag (window.orweo)
```

Sicherheit: `contextIsolation: true`, `nodeIntegration: false`. Der Renderer erreicht die Datenlogik nur über `window.orweo` (Preload/contextBridge).

## Befehle

```bash
npm install          # Abhängigkeiten (better-sqlite3 wird nativ gebaut)
npm run typecheck    # TypeScript prüfen (Renderer + Electron)
npm run build        # Electron kompilieren + Renderer bauen
npm run start        # Build + Electron starten (Produktivpfad)
npm run dev          # Vite-Dev-Server + Electron (Hot Reload der UI)
npm run dist         # Windows-Installer (.exe) via electron-builder
npm run release      # Installer bauen UND zu GitHub Releases hochladen
```

## Daten

- SQLite-DB liegt unter `userData/data/orweo.sqlite` (pro Windows-Nutzer).
  Unter Windows konkret: `C:\Users\<Name>\AppData\Roaming\ORWEO Abrechnung\data\orweo.sqlite`.
- Beim ersten Start laufen Migrationen und ein Seed mit den ORWEO-Startpreisen
  (Pakete, Leistungen, Zusatzleistungen, Anfahrtszonen, Status). **Alle Werte
  sind danach in der App frei editierbar** – nichts ist im Code fest verdrahtet.

## Daten bleiben bei Updates erhalten

Die Datenbank liegt bewusst **außerhalb** des Installationsordners (in `userData`).
Ein Programm-Update ersetzt nur die App unter `C:\Program Files\...`, nie die Daten.
Damit gehen Rechnungen, Kunden usw. bei Updates nicht verloren.

Schemaänderungen werden über **versionierte Migrationen** (`src/main/db/migrations.ts`,
`user_version`) eingespielt:

- Neue Änderung = neuer Eintrag im `MIGRATIONS`-Array (z. B. `ALTER TABLE …`).
  **Bestehende Einträge niemals ändern**, sonst laufen produktive DBs nicht sauber weiter.
- Beim Start führt die App nur die noch fehlenden Schritte aus.
- **Vor** jeder Migration wird automatisch eine Sicherung unter
  `userData/data/backups/` angelegt.
- **Downgrade-Schutz:** Trifft eine ältere App auf eine neuere Datenbank, startet
  sie nicht und zeigt einen klaren Hinweis, statt Daten zu riskieren.

## Datensicherung (in der App)

Unter **Einstellungen → Datensicherung**:

- **Daten sichern:** schreibt eine eigenständige `.sqlite`-Datei an einen frei
  wählbaren Ort (externe Platte, Cloud-Ordner …). Empfehlung: regelmäßig machen.
- **Sicherung wiederherstellen:** lädt eine solche Datei zurück. Vorher wird
  automatisch ein Sicherheits-Backup der aktuellen Daten angelegt; danach startet
  die App neu.

## Automatische Updates (GitHub Releases)

Die App prüft beim Start auf neue Versionen, lädt sie im Hintergrund und
installiert sie beim nächsten Beenden. Manuell geht das über
**Einstellungen → Programm-Updates → „Nach Updates suchen"**.

### Einmalige Einrichtung

1. Ein GitHub-Repository anlegen (privat genügt) und den Code dorthin pushen.
2. In `package.json` unter `build.publish` die Platzhalter ersetzen:
   ```json
   "publish": [
     { "provider": "github", "owner": "DEIN-GITHUB-NAME", "repo": "DEIN-REPO-NAME" }
   ]
   ```
3. Einen **Personal Access Token** auf GitHub erstellen (Scope `repo`) und als
   Umgebungsvariable setzen, damit `electron-builder` hochladen darf:
   ```powershell
   $env:GH_TOKEN = "dein_token"
   ```

### Neue Version veröffentlichen

1. Versionsnummer in `package.json` erhöhen (z. B. `0.1.0` → `0.1.1`).
2. Falls das Datenbankschema geändert wurde: neue Migration in
   `src/main/db/migrations.ts` ergänzen.
3. Veröffentlichen:
   ```powershell
   $env:GH_TOKEN = "dein_token"
   npm run release
   ```
   Das baut den Installer und lädt ihn als GitHub-Release hoch. Installierte
   Apps ziehen das Update beim nächsten Start automatisch.

> Hinweis: Auto-Update ist nur in der **installierten** App aktiv, nicht im
> Dev-/Build-Betrieb. Dort zeigt die App „Automatische Updates sind in dieser
> Umgebung nicht aktiv".

## Schrift

Montserrat wird lokal gebündelt. Lege die Variable-Font-Datei unter
`src/renderer/assets/fonts/Montserrat-Variable.woff2` ab und aktiviere den
`@font-face`-Block in `src/renderer/styles/globals.css`. Bis dahin greift der
System-Sans-Fallback.
