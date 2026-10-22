import { HashRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./theme";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./pages/Dashboard";
import { ServicesAndPackages } from "./pages/ServicesAndPackages";
import { Customers } from "./pages/Customers";
import { Inquiries } from "./pages/Inquiries";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Quotes } from "./pages/Quotes";
import { QuoteDetail } from "./pages/QuoteDetail";
import { Invoices } from "./pages/Invoices";
import { InvoiceDetail } from "./pages/InvoiceDetail";
import { Calendar } from "./pages/Calendar";
import { Settings } from "./pages/Settings";

/**
 * App-Shell: feste Sidebar + Topbar, scrollbarer Inhaltsbereich.
 * HashRouter, weil der Produktivbuild per file:// geladen wird (kein Server-Routing).
 */
export function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--app-bg)" }}>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto px-8 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/anfragen" element={<Inquiries />} />
                <Route path="/kunden" element={<Customers />} />
                <Route path="/projekte" element={<Projects />} />
                <Route path="/projekte/:id" element={<ProjectDetail />} />
                <Route path="/angebote" element={<Quotes />} />
                <Route path="/angebote/:id" element={<QuoteDetail />} />
                <Route path="/rechnungen" element={<Invoices />} />
                <Route path="/rechnungen/:id" element={<InvoiceDetail />} />
                <Route path="/leistungen" element={<ServicesAndPackages />} />
                <Route path="/kalender" element={<Calendar />} />
                <Route path="/einstellungen" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}
