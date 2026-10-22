import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { GlassCard } from "../components/GlassCard";
import { IconPlus } from "../components/icons";
import { AppointmentEditorModal } from "./calendar/AppointmentEditorModal";
import type { Customer } from "@shared/domain";
import type { AppointmentListRow } from "@shared/ipc";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** ISO-Datum (YYYY-MM-DD) für ein Jahr/Monat/Tag ohne Zeitzonen-Verschiebung. */
function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Montagsbasierter Wochentag-Index (0 = Mo … 6 = So). */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

const formatTime = (t: string | null) => (t ? t.slice(0, 5) : "");

/**
 * Kalender- und Terminübersicht. Monatsraster links, Terminliste des Monats
 * rechts. Klick auf einen Tag legt einen Termin mit vorbelegtem Datum an,
 * Klick auf einen Termin öffnet ihn zum Bearbeiten.
 */
export function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appointments, setAppointments] = useState<AppointmentListRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<{ id: number; label: string }[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentListRow | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const monthStart = isoDate(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = isoDate(year, month, daysInMonth);

  const load = useCallback(() => {
    window.orweo.appointments
      .list(monthStart, monthEnd)
      .then(setAppointments)
      .catch(() => setAppointments([]));
  }, [monthStart, monthEnd]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.orweo.customers.list().then(setCustomers).catch(() => setCustomers([]));
    window.orweo.projects
      .list()
      .then((rows) =>
        setProjects(rows.map((p) => ({ id: p.id, label: `${p.projectNumber} · ${p.name}` }))),
      )
      .catch(() => setProjects([]));
  }, []);

  // Termine nach Tag (1…31) gruppieren.
  const byDay = useMemo(() => {
    const map = new Map<number, AppointmentListRow[]>();
    for (const a of appointments) {
      const day = Number(a.date.slice(8, 10));
      const list = map.get(day) ?? [];
      list.push(a);
      map.set(day, list);
    }
    return map;
  }, [appointments]);

  // Führende Leerzellen bis zum ersten Wochentag.
  const leadingBlanks = mondayIndex(new Date(year, month, 1).getDay());

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const openNew = (date?: string) => {
    setEditing(null);
    setDefaultDate(date ?? isoDate(year, month, 1));
    setEditorOpen(true);
  };

  const openEdit = (appointment: AppointmentListRow) => {
    setEditing(appointment);
    setDefaultDate(undefined);
    setEditorOpen(true);
  };

  const todayIso = today.toISOString().slice(0, 10);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Kalender / Termine"
        subtitle="Produktionstermine planen und Terminen Projekte zuordnen"
        actions={
          <button type="button" className="btn-primary" onClick={() => openNew()}>
            <IconPlus width={16} height={16} />
            Neuer Termin
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-sm" onClick={prevMonth}>
          ←
        </button>
        <h2 className="min-w-48 text-center text-lg font-light tracking-wide">
          {MONTHS[month]} {year}
        </h2>
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-sm" onClick={nextMonth}>
          →
        </button>
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={goToday}>
          Heute
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Monatsraster */}
        <GlassCard className="p-4">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = isoDate(year, month, day);
              const dayAppts = byDay.get(day) ?? [];
              const isToday = iso === todayIso;
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => openNew(iso)}
                  className="flex min-h-20 flex-col rounded-lg border p-1.5 text-left transition-colors hover:bg-[rgba(212,195,161,0.06)]"
                  style={{
                    borderColor: isToday ? "var(--color-champagne)" : "var(--app-border)",
                  }}
                >
                  <span className="text-xs" style={{ color: isToday ? "var(--color-champagne)" : "var(--app-text-muted)" }}>
                    {day}
                  </span>
                  <span className="mt-1 flex flex-col gap-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(a);
                        }}
                        className="truncate rounded px-1 py-0.5 text-[10px]"
                        style={{ background: "rgba(212,195,161,0.15)", color: "var(--app-text)" }}
                        title={a.title}
                      >
                        {formatTime(a.time)} {a.title}
                      </span>
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="text-[10px]" style={{ color: "var(--app-text-muted)" }}>
                        +{dayAppts.length - 3} weitere
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Terminliste des Monats */}
        <GlassCard className="p-4">
          <h3 className="mb-3 text-sm uppercase tracking-[0.2em]" style={{ color: "var(--app-text-muted)" }}>
            Termine im {MONTHS[month]}
          </h3>
          <div className="flex flex-col gap-2">
            {appointments.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => openEdit(a)}
                className="rounded-lg border p-3 text-left transition-colors hover:bg-[rgba(212,195,161,0.06)]"
                style={{ borderColor: "var(--app-border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{a.title}</span>
                  <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                    {new Date(a.date).toLocaleDateString("de-DE")} {formatTime(a.time)}
                  </span>
                </div>
                {(a.projectName || a.customerName || a.location) && (
                  <div className="mt-1 text-xs" style={{ color: "var(--app-text-muted)" }}>
                    {[a.projectName, a.customerName, a.location].filter(Boolean).join(" · ")}
                  </div>
                )}
              </button>
            ))}
            {appointments.length === 0 && (
              <p className="py-6 text-center text-xs" style={{ color: "var(--app-text-muted)" }}>
                Keine Termine in diesem Monat. Klicke auf einen Tag, um einen anzulegen.
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      <AppointmentEditorModal
        open={editorOpen}
        appointment={editing}
        defaultDate={defaultDate}
        customers={customers}
        projects={projects}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
