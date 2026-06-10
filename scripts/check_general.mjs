// Verificación empírica: crédito Itaú, leasing recalculado, corte de tablas apiladas
import Papa from "papaparse";

const CSV = {
  credito: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1158539978&single=true&output=csv",
  finBancos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1699395114&single=true&output=csv",
  finDAP: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1020614134&single=true&output=csv",
  finCalendario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1876759165&single=true&output=csv",
  finFondos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1691837276&single=true&output=csv",
  leasingDetalle: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=675670021&single=true&output=csv",
};

const parseNum = (v) => {
  if (v == null) return 0; let s = String(v).trim(); if (!s) return 0;
  s = s.replace(/\$/g,"").replace(/\s/g,"").replace(/\./g,"").replace(/,/g,".");
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
};
const parseDate = (s) => {
  if(!s)return null; const str=String(s).trim();
  let p=str.split("/");
  if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);}
  p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);}
  const d=new Date(str);return isNaN(d)?null:d;
};

const fetchRaw = async (url) => {
  const res = await fetch(url);
  const text = await res.text();
  return Papa.parse(text, { header: false, skipEmptyLines: true }).data;
};

// Réplica de fetchFinCSV (corte de tablas apiladas)
const finParse = (rows, knownHeaders) => {
  let headerIdx = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c||"").trim().toLowerCase());
    const score = knownHeaders.reduce((s,h) => s+(row.some(c=>c.includes(h.toLowerCase()))?1:0), 0);
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  if (headerIdx === -1 || bestScore < 2) return {headers:[], data:[], cutAt:null, totalRows:rows.length, headerIdx};
  const headers = rows[headerIdx].map(c => String(c||"").trim());
  const data = []; let cutAt = null;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c || String(c).trim() === "")) continue;
    const filled = row.map((c, ci) => ({ ci, v: String(c == null ? "" : c).trim() })).filter(x => x.v !== "");
    if (filled.length === 1 && filled[0].ci === 0 && parseNum(filled[0].v) === 0) { cutAt = i; break; }
    const obj = {}; headers.forEach((h, ci) => { if (h) obj[h] = row[ci] || ""; });
    data.push(obj);
  }
  return {headers, data, cutAt, totalRows: rows.length, headerIdx};
};

// ── 1) CRÉDITO ──
const credRaw = await fetchRaw(CSV.credito);
const credHdr = credRaw[0].map(c=>String(c||"").trim());
const cred = credRaw.slice(1).map(r => { const o={}; credHdr.forEach((h,i)=>o[h]=r[i]); return o; });
const credRows = cred.map(r=>({cuota:parseNum(r["N° Cuota"]||r.Cuota||r.cuota),fecha:r["Fecha Vencimiento"]||r.Fecha||r.fecha||"",capital:parseNum(r["Amortización Capital"]||r["Amortizacion Capital"]||r.capital),interes:parseNum(r["Monto Interés"]||r["Monto Interes"]||r.interes),valorCuota:parseNum(r["Valor Cuota"]||r.ValorCuota||r.valor_cuota),saldo:parseNum(r["Saldo Insoluto"]||r.SaldoInsoluto||r.saldo)})).filter(r=>r.cuota>0);
const sumCapital = credRows.reduce((s,r)=>s+r.capital,0);
const hoy = new Date(2026,5,10);
const pagadas = credRows.filter(r=>{const fd=parseDate(r.fecha);return fd&&fd<hoy;});
const saldoActual = pagadas.length>0 ? pagadas[pagadas.length-1].saldo : (credRows[0].saldo+credRows[0].capital);
const montoOriginalImplicito = credRows.length>0 ? credRows[0].saldo + credRows[0].capital : 0;
// coherencia saldo: saldo[i] = saldo[i-1] - capital[i]
let incoherencias = 0;
for (let i=1;i<credRows.length;i++){
  const esperado = credRows[i-1].saldo - credRows[i].capital;
  if (Math.abs(esperado - credRows[i].saldo) > 2) incoherencias++;
}
console.log("== CRÉDITO ==");
console.log({filas:credRows.length, sumCapital, montoOriginalImplicito, hardcodeVista:5000000000, saldoActualCalc:saldoActual, cuotasPagadas:pagadas.length, incoherenciasSaldo:incoherencias});
console.log("primeras 3 cuotas:", credRows.slice(0,3).map(r=>({c:r.cuota,f:r.fecha,cap:r.capital,int:r.interes,vc:r.valorCuota,s:r.saldo})));

