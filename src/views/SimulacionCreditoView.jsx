import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Landmark, Calculator, Coins, CalendarClock, Banknote, TrendingUp, Info,
  AlertTriangle, Wallet, TrendingDown, Percent,
} from "lucide-react";
import { fmtFull, fmtM, parseNum, todayMidnight } from "../utils.js";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";
import Pagination from "../components/Pagination.jsx";
import { usePagination } from "../hooks/usePagination.js";

// ─────────────────────────────────────────────────────────────────────────────
// Simulación de Crédito (sistema francés: cuota fija mensual).
//
// Tres preguntas que el gerente puede responder con esta herramienta:
//   1. CUOTA  — "Si pido $X a N meses, ¿cuánto pago cada mes?"
//   2. PLAZO  — "Si pido $X y quiero pagar $Y al mes, ¿en cuánto tiempo lo salgo?"
//   3. MONTO  — "Si puedo pagar $Y al mes durante N meses, ¿cuánto puedo pedir?"
//
// La tasa se prellena con la del último crédito Itaú de la empresa (se calcula
// sola desde la tabla de cuotas real). Todo es referencial: el banco fija la
// cuota definitiva e incluye seguros, comisiones y la CAE.
// ─────────────────────────────────────────────────────────────────────────────

const TASA_FALLBACK_MES = 0.65; // % mensual, solo si aún no cargan los datos del crédito Itaú

// parseNum (de utils) distingue separador de miles (1.000.000) de decimal (0,65 / 0.65),
// por eso sirve tanto para los montos grandes como para la tasa.
const num = parseNum;
const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
const fmtPctTasa = (x) => x.toLocaleString("es-CL", { maximumFractionDigits: 4 }) + "%";

// Deriva la tasa mensual implícita del crédito Itaú vigente a partir de su tabla
// de cuotas: en cada cuota, interés = saldo_anterior · tasa, y saldo_anterior =
// saldo_insoluto + amortización de capital de esa cuota. Tomamos la mediana de
// todas las cuotas válidas para que no la distorsionen redondeos puntuales.
function deriveTasaItauMensual(creditoRows) {
  if (!Array.isArray(creditoRows) || creditoRows.length === 0) return 0;
  const tasas = [];
  for (const r of creditoRows) {
    const base = (r.saldo || 0) + (r.capital || 0); // saldo antes de pagar la cuota
    if (r.interes > 0 && base > 0) tasas.push(r.interes / base);
  }
  if (tasas.length === 0) return 0;
  tasas.sort((a, b) => a - b);
  const mid = Math.floor(tasas.length / 2);
  return tasas.length % 2 ? tasas[mid] : (tasas[mid - 1] + tasas[mid]) / 2;
}

// Campo de entrada. A nivel de módulo para que no pierda el foco entre renders.
function Field({ T, label, value, onChange, suffix, hint, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.txM, letterSpacing: 0.2 }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: suffix ? "9px 52px 9px 12px" : "9px 12px",
            background: T.bg3 + "66", border: `1px solid ${accent ? T.accent + "55" : T.border}`, borderRadius: 9,
            color: T.tx, fontSize: 15, fontWeight: 600, outline: "none",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 12, fontSize: 11, color: T.txD, fontWeight: 600, pointerEvents: "none" }}>{suffix}</span>}
      </div>
      {hint && <span style={{ fontSize: 10, color: T.txD, lineHeight: 1.4 }}>{hint}</span>}
    </div>
  );
}

