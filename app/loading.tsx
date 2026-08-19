/**
 * Estado de carregamento das rotas.
 *
 * Sem este arquivo o Next segura a navegação inteira até o servidor terminar de
 * falar com a Meta — e há rotas que levam segundos no cache frio, durante os
 * quais a tela fica parada, sem sinal nenhum. Com ele o esqueleto aparece na
 * hora e o conteúdo entra por streaming quando fica pronto.
 */
export default function Loading() {
  const bloco = (altura: number | string): React.CSSProperties => ({
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 18,
    boxShadow: "var(--shadow)",
    height: altura,
    minHeight: 0,
    position: "relative",
    overflow: "hidden",
  });

  return (
    <div className="pag" style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }} aria-busy="true" aria-live="polite">
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Carregando dados da Meta…
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skel" style={bloco(92)} />
        ))}
      </div>
      <div className="emp" style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 12, minHeight: 0 }}>
        <div className="skel" style={bloco("100%")} />
        <div className="skel" style={bloco("100%")} />
      </div>
    </div>
  );
}
