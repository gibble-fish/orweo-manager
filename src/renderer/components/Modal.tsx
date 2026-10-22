import { useEffect, type ReactNode } from "react";

/**
 * Schlichtes, zentriertes Modal im ORWEO-Glass-Stil.
 * Schließt bei Escape und Klick auf den Backdrop.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind-Klasse für die maximale Breite (Standard: max-w-lg). */
  maxWidthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(6,6,8,0.72)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`glass-card w-full ${maxWidthClass} rounded-xl animate-scale-in`}
        style={{ background: "var(--app-card)", borderColor: "var(--app-border)" }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--app-border)" }}
        >
          <h3 className="text-lg font-light tracking-wide">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="grid h-8 w-8 place-items-center rounded-lg text-lg transition-colors hover:text-[color:var(--color-champagne)]"
            style={{ color: "var(--app-text-muted)" }}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div
            className="flex items-center justify-end gap-2 border-t px-6 py-4"
            style={{ borderColor: "var(--app-border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
