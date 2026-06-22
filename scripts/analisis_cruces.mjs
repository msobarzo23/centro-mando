// Análisis exploratorio de cruces NO presentes hoy en el dashboard.
// Solo lectura; no toca el repo. Ejecutar: node scripts/analisis_cruces.mjs
import Papa from "papaparse";

const CSV = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  viajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
  flotaEquipos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv",
  expediciones: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=0&single=true&output=csv",
};

const parseNum = (v) => {
  if (v == null) return 0;
  const s = String(v).replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const parseDate = (v) => {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return null;
  let [_, d, mo, y] = m; y = +y < 100 ? 2000 + +y : +y;
  const dt = new Date(+y, +mo - 1, +d);
  return isNaN(dt) ? null : dt;
};
async function load(url) {
  const txt = await (await fetch(url)).text();
  return Papa.parse(txt, { header: true, skipEmptyLines: true }).data;
}
const fmt = (n) => Math.round(n).toLocaleString("es-CL");
const top = (map, n = 10) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);

const YEAR = 2026;
const [ventas, viajes, flota, equipos, exped] = await Promise.all(
  [CSV.ventas, CSV.viajes, CSV.flotaViajes, CSV.flotaEquipos, CSV.expediciones].map(load)
);
console.log("Filas:", { ventas: ventas.length, viajes: viajes.length, flota: flota.length, equipos: equipos.length, exped: exped.length });

// ---------- VIAJES 2026 ----------
const vj = viajes.map(r => ({ ...r, _d: parseDate(r.fechainicio) })).filter(r => r._d && r._d.getFullYear() === YEAR);
const lastMonth = Math.max(...vj.map(r => r._d.getMonth()));
console.log(`\nViajes ${YEAR}: ${vj.length} | último mes con datos: ${lastMonth + 1}`);

// Rutas
const rutas = {}; vj.forEach(r => { const k = `${(r.origen || "?").trim()} → ${(r.destino || "?").trim()}`; rutas[k] = (rutas[k] || 0) + 1; });
console.log(`\n=== TOP RUTAS por nº de viajes (${YEAR}) — total ${Object.keys(rutas).length} rutas distintas ===`);
top(rutas, 12).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

// Tipo de carga
const cargas = {}; vj.forEach(r => { const k = (r.tipocarga || "(sin)").trim().toUpperCase(); cargas[k] = (cargas[k] || 0) + 1; });
console.log(`\n=== MIX por TIPO DE CARGA (${YEAR}) — ${Object.keys(cargas).length} tipos ===`);
top(cargas, 12).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${(100 * v / vj.length).toFixed(1).padStart(5)}%  ${k}`));

// Tipo de viaje
const tv = {}; vj.forEach(r => { const k = (r.tipoviaje || "(sin)").trim().toUpperCase(); tv[k] = (tv[k] || 0) + 1; });
console.log(`\n=== TIPO DE VIAJE (${YEAR}) ===`);
top(tv, 8).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${(100 * v / vj.length).toFixed(1).padStart(5)}%  ${k}`));

// Estado de viajes (control de calidad / conformidad)
const est = {}; vj.forEach(r => { const k = (r.Estado || r.estado || "(sin)").trim(); est[k] = (est[k] || 0) + 1; });
console.log(`\n=== ESTADO de viajes (${YEAR}) — control de recepción ===`);
top(est, 12).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${(100 * v / vj.length).toFixed(1).padStart(5)}%  ${k}`));

// Patrón horario
const horas = {}; vj.forEach(r => { const h = String(r.hora || "").split(":")[0]; if (h !== "") horas[h.padStart(2, "0")] = (horas[h.padStart(2, "0")] || 0) + 1; });
console.log(`\n=== DESPACHOS por HORA del día (${YEAR}) — top franjas ===`);
top(horas, 6).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}:00 hrs`));

// ---------- FLOTA VIAJES 2026: conductores, ramplas, rutas con km ----------
const fl = flota.map(r => ({ ...r, _d: parseDate(r.Fecha), _km: parseNum(r.Kilometro), _cond: `${(r.Nombre || "").trim()} ${(r.Apellido || "").trim()}`.trim(), _carga: (r.Carga || "").trim().toUpperCase() })).filter(r => r._d && r._d.getFullYear() === YEAR);
const flCargados = fl.filter(r => r.Cliente && r.Cliente.trim() && r._carga !== "VACIO");
console.log(`\nflotaViajes ${YEAR}: ${fl.length} tramos (${flCargados.length} cargados, ${fl.length - flCargados.length} vacíos/sin cliente)`);

// Productividad por conductor (km + viajes), año 2026
const condKm = {}, condViajes = {};
fl.forEach(r => { if (!r._cond) return; condKm[r._cond] = (condKm[r._cond] || 0) + r._km; condViajes[r._cond] = (condViajes[r._cond] || 0) + 1; });
console.log(`\n=== TOP CONDUCTORES por KM (${YEAR}) — ${Object.keys(condKm).length} conductores con viajes ===`);
top(condKm, 12).forEach(([k, v]) => console.log(`  ${fmt(v).padStart(10)} km  ${String(condViajes[k]).padStart(4)} tramos  ${k}`));
const condArr = Object.keys(condKm);
const kmProm = condArr.reduce((s, k) => s + condKm[k], 0) / condArr.length;
console.log(`  → km promedio/conductor: ${fmt(kmProm)} | conductores bajo 50% del promedio: ${condArr.filter(k => condKm[k] < kmProm * 0.5).length}`);

