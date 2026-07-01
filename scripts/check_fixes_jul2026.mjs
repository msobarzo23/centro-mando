// Verificación empírica de las correcciones de la auditoría jul-2026: ejecuta el
// computeAll REAL (no una réplica) con los CSV publicados y chequea los números
// que las correcciones debían arreglar. Uso:
//   node scripts/check_fixes_jul2026.mjs <carpeta-con-csv-descargados>
// La carpeta debe tener ventas.csv, viajes.csv, flotaViajes.csv, flotaEquipos.csv,
// expediciones.csv, conductoresActivos.csv, historico.csv, finBancos.csv,
// finDAP.csv, finCalendario.csv, finFondos.csv, leasingDetalle.csv,
// leasingResumen.csv y credito.csv (descargados con las URLs de constants.js).
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { computeAll } from "../src/services/compute.js";
import { parseLeasingResumen } from "../src/services/fetchData.js";
import { parseNum } from "../src/utils.js";

const dir = process.argv[2];
if (!dir) { console.error("Falta la carpeta de CSVs"); process.exit(1); }
const read = (name) => fs.readFileSync(path.join(dir, name + ".csv"), "utf8");

const csv = (name) => Papa.parse(read(name), { header: true, skipEmptyLines: true }).data;
const csvRaw = (name) => Papa.parse(read(name), { header: false, skipEmptyLines: true }).data;

// Réplica de fetchFinCSV (misma lógica que src/services/fetchData.js, pero sobre texto local)
const fin = (name, knownHeaders) => {
  const rows = csvRaw(name);
  let headerIdx = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c || "").trim().toLowerCase());
    const score = knownHeaders.reduce((s, h) => s + (row.some(c => c.includes(h.toLowerCase())) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  if (headerIdx === -1 || bestScore < 2) return [];
  const headers = rows[headerIdx].map(c => String(c || "").trim());
  const data = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c || String(c).trim() === "")) continue;
    const filled = row.map((c, ci) => ({ ci, v: String(c == null ? "" : c).trim() })).filter(x => x.v !== "");
    const esTitulo = (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) && !/[a-záéíóúñ]/.test(v);
    if (filled.length === 1 && filled[0].ci === 0 && esTitulo(filled[0].v)) break;
    if (filled.some(x => /^TOTAL(ES)?$/i.test(x.v) || /^TOTALES\s/i.test(x.v))) continue;
    const obj = {};
    headers.forEach((h, ci) => { if (h) obj[h] = row[ci] || ""; });
    data.push(obj);
  }
  return data;
};

const data = {
  ventas: csv("ventas"),
  viajes: csv("viajes"),
  flotaViajes: csv("flotaViajes"),
  flotaEquipos: csv("flotaEquipos"),
  expediciones: csv("expediciones"),
  conductoresActivos: csv("conductoresActivos"),
  historico: csv("historico"),
  finResumen: [],
  finBancos: fin("finBancos", ["Fecha", "Banco", "Saldo Inicial", "Saldo Final", "Monto"]),
  finDAP: fin("finDAP", ["Fecha Inicio", "Vencimiento", "Tasa", "Monto Inicial", "Monto Final", "Ganancia", "Vigente"]),
  finCalendario: fin("finCalendario", ["Fecha", "Monto", "Guardado", "Falta", "Concepto", "Estado"]),
  finFondos: fin("finFondos", ["Empresa", "Fondo", "Administradora", "Monto Invertido", "Valor Actual", "Rentabilidad"]),
  leasingDetalle: fin("leasingDetalle", ["ID", "Banco", "Emisor", "Tractos", "Cuota UF", "Dia Vcto", "Fecha Inicio", "Fecha Fin", "Estado"]),
  leasingResumen: parseLeasingResumen(csvRaw("leasingResumen")),
  credito: csv("credito"),
};

const C = computeAll(data);
const M = (n) => n == null ? "—" : "$" + Math.round(n / 1e6).toLocaleString("es-CL") + "M";
let fails = 0;
const check = (label, ok, detail) => { console.log(`${ok ? "OK " : "FALLA"} ${label}${detail ? " — " + detail : ""}`); if (!ok) fails++; };

console.log("=== Correcciones jul-2026 ===");

