import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../src/shared/ipc";
import type { OrweoApi, UpdateState } from "../src/shared/ipc";

/**
 * Exponiert eine schmale, typisierte API unter window.orweo.
 * Der Renderer bekommt KEINEN direkten Zugriff auf ipcRenderer, Node oder die DB –
 * nur diese definierten Methoden (contextIsolation: true).
 */
const api: OrweoApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.app.getVersion),
  },
  dialog: {
    selectFolder: (defaultPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.dialog.selectFolder, defaultPath),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settings.get),
    update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settings.update, patch),
  },
  mail: {
    checkNow: () => ipcRenderer.invoke(IPC_CHANNELS.mail.checkNow),
    testConnection: () => ipcRenderer.invoke(IPC_CHANNELS.mail.testConnection),
  },
  backup: {
    export: () => ipcRenderer.invoke(IPC_CHANNELS.backup.export),
    restore: () => ipcRenderer.invoke(IPC_CHANNELS.backup.restore),
    relaunch: () => ipcRenderer.invoke(IPC_CHANNELS.backup.relaunch),
  },
  update: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.update.getState),
    check: () => ipcRenderer.invoke(IPC_CHANNELS.update.check),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.update.install),
    onState: (callback) => {
      const listener = (_event: unknown, state: UpdateState) => callback(state);
      ipcRenderer.on(IPC_CHANNELS.update.getState, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.update.getState, listener);
    },
  },
  services: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.services.list),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.services.create, input),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.services.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.services.remove, id),
  },
  packages: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.packages.list),
    listItems: (packageId) => ipcRenderer.invoke(IPC_CHANNELS.packages.listItems, packageId),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.packages.create, input),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.packages.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.packages.remove, id),
    setItems: (packageId, items) =>
      ipcRenderer.invoke(IPC_CHANNELS.packages.setItems, packageId, items),
  },
  customers: {
    list: (search) => ipcRenderer.invoke(IPC_CHANNELS.customers.list, search),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.customers.get, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.customers.create, input),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.customers.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.customers.remove, id),
  },
  inquiries: {
    list: (status) => ipcRenderer.invoke(IPC_CHANNELS.inquiries.list, status),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.inquiries.create, input),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.inquiries.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.inquiries.remove, id),
    setStatus: (id, status) => ipcRenderer.invoke(IPC_CHANNELS.inquiries.setStatus, id, status),
    convertToCustomer: (id) =>
      ipcRenderer.invoke(IPC_CHANNELS.inquiries.convertToCustomer, id),
  },
  projects: {
    list: (search, status) => ipcRenderer.invoke(IPC_CHANNELS.projects.list, search, status),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.projects.get, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.projects.create, input),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.projects.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.projects.remove, id),
    listItems: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.projects.listItems, projectId),
    setItems: (projectId, items) =>
      ipcRenderer.invoke(IPC_CHANNELS.projects.setItems, projectId, items),
    addPackage: (projectId, packageId) =>
      ipcRenderer.invoke(IPC_CHANNELS.projects.addPackage, projectId, packageId),
  },
  quotes: {
    list: (search, status) => ipcRenderer.invoke(IPC_CHANNELS.quotes.list, search, status),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.quotes.get, id),
    createFromProject: (projectId) =>
      ipcRenderer.invoke(IPC_CHANNELS.quotes.createFromProject, projectId),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.quotes.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.quotes.remove, id),
    setItems: (id, items) => ipcRenderer.invoke(IPC_CHANNELS.quotes.setItems, id, items),
    setStatus: (id, status) => ipcRenderer.invoke(IPC_CHANNELS.quotes.setStatus, id, status),
  },
  invoices: {
    list: (search, status) => ipcRenderer.invoke(IPC_CHANNELS.invoices.list, search, status),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.invoices.get, id),
    createFromQuote: (quoteId) =>
      ipcRenderer.invoke(IPC_CHANNELS.invoices.createFromQuote, quoteId),
    createForCustomer: (customerId) =>
      ipcRenderer.invoke(IPC_CHANNELS.invoices.createForCustomer, customerId),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.invoices.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.invoices.remove, id),
    setItems: (id, items) => ipcRenderer.invoke(IPC_CHANNELS.invoices.setItems, id, items),
    setStatus: (id, status) => ipcRenderer.invoke(IPC_CHANNELS.invoices.setStatus, id, status),
    addPayment: (id, payment) =>
      ipcRenderer.invoke(IPC_CHANNELS.invoices.addPayment, id, payment),
    removePayment: (id, paymentId) =>
      ipcRenderer.invoke(IPC_CHANNELS.invoices.removePayment, id, paymentId),
  },
  appointments: {
    list: (from, to) => ipcRenderer.invoke(IPC_CHANNELS.appointments.list, from, to),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.appointments.create, input),
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.appointments.update, id, patch),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.appointments.remove, id),
  },
  pdf: {
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.pdf.save, input),
  },
  status: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.status.list),
    update: (key, patch) => ipcRenderer.invoke(IPC_CHANNELS.status.update, key, patch),
    reorder: (orderedKeys) => ipcRenderer.invoke(IPC_CHANNELS.status.reorder, orderedKeys),
  },
  dashboard: {
    stats: () => ipcRenderer.invoke(IPC_CHANNELS.dashboard.stats),
  },
};

contextBridge.exposeInMainWorld("orweo", api);
