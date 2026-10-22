import { app, dialog, ipcMain, BrowserWindow } from "electron";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { IPC_CHANNELS } from "../../src/shared/ipc";
import type { PdfResult, PdfSaveInput } from "../../src/shared/ipc";
import type { AppSettings } from "../../src/shared/domain";
import { getSettings, updateSettings } from "../../src/main/services/settingsService";
import {
  checkMailbox,
  startMailPolling,
  testMailConnection,
} from "../../src/main/services/mailService";
import {
  exportBackup,
  relaunchApp,
  restoreBackup,
} from "../../src/main/services/backupService";
import {
  checkForUpdates,
  getUpdateState,
  installUpdate,
} from "../../src/main/services/updateService";
import {
  createService,
  listServices,
  removeService,
  updateService,
} from "../../src/main/services/serviceCatalog";
import {
  createPackage,
  listPackageItems,
  listPackages,
  removePackage,
  setPackageItems,
  updatePackage,
} from "../../src/main/services/packageService";
import {
  createCustomer,
  getCustomer,
  listCustomers,
  removeCustomer,
  updateCustomer,
} from "../../src/main/services/customerService";
import {
  convertInquiryToCustomer,
  createInquiry,
  listInquiries,
  removeInquiry,
  setInquiryStatus,
  updateInquiry,
} from "../../src/main/services/inquiryService";
import {
  addPackageToProject,
  createProject,
  getProject,
  listProjectItems,
  listProjects,
  removeProject,
  setProjectItems,
  updateProject,
} from "../../src/main/services/projectService";
import {
  createQuoteFromProject,
  getQuote,
  listQuotes,
  removeQuote,
  setQuoteItems,
  setQuoteStatus,
  updateQuote,
} from "../../src/main/services/quoteService";
import {
  addPayment,
  createInvoiceForCustomer,
  createInvoiceFromQuote,
  getInvoice,
  listInvoices,
  removeInvoice,
  removePayment,
  setInvoiceItems,
  setInvoiceStatus,
  updateInvoice,
} from "../../src/main/services/invoiceService";
import {
  createAppointment,
  listAppointments,
  removeAppointment,
  updateAppointment,
} from "../../src/main/services/appointmentService";
import { listStatuses, reorderStatuses, updateStatus } from "../../src/main/services/statusService";
import { getDashboardStats } from "../../src/main/services/dashboardService";

/**
 * Registriert alle IPC-Handler. Jeder Handler ist ein dünner Adapter auf einen
 * Service im Main-Prozess – so bleibt Datenlogik von IPC/Transport getrennt.
 * Fehler werden geloggt und als abgelehnte Promise an den Renderer gereicht.
 */
