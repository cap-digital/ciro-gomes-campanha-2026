"use client";

import { useMemo, useState } from "react";
import type { CampaignRowView } from "@/lib/types";
import { StatusBadge } from "./ui/Pill";
import { METRICAS_CAMPANHAS, rotularMetricas, type MetricaId } from "@/lib/metricas";

function CampaignRow({ c, valor, rotulo }: { c: CampaignRowView; valor: string; rotulo: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
        alignItems: "center",
        background: "var(--soft)",
        border: "1px solid var(--line)",
        borderRadius: 11,
        padding: "9px 11px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
        <div style={{ fontSize: 10, color: "#6E7EA6" }}>{c.objective}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{valor}</div>
        <div style={{ fontSize: 9.5, color: "#6E7EA6" }}>{rotulo}</div>
      </div>
      <StatusBadge status={c.status} />
    </div>
  );
}

export function CampaignListPanel({
  title,
  dotColor,
  campaigns,
  resultLabel = "Resultados",
  costLabel = "Custo por resultado",
}: {
  title: string;
  dotColor: string;
  campaigns: CampaignRowView[];
  resultLabel?: string;
  costLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [metricaId, setMetricaId] = useState<MetricaId>("investimento");
  const defs = useMemo(() => rotularMetricas(resultLabel, costLabel), [resultLabel, costLabel]);
  const metrica = defs[metricaId];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => c.name.toLowerCase().includes(q));
  }, [campaigns, query]);

  return (
    <div
      style={{
        gridColumn: "span 6",
        minWidth: 0,
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        boxShadow: "var(--shadow)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: dotColor, flex: "0 0 auto" }} />
        <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{title}</span>
        <span style={{ fontSize: 10.5, color: "var(--dim)", whiteSpace: "nowrap" }}>
          {(() => {
            // Linhas de aviso (ex.: "Kwai não iniciada") não são campanhas.
            const reais = campaigns.filter((c) => c.status.toUpperCase() !== "NÃO INICIADA");
            if (!reais.length) return "sem campanhas";
            return `${query ? `${filtered.length}/${reais.length}` : reais.length} ${reais.length === 1 ? "ativa" : "ativas"}`;
          })()}
        </span>
        <select
          value={metricaId}
          onChange={(e) => setMetricaId(e.target.value as MetricaId)}
          style={{
            marginLeft: "auto",
            background: "var(--soft)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--text2)",
            fontSize: 10.5,
            fontFamily: "inherit",
            padding: "5px 7px",
            cursor: "pointer",
          }}
        >
          {METRICAS_CAMPANHAS.map((id) => (
            <option key={id} value={id}>
              {defs[id].curto}
            </option>
          ))}
        </select>
        <div style={{ position: "relative", width: 120, minWidth: 90, flex: "1 1 90px" }}>
          <span className="ms" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--dim)", pointerEvents: "none" }}>
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            style={{
              width: "100%",
              background: "var(--soft)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "6px 10px 6px 27px",
              fontSize: 11,
              color: "var(--text)",
              fontFamily: "'Inter',sans-serif",
            }}
          />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
        {filtered.length ? (
          filtered.map((c, i) => (
            <CampaignRow
              key={i}
              c={c}
              valor={c.metricas ? metrica.compacto(c.metricas[metricaId]) : c.spend}
              rotulo={metricaId === "investimento" ? `${defs.cpa.curto} ${c.cpa}` : metrica.label}
            />
          ))
        ) : (
          <div style={{ fontSize: 11.5, color: "var(--dim)", textAlign: "center", padding: "16px 0" }}>Nenhuma campanha encontrada para &quot;{query}&quot;</div>
        )}
      </div>
    </div>
  );
}
