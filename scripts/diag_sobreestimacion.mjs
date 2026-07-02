// Diagnóstico temporal: ¿por qué "Esperado por viajes" quedó tan por encima
// del real en TODOS los meses cerrados 2026, incluso pre-MEPCO (ene-mar)?
// Compara el método viejo (match exacto de cliente → resto a tarifa global)
// contra el nuevo (match por núcleo de tokens, commit daab3cc) y busca
// dobles conteos de ventas entre claves de viajes.
import Papa from "papaparse";
import { computeAll } from "../src/services/compute.js";
import { CSV as CSV_URLS } from "../src/constants.js";
import { normName, parseDate, parseNum } from "../src/utils.js";

const fetchCSV = async (url) => {
  const text = await (await fetch(url)).text();
  return Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
};

const [ventas, viajes] = await Promise.all([fetchCSV(CSV_URLS.ventas), fetchCSV(CSV_URLS.viajes)]);
console.log(`ventas: ${ventas.length} filas | viajes: ${viajes.length} filas`);

// ── réplica de la lógica de compute.js ──
const CLIENTE_LEGAL_TOKENS = new Set(["SA","S","A","SPA","LTDA","LTD","LIMITADA","SCM","EIRL","SAC","CHILE","CIA","COMPANIA","COMPAÑIA","SOCIEDAD","CONTRACTUAL","DE","DEL","LA","EL","Y","E"]);
const coreTokens = (name) => String(name||"").toUpperCase().replace(/[^A-ZÑ0-9 ]/g," ").split(/\s+/).filter(t => t && !CLIENTE_LEGAL_TOKENS.has(t));
const tokensPrefix = (a,b) => a.length>0 && a.length<=b.length && a.every((t,i)=>t===b[i]);
const normKey = (s) => normName(s).replace(/\s+/g," ").trim();

const now = new Date(), curYear = now.getFullYear(), prevYear = curYear-1;
const viajesRows = viajes.map(r=>{const d=parseDate(r.fechainicio||r.FechaInicio||r.fecha);return {...r,_date:d,_cliente:r.Cliente||r.cliente||""};}).filter(r=>r._date);
const ventasRows = ventas.map(r=>{const d=parseDate(r.FECHA||r.Fecha||r.fecha);return {...r,_date:d,_neto:parseNum(r.NETO||r.Neto||r.neto)};}).filter(r=>r._date);

const viajesByClienteMesPrev = {}, ventasByClienteMesPrev = {};
viajesRows.forEach(r=>{if(r._date.getFullYear()!==prevYear)return;const k=normKey(r._cliente);if(!k)return;const m=r._date.getMonth();(viajesByClienteMesPrev[k]??=Array(12).fill(0))[m]+=1;});
ventasRows.forEach(r=>{if(r._date.getFullYear()!==prevYear)return;const k=normKey(r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"");if(!k)return;const m=r._date.getMonth();(ventasByClienteMesPrev[k]??=Array(12).fill(0))[m]+=r._neto;});

const ventasClienteKeys = Object.keys(ventasByClienteMesPrev);
const ventasCoreMap = new Map(ventasClienteKeys.map(k=>[k, coreTokens(k)]));
const matchKeys = (vKey) => {
  if (ventasByClienteMesPrev[vKey]) return [vKey];
  const vc = coreTokens(vKey);
  if (!vc.length) return [];
  let m = ventasClienteKeys.filter(fk => { const fc = ventasCoreMap.get(fk); return fc.length===vc.length && tokensPrefix(vc,fc); });
  if (!m.length) m = ventasClienteKeys.filter(fk => tokensPrefix(vc, ventasCoreMap.get(fk)));
  if (!m.length) m = ventasClienteKeys.filter(fk => tokensPrefix(ventasCoreMap.get(fk), vc));
  return m;
};
const sumArrs = (keys) => { if(!keys.length) return null; const out=Array(12).fill(0); keys.forEach(fk=>ventasByClienteMesPrev[fk].forEach((v,i)=>out[i]+=v)); return out; };

