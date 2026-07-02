// Desglose por cliente del delta esperado NUEVO(tokens) − VIEJO(exacto) por mes,
// y ficha del caso ORICA (viajes por mes 2025/2026 de cada clave).
import Papa from "papaparse";
import { CSV as CSV_URLS } from "../src/constants.js";
import { normName, parseDate, parseNum } from "../src/utils.js";

const fetchCSV = async (url) => {
  const text = await (await fetch(url)).text();
  return Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
};
const [ventas, viajes] = await Promise.all([fetchCSV(CSV_URLS.ventas), fetchCSV(CSV_URLS.viajes)]);

const LEGAL = new Set(["SA","S","A","SPA","LTDA","LTD","LIMITADA","SCM","EIRL","SAC","CHILE","CIA","COMPANIA","COMPAÑIA","SOCIEDAD","CONTRACTUAL","DE","DEL","LA","EL","Y","E"]);
const core = (n) => String(n||"").toUpperCase().replace(/[^A-ZÑ0-9 ]/g," ").split(/\s+/).filter(t=>t&&!LEGAL.has(t));
const pref = (a,b) => a.length>0 && a.length<=b.length && a.every((t,i)=>t===b[i]);
const normKey = (s) => normName(s).replace(/\s+/g," ").trim();

const now=new Date(), curYear=now.getFullYear(), prevYear=curYear-1;
const vjRows = viajes.map(r=>{const d=parseDate(r.fechainicio||r.FechaInicio||r.fecha);return {...r,_date:d,_cliente:r.Cliente||r.cliente||""};}).filter(r=>r._date);
const vtRows = ventas.map(r=>{const d=parseDate(r.FECHA||r.Fecha||r.fecha);return {...r,_date:d,_neto:parseNum(r.NETO||r.Neto||r.neto)};}).filter(r=>r._date);

const vjPrev={}, vtPrev={};
vjRows.forEach(r=>{if(r._date.getFullYear()!==prevYear)return;const k=normKey(r._cliente);if(!k)return;(vjPrev[k]??=Array(12).fill(0))[r._date.getMonth()]+=1;});
vtRows.forEach(r=>{if(r._date.getFullYear()!==prevYear)return;const k=normKey(r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"");if(!k)return;(vtPrev[k]??=Array(12).fill(0))[r._date.getMonth()]+=r._neto;});

const fKeys=Object.keys(vtPrev), fCore=new Map(fKeys.map(k=>[k,core(k)]));
const match=(vk)=>{
  if(vtPrev[vk])return [vk];
  const vc=core(vk); if(!vc.length)return [];
  let m=fKeys.filter(fk=>{const fc=fCore.get(fk);return fc.length===vc.length&&pref(vc,fc);});
  if(!m.length)m=fKeys.filter(fk=>pref(vc,fCore.get(fk)));
  if(!m.length)m=fKeys.filter(fk=>pref(fCore.get(fk),vc));
  return m;
};
const sum=(ks)=>{if(!ks.length)return null;const o=Array(12).fill(0);ks.forEach(fk=>vtPrev[fk].forEach((v,i)=>o[i]+=v));return o;};
const build=(mode)=>{const T={};let gV=0,gJ=0;Object.keys(vjPrev).forEach(k=>{const vj=vjPrev[k],vt=(mode==="t"?sum(match(k)):vtPrev[k])||Array(12).fill(0);let sJ=0,sV=0,n=0;for(let m=0;m<11;m++){if(vj[m]>0&&vt[m+1]>0){sJ+=vj[m];sV+=vt[m+1];n++;}}if(n>=1&&sJ>0)T[k]={tasa:sV/sJ};if(sJ>0){gV+=sV;gJ+=sJ;}});return {T,g:gJ>0?gV/gJ:0};};
const V=build("e"), N=build("t");

const MESES=["Ene","Feb","Mar","Abr","May","Jun"];
for(let mF=0;mF<6;mF++){
  const vY=mF===0?prevYear:curYear, vM=mF===0?11:mF-1;
  const cnt={};vjRows.forEach(r=>{if(r._date.getFullYear()!==vY||r._date.getMonth()!==vM)return;const k=normKey(r._cliente);if(k)cnt[k]=(cnt[k]||0)+1;});
  const deltas=Object.entries(cnt).map(([k,c])=>{
    const tN=(N.T[k]&&N.T[k].tasa)||N.g, tV=(V.T[k]&&V.T[k].tasa)||V.g;
    return {k,c,delta:c*(tN-tV),srcN:N.T[k]?"propia":"GLOBAL",srcV:V.T[k]?"propia":"GLOBAL"};
  }).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const tot=deltas.reduce((s,d)=>s+d.delta,0);
  console.log(`\n${MESES[mF]} (viajes ${vY}-${String(vM+1).padStart(2,"0")}): delta total ${tot>=0?"+":""}$${(tot/1e6).toFixed(0)}M`);
  deltas.slice(0,5).forEach(d=>console.log(`   ${d.delta>=0?"+":""}$${(d.delta/1e6).toFixed(0)}M  ${d.k} (${d.c} viajes, ${d.srcV}→${d.srcN})`));
}

// ficha ORICA
console.log("\n── Viajes por mes de las claves ORICA* ──");
["ORICA","ORICA ARGENTINA S.A.I.C","ORICA PERU"].forEach(k=>{
  for(const y of [prevYear,curYear]){
    const arr=Array(12).fill(0);
    vjRows.forEach(r=>{if(r._date.getFullYear()===y&&normKey(r._cliente)===k)arr[r._date.getMonth()]++;});
    if(arr.some(x=>x>0))console.log(` ${k} ${y}: [${arr.join(",")}] total ${arr.reduce((a,b)=>a+b,0)}`);
  }
  console.log(`   → matchea razones: ${match(k).join(" | ")||"(ninguna)"} | tasa nueva: ${N.T[k]?"$"+(N.T[k].tasa/1e6).toFixed(1)+"M/viaje":"global"}`);
});
console.log("\nVentas ORICA CHILE S.A 2025 por mes: ["+ (vtPrev["ORICA CHILE S.A"]||[]).map(v=>(v/1e6).toFixed(0)).join(",") +"]");
