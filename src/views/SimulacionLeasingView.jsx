import { useState, useEffect, useRef, useMemo } from "react";
import {
  Calculator, Truck, DollarSign, Banknote, TrendingUp, Info, Coins,
} from "lucide-react";
import { fmtFull } from "../utils.js";
import { IVA_RATE } from "../constants.js";
import { useIndicadores } from "../services/indicadores.js";
import SectionCard from "../components/SectionCard.jsx";

// ── Valores por defecto alineados con la Simulación Banchile N° 352449 (19-12-2025)
// y con el informe interno "Leasing 50 Tractos" que ya se entregó a Gerencia ──
// Tasa mensual implícita 0,277218% (anual efectiva 3,38%), pie 50%, opción de compra
// = 1 cuota. Escenario base de evaluación: tracto nuevo a USD 160.000. La UF y el
// dólar se prellenan con el valor de hoy; estos fallbacks solo aplican si falla la API.
const UF_FALLBACK = 40661.48;
const DOLAR_FALLBACK = 900;
const TASA_MES_DEFAULT = "0.277218";

// Convierte un string de input a número, devolviendo 0 si no es válido.
const num = (s) => {
  const n = parseFloat(String(s).replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const fmtUF = (x) => (x || 0).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " UF";

// Campo de entrada. Definido a nivel de módulo (no dentro de la vista) para que el
// input NO se remonte en cada render y conserve el foco al escribir.
function Field({ T, label, value, onChange, suffix, hint, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.txM, letterSpacing: 0.2 }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: suffix ? "9px 44px 9px 12px" : "9px 12px",
            background: T.bg3 + "66", border: `1px solid ${accent ? T.accent + "55" : T.border}`, borderRadius: 9,
            color: T.tx, fontSize: 15, fontWeight: 600, outline: "none",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 12, fontSize: 11, color: T.txD, fontWeight: 600, pointerEvents: "none" }}>{suffix}</span>}
      </div>
      {hint && <span style={{ fontSize: 10, color: T.txD }}>{hint}</span>}
    </div>
  );
}

// Tarjeta de resultado grande.
function ResultCard({ T, label, ufVal, clpVal, color, colorBg, icon: Icon, big, foot }) {
  return (
    <div style={{ flex: big ? "1 1 240px" : "1 1 180px", background: colorBg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${color}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: big ? 28 : 22, fontWeight: 800, color: T.tx, letterSpacing: -0.6, lineHeight: 1.1 }}>{fmtUF(ufVal)}</div>
      <div style={{ fontSize: 12.5, color: T.txM, fontWeight: 600, marginTop: 3 }}>{fmtFull(clpVal)}</div>
      {foot && <div style={{ fontSize: 10.5, color: T.txD, marginTop: 5 }}>{foot}</div>}
    </div>
  );
}

