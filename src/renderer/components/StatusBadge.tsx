import type { StatusDefinition, WorkflowStatus } from "@shared/domain";

/**
 * Farbiges Status-Etikett. Farbe/Label kommen aus den status_definitions
 * (in den Einstellungen editierbar). Fällt auf den Schlüssel zurück, wenn
 * keine Definition vorliegt.
 */
export function StatusBadge({
  status,
  statuses,
}: {
  status: WorkflowStatus;
  statuses: StatusDefinition[];
}) {
  const def = statuses.find((s) => s.key === status);
  const color = def?.color ?? "#77777A";
  const label = def?.label ?? status;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap"
      style={{
        color,
        background: "rgba(212,195,161,0.06)",
        border: `1px solid ${color}44`,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
