import { useNavigate } from "react-router-dom";
import { IconMoon, IconPlus, IconSearch, IconSun } from "./icons";
import { useTheme } from "../theme";

/**
 * Schnellaktionen der Kopfleiste.
 * - label: Beschriftung auf dem Button.
 * - to: Zielroute.
 * - openNew: true → die Zielseite öffnet automatisch ihr „Neu anlegen"-Formular
 *   (via ?new=1). Angebote/Rechnungen entstehen aus Projekt/Angebot, daher wird
 *   dort nur die Liste geöffnet (openNew=false) – mit Hinweistext auf der Seite.
 */
const QUICK_ACTIONS: { label: string; short: string; to: string; openNew: boolean }[] = [
  { label: "Neue Anfrage", short: "Anfrage", to: "/anfragen", openNew: true },
  { label: "Neuer Kunde", short: "Kunde", to: "/kunden", openNew: true },
  { label: "Neues Angebot", short: "Angebot", to: "/angebote", openNew: false },
  { label: "Neuer Auftrag", short: "Auftrag", to: "/projekte", openNew: true },
  { label: "Neue Rechnung", short: "Rechnung", to: "/rechnungen", openNew: false },
];

/**
 * Kopfleiste mit globaler Sofort-Suche (Platzhalter im Gerüst) und
 * Schnellaktionen. Die Aktionen öffnen die passende Seite und starten dort
 * direkt das Anlegen-Formular.
 */
export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const runAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    navigate(action.openNew ? `${action.to}?new=1` : action.to);
  };

  return (
    <header
      className="flex h-24 shrink-0 items-center gap-4 border-b px-6"
      style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
    >
      <div className="relative w-full max-w-md">
        <IconSearch
          width={20}
          height={20}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--app-text-muted)" }}
        />
        <input
          type="search"
          placeholder="Suche: Kunden, Projekte, Angebote, Rechnungen …"
          className="w-full rounded-lg border bg-transparent py-3 pl-11 pr-3 text-base outline-none transition-colors focus:border-[color:var(--color-champagne)]"
          style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              onClick={() => runAction(action)}
              className="btn-secondary !px-3.5 !py-2.5 text-sm"
            >
              <IconPlus width={16} height={16} />
              <span className="hidden xl:inline">{action.short}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Zum hellen Design wechseln" : "Zum dunklen Design wechseln"}
          aria-label="Design umschalten"
          className="grid h-11 w-11 place-items-center rounded-lg border transition-colors hover:border-[color:var(--color-champagne)]"
          style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  );
}
