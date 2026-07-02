// Sanidad del fix de tarifa por grupo: tamaño de grupos, tarifa global y tarifas ORICA*.
import Papa from "papaparse";
import { computeAll } from "../src/services/compute.js";
import { CSV as CSV_URLS } from "../src/constants.js";

const fetchCSV = async (url) => {
  const text = await (await fetch(url)).text();
  return Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
};
const [ventas, viajes] = await Promise.all([fetchCSV(CSV_URLS.ventas), fetchCSV(CSV_URLS.viajes)]);
const C = computeAll({ ventas, viajes });

console.log(`tasaGlobal: $${(C.tasaGlobal/1e3).toFixed(0)}k/viaje`);
// claves que comparten el mismo objeto de tarifa = mismo grupo
const porTasa = new Map();
Object.entries(C.tasaPorCliente).forEach(([k,t])=>{(porTasa.get(t)??porTasa.set(t,[]).get(t)).push(k);});
const multi=[...porTasa.entries()].filter(([,ks])=>ks.length>1).sort((a,b)=>b[1].length-a[1].length);
console.log(`grupos con ≥2 claves de viajes: ${multi.length}`);
multi.slice(0,10).forEach(([t,ks])=>console.log(` - [$${(t.tasa/1e3).toFixed(0)}k/viaje, ${t.confianza}] ${ks.join(" | ")}`));
["ORICA","ORICA ARGENTINA S.A.I.C","ORICA PERU","MAXAM","SQM SALAR","SQM SALAR PROYECTO"].forEach(k=>{
  const t=C.tasaPorCliente[k];
  console.log(`${k}: ${t?`$${(t.tasa/1e3).toFixed(0)}k/viaje (${t.confianza})`:"→ tarifa global"}`);
});
console.log("\nbrechaMepco por mes:", C.cumplimientoMensual.map(r=>`${r.mes}:${r.brechaMepco?("$"+(r.brechaMepco/1e6).toFixed(0)+"M"):"—"}`).join(" "));
