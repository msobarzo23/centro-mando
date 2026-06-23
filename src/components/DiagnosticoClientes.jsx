import { TrendingDown, ArrowRight } from "lucide-react";
import { fmtPctArrow } from "../utils.js";

// Estilo de la píldora de hipótesis según la causa probable.
const hipStyle = (T) => ({
  cliente: { c: T.accent, bg: T.accentBg },
  nuestra: { c: T.red, bg: T.redBg },
  mixto: { c: T.amber, bg: T.amberBg },
  neutro: { c: T.txM, bg: T.bg3 },
});

export default function DiagnosticoClientes({ data, T }) {
  if (!data || data.length === 0) return null;
  const hs = hipStyle(T);
  const nivelColor = { rojo: T.red, amarillo: T.amber };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.tx, letterSpacing: -0.3 }}>Clientes en alerta — diagnóstico</h3>
        <span style={{ fontSize: 11, color: T.txD, fontWeight: 600 }}>caída + hipótesis de causa</span>
      </div>
      <div style={{ fontSize: 11.5, color: T.txD, lineHeight: 1.45, marginTop: -8 }}>
        Compara el ritmo reciente de cada cliente con su propia norma y lo cruza con el estado de los tractos que lo atienden.
        La causa es una <strong>hipótesis</strong> para orientar la conversación, no un dato confirmado.
      </div>

      {data.map((d, i) => {
        const nc = nivelColor[d.nivel] || T.amber;
        const h = hs[d.hipTipo] || hs.neutro;
        return (
          <div key={i} style={{ background: T.card, border: `1px solid ${nc}33`, borderLeft: `3px solid ${nc}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Encabezado: cliente + peso */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <TrendingDown size={16} color={nc} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: T.tx }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.txM, background: T.bg3, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>
                {(d.peso * 100).toFixed(0)}% de los viajes
              </span>
            </div>

            {/* Señales de caída */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {d.dropSemanal != null && (
                <div style={{ fontSize: 12, color: T.txM }}>
                  <span style={{ color: T.txD }}>Esta semana </span>
                  <strong style={{ color: T.tx }}>{d.viajes7d}</strong>
                  <span style={{ color: T.txD }}> vs norma {d.norma7d} </span>
                  <strong style={{ color: d.dropSemanal < 0 ? T.red : T.green }}>{fmtPctArrow(d.dropSemanal)}</strong>
                </div>
              )}
              {d.dropMensual != null && (
                <div style={{ fontSize: 12, color: T.txM }}>
                  <span style={{ color: T.txD }}>Proy. cierre </span>
                  <strong style={{ color: T.tx }}>{d.proyCierre}</strong>
                  <span style={{ color: T.txD }}> vs {d.mesAnt} mes ant. </span>
                  <strong style={{ color: d.dropMensual < 0 ? T.red : T.green }}>{fmtPctArrow(d.dropMensual)}</strong>
                </div>
              )}
            </div>

            {/* Hipótesis */}
            <div style={{ alignSelf: "flex-start", background: h.bg, border: `1px solid ${h.c}44`, borderRadius: 8, padding: "4px 11px" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: h.c, textTransform: "uppercase", letterSpacing: 0.4 }}>{d.hip}</span>
            </div>

            {/* Evidencia */}
            {d.evidencia.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
                {d.evidencia.map((e, j) => (
                  <li key={j} style={{ fontSize: 12, color: T.txM, lineHeight: 1.4 }}>{e}</li>
                ))}
              </ul>
            )}

            {/* Sugerencia */}
            {d.sugerencia && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: h.c, fontWeight: 600, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                <ArrowRight size={14} style={{ flexShrink: 0 }} />{d.sugerencia}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
