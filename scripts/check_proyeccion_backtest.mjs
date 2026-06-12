// Backtest de los métodos de proyección anual con el histórico completo de la
// planilla (2023+): parado a fin de cada mes M de un año ya cerrado, ¿qué habría
// proyectado cada método y cuánto se equivocó contra el cierre real?
import Papa from "papaparse";
import { CSV } from "../src/constants.js";
import { parseNum, parseDate } from "../src/utils.js";

const text = await (await fetch(CSV.ventas)).text();
const rows = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
const ventas = rows.map(r => ({ d: parseDate(r.FECHA || r.Fecha || r.fecha), neto: parseNum(r.NETO || r.Neto || r.neto) })).filter(r => r.d && r.neto);

const byYM = {};
ventas.forEach(r => { const y = r.d.getFullYear(); (byYM[y] ??= Array(12).fill(0))[r.d.getMonth()] += r.neto; });
const years = Object.keys(byYM).map(Number).sort();

console.log("== Totales y reparto mensual por año ($B) ==");
years.forEach(y => {
  const t = byYM[y].reduce((a, b) => a + b, 0);
  console.log(y, ("$" + (t / 1e6).toFixed(0) + "M").padStart(9), "|", byYM[y].map(v => (v / 1e9).toFixed(2)).join(" "));
});

const share = (y) => { const t = byYM[y].reduce((a, b) => a + b, 0); return byYM[y].map(v => v / t); };
const avgShares = (ys) => { const w = Array(12).fill(0); ys.forEach(y => { share(y).forEach((v, i) => w[i] += v / ys.length); }); return w; };

console.log("\n== Peso de cada semestre (estacionalidad) ==");
years.forEach(y => {
  const s = share(y);
  console.log(y, "H1:", (s.slice(0, 6).reduce((a, b) => a + b, 0) * 100).toFixed(1) + "%", "| H2:", (s.slice(6).reduce((a, b) => a + b, 0) * 100).toFixed(1) + "%");
});

console.log("\n== Backtest: error% = (proyección − cierre real) / cierre real ==");
for (const y of years) {
  if (y >= 2026) continue;
  const prevYs = years.filter(p => p < y);
  if (prevYs.length === 0) continue;
  const real = byYM[y].reduce((a, b) => a + b, 0);
  console.log(`\n-- Año ${y} (cierre real $${(real / 1e6).toFixed(0)}M) — pesos prev: ${y - 1} | multi: ${prevYs.join("+")} --`);
  console.log("corte | lineal/prorr | estac(prev) | estac(multi)");
  const errs = { lin: [], e1: [], eM: [] };
  for (let M = 3; M <= 11; M++) {
    const ytd = byYM[y].slice(0, M).reduce((a, b) => a + b, 0);
    const lin = ytd / M * 12;
    const w1 = share(y - 1), wM = avgShares(prevYs);
    const e1 = ytd / w1.slice(0, M).reduce((a, b) => a + b, 0);
    const eM = ytd / wM.slice(0, M).reduce((a, b) => a + b, 0);
    const pe = (v) => (((v - real) / real * 100).toFixed(1) + "%").padStart(7);
    errs.lin.push(Math.abs(lin - real) / real); errs.e1.push(Math.abs(e1 - real) / real); errs.eM.push(Math.abs(eM - real) / real);
    console.log(`  ${String(M).padStart(2)}  | ${pe(lin)}      | ${pe(e1)}     | ${pe(eM)}`);
  }
  const m = (a) => (a.reduce((x, b) => x + b, 0) / a.length * 100).toFixed(1) + "%";
  console.log(`error promedio: lineal ${m(errs.lin)} | estacional(prev) ${m(errs.e1)} | estacional(multi) ${m(errs.eM)}`);
}

console.log("\n== 2026 hoy (ene-may cerrados, junio en curso) ==");
const ytdC = byYM[2026].slice(0, 5).reduce((a, b) => a + b, 0);
const jun = byYM[2026][5] || 0;
console.log("YTD cerrado: $" + (ytdC / 1e6).toFixed(0) + "M | junio parcial: $" + (jun / 1e6).toFixed(0) + "M");
console.log("Lineal ACTUAL (junio parcial cuenta como mes entero): $" + (((ytdC + jun) / 6 * 12) / 1e6).toFixed(0) + "M");
console.log("Lineal corregido (solo meses cerrados):               $" + ((ytdC / 5 * 12) / 1e6).toFixed(0) + "M");
const w25 = share(2025), wMulti = avgShares(years.filter(p => p < 2026));
console.log("Estacional s/uplift, pesos 2025:      $" + ((ytdC / w25.slice(0, 5).reduce((a, b) => a + b, 0)) / 1e6).toFixed(0) + "M");
console.log("Estacional s/uplift, pesos 2023-2025: $" + ((ytdC / wMulti.slice(0, 5).reduce((a, b) => a + b, 0)) / 1e6).toFixed(0) + "M");
