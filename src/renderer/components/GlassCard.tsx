import type { ReactNode } from "react";

/** Karte im ORWEO-Glass-Stil (dezenter Champagne-Border, Blur). */
export function GlassCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl ${onClick ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
