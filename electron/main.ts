import { app, BrowserWindow, dialog, shell } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/registerHandlers";
import { closeDb, getDb } from "../src/main/db/connection";
import { DatabaseDowngradeError } from "../src/main/db/migrations";
import { startMailPolling, stopMailPolling } from "../src/main/services/mailService";
import { initAutoUpdater } from "../src/main/services/updateService";

// Dev-Server-URL wird von Vite gesetzt; im Produktivbuild laden wir die
// gebauten Dateien aus dist/ per file://.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!DEV_SERVER_URL;

/**
 * Pfad zum App-Icon (Fenster/Taskleiste). Im gepackten Zustand liegt es als
 * extraResource unter resources/build/, im Dev-/Build-Betrieb relativ zum
 * Projektwurzelverzeichnis (drei Ebenen über dist-electron/electron/main.js).
 */
function resolveIconPath(): string | undefined {
  const candidates = [
    join(process.resourcesPath, "build", "ORWEO_Manager.ico"),
    join(__dirname, "..", "..", "..", "build", "ORWEO_Manager.ico"),
  ];
  return candidates.find((p) => existsSync(p));
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const iconPath = resolveIconPath();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0B0B0D",
    show: false,
    autoHideMenuBar: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      // Sicherheit gemäß Vorgabe:
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload benötigt Node-APIs (contextBridge)
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Externe Links im Standardbrowser öffnen, nicht in der App.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (isDev && DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(join(__dirname, "../../dist/index.html"));
  }
}

process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
});

app.whenReady().then(() => {
  try {
    console.log("[main] app ready, initialisiere DB …");
    // DB früh initialisieren (Migrationen + Seed laufen hier).
    getDb();
    console.log("[main] DB ok, registriere IPC …");
    registerIpcHandlers();
    console.log("[main] erstelle Fenster …");
    createWindow();
    // E-Mail-Abruf starten (no-op, falls in den Einstellungen deaktiviert).
    startMailPolling();
    // Auto-Update prüfen (nur im gepackten Produktivbuild aktiv).
    initAutoUpdater(() => mainWindow);
  } catch (err) {
    console.error("[main] Fehler beim Start:", err);
    // Downgrade (zu neue DB) verständlich melden und sauber beenden, statt stillem Crash.
    if (err instanceof DatabaseDowngradeError) {
      dialog.showErrorBox("Neuere Datenbank gefunden", err.message);
    } else {
      dialog.showErrorBox(
        "Start fehlgeschlagen",
        `ORWEO Abrechnung konnte nicht gestartet werden.\n\n${(err as Error).message}`,
      );
    }
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  stopMailPolling();
  closeDb();
});
