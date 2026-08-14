"use client";

import { useMemo, useState } from "react";
import { brl, num } from "@/lib/format";

type Baseline = {
  cpaBase: Record<string, [number, number]>;
  cpmBase: Record<string, [number, number]>;
  source: "live" | "mock";
};

const FOCOS = [
  { id: "cadastros", label: "Cadastros" },
  { id: "alcance", label: "Alcance" },
  { id: "video", label: "Vídeo" },
] as const;

const SCENARIO_PCTS = [0, 25, 38, 50, 75, 100];

export function SimuladorClient({ baseline }: { baseline: Baseline }) {
  const [verba, setVerba] = useState(320000);
  const [kwaiPct, setKwaiPct] = useState(38);
  const [foco, setFoco] = useState<(typeof FOCOS)[number]["id"]>("cadastros");

  const calc = useMemo(() => {
    const cpaBase = baseline.cpaBase[foco];
    const cpmBase = baseline.cpmBase[foco];
    const kSpend = (verba * kwaiPct) / 100;
    const mSpend = verba - kSpend;
    const simCad = Math.round(kSpend / cpaBase[0] + mSpend / cpaBase[1]);
    const simCpa = simCad ? verba / simCad : 0;
    const simImp = Math.round((kSpend / cpmBase[0] + mSpend / cpmBase[1]) * 1000);
    const simAlc = Math.round(simImp / 2.4);
    const scenarioCad = (pct: number) => Math.round(((verba * pct) / 100) / cpaBase[0] + ((verba * (100 - pct)) / 100) / cpaBase[1]);
    const scen = SCENARIO_PCTS.map((p) => ({ p, v: scenarioCad(p) }));
    const scenMax = Math.max(...scen.map((x) => x.v), 1);
    const best = scen.reduce((a, b) => (b.v > a.v ? b : a));
    return { kSpend, mSpend, simCad, simCpa, simImp, simAlc, scen, scenMax, best };
  }, [verba, kwaiPct, foco, baseline]);

  const focoLabel = FOCOS.find((f) => f.id === foco)?.label ?? "Cadastros";

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: 12, minHeight: 0 }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20, minHeight: 0, overflow: "auto" }}>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 15 }}>Alocação de verba</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Verba do período</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 19 }}>{brl(verba, 0)}</span>
          </div>
          <input type="range" min={50000} max={800000} step={10000} value={verba} onChange={(e) => setVerba(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Divisão Kwai × Meta</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
              <span style={{ color: "#FF9E4D" }}>{kwaiPct}% Kwai</span> · <span style={{ color: "#93C3FF" }}>{100 - kwaiPct}% Meta</span>
            </span>
          </div>
          <input type="range" min={0} max={100} step={1} value={kwaiPct} onChange={(e) => setKwaiPct(Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", background: "var(--track)" }}>
            <div style={{ width: `${kwaiPct}%`, background: "#FF7A00" }} />
            <div style={{ width: `${100 - kwaiPct}%`, background: "#2E8FFF" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Estratégia principal</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FOCOS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFoco(f.id)}
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "6px 11px",
                  borderRadius: 8,
                  background: foco === f.id ? "#F5B301" : "transparent",
                  color: foco === f.id ? "#fff" : "var(--muted)",
                  border: foco === f.id ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", background: "rgba(53,208,255,.08)", border: "1px solid rgba(53,208,255,.22)", borderRadius: 12, padding: "13px 15px", fontSize: 12, lineHeight: 1.6, color: "var(--text2)" }}>
          Com foco em {focoLabel.toLowerCase()}, a melhor divisão simulada é {calc.best.p}% no Kwai. A divisão atual entrega {num(calc.simCad)} cadastros a{" "}
          {brl(calc.simCpa)} cada.
          {baseline.source === "mock" && <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--dim)" }}>Estimativa com CPA/CPM base ilustrativos.</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 12, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Cadastros projetados", value: num(calc.simCad), note: "com a divisão atual" },
            { label: "CPA projetado", value: brl(calc.simCpa), note: "média ponderada" },
            { label: "Impressões", value: (calc.simImp / 1e6).toFixed(2).replace(".", ",") + " mi", note: "estimativa de entrega" },
            { label: "Alcance único", value: (calc.simAlc / 1e6).toFixed(2).replace(".", ",") + " mi", note: "frequência 2,4" },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "14px 15px", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(16px,1.8vw,25px)", color: "#35D0FF" }}>{k.value}</div>
              <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{k.note}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow)", padding: "14px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>Projeção por cenário</div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 14, paddingBottom: 22, position: "relative" }}>
            {calc.scen.map((c, i) => (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6, position: "relative" }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: "var(--text2)" }}>{num(c.v)}</div>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.round((c.v / calc.scenMax) * 100)}%`,
                    borderRadius: "7px 7px 3px 3px",
                    background: c.p === kwaiPct ? "linear-gradient(180deg,#35D0FF,#2E8FFF)" : "rgba(46,143,255,.28)",
                    border: c.p === kwaiPct ? "1px solid rgba(53,208,255,.6)" : "1px solid transparent",
                  }}
                />
                <div style={{ position: "absolute", bottom: -19, fontSize: 9.5, color: "var(--muted)", whiteSpace: "nowrap" }}>{c.p}% Kwai</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Distribuição sugerida</div>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            {[
              { label: "Kwai Ads", value: brl(calc.kSpend, 0) },
              { label: "Meta Ads", value: brl(calc.mSpend, 0) },
              { label: "RMS", value: brl(verba * 0.42, 0) },
              { label: "Interior", value: brl(verba * 0.58, 0) },
            ].map((d, i) => (
              <div key={i} style={{ background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 9, padding: "7px 11px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{d.value}</span>
                <span style={{ fontSize: 9.5, color: "var(--muted)" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
