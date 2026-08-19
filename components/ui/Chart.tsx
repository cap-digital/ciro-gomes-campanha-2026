import { svgPath, svgPontos } from "@/lib/style";

export type ChartLine = {
  values: number[];
  color: string;
  width?: number;
  dashed?: boolean;
  areaFill?: string;
  /** Como escrever o valor no rótulo. Sem isto a linha não ganha rótulo. */
  fmt?: (v: number) => string;
};

/**
 * Quais pontos ganham rótulo.
 *
 * Rotular todos os pontos de uma série longa vira borrão. Acima de dez pontos o
 * rótulo passa a aparecer de N em N, sempre incluindo o primeiro e o último —
 * que são os que o olho procura para ler início e fim do período.
 */
function indicesRotulados(n: number): Set<number> {
  if (n <= 10) return new Set(Array.from({ length: n }, (_, i) => i));
  const passo = Math.ceil((n - 1) / 7);
  const s = new Set<number>();
  for (let i = 0; i < n; i += passo) s.add(i);
  s.add(n - 1);
  return s;
}

export function SvgLines({ lines, height = 34, rotulos = false }: { lines: ChartLine[]; height?: number; rotulos?: boolean }) {
  if (!lines.length || lines.every((l) => !l.values.length)) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontSize: 11 }}>
        sem dados no período
      </div>
    );
  }

  /**
   * Os rótulos são HTML por cima do SVG, não `<text>` dentro dele: o gráfico usa
   * `preserveAspectRatio="none"`, que estica o desenho na horizontal — e
   * esticaria a tipografia junto, deixando os números deformados.
   */
  if (rotulos) {
    const comFmt = lines.map((l, i) => ({ l, i })).filter((x) => x.l.fmt && x.l.values.length >= 2);
    const pontos = new Map(comFmt.map((x) => [x.i, svgPontos(x.l.values, height)]));
    const marcados = indicesRotulados(Math.max(...comFmt.map((x) => x.l.values.length), 0));

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Linhas lines={lines} height={height} />
        {[...marcados].flatMap((j) => {
          /**
           * Acima ou abaixo é decidido PONTO A PONTO, pela ordem real das
           * linhas ali. Com um lado fixo por série, no trecho em que as linhas
           * se cruzam os dois números caíam no mesmo vão e um cobria o outro.
           * A linha que estiver por cima naquele ponto escreve para cima; as de
           * baixo escrevem para baixo, empilhadas.
           */
          const naOrdem = comFmt
            .map((x) => ({ ...x, p: pontos.get(x.i)![j] }))
            .filter((x) => x.p)
            .sort((a, b) => a.p.yPct - b.p.yPct);

          return naOrdem.map((x, rank) => {
            const n = x.l.values.length;
            const dx = j === 0 ? "0" : j === n - 1 ? "-100%" : "-50%";
            const dy = rank === 0 ? "-135%" : `${35 + (rank - 1) * 120}%`;
            return (
              <span
                key={`${x.i}-${j}`}
                style={{
                  position: "absolute",
                  left: `${x.p.xPct}%`,
                  top: `${x.p.yPct}%`,
                  transform: `translate(${dx}, ${dy})`,
                  fontFamily: "'Inter',sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 9,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: x.l.color,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {x.l.fmt!(x.p.v)}
              </span>
            );
          });
        })}
      </div>
    );
  }
  return <Linhas lines={lines} height={height} />;
}

function Linhas({ lines, height }: { lines: ChartLine[]; height: number }) {
  return (
    <svg className="grafico" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      {lines.map(
        (l, i) => l.areaFill && <path key={"a" + i} d={svgPath(l.values, 100, height, true)} fill={l.areaFill} />,
      )}
      {lines.map((l, i) => (
        <path
          key={i}
          d={svgPath(l.values, 100, height)}
          fill="none"
          stroke={l.color}
          strokeWidth={l.width ?? 0.8}
          strokeDasharray={l.dashed ? "3 3" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function DayAxis({ labels }: { labels: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: "'Inter',sans-serif",
        fontVariantNumeric: "tabular-nums",
        fontSize: 9.5,
        color: "var(--dim)",
        paddingTop: 6,
      }}
    >
      {labels.map((d, i) => (
        <span key={i}>{d}</span>
      ))}
    </div>
  );
}
