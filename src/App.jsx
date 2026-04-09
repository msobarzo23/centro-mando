import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Truck, CreditCard, Calendar,
  BarChart3, RefreshCw, Sun, Moon, ChevronRight, AlertTriangle,
  Banknote, PiggyBank, Building2, ArrowUpRight, ArrowDownRight, Clock,
  Target, Activity, Users, MapPin, Fuel, Menu, X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// DATA SOURCES — Google Sheets published as CSV
// ═══════════════════════════════════════════════════════════════
const CSV = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  viajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv",
  finResumen: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1738797304&single=true&output=csv",
  finBancos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1699395114&single=true&output=csv",
  finDAP: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1020614134&single=true&output=csv",
  finCalendario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1876759165&single=true&output=csv",
  finFondos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1691837276&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
  flotaEquipos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv",
};

const AUTO_REFRESH_MIN = 15;
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const parseNum = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).trim().replace(/\$/g, "").replace(/%/g, "");
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  if (dots > 1) s = s.replace(/\./g, "");
  else if (dots === 1 && commas === 0) {
    const afterDot = s.split(".")[1];
    if (afterDot && afterDot.length === 3) s = s.replace(".", "");
  }
  s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseDate = (s) => {
  if (!s) return null;
  const str = String(s).trim();
  let p = str.split("/");
  if (p.length === 3) {
    const [a, b, c] = p.map(Number);
    if (c > 1000) return new Date(c, b - 1, a);
    if (a > 1000) return new Date(a, b - 1, c);
  }
  p = str.split("-");
  if (p.length === 3) {
    const [a, b, c] = p.map(Number);
    if (a > 1000) return new Date(a, b - 1, c);
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
};

const fmtM = (n) => {
  if (n == null) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return sign + "$" + (abs / 1e6).toLocaleString("es-CL", { maximumFractionDigits: 0 }) + "M";
  if (abs >= 1e6) return sign + "$" + Math.round(abs / 1e6).toLocaleString("es-CL") + "M";
  if (abs >= 1e3) return sign + "$" + Math.round(abs / 1e3).toLocaleString("es-CL") + "K";
  return sign + "$" + Math.round(abs).toLocaleString("es-CL");
};

const fmtFull = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
const pctChange = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

const fetchCSV = (url) => new Promise((resolve) => {
  Papa.parse(url, {
    download: true, header: true, skipEmptyLines: true,
    complete: (r) => resolve(r.data || []),
    error: () => resolve([]),
  });
});

// Smart CSV fetcher for financial sheets with decorative title rows
// Parses raw (no header), finds the real header row by matching known column names, then re-maps
const fetchFinCSV = (url, knownHeaders) => new Promise((resolve) => {
  Papa.parse(url, {
    download: true, header: false, skipEmptyLines: true,
    complete: (r) => {
      const rows = r.data || [];
      // Find the row that best matches known headers
      let headerIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i].map(c => String(c || "").trim().toLowerCase());
        const score = knownHeaders.reduce((s, h) => s + (row.some(c => c.includes(h.toLowerCase())) ? 1 : 0), 0);
        if (score > bestScore) { bestScore = score; headerIdx = i; }
      }
      if (headerIdx === -1 || bestScore < 2) { resolve([]); return; }
      const headers = rows[headerIdx].map(c => String(c || "").trim());
      const data = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(c => !c || String(c).trim() === "")) continue;
        const obj = {};
        headers.forEach((h, ci) => { if (h) obj[h] = row[ci] || ""; });
        data.push(obj);
      }
      resolve(data);
    },
    error: () => resolve([]),
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════
const themes = {
  dark: {
    bg: "#0b1120", bg2: "#111827", bg3: "#1e293b", card: "#151f32",
    tx: "#e2e8f0", txM: "#94a3b8", txD: "#64748b",
    border: "#1e3a5f", accent: "#3b82f6", accentBg: "rgba(59,130,246,0.12)",
    green: "#22c55e", greenBg: "rgba(34,197,94,0.12)",
    red: "#ef4444", redBg: "rgba(239,68,68,0.12)",
    amber: "#f59e0b", amberBg: "rgba(245,158,11,0.12)",
    purple: "#a855f7", purpleBg: "rgba(168,85,247,0.12)",
    teal: "#14b8a6", tealBg: "rgba(20,184,166,0.12)",
    chart: ["#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7","#14b8a6","#ec4899","#6366f1"],
  },
  light: {
    bg: "#f0f4f8", bg2: "#ffffff", bg3: "#e2e8f0", card: "#ffffff",
    tx: "#0f172a", txM: "#475569", txD: "#94a3b8",
    border: "#e2e8f0", accent: "#2563eb", accentBg: "rgba(37,99,235,0.08)",
    green: "#16a34a", greenBg: "rgba(22,163,74,0.08)",
    red: "#dc2626", redBg: "rgba(220,38,38,0.08)",
    amber: "#d97706", amberBg: "rgba(217,119,6,0.08)",
    purple: "#9333ea", purpleBg: "rgba(147,51,234,0.08)",
    teal: "#0d9488", tealBg: "rgba(13,148,136,0.08)",
    chart: ["#2563eb","#16a34a","#d97706","#dc2626","#9333ea","#0d9488","#db2777","#4f46e5"],
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════
const KpiCard = ({ icon: Icon, label, value, sub, color, colorBg, T }) => (
  <div style={{
    background: T.card, borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}`,
    display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: "1 1 160px",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ background: colorBg, borderRadius: 8, padding: 6, display: "flex" }}>
        <Icon size={16} color={color} />
      </div>
      <span style={{ fontSize: 11, color: T.txM, fontWeight: 500, letterSpacing: 0.3 }}>{label}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: T.tx, letterSpacing: -0.5 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: sub.startsWith("+") ? T.green : sub.startsWith("-") ? T.red : T.txM }}>{sub}</div>}
  </div>
);

const MiniTable = ({ headers, rows, T, maxRows = 8 }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>{headers.map((h, i) => (
          <th key={i} style={{ padding: "8px 10px", textAlign: i === 0 ? "left" : "right", color: T.txM, fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.slice(0, maxRows).map((row, ri) => (
          <tr key={ri} style={{ borderBottom: `1px solid ${T.border}22` }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "7px 10px", textAlign: ci === 0 ? "left" : "right", color: T.tx, whiteSpace: "nowrap" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SectionCard = ({ title, icon: Icon, children, T, color }) => (
  <div style={{ background: T.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${T.border}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      {Icon && <Icon size={16} color={color || T.accent} />}
      <span style={{ fontSize: 14, fontWeight: 600, color: T.tx }}>{title}</span>
    </div>
    {children}
  </div>
);

const ChartTooltip = ({ active, payload, label, T, prefix = "$" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 8 }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{prefix === "$" ? fmtM(p.value) : p.value?.toLocaleString("es-CL")}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TABS CONFIG
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: "home", label: "Inicio", icon: Activity },
  { id: "ventas", label: "Ventas", icon: DollarSign },
  { id: "operaciones", label: "Operaciones", icon: Truck },
  { id: "finanzas", label: "Finanzas", icon: Banknote },
  { id: "alertas", label: "Alertas", icon: AlertTriangle },
];

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("cm-theme") !== "light"; } catch { return true; }
  });
  const [tab, setTab] = useState("home");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const T = dark ? themes.dark : themes.light;

  const toggleTheme = () => {
    setDark(d => { const n = !d; try { localStorage.setItem("cm-theme", n ? "dark" : "light"); } catch {} return n; });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ventas, viajes, flotaViajes, flotaEquipos] = await Promise.all([
        fetchCSV(CSV.ventas), fetchCSV(CSV.viajes), fetchCSV(CSV.flotaViajes), fetchCSV(CSV.flotaEquipos),
      ]);
      const [finResumen, finBancos, finDAP, finCalendario, finFondos] = await Promise.all([
        fetchFinCSV(CSV.finResumen, ["Concepto", "Monto", "Ganancia", "Mes", "Comprometido", "Guardado"]),
        fetchFinCSV(CSV.finBancos, ["Fecha", "Banco", "Saldo Inicial", "Saldo Final", "Monto"]),
        fetchFinCSV(CSV.finDAP, ["Fecha Inicio", "Vencimiento", "Tasa", "Monto Inicial", "Monto Final", "Ganancia", "Vigente"]),
        fetchFinCSV(CSV.finCalendario, ["Fecha", "Monto", "Guardado", "Falta", "Concepto", "Estado"]),
        fetchFinCSV(CSV.finFondos, ["Empresa", "Fondo", "Administradora", "Monto Invertido", "Valor Actual", "Rentabilidad"]),
      ]);
      setData({ ventas, viajes, finResumen, finBancos, finDAP, finCalendario, finFondos, flotaViajes, flotaEquipos });
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (AUTO_REFRESH_MIN <= 0) return;
    const id = setInterval(loadData, AUTO_REFRESH_MIN * 60000);
    return () => clearInterval(id);
  }, [loadData]);

  // ─── COMPUTED DATA ─────────────────────────────────────────
  const computed = useMemo(() => {
    if (!data.ventas) return null;
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // VENTAS
    const ventasRows = (data.ventas || []).map(r => {
      const d = parseDate(r.FECHA || r.Fecha || r.fecha);
      return { ...r, _date: d, _neto: parseNum(r.NETO || r.Neto || r.neto) };
    }).filter(r => r._date);

    const ventasMesActual = ventasRows.filter(r => r._date.getMonth() === curMonth && r._date.getFullYear() === curYear);
    const ventasMesAnterior = ventasRows.filter(r => {
      const pm = curMonth === 0 ? 11 : curMonth - 1;
      const py = curMonth === 0 ? curYear - 1 : curYear;
      return r._date.getMonth() === pm && r._date.getFullYear() === py;
    });
    const totalMesActual = ventasMesActual.reduce((s, r) => s + r._neto, 0);
    const totalMesAnterior = ventasMesAnterior.reduce((s, r) => s + r._neto, 0);

    // Ventas por mes (año actual)
    const ventasPorMes = [];
    for (let m = 0; m < 12; m++) {
      const rows = ventasRows.filter(r => r._date.getMonth() === m && r._date.getFullYear() === curYear);
      ventasPorMes.push({ mes: MESES[m], total: rows.reduce((s, r) => s + r._neto, 0), count: rows.length });
    }

    // Top clientes mes actual
    const clienteMap = {};
    ventasMesActual.forEach(r => {
      const name = r["RAZON SOCIAL"] || r["Razon Social"] || r.razon_social || "Sin nombre";
      clienteMap[name] = (clienteMap[name] || 0) + r._neto;
    });
    const topClientes = Object.entries(clienteMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, total]) => ({ name, total }));

    // Ventas año actual vs anterior
    const ventasAnoActual = ventasRows.filter(r => r._date.getFullYear() === curYear).reduce((s, r) => s + r._neto, 0);
    const ventasAnoAnterior = ventasRows.filter(r => r._date.getFullYear() === curYear - 1).reduce((s, r) => s + r._neto, 0);

    // VIAJES
    const viajesRows = (data.viajes || []).map(r => {
      const dateStr = r.fechainicio || r.FechaInicio || r.fecha;
      const d = parseDate(dateStr);
      return { ...r, _date: d, _cliente: r.Cliente || r.cliente || "", _equipo: r.tipoequipo || r.TipoEquipo || "" };
    }).filter(r => r._date);

    const viajesMesActual = viajesRows.filter(r => r._date.getMonth() === curMonth && r._date.getFullYear() === curYear);
    const viajesMesAnterior = viajesRows.filter(r => {
      const pm = curMonth === 0 ? 11 : curMonth - 1;
      const py = curMonth === 0 ? curYear - 1 : curYear;
      return r._date.getMonth() === pm && r._date.getFullYear() === py;
    });

    // Corte comparativo: mismos días del mes
    const dayOfMonth = now.getDate();
    const viajesCorteActual = viajesMesActual.filter(r => r._date.getDate() <= dayOfMonth).length;
    const viajesCorteAnterior = viajesMesAnterior.filter(r => r._date.getDate() <= dayOfMonth).length;

    // Viajes por mes
    const viajesPorMes = [];
    for (let m = 0; m < 12; m++) {
      const rows = viajesRows.filter(r => r._date.getMonth() === m && r._date.getFullYear() === curYear);
      viajesPorMes.push({ mes: MESES[m], total: rows.length });
    }

    // Top clientes viajes
    const vClienteMap = {};
    viajesMesActual.forEach(r => { vClienteMap[r._cliente] = (vClienteMap[r._cliente] || 0) + 1; });
    const topClientesViajes = Object.entries(vClienteMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    // Viajes por equipo
    const equipoMap = {};
    viajesMesActual.forEach(r => { const e = r._equipo || "Sin tipo"; equipoMap[e] = (equipoMap[e] || 0) + 1; });
    const viajesPorEquipo = Object.entries(equipoMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 22) + "..." : name, count }));

    // FINANZAS — Bancos
    const bancosRows = (data.finBancos || []).filter(r => r.Banco || r.banco);
    const saldosBancos = {};
    bancosRows.forEach(r => {
      const banco = r.Banco || r.banco;
      const saldoFinal = parseNum(r["Saldo Final"] || r.saldo_final || r.SaldoFinal);
      if (saldoFinal > 0) saldosBancos[banco] = saldoFinal;
    });
    const totalCaja = Object.values(saldosBancos).reduce((s, v) => s + v, 0);

    // FINANZAS — DAP vigentes (separados por tipo)
    const dapRows = (data.finDAP || []).filter(r => {
      const vigente = (r.Vigente || r.vigente || "").toString().toLowerCase();
      return vigente === "si" || vigente === "sí" || vigente === "yes";
    });
    
    const getDapType = (r) => {
      const t = (r.Tipo || r.tipo || "").toString().toLowerCase().trim();
      if (t.includes("credito") || t.includes("crédito")) return "credito";
      if (t.includes("inversion") || t.includes("inversión")) return "inversion";
      return "trabajo";
    };
    
    const dapTrabajo = dapRows.filter(r => getDapType(r) === "trabajo");
    const dapInversion = dapRows.filter(r => getDapType(r) === "inversion");
    const dapCredito = dapRows.filter(r => getDapType(r) === "credito");
    
    const totalDAPTrabajo = dapTrabajo.reduce((s, r) => s + parseNum(r["Monto Inicial"] || r.MontoInicial || r.monto_inicial), 0);
    const totalDAPInversion = dapInversion.reduce((s, r) => s + parseNum(r["Monto Inicial"] || r.MontoInicial || r.monto_inicial), 0);
    const totalDAPCredito = dapCredito.reduce((s, r) => s + parseNum(r["Monto Inicial"] || r.MontoInicial || r.monto_inicial), 0);
    const totalDAP = totalDAPTrabajo + totalDAPInversion + totalDAPCredito;
    
    const gananciaDAPTrabajo = dapTrabajo.reduce((s, r) => s + parseNum(r.Ganancia || r.ganancia), 0);
    const gananciaDAPInversion = dapInversion.reduce((s, r) => s + parseNum(r.Ganancia || r.ganancia), 0);
    const gananciaDAPCredito = dapCredito.reduce((s, r) => s + parseNum(r.Ganancia || r.ganancia), 0);
    const gananciaDAP = gananciaDAPTrabajo + gananciaDAPInversion + gananciaDAPCredito;

    // Próximos vencimientos DAP (todos los tipos)
    const dapProximos = dapRows.map(r => ({
      banco: r.Banco || r.banco,
      monto: parseNum(r["Monto Inicial"] || r.MontoInicial || r.monto_inicial),
      montoFinal: parseNum(r["Monto Final"] || r.MontoFinal || r.monto_final),
      vencimiento: parseDate(r.Vencimiento || r.vencimiento),
      tipo: r.Tipo || r.tipo,
      tasa: r.Tasa || r.tasa,
      _tipoNorm: getDapType(r),
    })).filter(r => r.vencimiento && r.vencimiento >= now).sort((a, b) => a.vencimiento - b.vencimiento).slice(0, 10);

    // FINANZAS — Fondos Mutuos
    const fondosRows = (data.finFondos || []).filter(r => r.Fondo || r.fondo);
    const fondosSaldos = fondosRows.filter(r => parseNum(r["Valor Actual"] || r.ValorActual || r.valor_actual) > 0).map(r => ({
      fondo: r.Fondo || r.fondo,
      admin: r.Administradora || r.administradora,
      invertido: parseNum(r["Monto Invertido"] || r.MontoInvertido || r.monto_invertido),
      actual: parseNum(r["Valor Actual"] || r.ValorActual || r.valor_actual),
      rentPct: r["Rentabilidad %"] || r.rentabilidad_pct || "",
    }));
    const totalFondos = fondosSaldos.reduce((s, r) => s + r.actual, 0);

    // Inversión real = DAP Inversión + Fondos Mutuos (NO incluye trabajo ni crédito)
    const totalInversionReal = totalDAPInversion + totalFondos;
    // Total en DAPs (todos los tipos)
    const totalInversiones = totalDAP + totalFondos;

    // FINANZAS — Calendario compromisos
    const calRows = (data.finCalendario || []).map(r => ({
      fecha: parseDate(r.Fecha || r.fecha),
      monto: parseNum(r.Monto || r.monto),
      guardado: parseNum(r.Guardado || r.guardado),
      falta: parseNum(r.Falta || r.falta),
      concepto: r.Concepto || r.concepto || "",
      estado: r.Estado || r.estado || "",
      mes: r.Mes || r.mes,
      semana: r.Semana || r.semana,
    })).filter(r => r.fecha);

    // Compromisos próxima semana
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const compromisosProx = calRows.filter(r => r.fecha >= now && r.fecha <= nextWeek).sort((a, b) => a.fecha - b.fecha);
    const totalCompromisosProx = compromisosProx.reduce((s, r) => s + r.monto, 0);

    // Compromisos mes actual
    const compromisosMes = calRows.filter(r => r.fecha && r.fecha.getMonth() === curMonth && r.fecha.getFullYear() === curYear);
    const totalCompromisosMes = compromisosMes.reduce((s, r) => s + r.monto, 0);
    const totalGuardadoMes = compromisosMes.reduce((s, r) => s + r.guardado, 0);

    // ALERTAS
    const alertas = [];

    // Pagos que faltan
    const pagosFaltantes = calRows.filter(r => r.falta > 0 && r.fecha >= now && r.fecha <= nextWeek);
    pagosFaltantes.forEach(r => {
      alertas.push({
        type: "warning", icon: Calendar,
        msg: `${r.concepto}: falta ${fmtM(r.falta)} para el ${r.fecha.toLocaleDateString("es-CL")}`,
      });
    });

    // DAP por vencer en 7 días
    dapProximos.filter(r => r.vencimiento <= nextWeek).forEach(r => {
      alertas.push({
        type: "info", icon: PiggyBank,
        msg: `DAP ${r.banco} por ${fmtM(r.monto)} vence el ${r.vencimiento.toLocaleDateString("es-CL")}`,
      });
    });

    // Baja de viajes
    if (viajesCorteAnterior > 0 && viajesCorteActual < viajesCorteAnterior * 0.85) {
      alertas.push({
        type: "danger", icon: TrendingDown,
        msg: `Viajes al día ${dayOfMonth}: ${viajesCorteActual} vs ${viajesCorteAnterior} mes anterior (${fmtPct(pctChange(viajesCorteActual, viajesCorteAnterior))})`,
      });
    }

    // FLOTA
    const flotaRows = (data.flotaViajes || []).map(r => ({
      ...r,
      _date: parseDate(r.Fecha || r.fecha || r.fechainicio),
      _km: parseNum(r.Kilometro || r.kilometro || r.km),
      _tracto: r.Tracto || r.tracto || "",
      _origen: r.Origen || r.origen || "",
      _destino: r.Destino || r.destino || "",
      _cliente: r.Cliente || r.cliente || "",
    })).filter(r => r._date);

    const flotaMesActual = flotaRows.filter(r => r._date.getMonth() === curMonth && r._date.getFullYear() === curYear);
    const kmMesActual = flotaMesActual.reduce((s, r) => s + r._km, 0);
    const tractosActivos = new Set(flotaMesActual.map(r => r._tracto).filter(Boolean)).size;

    return {
      totalMesActual, totalMesAnterior, ventasPorMes, topClientes, ventasAnoActual, ventasAnoAnterior, ventasRows,
      viajesMesActual: viajesMesActual.length, viajesMesAnteriorCount: viajesMesAnterior.length,
      viajesCorteActual, viajesCorteAnterior, viajesPorMes, topClientesViajes, viajesPorEquipo, dayOfMonth,
      totalCaja, saldosBancos, totalDAP, gananciaDAP, dapProximos, totalFondos, fondosSaldos, totalInversiones,
      totalDAPTrabajo, totalDAPInversion, totalDAPCredito,
      gananciaDAPTrabajo, gananciaDAPInversion, gananciaDAPCredito,
      totalInversionReal,
      totalCompromisosProx, compromisosProx, totalCompromisosMes, totalGuardadoMes, compromisosMes,
      alertas, kmMesActual, tractosActivos,
      curMonth, curYear,
    };
  }, [data]);

  // ─── RENDER ────────────────────────────────────────────────
  if (loading && !computed) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.tx, fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw size={32} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: 16, color: T.txM }}>Cargando datos...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const C = computed || {};
  const activeAlerts = (C.alertas || []).length;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif", color: T.tx }}>
      {/* HEADER */}
      <header style={{
        background: T.bg2, borderBottom: `1px solid ${T.border}`, padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", cursor: "pointer", display: "none", color: T.tx, padding: 4 }}
            className="mobile-menu-btn">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.tx, letterSpacing: -0.3 }}>Centro de Mando</div>
            <div style={{ fontSize: 11, color: T.txD }}>Transportes Bello e Hijos Ltda.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdate && <span style={{ fontSize: 10, color: T.txD }}>{lastUpdate.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>}
          <button onClick={loadData} style={{ background: "none", border: "none", cursor: "pointer", color: T.txM, padding: 4 }} title="Actualizar">
            <RefreshCw size={16} className={loading ? "spinning" : ""} />
          </button>
          <button onClick={toggleTheme} style={{ background: "none", border: "none", cursor: "pointer", color: T.txM, padding: 4 }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
        {/* SIDEBAR — desktop */}
        <nav className="sidebar" style={{
          width: 200, background: T.bg2, borderRight: `1px solid ${T.border}`, padding: "16px 8px",
          flexShrink: 0, display: "flex", flexDirection: "column", gap: 2,
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setMobileMenu(false); }} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                border: "none", cursor: "pointer", width: "100%", textAlign: "left",
                background: active ? T.accentBg : "transparent",
                color: active ? T.accent : T.txM, fontWeight: active ? 600 : 400, fontSize: 13,
                transition: "all 0.15s",
              }}>
                <t.icon size={16} />
                {t.label}
                {t.id === "alertas" && activeAlerts > 0 && (
                  <span style={{ marginLeft: "auto", background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 7px" }}>{activeAlerts}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* MOBILE NAV — overlay */}
        {mobileMenu && (
          <div className="mobile-nav-overlay" style={{
            position: "fixed", top: 52, left: 0, right: 0, bottom: 0, zIndex: 99,
            background: "rgba(0,0,0,0.5)",
          }} onClick={() => setMobileMenu(false)}>
            <div style={{ width: 220, background: T.bg2, height: "100%", padding: "16px 8px", display: "flex", flexDirection: "column", gap: 2 }}
              onClick={e => e.stopPropagation()}>
              {TABS.map(t => {
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => { setTab(t.id); setMobileMenu(false); }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10,
                    border: "none", cursor: "pointer", width: "100%", textAlign: "left",
                    background: active ? T.accentBg : "transparent",
                    color: active ? T.accent : T.txM, fontWeight: active ? 600 : 400, fontSize: 14,
                  }}>
                    <t.icon size={18} /> {t.label}
                    {t.id === "alertas" && activeAlerts > 0 && (
                      <span style={{ marginLeft: "auto", background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 8px" }}>{activeAlerts}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, padding: "20px 24px", maxWidth: 1200, overflowX: "hidden" }}>
          {tab === "home" && <HomeView C={C} T={T} setTab={setTab} />}
          {tab === "ventas" && <VentasView C={C} T={T} />}
          {tab === "operaciones" && <OperacionesView C={C} T={T} />}
          {tab === "finanzas" && <FinanzasView C={C} T={T} />}
          {tab === "alertas" && <AlertasView C={C} T={T} />}
        </main>
      </div>

      {/* BOTTOM NAV — mobile only */}
      <nav className="bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: T.bg2,
        borderTop: `1px solid ${T.border}`, display: "none", padding: "6px 0 env(safe-area-inset-bottom,8px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                color: active ? T.accent : T.txD, fontSize: 10, fontWeight: active ? 600 : 400,
                position: "relative",
              }}>
                <t.icon size={18} />
                {t.label}
                {t.id === "alertas" && activeAlerts > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 2, background: T.red, color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 6, padding: "0 4px", lineHeight: "14px" }}>{activeAlerts}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin 1s linear infinite}
        @media(max-width:768px){
          .sidebar{display:none!important}
          .bottom-nav{display:block!important}
          .mobile-menu-btn{display:block!important}
          main{padding:14px 12px 80px!important}
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME VIEW — Pantalla principal gerencial
// ═══════════════════════════════════════════════════════════════
function HomeView({ C, T, setTab }) {
  const mesLabel = MESES_FULL[C.curMonth] + " " + C.curYear;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.tx, marginBottom: 2 }}>Buenos días</h1>
        <p style={{ fontSize: 13, color: T.txM }}>{mesLabel} — Resumen ejecutivo</p>
      </div>

      {/* KPIs principales */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard icon={DollarSign} label="Facturación mes" value={fmtM(C.totalMesActual)} T={T}
          sub={C.totalMesAnterior > 0 ? fmtPct(pctChange(C.totalMesActual, C.totalMesAnterior)) + " vs mes ant." : undefined}
          color={T.accent} colorBg={T.accentBg} />
        <KpiCard icon={Truck} label="Viajes mes" value={C.viajesMesActual?.toLocaleString("es-CL")} T={T}
          sub={`Corte día ${C.dayOfMonth}: ${C.viajesCorteActual} vs ${C.viajesCorteAnterior}`}
          color={T.green} colorBg={T.greenBg} />
        <KpiCard icon={Building2} label="Caja total" value={fmtM(C.totalCaja)} T={T}
          sub={Object.keys(C.saldosBancos || {}).length + " bancos"}
          color={T.teal} colorBg={T.tealBg} />
        <KpiCard icon={Calendar} label="Pagos próx. 7 días" value={fmtM(C.totalCompromisosProx)} T={T}
          sub={C.compromisosProx?.length + " compromisos"}
          color={T.amber} colorBg={T.amberBg} />
        <KpiCard icon={PiggyBank} label="Inversión real" value={fmtM(C.totalInversionReal)} T={T}
          sub={`DAP Inv. ${fmtM(C.totalDAPInversion)} + FF.MM. ${fmtM(C.totalFondos)}`}
          color={T.purple} colorBg={T.purpleBg} />
      </div>

      {/* Alertas rápidas */}
      {C.alertas?.length > 0 && (
        <div style={{ background: T.redBg, border: `1px solid ${T.red}33`, borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={14} color={T.red} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.red }}>Alertas ({C.alertas.length})</span>
            <button onClick={() => setTab("alertas")} style={{ marginLeft: "auto", background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Ver todas</button>
          </div>
          {C.alertas.slice(0, 3).map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: T.tx, padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <a.icon size={12} color={a.type === "danger" ? T.red : a.type === "warning" ? T.amber : T.accent} />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Facturación mensual */}
        <SectionCard title="Facturación mensual" icon={BarChart3} T={T} color={T.accent}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={C.ventasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="mes" tick={{ fill: T.txM, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.txM, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtM(v)} width={55} />
              <Tooltip content={<ChartTooltip T={T} />} />
              <Bar dataKey="total" fill={T.accent} radius={[4, 4, 0, 0]} name="Facturación" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Viajes mensuales */}
        <SectionCard title="Viajes mensuales" icon={Truck} T={T} color={T.green}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={C.viajesPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="mes" tick={{ fill: T.txM, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.txM, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip T={T} prefix="#" />} />
              <Area type="monotone" dataKey="total" stroke={T.green} fill={T.greenBg} name="Viajes" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Saldos bancos */}
        <SectionCard title="Saldos bancarios" icon={Building2} T={T} color={T.teal}>
          <MiniTable T={T}
            headers={["Banco", "Saldo"]}
            rows={[
              ...Object.entries(C.saldosBancos || {}).sort((a, b) => b[1] - a[1]).map(([banco, saldo]) => [banco, fmtFull(saldo)]),
              ["TOTAL", fmtFull(C.totalCaja)]
            ]} />
        </SectionCard>

        {/* Próximos compromisos */}
        <SectionCard title="Compromisos próximos 7 días" icon={Calendar} T={T} color={T.amber}>
          {C.compromisosProx?.length > 0 ? (
            <MiniTable T={T}
              headers={["Fecha", "Concepto", "Monto"]}
              rows={C.compromisosProx.map(r => [
                r.fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
                r.concepto.length > 30 ? r.concepto.slice(0, 28) + "..." : r.concepto,
                fmtM(r.monto),
              ])} />
          ) : <p style={{ fontSize: 12, color: T.txM, padding: 8 }}>Sin compromisos en los próximos 7 días</p>}
        </SectionCard>

        {/* Top clientes */}
        <SectionCard title={"Top clientes " + MESES[C.curMonth]} icon={Users} T={T} color={T.purple}>
          <MiniTable T={T}
            headers={["Cliente", "Facturación"]}
            rows={(C.topClientes || []).map(c => [c.name.length > 25 ? c.name.slice(0, 23) + "..." : c.name, fmtM(c.total)])} />
        </SectionCard>

        {/* DAP próximos vencimientos */}
        <SectionCard title="DAP — próximos vencimientos" icon={PiggyBank} T={T} color={T.green}>
          {C.dapProximos?.length > 0 ? (
            <MiniTable T={T}
              headers={["Banco", "Monto", "Vence", "Tasa"]}
              rows={C.dapProximos.map(r => [
                r.banco, fmtM(r.monto),
                r.vencimiento.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
                r.tasa || "",
              ])} />
          ) : <p style={{ fontSize: 12, color: T.txM, padding: 8 }}>Sin DAPs vigentes</p>}
        </SectionCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VENTAS VIEW
// ═══════════════════════════════════════════════════════════════
function VentasView({ C, T }) {
  const mesLabel = MESES_FULL[C.curMonth];
  const varMes = C.totalMesAnterior > 0 ? pctChange(C.totalMesActual, C.totalMesAnterior) : 0;
  const varAno = C.ventasAnoAnterior > 0 ? pctChange(C.ventasAnoActual, C.ventasAnoAnterior) : 0;

  // Participación por cliente
  const totalTop = (C.topClientes || []).reduce((s, c) => s + c.total, 0);
  const pieData = (C.topClientes || []).slice(0, 6).map((c, i) => ({
    name: c.name.length > 18 ? c.name.slice(0, 16) + "..." : c.name,
    value: c.total,
    pct: totalTop > 0 ? ((c.total / C.totalMesActual) * 100).toFixed(1) : 0,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>Ventas y facturación</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard icon={DollarSign} label={`Facturación ${mesLabel}`} value={fmtM(C.totalMesActual)} T={T}
          sub={varMes !== 0 ? fmtPct(varMes) + " vs mes anterior" : undefined} color={T.accent} colorBg={T.accentBg} />
        <KpiCard icon={TrendingUp} label="Acumulado año" value={fmtM(C.ventasAnoActual)} T={T}
          sub={varAno !== 0 ? fmtPct(varAno) + " vs " + (C.curYear - 1) : undefined} color={T.green} colorBg={T.greenBg} />
        <KpiCard icon={Target} label="Mes anterior" value={fmtM(C.totalMesAnterior)} T={T} color={T.txM} colorBg={T.bg3 + "88"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <SectionCard title="Evolución mensual" icon={BarChart3} T={T}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={C.ventasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="mes" tick={{ fill: T.txM, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.txM, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtM(v)} width={55} />
              <Tooltip content={<ChartTooltip T={T} />} />
              <Bar dataKey="total" fill={T.accent} radius={[4, 4, 0, 0]} name="Facturación" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title={`Participación clientes — ${mesLabel}`} icon={Users} T={T} color={T.purple}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ name, pct }) => `${pct}%`} labelLine={{ stroke: T.txD }}>
                {pieData.map((_, i) => <Cell key={i} fill={T.chart[i % T.chart.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip T={T} />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "center" }}>
            {pieData.map((d, i) => (
              <span key={i} style={{ fontSize: 10, color: T.txM, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: T.chart[i % T.chart.length] }} />{d.name}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top clientes del mes" icon={Users} T={T} color={T.accent}>
          <MiniTable T={T}
            headers={["#", "Cliente", "Monto", "% Part."]}
            rows={(C.topClientes || []).map((c, i) => [
              i + 1,
              c.name.length > 22 ? c.name.slice(0, 20) + "..." : c.name,
              fmtM(c.total),
              C.totalMesActual > 0 ? ((c.total / C.totalMesActual) * 100).toFixed(1) + "%" : "0%",
            ])} />
        </SectionCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OPERACIONES VIEW
// ═══════════════════════════════════════════════════════════════
function OperacionesView({ C, T }) {
  const varViajes = C.viajesMesAnteriorCount > 0 ? pctChange(C.viajesMesActual, C.viajesMesAnteriorCount) : 0;
  const varCorte = C.viajesCorteAnterior > 0 ? pctChange(C.viajesCorteActual, C.viajesCorteAnterior) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>Operaciones</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard icon={Truck} label="Viajes mes completo" value={C.viajesMesActual?.toLocaleString("es-CL")} T={T}
          sub={varViajes !== 0 ? fmtPct(varViajes) + " vs mes anterior" : undefined} color={T.green} colorBg={T.greenBg} />
        <KpiCard icon={Activity} label={`Corte al día ${C.dayOfMonth}`} value={C.viajesCorteActual?.toLocaleString("es-CL")} T={T}
          sub={`${C.viajesCorteAnterior} mes ant. (${fmtPct(varCorte)})`}
          color={varCorte >= 0 ? T.green : T.red} colorBg={varCorte >= 0 ? T.greenBg : T.redBg} />
        <KpiCard icon={MapPin} label="KM mes actual" value={C.kmMesActual?.toLocaleString("es-CL")} T={T} color={T.teal} colorBg={T.tealBg} />
        <KpiCard icon={Truck} label="Tractos activos" value={C.tractosActivos?.toString()} T={T} color={T.purple} colorBg={T.purpleBg} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <SectionCard title="Viajes por mes" icon={BarChart3} T={T} color={T.green}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={C.viajesPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="mes" tick={{ fill: T.txM, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.txM, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip T={T} prefix="#" />} />
              <Bar dataKey="total" fill={T.green} radius={[4, 4, 0, 0]} name="Viajes" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top clientes por viajes" icon={Users} T={T} color={T.accent}>
          <MiniTable T={T}
            headers={["Cliente", "Viajes", "% Part."]}
            rows={(C.topClientesViajes || []).map(c => [
              c.name.length > 22 ? c.name.slice(0, 20) + "..." : c.name,
              c.count,
              C.viajesMesActual > 0 ? ((c.count / C.viajesMesActual) * 100).toFixed(1) + "%" : "0%",
            ])} />
        </SectionCard>

        <SectionCard title="Viajes por tipo de equipo" icon={Truck} T={T} color={T.purple}>
          {C.viajesPorEquipo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={C.viajesPorEquipo} dataKey="count" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={2}
                  label={({ name, count }) => `${count}`} labelLine={{ stroke: T.txD }}>
                  {C.viajesPorEquipo.map((_, i) => <Cell key={i} fill={T.chart[i % T.chart.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip T={T} prefix="#" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ fontSize: 12, color: T.txM }}>Sin datos</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, justifyContent: "center" }}>
            {(C.viajesPorEquipo || []).slice(0, 6).map((d, i) => (
              <span key={i} style={{ fontSize: 9, color: T.txM, display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: T.chart[i % T.chart.length] }} />{d.name}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FINANZAS VIEW
// ═══════════════════════════════════════════════════════════════
function FinanzasView({ C, T }) {
  const DapBadge = ({ label, color, bg }) => (
    <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: bg, color, letterSpacing: 0.3 }}>{label}</span>
  );
  const tipoLabel = { trabajo: "Trabajo", inversion: "Inversión", credito: "Crédito" };
  const tipoColor = { trabajo: T.accent, inversion: T.green, credito: T.amber };
  const tipoBg = { trabajo: T.accentBg, inversion: T.greenBg, credito: T.amberBg };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>Finanzas</h2>

      {/* KPIs principales */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard icon={Building2} label="Caja total" value={fmtM(C.totalCaja)} T={T} color={T.teal} colorBg={T.tealBg} />
        <KpiCard icon={Target} label="Inversión real" value={fmtM(C.totalInversionReal)} T={T}
          sub={`DAP Inv. ${fmtM(C.totalDAPInversion)} + FF.MM. ${fmtM(C.totalFondos)}`}
          color={T.green} colorBg={T.greenBg} />
        <KpiCard icon={Calendar} label="Compromisos mes" value={fmtM(C.totalCompromisosMes)} T={T}
          sub={`Guardado: ${fmtM(C.totalGuardadoMes)}`} color={T.amber} colorBg={T.amberBg} />
      </div>

      {/* Desglose DAP por tipo */}
      <SectionCard title="Depósitos a plazo — desglose por tipo" icon={PiggyBank} T={T} color={T.purple}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ flex: "1 1 150px", background: T.accentBg, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.accent}22` }}>
            <div style={{ fontSize: 10, color: T.accent, fontWeight: 600, marginBottom: 4 }}>DAP TRABAJO</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>{fmtM(C.totalDAPTrabajo)}</div>
            <div style={{ fontSize: 11, color: T.txM, marginTop: 2 }}>Ganancia: {fmtM(C.gananciaDAPTrabajo)}</div>
            <div style={{ fontSize: 10, color: T.txD, marginTop: 4 }}>Capital de trabajo rotativo</div>
          </div>
          <div style={{ flex: "1 1 150px", background: T.greenBg, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.green}22` }}>
            <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginBottom: 4 }}>DAP INVERSIÓN</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>{fmtM(C.totalDAPInversion)}</div>
            <div style={{ fontSize: 11, color: T.txM, marginTop: 2 }}>Ganancia: {fmtM(C.gananciaDAPInversion)}</div>
            <div style={{ fontSize: 10, color: T.txD, marginTop: 4 }}>Inversión a mayor plazo</div>
          </div>
          <div style={{ flex: "1 1 150px", background: T.amberBg, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.amber}22` }}>
            <div style={{ fontSize: 10, color: T.amber, fontWeight: 600, marginBottom: 4 }}>DAP CRÉDITO</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>{fmtM(C.totalDAPCredito)}</div>
            <div style={{ fontSize: 11, color: T.txM, marginTop: 2 }}>Ganancia: {fmtM(C.gananciaDAPCredito)}</div>
            <div style={{ fontSize: 10, color: T.txD, marginTop: 4 }}>Reserva cuotas crédito Itaú</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.tx }}>Total DAPs vigentes</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.tx }}>{fmtM(C.totalDAP)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: T.txM }}>Ganancia total DAPs</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.green }}>{fmtM(C.gananciaDAP)}</span>
        </div>
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Saldos bancarios */}
        <SectionCard title="Saldos bancarios" icon={Building2} T={T} color={T.teal}>
          <MiniTable T={T}
            headers={["Banco", "Saldo"]}
            rows={[
              ...Object.entries(C.saldosBancos || {}).sort((a, b) => b[1] - a[1]).map(([banco, saldo]) => [banco, fmtFull(saldo)]),
              ["TOTAL", fmtFull(C.totalCaja)],
            ]} />
        </SectionCard>

        {/* Fondos Mutuos */}
        <SectionCard title="Fondos mutuos" icon={TrendingUp} T={T} color={T.purple}>
          <MiniTable T={T}
            headers={["Fondo", "Admin.", "Invertido", "Actual", "Rent. %"]}
            rows={(C.fondosSaldos || []).map(r => [
              r.fondo, r.admin, fmtM(r.invertido), fmtM(r.actual), r.rentPct,
            ])} />
          {C.totalFondos > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: `1px solid ${T.border}`, marginTop: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>Total FF.MM.</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.tx }}>{fmtM(C.totalFondos)}</span>
            </div>
          )}
        </SectionCard>

        {/* Resumen inversión real */}
        <SectionCard title="Inversión real (no incluye trabajo ni crédito)" icon={Target} T={T} color={T.green}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: T.txM }}>DAP Inversión</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>{fmtM(C.totalDAPInversion)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: T.txM }}>Fondos Mutuos</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>{fmtM(C.totalFondos)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.green }}>Total inversión real</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{fmtM(C.totalInversionReal)}</span>
            </div>
          </div>
        </SectionCard>

        {/* DAPs próximos vencimientos */}
        <SectionCard title="DAPs — próximos vencimientos" icon={PiggyBank} T={T} color={T.accent}>
          <MiniTable T={T}
            headers={["Banco", "Tipo", "Monto", "Final", "Vence", "Tasa"]}
            rows={(C.dapProximos || []).map(r => [
              r.banco,
              <DapBadge key="t" label={tipoLabel[r._tipoNorm] || r.tipo} color={tipoColor[r._tipoNorm] || T.txM} bg={tipoBg[r._tipoNorm] || T.bg3} />,
              fmtM(r.monto), fmtM(r.montoFinal),
              r.vencimiento?.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
              r.tasa || "",
            ])} />
        </SectionCard>

        {/* Compromisos próximos 7 días */}
        <SectionCard title="Compromisos próximos 7 días" icon={Calendar} T={T} color={T.amber}>
          {C.compromisosProx?.length > 0 ? (
            <MiniTable T={T}
              headers={["Fecha", "Concepto", "Monto", "Guardado", "Falta"]}
              rows={C.compromisosProx.map(r => [
                r.fecha.toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" }),
                r.concepto.length > 25 ? r.concepto.slice(0, 23) + "..." : r.concepto,
                fmtM(r.monto), fmtM(r.guardado),
                r.falta > 0 ? fmtM(r.falta) : "Ok",
              ])} />
          ) : <p style={{ fontSize: 12, color: T.txM, padding: 8 }}>Sin compromisos pendientes</p>}
        </SectionCard>

        {/* Calendario del mes */}
        <SectionCard title={`Calendario del mes — ${MESES_FULL[C.curMonth]}`} icon={Clock} T={T} color={T.accent}>
          <MiniTable T={T} maxRows={15}
            headers={["Fecha", "Concepto", "Monto", "Estado"]}
            rows={(C.compromisosMes || []).sort((a, b) => a.fecha - b.fecha).map(r => [
              r.fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
              r.concepto.length > 28 ? r.concepto.slice(0, 26) + "..." : r.concepto,
              fmtM(r.monto),
              r.estado || "-",
            ])} />
        </SectionCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERTAS VIEW
