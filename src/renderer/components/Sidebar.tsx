import { NavLink } from "react-router-dom";
import { OrweoLogo } from "./OrweoLogo";
import { NAV_ITEMS } from "../navigation";
import { useTheme } from "../theme";

export function Sidebar() {
  const { theme } = useTheme();

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r"
      style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
    >
      <div className="flex h-24 items-center px-6">
        <OrweoLogo className="h-9" variant={theme === "light" ? "dark" : "light"} />
      </div>

      <div className="divider-champagne mx-4" />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors ${
                      isActive
                        ? "font-medium text-[color:var(--app-text)]"
                        : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                    }`
                  }
                  style={({ isActive }: { isActive: boolean }) =>
                    isActive
                      ? { background: "rgba(212,195,161,0.10)", boxShadow: "inset 2px 0 0 var(--color-champagne)" }
                      : undefined
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        width={22}
                        height={22}
                        style={{ color: isActive ? "var(--color-champagne)" : undefined }}
                        className="shrink-0"
                      />
                      <span className="truncate tracking-wide">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-4 text-xs tracking-[0.2em] uppercase" style={{ color: "var(--app-text-muted)" }}>
        Abrechnungssystem
      </div>
    </aside>
  );
}
