import { DollarSign, TrendingUp, Calendar, Coins } from "lucide-react";
import { useIndicadores } from "../services/indicadores.js";

const fmtCLP = (n) => n != null
  ? `$${n.toLocaleString("es-CL", { maximumFractionDigits: n >= 1000 ? 0 : 2 })}`
  : "—";

export default function IndicadoresBanner({ T }) {
  const { data, loading, error } = useIndicadores();

  if (loading || error || !data) return null;

  const fechaStr = data.fecha
    ? new Date(data.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  const items = [
    { label: "UF", valor: fmtCLP(data.uf), icon: TrendingUp, color: T.accent, bg: T.accentBg },
    { label: "Dólar", valor: fmtCLP(data.dolar), icon: DollarSign, color: T.green, bg: T.greenBg },
    { label: "Euro", valor: fmtCLP(data.euro), icon: Coins, color: T.violet, bg: T.violetBg },
    { label: "UTM", valor: fmtCLP(data.utm), icon: Coins, color: T.amber, bg: T.amberBg },
  ];

  return (
    <div style={{
      background: T.bg2,
      borderBottom: `1px solid ${T.border}`,
      padding: "14px 24px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          flex: "1 1 auto",
        }}>
          {items.map((i, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: i.bg,
              border: `1px solid ${i.color}33`,
              borderRadius: 12,
              padding: "12px 18px",
              minWidth: 170,
              flex: "1 1 auto",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: i.color + "22",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <i.icon size={20} color={i.color}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  color: T.txM,
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}>
                  {i.label}
                </div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: i.color,
                  letterSpacing: -0.5,
                  lineHeight: 1.1,
                  fontFamily: "'SF Mono', ui-monospace, Menlo, Consolas, monospace",
                }}>
                  {i.valor}
                </div>
              </div>
            </div>
          ))}
        </div>
        {fechaStr && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: T.txD,
            fontWeight: 500,
            whiteSpace: "nowrap",
            paddingRight: 4,
          }}>
            <Calendar size={12}/>
            {fechaStr} · mindicador.cl
          </div>
        )}
      </div>
    </div>
  );
}