// ═══════════════════════════════════════════════════════════════
function AlertasView({ C, T }) {
  const typeStyle = {
    danger: { bg: T.redBg, border: T.red, color: T.red },
    warning: { bg: T.amberBg, border: T.amber, color: T.amber },
    info: { bg: T.accentBg, border: T.accent, color: T.accent },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>Alertas</h2>

      {C.alertas?.length === 0 && (
        <div style={{ background: T.greenBg, border: `1px solid ${T.green}33`, borderRadius: 12, padding: 20, textAlign: "center" }}>
          <span style={{ fontSize: 14, color: T.green, fontWeight: 600 }}>Todo en orden — sin alertas activas</span>
        </div>
      )}

      {(C.alertas || []).map((a, i) => {
        const s = typeStyle[a.type] || typeStyle.info;
        return (
          <div key={i} style={{
            background: s.bg, border: `1px solid ${s.border}33`, borderRadius: 12, padding: "14px 18px",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{ background: s.border + "22", borderRadius: 8, padding: 6, display: "flex", flexShrink: 0 }}>
              <a.icon size={16} color={s.color} />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: s.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {a.type === "danger" ? "Crítico" : a.type === "warning" ? "Atención" : "Info"}
              </span>
              <p style={{ fontSize: 13, color: T.tx, marginTop: 2, lineHeight: 1.4 }}>{a.msg}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
