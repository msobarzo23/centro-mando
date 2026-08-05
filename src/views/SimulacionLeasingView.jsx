import { useState, useEffect, useRef, useMemo } from "react";
import {
  Calculator, Truck, DollarSign, Banknote, TrendingUp, Info, Coins, Clock, Percent, AlertTriangle, Repeat,
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
const PLAZO_MAX = 240;

// Convierte un string de input a número, devolviendo 0 si no es válido.
const num = (s) => {
  const n = parseFloat(String(s).replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const fmtUF = (x) => (x || 0).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " UF";
const fmtPct = (x) => (x || 0).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + "%";

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

// Tarjeta de resultado grande. Con `custom` muestra un valor libre (p. ej. un plazo)
// en vez del par UF/CLP.
function ResultCard({ T, label, ufVal, clpVal, custom, customSub, color, colorBg, icon: Icon, big, foot }) {
  return (
    <div style={{ flex: big ? "1 1 240px" : "1 1 180px", background: colorBg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${color}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: big ? 28 : 22, fontWeight: 800, color: T.tx, letterSpacing: -0.6, lineHeight: 1.1 }}>{custom ?? fmtUF(ufVal)}</div>
      <div style={{ fontSize: 12.5, color: T.txM, fontWeight: 600, marginTop: 3 }}>{custom ? customSub : fmtFull(clpVal)}</div>
      {foot && <div style={{ fontSize: 10.5, color: T.txD, marginTop: 5 }}>{foot}</div>}
    </div>
  );
}

// Los tres modos de cálculo: qué variable despeja el simulador.
const MODOS = [
  { id: "cuota", label: "Calcular la cuota", desc: "Con pie y plazo definidos" },
  { id: "plazo", label: "Calcular el plazo", desc: "Fijando la cuota en UF" },
  { id: "pie", label: "Calcular el pie", desc: "Fijando la cuota en UF" },
];

export default function SimulacionLeasingView({ T }) {
  const { data: ind } = useIndicadores();

  const [modo, setModo] = useState("cuota");
  const [tractos, setTractos] = useState("50");
  const [valorUSD, setValorUSD] = useState("160000");
  const [pie, setPie] = useState("50");
  const [plazo, setPlazo] = useState("36");
  const [cuotaObj, setCuotaObj] = useState("");
  const [tasaMes, setTasaMes] = useState(TASA_MES_DEFAULT);
  const [uf, setUf] = useState(String(UF_FALLBACK));
  const [dolar, setDolar] = useState(String(DOLAR_FALLBACK));
  // Parte de pago: tractos usados que se entregan como abono al pie.
  const [ppCant, setPpCant] = useState("0");
  const [ppValor, setPpValor] = useState("");

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
    const i = num(tasaMes) / 100;

    const valorUnitCLP = usd * d;
    const valorTotalCLP = valorUnitCLP * nTractos;
    const valorUF = ufv > 0 ? valorTotalCLP / ufv : 0;

    // Parte de pago: se abona al pie (no cambia el monto financiado, que depende del pie pactado).
    const ppN = Math.max(0, Math.round(num(ppCant)));
    const ppUnitCLP = num(ppValor);
    const ppCLP = ppN * ppUnitCLP;
    const ppUF = ufv > 0 ? ppCLP / ufv : 0;

    // Cuota con opción de compra = 1 cuota extra: Capital = Cuota·[(1-v^n)/i + v^n].
    const v = 1 / (1 + i);
    const factorDe = (n) => (i > 0 ? (1 - Math.pow(v, n)) / i : n) + Math.pow(v, n);

    let n = Math.max(1, Math.round(num(plazo)));
    let piePct = num(pie) / 100;
    let pieUF, financiadoUF, cuotaUF;
    let aviso = null;
    const cObj = num(cuotaObj);

    if (modo === "plazo") {
      // Despejar n de F = C·[(1-vⁿ)/i + vⁿ]  →  vⁿ = (C − F·i) / (C·(1−i))
      pieUF = valorUF * piePct;
      financiadoUF = valorUF - pieUF;
      const cuotaMin = financiadoUF * i;
      if (cObj <= 0) {
        aviso = "Ingresa la cuota mensual objetivo en UF para calcular el plazo.";
        cuotaUF = 0; n = 0;
      } else if (i > 0 && cObj <= cuotaMin) {
        aviso = `Con ${fmtUF(cObj)} la cuota no alcanza a cubrir los intereses del monto financiado (mínimo ≈ ${fmtUF(cuotaMin * 1.02)}). Sube la cuota o el pie.`;
        cuotaUF = 0; n = 0;
      } else {
        const nExacto = i > 0 ? Math.log((cObj - financiadoUF * i) / (cObj * (1 - i))) / Math.log(v) : financiadoUF / cObj;
        n = Math.max(1, Math.ceil(nExacto - 1e-9));
        if (n > PLAZO_MAX) {
          aviso = `El plazo necesario supera ${PLAZO_MAX} meses. Sube la cuota o el pie.`;
          n = PLAZO_MAX;
        }
        // Con el plazo redondeado a meses enteros, la cuota exacta queda algo bajo el objetivo.
        cuotaUF = financiadoUF / factorDe(n);
      }
    } else if (modo === "pie") {
      // Despejar el pie: financiado = C·factor  →  pie = valor − financiado.
      if (cObj <= 0) {
        aviso = "Ingresa la cuota mensual objetivo en UF para calcular el pie.";
        cuotaUF = 0; pieUF = 0; financiadoUF = 0; piePct = 0;
      } else {
        cuotaUF = cObj;
        financiadoUF = cObj * factorDe(n);
        pieUF = valorUF - financiadoUF;
        if (pieUF < 0) {
          aviso = `Con ${fmtUF(cObj)} a ${n} meses se financia más que el valor de los tractos: no se necesita pie. Baja la cuota o el plazo para un escenario realista.`;
          pieUF = 0;
          financiadoUF = valorUF;
          cuotaUF = valorUF / factorDe(n);
        }
        piePct = valorUF > 0 ? pieUF / valorUF : 0;
      }
    } else {
      // Modo clásico: pie y plazo definidos → cuota.
      pieUF = valorUF * piePct;
      financiadoUF = valorUF - pieUF;
      const factor = factorDe(n);
      cuotaUF = factor > 0 ? financiadoUF / factor : 0;
    }

    // Pie en efectivo = pie pactado − tractos entregados en parte de pago.
    const pieEfectivoUF = Math.max(0, pieUF - ppUF);
    const ppExcedenteUF = Math.max(0, ppUF - pieUF);

    const opcionUF = cuotaUF;
    const totalCuotasUF = cuotaUF * n;
    const costoTotalUF = pieUF + totalCuotasUF + opcionUF;
    const costoFinancieroUF = costoTotalUF - valorUF;

    const tasaAnual = (Math.pow(1 + i, 12) - 1) * 100; // anual efectiva (igual que el informe de Gerencia)

    return {
      nTractos, n, valorUnitCLP, valorTotalCLP, valorUF, piePct, pieUF, financiadoUF,
      cuotaUF, opcionUF, totalCuotasUF, costoTotalUF, costoFinancieroUF, tasaAnual, ufv,
      ppN, ppCLP, ppUF, pieEfectivoUF, ppExcedenteUF, aviso,
    };
  }, [modo, tractos, valorUSD, pie, plazo, cuotaObj, tasaMes, uf, dolar, ppCant, ppValor]);

  const toCLP = (x) => x * r.ufv;
  const conIVA = 1 + IVA_RATE;
  const hayPP = r.ppN > 0 && r.ppCLP > 0;
  const pideCuota = modo === "plazo" || modo === "pie";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.tx, letterSpacing: -0.5 }}>Simulación de Leasing</h2>
        <span style={{ fontSize: 11, color: T.txD, fontStyle: "italic" }}>Base: Simulación Banchile N° 352449</span>
      </div>

      {/* ── QUÉ CALCULAR ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {MODOS.map((m) => {
          const activo = modo === m.id;
          return (
            <button key={m.id} onClick={() => setModo(m.id)}
              style={{
                flex: "1 1 160px", textAlign: "left", cursor: "pointer", padding: "10px 14px", borderRadius: 10,
                background: activo ? T.accentBg : "transparent",
                border: `1.5px solid ${activo ? T.accent : T.border}`,
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Repeat size={13} color={activo ? T.accent : T.txD} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: activo ? T.accent : T.tx }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 10.5, color: T.txD, marginTop: 3 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── ENTRADAS ── */}
      <SectionCard title="Datos de la operación" icon={Calculator} T={T} color={T.accent}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field T={T} label="Cantidad de tractos" value={tractos} onChange={setTractos} suffix="u." />
          <Field T={T} label="Valor del tracto (USD)" value={valorUSD} onChange={setValorUSD} suffix="US$" hint="Precio unitario, neto" />
          <Field T={T} label="Valor del dólar" value={dolar} onChange={setDolar} suffix="$" hint={ind?.dolar ? "Prellenado con el dólar de hoy" : "Edítalo con el dólar vigente"} />
          {pideCuota && (
            <Field T={T} label="Cuota mensual objetivo (neta, total)" value={cuotaObj} onChange={setCuotaObj} suffix="UF" accent
              hint={num(cuotaObj) > 0
                ? `${fmtFull(toCLP(num(cuotaObj)))}${r.nTractos > 1 ? ` · ${fmtUF(num(cuotaObj) / r.nTractos)} por tracto` : ""}`
                : "Cuánto quieres pagar al mes por toda la flota"} />
          )}
          {modo !== "pie" && (
            <Field T={T} label="Pie (% a pagar a la firma)" value={pie} onChange={setPie} suffix="%" hint="50% = se financia la mitad" accent={modo === "cuota"} />
          )}
          {modo !== "plazo" && (
            <Field T={T} label="Plazo" value={plazo} onChange={setPlazo} suffix="meses" />
          )}
          <Field T={T} label="Tasa de interés mensual" value={tasaMes} onChange={setTasaMes} suffix="%" hint={`≈ ${r.tasaAnual.toLocaleString("es-CL", { maximumFractionDigits: 2 })}% anual`} />
          <Field T={T} label="Valor de la UF" value={uf} onChange={setUf} suffix="$" hint={ind?.uf ? "Prellenado con la UF de hoy" : "Edítalo con la UF vigente"} />
        </div>
        {modo !== "plazo" && (
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
        )}
      </SectionCard>

      {/* ── PARTE DE PAGO ── */}
      <SectionCard title="Tractos en parte de pago (opcional)" icon={Truck} T={T} color={T.purple}
        action={hayPP && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: T.purpleBg, color: T.purple }}>{fmtFull(r.ppCLP * conIVA)} IVA incl.</span>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field T={T} label="Tractos usados que se entregan" value={ppCant} onChange={setPpCant} suffix="u." />
          <Field T={T} label="Valor neto por tracto usado" value={ppValor} onChange={setPpValor} suffix="$"
            hint={hayPP ? `Total: ${fmtFull(r.ppCLP * conIVA)} con IVA incluido (neto ${fmtFull(r.ppCLP)})` : "Lo que el banco/dealer reconoce por cada uno, neto (sin IVA)"} />
          {hayPP && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.txM }}>Pie en efectivo a la firma</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.tx }}>{fmtFull(toCLP(r.pieEfectivoUF) * conIVA)}</span>
              <span style={{ fontSize: 10.5, color: T.txD }}>IVA incluido · Pie {fmtFull(toCLP(r.pieUF) * conIVA)} − parte de pago {fmtFull(r.ppCLP * conIVA)}</span>
            </div>
          )}
        </div>
        {r.ppExcedenteUF > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, padding: "9px 12px", background: T.amberBg, borderRadius: 9, border: `1px solid ${T.amber}33` }}>
            <AlertTriangle size={14} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11.5, color: T.txM, lineHeight: 1.5 }}>
              La parte de pago ({fmtFull(r.ppCLP * conIVA)} con IVA) supera el pie pactado ({fmtFull(toCLP(r.pieUF) * conIVA)} con IVA). El excedente de {fmtFull(toCLP(r.ppExcedenteUF) * conIVA)} podría usarse subiendo el pie, lo que bajaría la cuota.
            </span>
          </div>
        )}
      </SectionCard>

      {/* ── AVISO DE ESCENARIO INFACTIBLE ── */}
      {r.aviso && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", background: T.amberBg, borderRadius: 10, border: `1px solid ${T.amber}44` }}>
          <AlertTriangle size={15} color={T.amber} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12, color: T.tx, fontWeight: 600, lineHeight: 1.5 }}>{r.aviso}</span>
        </div>
      )}

      {/* ── RESULTADO PRINCIPAL ── */}
      <SectionCard
        title={modo === "plazo" ? "Plazo necesario" : modo === "pie" ? "Pie necesario" : `Cuota mensual estimada${r.nTractos > 1 ? ` — ${r.nTractos} tractos` : ""}`}
        icon={modo === "plazo" ? Clock : modo === "pie" ? Percent : Coins} T={T} color={T.green}
        action={<span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: T.greenBg, color: T.green }}>{r.n} cuotas</span>}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {modo === "plazo" && (
            <ResultCard T={T} big label="Plazo requerido" custom={r.n > 0 ? `${r.n} meses` : "—"}
              customSub={r.n > 0 ? `≈ ${(r.n / 12).toLocaleString("es-CL", { maximumFractionDigits: 1 })} años` : ""}
              color={T.accent} colorBg={T.accentBg} icon={Clock}
              foot={num(cuotaObj) > 0 ? `Para una cuota objetivo de ${fmtUF(num(cuotaObj))}` : undefined} />
          )}
          {modo === "pie" && (
            <ResultCard T={T} big label="Pie requerido" custom={fmtPct(r.piePct * 100)}
              customSub={`${fmtFull(toCLP(r.pieUF) * conIVA)} con IVA incluido (neto ${fmtFull(toCLP(r.pieUF))})`}
              color={T.accent} colorBg={T.accentBg} icon={Percent}
              foot={`Para una cuota de ${fmtUF(r.cuotaUF)} a ${r.n} meses`} />
          )}
          <ResultCard T={T} big label="Cuota mensual neta" ufVal={r.cuotaUF} clpVal={toCLP(r.cuotaUF)} color={T.green} colorBg={T.greenBg} icon={Coins} foot={r.nTractos > 1 ? `Total por ${r.nTractos} tractos · ${r.n} meses` : `Durante ${r.n} meses`} />
          <ResultCard T={T} big label="Cuota mensual con IVA" ufVal={r.cuotaUF * conIVA} clpVal={toCLP(r.cuotaUF) * conIVA} color={T.red} colorBg={T.redBg} icon={Coins} foot={r.nTractos > 1 ? `Total por ${r.nTractos} tractos` : "Lo que efectivamente se paga"} />
          <ResultCard T={T} label={hayPP ? "Pie en efectivo (IVA incluido)" : "Pie inicial (IVA incluido)"} ufVal={(hayPP ? r.pieEfectivoUF : r.pieUF) * conIVA} clpVal={toCLP(hayPP ? r.pieEfectivoUF : r.pieUF) * conIVA} color={T.amber} colorBg={T.amberBg} icon={Banknote}
            foot={hayPP ? `IVA incluido · neto ${fmtFull(toCLP(r.pieEfectivoUF))}` : `Se paga a la firma · neto ${fmtFull(toCLP(r.pieUF))}`} />
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
                [`Pie (${(r.piePct * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%, neto)`, fmtFull(toCLP(r.pieUF)), fmtUF(r.pieUF)],
                ...(hayPP ? [
                  [`Parte de pago (${r.ppN} tracto${r.ppN !== 1 ? "s" : ""} usado${r.ppN !== 1 ? "s" : ""}, IVA incl.)`, "− " + fmtFull(r.ppCLP * conIVA), fmtUF(r.ppUF * conIVA)],
                  ["Pie en efectivo a la firma (IVA incl.)", fmtFull(toCLP(r.pieEfectivoUF) * conIVA), fmtUF(r.pieEfectivoUF * conIVA)],
                ] : [
                  ["Pie a pagar a la firma (IVA incl.)", fmtFull(toCLP(r.pieUF) * conIVA), fmtUF(r.pieUF * conIVA)],
                ]),
                ["Monto a financiar", fmtFull(toCLP(r.financiadoUF)), fmtUF(r.financiadoUF)],
                ...(r.nTractos > 1 ? [["Cuota mensual por tracto (neta)", fmtFull(toCLP(r.cuotaUF / r.nTractos)), fmtUF(r.cuotaUF / r.nTractos)]] : []),
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
              {hayPP && (
                <tr>
                  <td style={{ padding: "4px 0", color: T.purple, fontWeight: 600, fontSize: 12 }}>Del pie, cubierto con tractos usados</td>
                  <td style={{ padding: "4px 0", textAlign: "right", color: T.purple, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtFull(Math.min(r.ppCLP, toCLP(r.pieUF)))}</td>
                  <td style={{ padding: "4px 0 4px 14px", textAlign: "right", color: T.purple, fontSize: 11, whiteSpace: "nowrap", opacity: 0.85 }}>{fmtUF(Math.min(r.ppUF, r.pieUF))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* ── NOTA ── */}
      <div style={{ padding: "12px 16px", background: T.accentBg, borderRadius: 10, border: `1px solid ${T.accent}22`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={15} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11.5, color: T.txM, lineHeight: 1.6 }}>
          <strong style={{ color: T.tx }}>Cómo funciona:</strong> el valor del tracto se ingresa en dólares y se convierte a pesos con el valor del dólar, y luego a UF. Elige arriba qué calcular: la <strong>cuota</strong> (con pie y plazo definidos), el <strong>plazo</strong> necesario para una cuota objetivo, o el <strong>pie</strong> necesario para una cuota y plazo dados. Los <strong>tractos en parte de pago</strong> se descuentan del pie: reducen lo que se paga en efectivo a la firma, no el monto financiado. La <strong>opción de compra</strong> equivale a una cuota mensual (igual que en la simulación N° 352449 de Banchile). El <strong>pie</strong> y la <strong>parte de pago</strong> se muestran <strong>con IVA incluido</strong> (los valores se ingresan netos y se les aplica el 19%), porque eso es lo que efectivamente se paga a la firma. Las cuotas se muestran netas y también con IVA. La UF y el dólar se prellenan con el valor de hoy — edítalos si quieres usar otros. Es una estimación referencial; la cuota definitiva y el valor reconocido por los tractos usados los fija el banco.
        </div>
      </div>
    </div>
  );
}
