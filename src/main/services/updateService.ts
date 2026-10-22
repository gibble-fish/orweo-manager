/**
 * Automatische Updates über GitHub Releases (electron-updater).
 *
 * Funktioniert ausschließlich im GEPACKTEN Produktivbuild (nicht im Dev-Modus)
 * und nur, wenn in package.json unter build.publish ein GitHub-Repo konfiguriert
 * ist. Ist nichts konfiguriert oder läuft die App unverpackt, wird der Updater
 * sauber in den Zustand „disabled" versetzt – es gibt keinen Absturz.
 *
 * Wichtig: Updates ersetzen nur das Programm. Die Datenbank liegt getrennt in
 * userData und bleibt bei jedem Update erhalten.
 */
import { app, BrowserWindow } from "electron";
import pkg from "electron-updater";
// Relativer Pfad statt @shared-Alias: IPC_CHANNELS ist ein LAUFZEIT-Wert.
// tsc löst Pfad-Aliase nicht in require() auf, sonst scheitert der Import zur Laufzeit.
import { IPC_CHANNELS } from "../../shared/ipc";
import type { UpdateState } from "../../shared/ipc";

// electron-updater ist CommonJS; autoUpdater wird aus dem Default-Export gelöst.
const { autoUpdater } = pkg;

let getWindow: () => BrowserWindow | null = () => null;

let state: UpdateState = {
  phase: "idle",
  currentVersion: "0.0.0",
};

/** Sendet den aktuellen Zustand an den Renderer (für Live-Anzeige). */
function emit(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch };
  const win = getWindow();
  win?.webContents.send(IPC_CHANNELS.update.getState, state);
}

/** True, sobald Auto-Update grundsätzlich möglich ist (gepackt). */
function updaterAvailable(): boolean {
  return app.isPackaged;
}

/**
 * Initialisiert den Auto-Updater und prüft beim Start einmalig auf Updates.
 * @param windowAccessor liefert das Hauptfenster (für Fortschritts-Events).
 */
export function initAutoUpdater(windowAccessor: () => BrowserWindow | null): void {
  getWindow = windowAccessor;
  state.currentVersion = app.getVersion();

  if (!updaterAvailable()) {
    // Im Dev-/Build-Betrieb gibt es keine signierten Artefakte → deaktiviert.
    emit({ phase: "disabled" });
    return;
  }

  // Updates werden heruntergeladen, aber erst beim App-Beenden installiert,
  // damit laufende Arbeit nicht unterbrochen wird.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => emit({ phase: "checking" }));
  autoUpdater.on("update-available", (info) =>
    emit({ phase: "available", newVersion: info.version }),
  );
  autoUpdater.on("update-not-available", () =>
    emit({ phase: "not-available", newVersion: undefined }),
  );
  autoUpdater.on("download-progress", (progress) =>
    emit({ phase: "downloading", percent: Math.round(progress.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) =>
    emit({ phase: "downloaded", newVersion: info.version, percent: 100 }),
  );
  autoUpdater.on("error", (err) =>
    emit({ phase: "error", error: err?.message ?? String(err) }),
  );

  // Beim Start prüfen – Fehler (z. B. keine Netzverbindung) nur melden, nicht werfen.
  autoUpdater.checkForUpdates().catch((err) => {
    emit({ phase: "error", error: (err as Error).message });
  });
}

/** Aktuellen Zustand zurückgeben (für IPC getState). */
export function getUpdateState(): UpdateState {
  if (!state.currentVersion || state.currentVersion === "0.0.0") {
    state.currentVersion = app.getVersion();
  }
  return state;
}

/** Manuelle Update-Prüfung (von der Einstellungen-Seite ausgelöst). */
export async function checkForUpdates(): Promise<UpdateState> {
  if (!updaterAvailable()) {
    emit({ phase: "disabled" });
    return state;
  }
  try {
    emit({ phase: "checking" });
    await autoUpdater.checkForUpdates();
  } catch (err) {
    emit({ phase: "error", error: (err as Error).message });
  }
  return state;
}

/** Installiert ein bereits heruntergeladenes Update (App startet neu). */
export function installUpdate(): void {
  if (state.phase !== "downloaded") return;
  // quitAndInstall: beendet die App und installiert das Update.
  autoUpdater.quitAndInstall();
}
