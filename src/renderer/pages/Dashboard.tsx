import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import type { DashboardStats } from "@shared/ipc";

const CARDS: { key: keyof DashboardStats; label: string; kind?: "count" | "money" }[] = [
  { key: "newInquiries", label: "Neue Anfragen" },
  { key: "inquiriesInProgress", label: "Anfragen in Bearbeitung" },
  { key: "openQuotes", label: "Offene Angebote" },
  { key: "acceptedQuotes", label: "Angenommene Angebote" },
  { key: "upcomingAppointments", label: "Bevorstehende Termine" },
  { key: "runningProductions", label: "Laufende Produktionen" },
  { key: "openInvoices", label: "Offene Rechnungen" },
  { key: "overdueInvoices", label: "Überfällige Rechnungen" },
  { key: "revenueThisYear", label: "Umsatz (Jahr)", kind: "money" },
];

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    window.orweo.dashboard.stats().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Dashboard" subtitle="Überblick über alle laufenden Vorgänge" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {CARDS.map((card) => {
          const value = stats?.[card.key] ?? 0;
          return (
            <GlassCard key={card.key} className="p-5">
              <div className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--app-text-muted)" }}>
                {card.label}
              </div>
              <div className="mt-3 text-4xl font-normal" style={{ color: "var(--color-champagne)" }}>
                {card.kind === "money" ? euro(value) : value}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-base uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
          Aktuelle Vorgänge
        </h2>
        <GlassCard className="p-8 text-center">
          <p className="text-base" style={{ color: "var(--app-text-muted)" }}>
            Noch keine Vorgänge vorhanden. Sobald Anfragen, Angebote und
            Rechnungen erfasst sind, erscheinen sie hier.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