// Resultado principal grande (valor ya formateado como string).
function BigResult({ T, label, value, sub, color, colorBg, icon: Icon }) {
  return (
    <div style={{ flex: "1 1 260px", background: colorBg, borderRadius: 12, padding: "16px 20px", border: `1px solid ${color}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        {Icon && <Icon size={15} color={color} />}
        <span style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: T.tx, letterSpacing: -0.6, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.txM, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Tarjeta secundaria compacta.
function Stat({ T, label, value, sub, color, colorBg, icon: Icon }) {
  return (
    <div style={{ flex: "1 1 180px", background: colorBg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${color}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.tx, letterSpacing: -0.5, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const MODOS = [
  { id: "cuota", titulo: "¿Cuánto pagaría al mes?", desc: "Pones monto y plazo → calcula la cuota mensual.", icon: Coins },
  { id: "plazo", titulo: "¿En cuánto tiempo lo pago?", desc: "Pones monto y cuánto quieres pagar al mes → calcula el plazo.", icon: CalendarClock },
  { id: "monto", titulo: "¿Cuánto puedo pedir?", desc: "Pones la cuota que aguantas y el plazo → calcula el monto máximo.", icon: Wallet },
];

// Texto "X años Y meses" a partir de un número de meses.
const mesesATexto = (n) => {
  const a = Math.floor(n / 12), m = n % 12;
  if (a === 0) return `${m} mes${m !== 1 ? "es" : ""}`;
  if (m === 0) return `${a} año${a !== 1 ? "s" : ""}`;
  return `${a} año${a !== 1 ? "s" : ""} y ${m} mes${m !== 1 ? "es" : ""}`;
};

export default function SimulacionCreditoView({ C, T }) {
  const tasaItauMes = useMemo(() => deriveTasaItauMensual(C?.creditoRows), [C?.creditoRows]);

  const [modo, setModo] = useState("cuota");
  const [monto, setMonto] = useState("1.000.000.000");
  const [plazo, setPlazo] = useState("48");
  const [cuotaObjetivo, setCuotaObjetivo] = useState("50.000.000");
  const [tasa, setTasa] = useState(String(TASA_FALLBACK_MES));
  const [tasaUnidad, setTasaUnidad] = useState("mensual"); // "mensual" | "anual"

  // Prellenar la tasa con la del último crédito Itaú apenas estén los datos (una sola vez).
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || tasaItauMes <= 0) return;
    setTasa(String(round(tasaItauMes * 100, 4)));
    setTasaUnidad("mensual");
    prefilled.current = true;
  }, [tasaItauMes]);

  // ── Cálculo central ──
  const calc = useMemo(() => {
    const P = num(monto);
    const Cobj = num(cuotaObjetivo);
    const nIn = Math.max(1, Math.round(num(plazo)));
    // Tasa mensual de trabajo. Si el usuario la ingresa anual, la pasamos a mensual
    // con equivalencia efectiva: (1 + anual)^(1/12) − 1.
    const i = tasaUnidad === "anual"
      ? Math.pow(1 + num(tasa) / 100, 1 / 12) - 1
      : num(tasa) / 100;
    const tasaAnualEf = (Math.pow(1 + i, 12) - 1) * 100;

    let principal = 0, n = 0, cuota = 0, factible = true, motivo = "";

    if (modo === "cuota") {
      principal = P; n = nIn;
      cuota = i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n;
    } else if (modo === "monto") {
      cuota = Cobj; n = nIn;
      principal = i > 0 ? Cobj * (1 - Math.pow(1 + i, -n)) / i : Cobj * n;
    } else { // plazo
      principal = P; cuota = Cobj;
      const interesMes1 = P * i;
      if (P <= 0 || Cobj <= 0) {
        factible = false; motivo = "Ingresa un monto y una cuota mensual.";
      } else if (i > 0 && Cobj <= interesMes1) {
        factible = false;
        motivo = `La cuota no alcanza a cubrir ni los intereses del primer mes (${fmtFull(Math.round(interesMes1))}). La deuda nunca bajaría. Sube la cuota mensual.`;
      } else {
        const nExact = i > 0 ? -Math.log(1 - (P * i) / Cobj) / Math.log(1 + i) : P / Cobj;
        n = Math.max(1, Math.ceil(nExact));
      }
    }

    // ── Tabla de amortización (sistema francés). La última cuota ajusta el saldo
    // a cero, por eso puede ser un poco menor que las demás. ──
    const filas = [];
    let saldo = principal;
    const nGen = factible ? Math.min(n, 720) : 0; // tope de seguridad
    for (let k = 1; k <= nGen; k++) {
      const interes = saldo * i;
      let amort = cuota - interes;
      if (k === nGen || amort > saldo) amort = saldo; // última cuota / saneo
      const valorCuota = interes + amort;
      saldo = Math.max(0, saldo - amort);
      filas.push({ k, interes, amort, valorCuota, saldo });
      if (saldo <= 0.5) break;
    }

    const totalPagado = filas.reduce((s, f) => s + f.valorCuota, 0);
    const totalInteres = totalPagado - principal;
    const cuotaUltima = filas.length ? filas[filas.length - 1].valorCuota : 0;

    return { principal, n: filas.length || n, cuota, i, tasaAnualEf, factible, motivo, filas, totalPagado, totalInteres, cuotaUltima };
  }, [modo, monto, plazo, cuotaObjetivo, tasa, tasaUnidad]);

  // Fechas de vencimiento proyectadas desde hoy (referenciales).
  const hoy = todayMidnight();
  const fechaCuota = (k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + k, hoy.getDate());
    return d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
  };

  const { page, setPage, totalPages, pageItems } = usePagination(calc.filas, 12);

  // Capacidad de pago: ¿cabe la cuota en el margen mensual estimado de la empresa?
  const margen = C?.margenMesEstimado ?? null;
  const pctMargen = margen && margen > 0 ? (calc.cuota / margen) * 100 : null;

  // Datos para el gráfico de evolución del saldo.
  const chartData = calc.filas.length > 1
    ? [{ etq: "Hoy", saldo: calc.principal }, ...calc.filas.map((f) => ({ etq: `#${f.k}`, saldo: f.saldo }))]
    : [];

  const tasaHint = `≈ ${calc.tasaAnualEf.toLocaleString("es-CL", { maximumFractionDigits: 2 })}% anual` +
    (tasaItauMes > 0 ? ` · Itaú actual: ${fmtPctTasa(round(tasaItauMes * 100, 4))} mensual` : "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.tx, letterSpacing: -0.5 }}>Simulación de Crédito</h2>
        <span style={{ fontSize: 11, color: T.txD, fontStyle: "italic" }}>
          {tasaItauMes > 0 ? "Tasa base: último crédito Itaú" : "Crédito comercial · cuota fija"}
        </span>
      </div>

      {/* ── SELECTOR DE MODO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {MODOS.map((m) => {
          const active = modo === m.id;
          return (
            <button key={m.id} onClick={() => setModo(m.id)}
              style={{
                textAlign: "left", padding: "13px 15px", borderRadius: 12, cursor: "pointer",
                background: active ? T.accentBg : T.card,
                border: `1.5px solid ${active ? T.accent : T.border}`, transition: "all 0.15s",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <m.icon size={16} color={active ? T.accent : T.txM} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? T.accent : T.tx }}>{m.titulo}</span>
              </div>
              <div style={{ fontSize: 11, color: T.txM, lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── ENTRADAS ── */}
      <SectionCard title="Datos del crédito" icon={Calculator} T={T} color={T.accent}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {(modo === "cuota" || modo === "plazo") && (
            <Field T={T} label="Monto del crédito" value={monto} onChange={setMonto} suffix="$" accent
              hint={num(monto) > 0 ? `= ${fmtM(num(monto))} (${(num(monto) / 1e6).toLocaleString("es-CL", { maximumFractionDigits: 0 })} millones)` : "Cuánto necesitas pedir"} />
          )}
          {(modo === "plazo" || modo === "monto") && (
            <Field T={T} label="Cuota mensual que quieres pagar" value={cuotaObjetivo} onChange={setCuotaObjetivo} suffix="$" accent
              hint={num(cuotaObjetivo) > 0 ? `= ${fmtM(num(cuotaObjetivo))} al mes` : "Lo que puedes destinar cada mes"} />
          )}
          {(modo === "cuota" || modo === "monto") && (
            <Field T={T} label="Plazo" value={plazo} onChange={setPlazo} suffix="meses"
              hint={num(plazo) > 0 ? `= ${mesesATexto(Math.round(num(plazo)))}` : "En cuántos meses lo pagas"} />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.txM, letterSpacing: 0.2 }}>Tasa de interés</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
                <input type="text" inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 30px 9px 12px", background: T.bg3 + "66", border: `1px solid ${T.border}`, borderRadius: 9, color: T.tx, fontSize: 15, fontWeight: 600, outline: "none" }} />
                <span style={{ position: "absolute", right: 12, fontSize: 11, color: T.txD, fontWeight: 600, pointerEvents: "none" }}>%</span>
              </div>
              <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: `1px solid ${T.border}` }}>
                {["mensual", "anual"].map((u) => (
                  <button key={u} onClick={() => setTasaUnidad(u)}
                    style={{ padding: "0 11px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: tasaUnidad === u ? T.accent : "transparent", color: tasaUnidad === u ? "#fff" : T.txM }}>
                    {u === "mensual" ? "mes" : "año"}
                  </button>
                ))}
              </div>
            </div>
            <span style={{ fontSize: 10, color: T.txD, lineHeight: 1.4 }}>{tasaHint}</span>
          </div>
        </div>

        {/* Atajos rápidos según el modo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {(modo === "cuota" || modo === "plazo") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: T.txM, fontWeight: 600, minWidth: 64 }}>Monto:</span>
              {[500e6, 1e9, 2e9, 3e9, 5e9].map((v) => (
                <button key={v} onClick={() => setMonto(v.toLocaleString("es-CL"))}
                  style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: num(monto) === v ? T.accentBg : "transparent", border: `1px solid ${num(monto) === v ? T.accent : T.border}`, color: num(monto) === v ? T.accent : T.txM }}>
                  {fmtM(v)}
                </button>
              ))}
            </div>
          )}
          {(modo === "plazo" || modo === "monto") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: T.txM, fontWeight: 600, minWidth: 64 }}>Cuota/mes:</span>
              {[20e6, 30e6, 50e6, 80e6, 100e6].map((v) => (
                <button key={v} onClick={() => setCuotaObjetivo(v.toLocaleString("es-CL"))}
                  style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: num(cuotaObjetivo) === v ? T.accentBg : "transparent", border: `1px solid ${num(cuotaObjetivo) === v ? T.accent : T.border}`, color: num(cuotaObjetivo) === v ? T.accent : T.txM }}>
                  {fmtM(v)}
                </button>
              ))}
            </div>
          )}
          {(modo === "cuota" || modo === "monto") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: T.txM, fontWeight: 600, minWidth: 64 }}>Plazo:</span>
              {[12, 24, 36, 48, 60, 72].map((m) => (
                <button key={m} onClick={() => setPlazo(String(m))}
                  style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: num(plazo) === m ? T.accentBg : "transparent", border: `1px solid ${num(plazo) === m ? T.accent : T.border}`, color: num(plazo) === m ? T.accent : T.txM }}>
                  {m}m
                </button>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── RESULTADO PRINCIPAL ── */}
      {!calc.factible ? (
        <div style={{ padding: "14px 18px", background: T.redBg, borderRadius: 12, border: `1px solid ${T.red}44`, display: "flex", gap: 11, alignItems: "flex-start" }}>
          <AlertTriangle size={18} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: T.tx, lineHeight: 1.5 }}><strong style={{ color: T.red }}>No se puede calcular: </strong>{calc.motivo}</div>
        </div>
      ) : (
        <SectionCard
          title={modo === "cuota" ? "Cuota mensual estimada" : modo === "plazo" ? "Plazo necesario" : "Monto máximo a solicitar"}
          icon={modo === "plazo" ? CalendarClock : modo === "monto" ? Wallet : Coins} T={T} color={T.green}
          action={<span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: T.greenBg, color: T.green }}>{calc.n} cuotas</span>}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {modo === "cuota" && (
              <BigResult T={T} label="Cuota mensual" value={fmtFull(Math.round(calc.cuota))} color={T.green} colorBg={T.greenBg} icon={Coins}
                sub={`${calc.n} cuotas iguales · ${mesesATexto(calc.n)}`} />
            )}
            {modo === "plazo" && (
              <BigResult T={T} label="Plazo" value={`${calc.n} meses`} color={T.green} colorBg={T.greenBg} icon={CalendarClock}
                sub={`${mesesATexto(calc.n)} pagando ${fmtM(calc.cuota)} al mes`} />
            )}
            {modo === "monto" && (
              <BigResult T={T} label="Monto máximo" value={fmtFull(Math.round(calc.principal))} color={T.green} colorBg={T.greenBg} icon={Wallet}
                sub={`Pagando ${fmtM(calc.cuota)}/mes durante ${calc.n} meses`} />
            )}
            <Stat T={T} label="Total a pagar" value={fmtFull(Math.round(calc.totalPagado))} color={T.amber} colorBg={T.amberBg} icon={Banknote}
              sub={`Capital ${fmtM(calc.principal)} + intereses`} />
            <Stat T={T} label="Costo del crédito (intereses)" value={fmtFull(Math.round(calc.totalInteres))} color={T.red} colorBg={T.redBg} icon={TrendingUp}
              sub={calc.principal > 0 ? `${((calc.totalInteres / calc.principal) * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 })}% sobre el monto` : ""} />
            {modo === "plazo" && Math.abs(calc.cuotaUltima - calc.cuota) > 1 && (
              <Stat T={T} label="Última cuota (ajuste)" value={fmtFull(Math.round(calc.cuotaUltima))} color={T.purple} colorBg={T.purpleBg} icon={Coins}
                sub="Cierra el saldo a cero" />
            )}
          </div>

          {/* Capacidad de pago contra el margen mensual estimado de la empresa */}
          {pctMargen != null && (
            <div style={{ marginTop: 14, padding: "12px 15px", background: pctMargen <= 100 ? T.greenBg : T.redBg, borderRadius: 10, border: `1px solid ${(pctMargen <= 100 ? T.green : T.red)}33`, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Wallet size={15} color={pctMargen <= 100 ? T.green : T.red} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 11.5, color: T.txM, lineHeight: 1.6 }}>
                <strong style={{ color: T.tx }}>Capacidad de pago:</strong> esta cuota de <strong style={{ color: T.tx }}>{fmtM(calc.cuota)}</strong> equivale al{" "}
                <strong style={{ color: pctMargen <= 100 ? T.green : T.red }}>{pctMargen.toLocaleString("es-CL", { maximumFractionDigits: 0 })}%</strong> del margen mensual estimado de la empresa ({fmtM(margen)}, lo que queda después de gastos, leasing y el crédito Itaú actual).
                {pctMargen <= 100 ? " Holgura suficiente según el ritmo actual." : " Excede el margen estimado: requeriría recortar otros pagos o subir la facturación."}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── GRÁFICO + DESGLOSE ── */}
      {calc.factible && calc.filas.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <SectionCard title="Cómo baja la deuda" icon={TrendingDown} T={T} color={T.green}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="etq" tick={{ fill: T.txM, fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 10))} />
                <YAxis tick={{ fill: T.txM, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} width={52} />
                <Tooltip content={<ChartTooltip T={T} />} />
                <Area type="monotone" dataKey="saldo" stroke={T.accent} fill={T.accentBg} name="Saldo" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Resumen de la operación" icon={Percent} T={T} color={T.teal}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {[
                  ["Monto del crédito", fmtFull(Math.round(calc.principal))],
                  ["Cuota mensual", fmtFull(Math.round(calc.cuota))],
                  ["N° de cuotas", `${calc.n} (${mesesATexto(calc.n)})`],
                  ["Tasa mensual", fmtPctTasa(round(calc.i * 100, 4))],
                  ["Tasa anual (efectiva)", `${calc.tasaAnualEf.toLocaleString("es-CL", { maximumFractionDigits: 2 })}%`],
                  ["Total a pagar", fmtFull(Math.round(calc.totalPagado))],
                  ["Intereses totales", fmtFull(Math.round(calc.totalInteres))],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                    <td style={{ padding: "8px 0", color: T.txM }}>{row[0]}</td>
                    <td style={{ padding: "8px 0", textAlign: "right", color: T.tx, fontWeight: 600, whiteSpace: "nowrap" }}>{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}

      {/* ── TABLA DE AMORTIZACIÓN ── */}
      {calc.factible && calc.filas.length > 0 && (
        <SectionCard title={`Tabla de pagos (${calc.filas.length} cuotas)`} icon={Landmark} T={T} color={T.accent}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>{["#", "Vence", "Cuota", "Interés", "Abono a capital", "Saldo"].map((h, i) => (
                  <th key={i} style={{ padding: "7px 10px", textAlign: i <= 1 ? "left" : "right", color: T.txM, fontWeight: 600, borderBottom: `1px solid ${T.border}`, fontSize: 11, whiteSpace: "nowrap", background: T.bg3 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {pageItems.map((f) => (
                  <tr key={f.k} style={{ borderBottom: `1px solid ${T.border}22` }}>
                    <td style={{ padding: "6px 10px", textAlign: "left", color: T.txM, fontSize: 11 }}>{f.k}</td>
                    <td style={{ padding: "6px 10px", textAlign: "left", color: T.txM }}>{fechaCuota(f.k)}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: T.tx, fontWeight: 600 }}>{fmtFull(Math.round(f.valorCuota))}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: T.red }}>{fmtFull(Math.round(f.interes))}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: T.green }}>{fmtFull(Math.round(f.amort))}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: T.txD }}>{fmtFull(Math.round(f.saldo))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} T={T} />
          <p style={{ textAlign: "center", fontSize: 10, color: T.txD, marginTop: 6 }}>
            Cuotas {page * 12 + 1}–{Math.min((page + 1) * 12, calc.filas.length)} de {calc.filas.length} · Fechas referenciales desde hoy
          </p>
        </SectionCard>
      )}

      {/* ── NOTA EXPLICATIVA ── */}
      <div style={{ padding: "12px 16px", background: T.accentBg, borderRadius: 10, border: `1px solid ${T.accent}22`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={15} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11.5, color: T.txM, lineHeight: 1.6 }}>
          <strong style={{ color: T.tx }}>Cómo se usa:</strong> elige arriba la pregunta que quieres responder. El cálculo usa el <strong>sistema francés</strong> (cuotas mensuales iguales, como el crédito comercial que ya tiene la empresa): cada cuota paga primero el interés del mes y el resto abona al capital, por eso al principio se pagan más intereses y al final más capital.
          La tasa se prellena con la del <strong>último crédito Itaú</strong> (calculada desde su tabla de cuotas real){tasaItauMes > 0 ? ` ≈ ${fmtPctTasa(round(tasaItauMes * 100, 4))} mensual` : ""}; puedes cambiarla y elegir si la ingresas por mes o por año.
          Es una <strong>estimación referencial</strong>: el banco fija la cuota definitiva y normalmente agrega seguros, comisiones e impuesto al crédito (la <strong>CAE</strong> real suele quedar algo por encima de la tasa pura).
        </div>
      </div>
    </div>
  );
}