export default function SimulacionLeasingView({ T }) {
  const { data: ind } = useIndicadores();

  const [tractos, setTractos] = useState("1");
  const [valorUSD, setValorUSD] = useState("160000");
  const [pie, setPie] = useState("50");
  const [plazo, setPlazo] = useState("36");
  const [tasaMes, setTasaMes] = useState(TASA_MES_DEFAULT);
  const [uf, setUf] = useState(String(UF_FALLBACK));
  const [dolar, setDolar] = useState(String(DOLAR_FALLBACK));

  // Prellenar UF y dólar con los valores en vivo (una sola vez, sin pisar ediciones).
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !ind) return;
    if (ind.uf) setUf(String(Math.round(ind.uf * 100) / 100));
    if (ind.dolar) setDolar(String(Math.round(ind.dolar)));
    prefilled.current = true;
  }, [ind]);

  const r = useMemo(() => {
    const nTractos = Math.max(0, num(tractos));
    const usd = num(valorUSD);
    const d = num(dolar);
    const ufv = num(uf);
    const piePct = num(pie) / 100;
    const n = Math.max(1, Math.round(num(plazo)));
    const i = num(tasaMes) / 100;

    const valorUnitCLP = usd * d;
    const valorTotalCLP = valorUnitCLP * nTractos;
    const valorUF = ufv > 0 ? valorTotalCLP / ufv : 0;
    const pieUF = valorUF * piePct;
    const financiadoUF = valorUF - pieUF;

    // Cuota: opción de compra = 1 cuota. Capital = Cuota·[(1-v^n)/i + v^n].
    const v = 1 / (1 + i);
    const an = i > 0 ? (1 - Math.pow(v, n)) / i : n;
    const factor = an + Math.pow(v, n);
    const cuotaUF = factor > 0 ? financiadoUF / factor : 0;
    const opcionUF = cuotaUF;

    const totalCuotasUF = cuotaUF * n;
    const costoTotalUF = pieUF + totalCuotasUF + opcionUF;
    const costoFinancieroUF = costoTotalUF - valorUF;

    const tasaAnual = (Math.pow(1 + i, 12) - 1) * 100; // anual efectiva (igual que el informe de Gerencia)

    return {
      nTractos, n, valorUnitCLP, valorTotalCLP, valorUF, piePct, pieUF, financiadoUF,
      cuotaUF, opcionUF, totalCuotasUF, costoTotalUF, costoFinancieroUF, tasaAnual, ufv,
    };
  }, [tractos, valorUSD, pie, plazo, tasaMes, uf, dolar]);

  const toCLP = (x) => x * r.ufv;
  const conIVA = 1 + IVA_RATE;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.tx, letterSpacing: -0.5 }}>Simulación de Leasing</h2>
        <span style={{ fontSize: 11, color: T.txD, fontStyle: "italic" }}>Base: Simulación Banchile N° 352449</span>
      </div>

      {/* ── ENTRADAS ── */}
      <SectionCard title="Datos de la operación" icon={Calculator} T={T} color={T.accent}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field T={T} label="Cantidad de tractos" value={tractos} onChange={setTractos} suffix="u." />
          <Field T={T} label="Valor del tracto (USD)" value={valorUSD} onChange={setValorUSD} suffix="US$" hint="Precio unitario, neto" />
          <Field T={T} label="Valor del dólar" value={dolar} onChange={setDolar} suffix="$" hint={ind?.dolar ? "Prellenado con el dólar de hoy" : "Edítalo con el dólar vigente"} />
          <Field T={T} label="Pie (% a pagar a la firma)" value={pie} onChange={setPie} suffix="%" hint="50% = se financia la mitad" accent />
          <Field T={T} label="Plazo" value={plazo} onChange={setPlazo} suffix="meses" />
          <Field T={T} label="Tasa de interés mensual" value={tasaMes} onChange={setTasaMes} suffix="%" hint={`≈ ${r.tasaAnual.toLocaleString("es-CL", { maximumFractionDigits: 2 })}% anual`} />
          <Field T={T} label="Valor de la UF" value={uf} onChange={setUf} suffix="$" hint={ind?.uf ? "Prellenado con la UF de hoy" : "Edítalo con la UF vigente"} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: T.txM, fontWeight: 600 }}>Plazo rápido:</span>
          {[12, 24, 36, 48, 60].map((m) => (
            <button key={m} onClick={() => setPlazo(String(m))}
              style={{
                padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                background: num(plazo) === m ? T.accentBg : "transparent",
                border: `1px solid ${num(plazo) === m ? T.accent : T.border}`,
                color: num(plazo) === m ? T.accent : T.txM,
              }}>{m === 36 ? "36 (3 años)" : `${m}m`}</button>
          ))}
        </div>
      </SectionCard>

      {/* ── RESULTADO PRINCIPAL: LA CUOTA ── */}
      <SectionCard title={`Cuota mensual estimada${r.nTractos > 1 ? ` — ${r.nTractos} tractos` : ""}`} icon={Coins} T={T} color={T.green}
        action={<span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: T.greenBg, color: T.green }}>{r.n} cuotas</span>}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ResultCard T={T} big label="Cuota mensual neta" ufVal={r.cuotaUF} clpVal={toCLP(r.cuotaUF)} color={T.green} colorBg={T.greenBg} icon={Coins} foot={r.nTractos > 1 ? `${fmtUF(r.cuotaUF / r.nTractos)} por tracto · ${r.n} meses` : `Durante ${r.n} meses`} />
          <ResultCard T={T} big label="Cuota mensual con IVA" ufVal={r.cuotaUF * conIVA} clpVal={toCLP(r.cuotaUF) * conIVA} color={T.red} colorBg={T.redBg} icon={Coins} foot={r.nTractos > 1 ? `${fmtUF((r.cuotaUF / r.nTractos) * conIVA)} por tracto` : "Lo que efectivamente se paga"} />
          <ResultCard T={T} label="Pie inicial (neto)" ufVal={r.pieUF} clpVal={toCLP(r.pieUF)} color={T.amber} colorBg={T.amberBg} icon={Banknote} foot="Se paga a la firma" />
          <ResultCard T={T} label="Opción de compra (neto)" ufVal={r.opcionUF} clpVal={toCLP(r.opcionUF)} color={T.purple} colorBg={T.purpleBg} icon={Truck} foot="Al final del contrato" />
        </div>
      </SectionCard>

      {/* ── DESGLOSE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <SectionCard title="Desglose de la operación" icon={DollarSign} T={T} color={T.teal}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <tbody>
              {[
                ["Valor del tracto (unitario)", fmtFull(r.valorUnitCLP), `US$ ${num(valorUSD).toLocaleString("es-CL")}`],
                [`Valor total (${r.nTractos} tracto${r.nTractos !== 1 ? "s" : ""})`, fmtFull(r.valorTotalCLP), fmtUF(r.valorUF)],
                [`Pie (${(r.piePct * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%)`, fmtFull(toCLP(r.pieUF)), fmtUF(r.pieUF)],
                ["Monto a financiar", fmtFull(toCLP(r.financiadoUF)), fmtUF(r.financiadoUF)],
                ["N° de cuotas", `${r.n} meses`, ""],
                ["Tasa de interés", `${num(tasaMes).toLocaleString("es-CL", { maximumFractionDigits: 4 })}% mensual`, `≈ ${r.tasaAnual.toLocaleString("es-CL", { maximumFractionDigits: 2 })}% anual`],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "8px 0", color: T.txM }}>{row[0]}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", color: T.tx, fontWeight: 600, whiteSpace: "nowrap" }}>{row[1]}</td>
                  <td style={{ padding: "8px 0 8px 14px", textAlign: "right", color: T.txD, fontSize: 11, whiteSpace: "nowrap" }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Costo total del leasing" icon={TrendingUp} T={T} color={T.amber}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <tbody>
              {[
                ["Pie inicial", toCLP(r.pieUF), r.pieUF],
                [`${r.n} cuotas mensuales`, toCLP(r.totalCuotasUF), r.totalCuotasUF],
                ["Opción de compra", toCLP(r.opcionUF), r.opcionUF],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "8px 0", color: T.txM }}>{row[0]}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", color: T.tx, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtFull(row[1])}</td>
                  <td style={{ padding: "8px 0 8px 14px", textAlign: "right", color: T.txD, fontSize: 11, whiteSpace: "nowrap" }}>{fmtUF(row[2])}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `1.5px solid ${T.border}` }}>
                <td style={{ padding: "10px 0", color: T.tx, fontWeight: 700 }}>Costo total (neto)</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: T.tx, fontWeight: 800, whiteSpace: "nowrap" }}>{fmtFull(r.costoTotalUF * r.ufv)}</td>
                <td style={{ padding: "10px 0 10px 14px", textAlign: "right", color: T.txD, fontSize: 11, whiteSpace: "nowrap" }}>{fmtUF(r.costoTotalUF)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", color: T.amber, fontWeight: 600, fontSize: 12 }}>Costo financiero (intereses)</td>
                <td style={{ padding: "4px 0", textAlign: "right", color: T.amber, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtFull(r.costoFinancieroUF * r.ufv)}</td>
                <td style={{ padding: "4px 0 4px 14px", textAlign: "right", color: T.amber, fontSize: 11, whiteSpace: "nowrap", opacity: 0.85 }}>{fmtUF(r.costoFinancieroUF)}</td>
              </tr>
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* ── NOTA ── */}
      <div style={{ padding: "12px 16px", background: T.accentBg, borderRadius: 10, border: `1px solid ${T.accent}22`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={15} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11.5, color: T.txM, lineHeight: 1.6 }}>
          <strong style={{ color: T.tx }}>Cómo funciona:</strong> el valor del tracto se ingresa en dólares y se convierte a pesos con el valor del dólar, y luego a UF. El pie se paga a la firma; el resto se financia en cuotas mensuales fijas en UF, calculadas con la tasa indicada. La <strong>opción de compra</strong> equivale a una cuota mensual (igual que en la simulación N° 352449 de Banchile). Las cuotas y el pie se muestran <strong>netos</strong>; el banco los cobra <strong>+ IVA</strong>. La UF y el dólar se prellenan con el valor de hoy — edítalos si quieres usar otros. Es una estimación referencial; la cuota definitiva la fija el banco.
        </div>
      </div>
    </div>
  );
}
