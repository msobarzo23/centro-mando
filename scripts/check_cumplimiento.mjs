// Verificación empírica del nuevo bloque "Proyectado vs. real — meses cerrados":
// descarga ventas y viajes reales, corre computeAll y muestra cumplimientoMensual.
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
const f = (v) => v == null ? "      —" : ("$" + (v / 1e6).toFixed(0) + "M").padStart(7);
console.log("\nMes  | Esp.viajes | Esp.estacional | Real    | Desvío   | Lectura");
for (const r of C.cumplimientoMensual) {
  const d = r.desvio == null ? "—" : `${r.desvio >= 0 ? "+" : "-"}${f(Math.abs(r.desvio)).trim()} (${r.desvioPct.toFixed(1)}%)`;
  console.log(`${r.mes.padEnd(4)} | ${f(r.espViajes)}    | ${f(r.espEstacional)}        | ${f(r.real)} | ${d.padEnd(8)} | ${r.lectura}`);
}
console.log("\nAlertas relacionadas:");
C.alertas.filter(a => /facturar|cerró/.test(a.msg)).forEach(a => console.log(" -", a.msg));
