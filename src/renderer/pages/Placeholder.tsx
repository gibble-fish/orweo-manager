import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";

/**
 * Einheitlicher Modul-Platzhalter. Wird in den kommenden Modulen (Anfragen,
 * Kunden, Projekte, Angebote, Rechnungen, Kalender) durch die echte
 * Implementierung ersetzt.
 */
export function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="animate-fade-in-up">
      <PageHeader title={title} subtitle={subtitle} />
      <GlassCard className="p-10 text-center">
        <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
          Dieses Modul wird als Nächstes gebaut. Das Datenmodell und die
          IPC-Schnittstelle stehen bereits – hier folgt die Oberfläche.
        </p>
      </GlassCard>
    </div>
  );
}
