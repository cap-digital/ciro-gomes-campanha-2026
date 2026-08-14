"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange as PickerRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { PERIOD_PRESETS, resolveRange, rangeFromPreset, type PeriodPresetId } from "@/lib/period";
import { dateBrFull } from "@/lib/format";

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const params = Object.fromEntries(searchParams.entries());
  const range = resolveRange(params);
  const [draft, setDraft] = useState<PickerRange | undefined>({ from: toDate(range.since), to: toDate(range.until) });

  useEffect(() => {
    setDraft({ from: toDate(range.since), to: toDate(range.until) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.since, range.until]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function applyRange(since: string, until: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("since", since);
    next.set("until", until);
    next.delete("period");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    setOpen(false);
  }

  function applyPreset(id: PeriodPresetId) {
    const r = rangeFromPreset(id);
    applyRange(r.since, r.until);
  }

  const label = `${dateBrFull(range.since).slice(0, 5)} – ${dateBrFull(range.until).slice(0, 5)}`;

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          background: "var(--soft)",
          border: "1px solid var(--line)",
          color: "var(--text)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "7px 12px",
          borderRadius: 10,
          fontFamily: "'Inter',sans-serif",
        }}
      >
        <span className="ms" style={{ fontSize: 15, color: "#35D0FF" }}>
          calendar_month
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{label}</span>
        <span className="ms" style={{ fontSize: 15, color: "var(--dim)" }}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 50,
            background: "var(--panel2)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            boxShadow: "var(--shadow)",
            padding: 14,
            display: "flex",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 96 }}>
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  color: "var(--text2)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 10px",
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {p.label}
              </button>
            ))}
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <button
              disabled={!draft?.from || !draft?.to}
              onClick={() => draft?.from && draft?.to && applyRange(toISO(draft.from), toISO(draft.to))}
              style={{
                cursor: draft?.from && draft?.to ? "pointer" : "not-allowed",
                background: "#2E8FFF",
                border: "none",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "9px 10px",
                borderRadius: 8,
                opacity: draft?.from && draft?.to ? 1 : 0.5,
              }}
            >
              Aplicar período
            </button>
          </div>
          <DayPicker
            mode="range"
            locale={ptBR}
            selected={draft}
            onSelect={setDraft}
            numberOfMonths={2}
            defaultMonth={toDate(range.until)}
            disabled={{ after: new Date() }}
          />
        </div>
      )}
    </div>
  );
}
