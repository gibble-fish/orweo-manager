import type { ComponentType, SVGProps } from "react";
import {
  IconCalendar,
  IconDashboard,
  IconFolder,
  IconInbox,
  IconInvoice,
  IconQuote,
  IconSettings,
  IconTag,
  IconUsers,
} from "./components/icons";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Hauptbereiche der Navigation (Reihenfolge gemäß Master-Prompt). */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: IconDashboard },
  { path: "/anfragen", label: "Anfragen", icon: IconInbox },
  { path: "/kunden", label: "Kunden", icon: IconUsers },
  { path: "/projekte", label: "Projekte / Aufträge", icon: IconFolder },
  { path: "/angebote", label: "Angebote", icon: IconQuote },
  { path: "/rechnungen", label: "Rechnungen", icon: IconInvoice },
  { path: "/leistungen", label: "Leistungen & Pakete", icon: IconTag },
  { path: "/kalender", label: "Kalender / Termine", icon: IconCalendar },
  { path: "/einstellungen", label: "Einstellungen", icon: IconSettings },
];