// ── 2) TABLAS APILADAS: ¿el corte funciona hoy? ──
const finSpecs = {
  finBancos: ["Fecha","Banco","Saldo Inicial","Saldo Final","Monto"],
  finDAP: ["Fecha Inicio","Vencimiento","Tasa","Monto Inicial","Monto Final","Ganancia","Vigente"],
  finCalendario: ["Fecha","Monto","Guardado","Falta","Concepto","Estado"],
  finFondos: ["Empresa","Fondo","Administradora","Monto Invertido","Valor Actual","Rentabilidad"],
  leasingDetalle: ["ID","Banco","Emisor","Tractos","Cuota UF","Dia Vcto","Fecha Inicio","Fecha Fin","Estado"],
};
console.log("\n== TABLAS APILADAS (corte) ==");
for (const [k,hdrs] of Object.entries(finSpecs)) {
  const raw = await fetchRaw(CSV[k]);
  const {headers, data, cutAt, totalRows, headerIdx} = finParse(raw, hdrs);
  // ¿qué queda después del corte? ¿hay más tablas?
  const restantes = cutAt!=null ? totalRows-cutAt : 0;
  // última fila incluida: ¿parece válida?
  const last = data[data.length-1];
  console.log(`${k}: headerIdx=${headerIdx}, filas=${data.length}, corteEnFila=${cutAt}, filasDespuesDelCorte=${restantes}`);
  if (cutAt!=null) console.log(`   fila de corte: [${raw[cutAt].slice(0,4).join(" | ")}]`);
  if (last) console.log(`   última fila incluida: ${JSON.stringify(Object.values(last).slice(0,5))}`);
  // detectar filas sospechosas dentro de data (texto de sección en primera columna con más celdas llenas)
  raw.slice(headerIdx+1, cutAt??raw.length).forEach((row,off)=>{
    const f=String(row[0]||"").toUpperCase();
    if(/RESUMEN|HISTORIAL|PROYECC|TOTAL|SALDOS|CUOTA/.test(f) && f.length>4) console.log(`   ⚠ fila sospechosa incluida idx=${headerIdx+1+off}: [${row.slice(0,5).join(" | ")}]`);
  });
}

// ── 3) LEASING: recálculo dinámico vs planilla ──
function cuotasLeasingPorPagar(fechaFin, diaVcto, hoy) {
  if (!fechaFin || !diaVcto) return null;
  let venc = new Date(hoy.getFullYear(), hoy.getMonth(), diaVcto);
  if (venc.getTime() < hoy.getTime()) venc = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVcto);
  if (venc.getTime() > fechaFin.getTime()) return 0;
  let count = 0, d = venc;
  while (d.getTime() <= fechaFin.getTime() && count < 600) { count++; d = new Date(d.getFullYear(), d.getMonth() + 1, diaVcto); }
  return count;
}
const ldRaw = await fetchRaw(CSV.leasingDetalle);
const ld = finParse(ldRaw, finSpecs.leasingDetalle);
console.log("\n== LEASING DETALLE (recálculo) ==");
const hoyMid = new Date(2026,5,10);
ld.data.filter(r=>(r.Estado||r.estado||"").toUpperCase()==="ACTIVO").forEach(r=>{
  const dia=parseNum(r["Dia Vcto"]);
  const ffKey = Object.keys(r).find(k=>k.replace(/\n/g," ").includes("Fecha Fin"));
  const ff=parseDate(r[ffKey]);
  const totKey = Object.keys(r).find(k=>k.replace(/\n/g," ").includes("Cuotas Totales"));
  const ppKey = Object.keys(r).find(k=>k.replace(/\n/g," ").includes("Cuotas Por"));
  const pagKey = Object.keys(r).find(k=>k.replace(/\n/g," ").includes("Cuotas Pagadas"));
  const tot=parseNum(r[totKey]), ppPlan=parseNum(r[ppKey]), pagPlan=parseNum(r[pagKey]);
  const ppCalc=cuotasLeasingPorPagar(ff,dia,hoyMid);
  console.log(`${(r.ID||"?").toString().padEnd(4)} ${(r["Banco / Emisor"]||r.Banco||"").toString().padEnd(18)} fin=${r[ffKey]} dia=${dia} | plan: tot=${tot} pag=${pagPlan} pp=${ppPlan} | ppCalc=${ppCalc}`);
});