// 1. Histórico re-basado: la venta de junio por comparativas debe ser ~mensual normal (no ~$60.000M)
const ventasMesHist = C.comparativas?.month?.ventas;
check("Histórico re-basado (mes previo ~$4-8.000M)", ventasMesHist?.previo != null && ventasMesHist.previo > 3e9 && ventasMesHist.previo < 9e9, `previo=${M(ventasMesHist?.previo)}`);

// 2. Flota: denominador por patentes únicas (~342)
check("Flota = patentes únicas", C.totalTractocamiones > 300 && C.totalTractocamiones < 400, `totalTractocamiones=${C.totalTractocamiones}`);

// 3. viajesAyer viene de VIAJES (~60-250/día), no de tramos de flota (~500+)
check("viajesAyer en escala de viajes reales", C.viajesAyer > 20 && C.viajesAyer < 400, `viajesAyer=${C.viajesAyer} (${C.viajesAyerLabel})`);

// 4. Despachos/día con fallback (nunca 0 con datos)
check("Despachos/día > 0", C.tractosDespachadosDia > 0, `=${C.tractosDespachadosDia} (${C.despachosMesLabel}, ${C.diasConDatosTractos} días)`);

// 5. Las barras de proyección estacional suman el KPI anual
const barras = (C.ventasPorMesConProyeccion || []).reduce((s, m) => s + (m.actual || 0) + (m.proyectado || 0), 0);
const seasonal = C.projections?.seasonal || 0;
check("Barras ≈ proyección estacional (±0.5%)", seasonal > 0 && Math.abs(barras - seasonal) / seasonal < 0.005, `barras=${M(barras)} vs seasonal=${M(seasonal)}`);

// 6. Cumplimiento: abril SIN uplift en el esperado estacional (uplift factura parte en mayo)
const abril = (C.cumplimientoMensual || []).find(r => r.mesNum === 4);
const upliftAbr = C.upliftPorMes?.[4] ?? null;
check("Uplift factura de abril = 0", upliftAbr === 0, `upliftPorMes[4]=${upliftAbr}`);
check("Uplift factura de mayo > 0", (C.upliftPorMes?.[5] || 0) > 0, `upliftPorMes[5]=${(C.upliftPorMes?.[5] || 0).toFixed(3)}`);
if (abril) console.log(`   abril: real=${M(abril.real)} espViajes=${M(abril.espViajes)} espEstacional=${M(abril.espEstacional)} lectura=${abril.lectura}`);

// 7. Tarifa por cliente: cobertura del cruce por tokens (top clientes del mes con tarifa propia)
const desg = C.desgloseMesActualProy || [];
const conTasaPropia = desg.filter(d => d.confianza !== "global").length;
check("Cruce tarifa: mayoría del top con tarifa propia", desg.length > 0 && conTasaPropia / desg.length > 0.5, `${conTasaPropia}/${desg.length} con tarifa propia`);

// 8. comp60Total real (ya no es comp30 × 2 exacto, salvo coincidencia)
console.log(`   comp30=${M(C.comp30)} comp60=${M(C.comp60Total)}`);

// 9. Leasing: UF implícita del detalle aplicada a próximas cuotas
const uf = C.leasingTotalUF > 0 ? C.leasingTotalCuotaSinIVA / C.leasingTotalUF : null;
const pc = (C.leasingProxCuotas || [])[0];
if (pc && uf) check("Próx. cuota leasing reescalada a UF del detalle", Math.abs(pc.cuotaCLP - pc.cuotaUF * uf) < 1, `cuotaUF=${pc.cuotaUF} × UF ${Math.round(uf)} = ${M(pc.cuotaUF * uf)} vs ${M(pc.cuotaCLP)}`);

// 10. Margen caja y corte de mes
console.log(`   margenCaja(mes cerrado)=${M(C.margenMesEstimadoCaja)} · totalMesActual=${M(C.totalMesActual)} vs mesAntCorte(día ${C.ventasDiaCorte})=${M(C.totalMesAnteriorCorte)}`);

// 11. Registro MEPCO congelado no depende del año en curso (ventana = año del corte)
check("Impacto MEPCO acumulado > 0 (congelado)", C.impactoMepcoAcum > 0, M(C.impactoMepcoAcum));

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} chequeos fallaron`);
process.exit(fails === 0 ? 0 : 1);