export function registerIpcHandlers(): void {
  function handle<A extends unknown[], R>(
    channel: string,
    fn: (...args: A) => R,
  ): void {
    ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
      try {
        return await fn(...(args as A));
      } catch (error) {
        console.error(`[IPC ${channel}]`, error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    });
  }

  handle(IPC_CHANNELS.app.getVersion, () => app.getVersion());

  // Ordner-Auswahldialog (z. B. für die Datenablage in den Einstellungen).
  handle(IPC_CHANNELS.dialog.selectFolder, async (defaultPath?: string) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const options: Electron.OpenDialogOptions = {
      title: "Speicherort wählen",
      properties: ["openDirectory", "createDirectory"],
      ...(defaultPath ? { defaultPath } : {}),
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  handle(IPC_CHANNELS.settings.get, getSettings);
  // Nach jedem Settings-Update das E-Mail-Polling an die neuen Werte anpassen.
  handle(IPC_CHANNELS.settings.update, (patch: Partial<AppSettings>) => {
    const updated = updateSettings(patch);
    startMailPolling();
    return updated;
  });

  // E-Mail: manueller Sofort-Abruf und Verbindungstest.
  handle(IPC_CHANNELS.mail.checkNow, checkMailbox);
  handle(IPC_CHANNELS.mail.testConnection, testMailConnection);

  // Datensicherung / Wiederherstellung.
  handle(IPC_CHANNELS.backup.export, exportBackup);
  handle(IPC_CHANNELS.backup.restore, restoreBackup);
  handle(IPC_CHANNELS.backup.relaunch, async () => relaunchApp());

  // Auto-Update.
  handle(IPC_CHANNELS.update.getState, getUpdateState);
  handle(IPC_CHANNELS.update.check, checkForUpdates);
  handle(IPC_CHANNELS.update.install, async () => installUpdate());

  handle(IPC_CHANNELS.services.list, listServices);
  handle(IPC_CHANNELS.services.create, createService);
  handle(IPC_CHANNELS.services.update, updateService);
  handle(IPC_CHANNELS.services.remove, removeService);

  handle(IPC_CHANNELS.packages.list, listPackages);
  handle(IPC_CHANNELS.packages.listItems, listPackageItems);
  handle(IPC_CHANNELS.packages.create, createPackage);
  handle(IPC_CHANNELS.packages.update, updatePackage);
  handle(IPC_CHANNELS.packages.remove, removePackage);
  handle(IPC_CHANNELS.packages.setItems, setPackageItems);

  handle(IPC_CHANNELS.customers.list, listCustomers);
  handle(IPC_CHANNELS.customers.get, getCustomer);
  handle(IPC_CHANNELS.customers.create, createCustomer);
  handle(IPC_CHANNELS.customers.update, updateCustomer);
  handle(IPC_CHANNELS.customers.remove, removeCustomer);

  handle(IPC_CHANNELS.inquiries.list, listInquiries);
  handle(IPC_CHANNELS.inquiries.create, createInquiry);
  handle(IPC_CHANNELS.inquiries.update, updateInquiry);
  handle(IPC_CHANNELS.inquiries.remove, removeInquiry);
  handle(IPC_CHANNELS.inquiries.setStatus, setInquiryStatus);
  handle(IPC_CHANNELS.inquiries.convertToCustomer, convertInquiryToCustomer);

  handle(IPC_CHANNELS.projects.list, listProjects);
  handle(IPC_CHANNELS.projects.get, getProject);
  handle(IPC_CHANNELS.projects.create, createProject);
  handle(IPC_CHANNELS.projects.update, updateProject);
  handle(IPC_CHANNELS.projects.remove, removeProject);
  handle(IPC_CHANNELS.projects.listItems, listProjectItems);
  handle(IPC_CHANNELS.projects.setItems, setProjectItems);
  handle(IPC_CHANNELS.projects.addPackage, addPackageToProject);

  handle(IPC_CHANNELS.quotes.list, listQuotes);
  handle(IPC_CHANNELS.quotes.get, getQuote);
  handle(IPC_CHANNELS.quotes.createFromProject, createQuoteFromProject);
  handle(IPC_CHANNELS.quotes.update, updateQuote);
  handle(IPC_CHANNELS.quotes.remove, removeQuote);
  handle(IPC_CHANNELS.quotes.setItems, setQuoteItems);
  handle(IPC_CHANNELS.quotes.setStatus, setQuoteStatus);

  handle(IPC_CHANNELS.invoices.list, listInvoices);
  handle(IPC_CHANNELS.invoices.get, getInvoice);
  handle(IPC_CHANNELS.invoices.createFromQuote, createInvoiceFromQuote);
  handle(IPC_CHANNELS.invoices.createForCustomer, createInvoiceForCustomer);
  handle(IPC_CHANNELS.invoices.update, updateInvoice);
  handle(IPC_CHANNELS.invoices.remove, removeInvoice);
  handle(IPC_CHANNELS.invoices.setItems, setInvoiceItems);
  handle(IPC_CHANNELS.invoices.setStatus, setInvoiceStatus);
  handle(IPC_CHANNELS.invoices.addPayment, addPayment);
  handle(IPC_CHANNELS.invoices.removePayment, removePayment);

  handle(IPC_CHANNELS.appointments.list, listAppointments);
  handle(IPC_CHANNELS.appointments.create, createAppointment);
  handle(IPC_CHANNELS.appointments.update, updateAppointment);
  handle(IPC_CHANNELS.appointments.remove, removeAppointment);

  // PDF wird im Renderer (ESM/JSX über Vite) erzeugt und hier nur gespeichert.
  // Standard-Zielordner ist der konfigurierte Datenablageordner, sonst userData.
  handle(IPC_CHANNELS.pdf.save, async (input: PdfSaveInput): Promise<PdfResult> => {
    const { dataRootPath } = getSettings();
    const defaultDir = dataRootPath && dataRootPath.trim() ? dataRootPath : app.getPath("documents");
    const result = await dialog.showSaveDialog({
      title: "PDF speichern",
      defaultPath: join(defaultDir, input.suggestedName),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) {
      return { path: null };
    }
    writeFileSync(result.filePath, Buffer.from(input.bytes));
    return { path: result.filePath };
  });

  handle(IPC_CHANNELS.status.list, listStatuses);
  handle(IPC_CHANNELS.status.update, updateStatus);
  handle(IPC_CHANNELS.status.reorder, reorderStatuses);

  handle(IPC_CHANNELS.dashboard.stats, getDashboardStats);
}
