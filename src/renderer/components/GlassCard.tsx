import type { CSSProperties, ReactNode } from "react";

/** Karte im ORWEO-Glass-Stil (dezenter Champagne-Border, Blur). */
export function GlassCard({
  children,
  className = "",
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`glass-card rounded-xl ${onClick ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