// tasas en ambos modos
const buildTasas = (mode) => {
  const tasas={}; let gV=0,gJ=0;
  Object.keys(viajesByClienteMesPrev).forEach(k=>{
    const vj=viajesByClienteMesPrev[k];
    const vt=(mode==="tokens" ? sumArrs(matchKeys(k)) : ventasByClienteMesPrev[k]) || Array(12).fill(0);
    let sJ=0,sV=0,n=0;
    for(let m=0;m<11;m++){if(vj[m]>0&&vt[m+1]>0){sJ+=vj[m];sV+=vt[m+1];n++;}}
    if(n>=1&&sJ>0)tasas[k]={tasa:sV/sJ,n};
    if(sJ>0){gV+=sV;gJ+=sJ;}
  });
  return {tasas, global: gJ>0?gV/gJ:0};
};
const viejo = buildTasas("exacto"), nuevo = buildTasas("tokens");
console.log(`\nTarifa global — viejo: $${(viejo.global/1e6).toFixed(2)}M/viaje | nuevo: $${(nuevo.global/1e6).toFixed(2)}M/viaje`);

// esperado por mes de factura (sin uplift) en ambos modos
const esperado = (mF, T) => {
  const vYear=mF===0?prevYear:curYear, vMonth=mF===0?11:mF-1;
  const cnt={};
  viajesRows.forEach(r=>{if(r._date.getFullYear()!==vYear||r._date.getMonth()!==vMonth)return;const k=normKey(r._cliente);if(k)cnt[k]=(cnt[k]||0)+1;});
  let tot=0; const det=[];
  Object.entries(cnt).forEach(([k,c])=>{const t=T.tasas[k];const tasa=(t&&t.tasa)||T.global;tot+=c*tasa;det.push({k,c,tasa,aporte:c*tasa,src:t?"propia":"GLOBAL"});});
  return {tot, det: det.sort((a,b)=>b.aporte-a.aporte)};
};

const C = computeAll({ ventas, viajes });
const f=(v)=>v==null?"—":"$"+(v/1e6).toFixed(0)+"M";
console.log("\nMes  |    Real | Esp.VIEJO(exacto) | Esp.NUEVO(tokens) | Esp.NUEVO+uplift(app) | uplift%");
for (const r of C.cumplimientoMensual) {
  const mF=r.mesNum-1;
  const eV=esperado(mF,viejo).tot, eN=esperado(mF,nuevo).tot;
  const up=C.upliftPorMes[r.mesNum]||0;
  console.log(`${r.mes.padEnd(4)} | ${f(r.real).padStart(7)} | ${f(eV).padStart(17)} | ${f(eN).padStart(17)} | ${f(r.espViajes).padStart(21)} | ${(up*100).toFixed(1)}%`);
}

// dobles conteos: razones sociales usadas por ≥2 claves de viajes
const uso = new Map();
Object.keys(viajesByClienteMesPrev).forEach(k=>{matchKeys(k).forEach(fk=>{(uso.get(fk)??uso.set(fk,[]).get(fk)).push(k);});});
const dobles=[...uso.entries()].filter(([,ks])=>ks.length>1);
console.log(`\nRazones sociales compartidas por ≥2 claves de viajes: ${dobles.length}`);
dobles.forEach(([fk,ks])=>{const tot=ventasByClienteMesPrev[fk].reduce((s,v)=>s+v,0);console.log(` - "${fk}" ($${(tot/1e6).toFixed(0)}M en ${prevYear}) ← usada por: ${ks.join(" | ")}`);});

// top clientes cuya tasa cambió más entre modos, con impacto en junio (mF=5)
console.log("\nTop cambios de tarifa por cliente (viejo→nuevo), aporte en factura JUN:");
const junN=esperado(5,nuevo).det;
junN.slice(0,15).forEach(d=>{
  const tV=(viejo.tasas[d.k]&&viejo.tasas[d.k].tasa)||viejo.global;
  const dif=d.tasa-tV;
  if(Math.abs(dif)*d.c>1e6)console.log(` - ${d.k}: $${(tV/1e3).toFixed(0)}k → $${(d.tasa/1e3).toFixed(0)}k/viaje (${d.src}) × ${d.c} viajes ⇒ ${dif>=0?"+":""}$${(dif*d.c/1e6).toFixed(1)}M`);
});
