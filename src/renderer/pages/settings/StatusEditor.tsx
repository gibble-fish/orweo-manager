import { useEffect, useState } from "react";
import { GlassCard } from "../../components/GlassCard";
import type { StatusDefinition } from "@shared/domain";

/**
 * Editor für die Status-Definitionen: Label, Farbe und Reihenfolge anpassbar.
 * Der Schlüssel (key) und der Workflow-Ablauf bleiben fest – dadurch bleiben
 * automatische Statuswechsel und Auswertungen zuverlässig.
 */
export function StatusEditor() {
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const load = () => {
    window.orweo.status.list().then(setStatuses).catch(() => setStatuses([]));
  };

  useEffect(load, []);

  const flashSaved = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1200);
  };

  const saveLabel = async (key: string, label: string) => {
    const updated = await window.orweo.status.update(key, { label });
    setStatuses(updated);
    flashSaved(key);
  };

  const saveColor = async (key: string, color: string) => {
    const updated = await window.orweo.status.update(key, { color });
    setStatuses(updated);
    flashSaved(key);
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= statuses.length) return;
    const reordered = [...statuses];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setStatuses(reordered); // optimistisch
    const updated = await window.orweo.status.reorder(reordered.map((s) => s.key));
    setStatuses(updated);
  };

  return (
    <GlassCard className="mt-6 max-w-2xl p-6">
      <h2 className="mb-1 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
        Status
      </h2>
      <p className="mb-4 text-xs" style={{ color: "var(--app-text-muted)" }}>
        Beschriftung, Farbe und Reihenfolge sind anpassbar. Der Ablauf des
        Workflows bleibt unverändert.
      </p>

      <div className="grid gap-2">
        {statuses.map((s, index) => (
          <div
            key={s.key}
            className="flex items-center gap-3 rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--app-border)" }}
          >
            <input
              type="color"
              value={s.color ?? "#77777A"}
              onChange={(e) => saveColor(s.key, e.target.value)}
              title="Farbe"
              className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <input
              type="text"
              defaultValue={s.label}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== s.label) {
                  saveLabel(s.key, e.target.value.trim());
                }
              }}
              className="flex-1 rounded border bg-transparent px-2 py-1 text-sm outline-none focus:border-[color:var(--color-champagne)]"
              style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}
            />
            <span className="w-14 text-right text-xs" style={{ color: "var(--color-champagne)" }}>
              {savedKey === s.key ? "✓ gesp." : ""}
            </span>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="nach oben"
                className="px-1 text-xs disabled:opacity-30"
                style={{ color: "var(--app-text-muted)" }}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === statuses.length - 1}
                aria-label="nach unten"
                className="px-1 text-xs disabled:opacity-30"
                style={{ color: "var(--app-text-muted)" }}
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