// Ramplas
const ramplasUsadas = new Set(fl.map(r => (r.Rampla || "").trim()).filter(Boolean));
const ramplasPadron = equipos.filter(r => (r.tipoequipo || "").toUpperCase().includes("RAMP") || (r.tipoequipo || "").toUpperCase().includes("SEMI") || (r.tipoequipo || "").toUpperCase().includes("ESTANQUE") || (r.tipoequipo || "").toUpperCase().includes("RAMPLA"));
console.log(`\n=== RAMPLAS/REMOLQUES ===`);
console.log(`  ramplas distintas usadas en ${YEAR}: ${ramplasUsadas.size}`);

// Tipos de equipo en el padrón
const teq = {}; equipos.forEach(r => { const k = (r.tipoequipo || "(sin)").trim().toUpperCase(); teq[k] = (teq[k] || 0) + 1; });
console.log(`\n=== PADRÓN por tipo de equipo (${equipos.length} unidades) ===`);
top(teq, 15).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

// Km por tracto (productividad por unidad) año 2026
const tractoKm = {}; fl.forEach(r => { const t = (r.Tracto || "").trim().toUpperCase().split("-")[0]; if (t) tractoKm[t] = (tractoKm[t] || 0) + r._km; });
const tractoArr = Object.entries(tractoKm).sort((a, b) => b[1] - a[1]);
console.log(`\n=== KM por TRACTO (${YEAR}) — dispersión de uso ===`);
console.log(`  tractos con km: ${tractoArr.length}`);
console.log(`  top 5:`, tractoArr.slice(0, 5).map(([t, k]) => `${t}:${fmt(k)}`).join("  "));
console.log(`  bottom 5 (con algo de km):`, tractoArr.filter(([, k]) => k > 0).slice(-5).map(([t, k]) => `${t}:${fmt(k)}`).join("  "));

// ---------- EXPEDICIONES: duración de ciclo ----------
const ex = exped.map(r => ({ ...r, _ini: parseDate(r.fechainicio), _fin: parseDate(r.fechacierre), _cant: parseNum(r.cantidad) }))
  .filter(r => r._ini && r._fin && r._fin >= r._ini && r._ini.getFullYear() === YEAR);
const durs = ex.map(r => Math.round((r._fin - r._ini) / 86400000));
durs.sort((a, b) => a - b);
const med = durs[Math.floor(durs.length / 2)];
const prom = durs.reduce((s, x) => s + x, 0) / durs.length;
console.log(`\n=== DURACIÓN de EXPEDICIÓN (${YEAR}, ${ex.length} cerradas) ===`);
console.log(`  promedio: ${prom.toFixed(1)} días | mediana: ${med} días | p90: ${durs[Math.floor(durs.length * 0.9)]} días | máx: ${durs[durs.length - 1]}`);
const estEx = {}; exped.forEach(r => { const k = (r.estado || "(sin)").trim(); estEx[k] = (estEx[k] || 0) + 1; });
console.log(`  estados:`, top(estEx, 8).map(([k, v]) => `${k}:${v}`).join("  "));

// ---------- CRUCE viajes ejecutados vs facturado (mes en curso) por cliente ----------
const vtRows = ventas.map(r => ({ ...r, _d: parseDate(r.FECHA || r.Fecha), _neto: parseNum(r.NETO || r.Neto), _rs: (r["RAZON SOCIAL"] || "").trim().toUpperCase() })).filter(r => r._d);
const norm = (s) => (s || "").toUpperCase().replace(/\s+/g, " ").replace(/[.,]/g, "").trim();
// tarifa por cliente del mes anterior cerrado (ventas / viajes mes previo)
console.log(`\n=== Señal: $/viaje por cliente (top clientes por viajes, ${YEAR}) ===`);
const vjMesUlt = vj.filter(r => r._d.getMonth() === lastMonth);
const cli = {}; vjMesUlt.forEach(r => { const k = norm(r.Cliente); cli[k] = (cli[k] || 0) + 1; });
const ventasMesUlt = {}; vtRows.filter(r => r._d.getFullYear() === YEAR && r._d.getMonth() === lastMonth).forEach(r => { ventasMesUlt[norm(r["RAZON SOCIAL"])] = (ventasMesUlt[norm(r["RAZON SOCIAL"])] || 0) + r._neto; });
top(cli, 10).forEach(([k, v]) => {
  const fact = ventasMesUlt[k] || 0;
  console.log(`  ${String(v).padStart(4)} viajes  fact $${fmt(fact).padStart(13)}  ${fact > 0 ? "$" + fmt(fact / v) + "/viaje" : "SIN FACTURA EN EL MES"}  ${k.slice(0, 32)}`);
});

console.log("\n[fin]");
