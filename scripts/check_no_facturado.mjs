// Verificación empírica del bloque "viajes sin facturar" y de la proyección del
// próximo mes con tarifario: descarga ventas y viajes, corre computeAll y compara
// la proyección nueva (tarifa TMS real) contra la vieja (viajes × tasa histórica).
import Papa from "papaparse";
import { computeAll } from "../src/services/compute.js";
import { CSV as CSV_URLS } from "../src/constants.js";

const fetchCSV = async (url) => {
  const text = await (await fetch(url)).text();
  return Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
};

const [ventas, viajes] = await Promise.all([
  fetchCSV(CSV_URLS.ventas),
  fetchCSV(CSV_URLS.viajes),
]);
console.log(`ventas: ${ventas.length} filas | viajes: ${viajes.length} filas`);

const C = computeAll({ ventas, viajes });
const f = (v) => "$" + Math.round(v / 1e6).toLocaleString("es-CL") + "M";

const IE = C.ingresoEstimado;
console.log(`\nIngreso estimado mes en curso: ${f(IE.total)} (${IE.cubiertos}/${IE.viajes} viajes, ${(IE.cobertura * 100).toFixed(0)}% cobertura)`);
console.log(`Valor medio por viaje valorizado: $${Math.round(IE.total / IE.cubiertos).toLocaleString("es-CL")}`);
console.log(`Viajes proyectados mes completo (proyViajesHibrido): ${C.proyViajesHibrido}`);
if (IE.tendencia) {
  const t = IE.tendencia;
  const p = (v) => v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  console.log(`Tendencia vs prom. ${t.nMeses} meses previos al día ${t.corte}: estimado ${p(t.estimadoPct)} · viajes ${p(t.viajesPct)} · ritmo ${p(t.ritmoPct)}`);
}
console.log(`\nProyección próx. mes NUEVA (tarifario):    ${f(C.proyMesSiguienteTarifario)}`);
console.log(`Proyección próx. mes VIEJA (viajes×tasa):  ${f(C.proyMesSiguientePorViajes)}`);
console.log(`Facturado real del mes en curso a la fecha: ${f(C.totalMesActual)}`);

const NF = C.noFacturado;
if (NF) {
  console.log(`\nNo facturado ${NF.meta.desde} a ${NF.meta.hasta}: ${f(NF.total)} en ${NF.meta.viajes} viajes (${NF.meta.valorizados} valorizados)`);
  NF.meses.forEach(m => console.log(`  ${m.mes}: ${f(m.monto)} (${m.viajes} viajes)`));
} else console.log("\nnoFacturado: null (sin datos)");
