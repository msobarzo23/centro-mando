// ¿Las filas extra de flotaViajes 2026 son duplicados exactos?
import Papa from "papaparse";
const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const parseNum = (v) => { if(v==null||v==="")return 0; let s=String(v).trim().replace(/\$/g,""); const dots=(s.match(/\./g)||[]).length,commas=(s.match(/,/g)||[]).length; if(commas===1&&dots>=1){s=s.replace(/\./g,"").replace(",",".");}else if(commas===0&&dots>1){s=s.replace(/\./g,"");}else if(commas===0&&dots===1){const ad=s.split(".")[1];if(ad&&ad.length===3)s=s.replace(".","");}else if(commas===1&&dots===0){s=s.replace(",",".");} const n=parseFloat(s);return isNaN(n)?0:n; };
const parseDate = (s) => { if(!s)return null; const str=String(s).trim(); let p=str.split("/"); if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);} p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);} const d=new Date(str);return isNaN(d)?null:d; };

const text = await (await fetch(URL)).text();
const data = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
console.log("Columnas:", Object.keys(data[0]).join(" | "));
const rows = data.map(r=>({d:parseDate(r.Fecha||r.fecha||r.fechainicio), km:parseNum(r.Kilometro||r.kilometro||r.km), tracto:(r.Tracto||r.tracto||"").trim(), origen:(r.Origen||r.origen||"").trim(), destino:(r.Destino||r.destino||"").trim(), cliente:(r.Cliente||r.cliente||"").trim()})).filter(r=>r.d);

for (const y of [2024, 2025, 2026]) {
  const yr = rows.filter(r=>r.d.getFullYear()===y);
  const seen = new Map();
  yr.forEach(r=>{const k=`${r.d.toISOString().slice(0,10)}|${r.tracto}|${r.origen}|${r.destino}|${r.km}|${r.cliente}`;seen.set(k,(seen.get(k)||0)+1);});
  const dups = [...seen.values()].reduce((s,c)=>s+(c-1),0);
  const km = yr.reduce((s,r)=>s+r.km,0);
  console.log(`${y}: ${yr.length} filas, ${seen.size} únicas, ${dups} duplicadas (${(dups/yr.length*100).toFixed(1)}%), km totales ${Math.round(km/1e6)}M, km únicos ${Math.round([...seen.entries()].reduce((s,[k])=>s+parseNum(k.split("|")[4]),0)/1e6)}M`);
}
// muestra ejemplo de duplicados 2026
const yr26 = rows.filter(r=>r.d.getFullYear()===2026);
const seen26 = new Map();
yr26.forEach(r=>{const k=`${r.d.toISOString().slice(0,10)}|${r.tracto}|${r.origen}|${r.destino}|${r.km}|${r.cliente}`;if(!seen26.has(k))seen26.set(k,[]);seen26.get(k).push(r);});
const ejemplos=[...seen26.entries()].filter(([,v])=>v.length>1).slice(0,5);
console.log("\nEjemplos de claves repetidas 2026:");
ejemplos.forEach(([k,v])=>console.log(`  x${v.length}: ${k}`));
// distribución filas por mes 2024
const MES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const f24=Array(12).fill(0);rows.forEach(r=>{if(r.d.getFullYear()===2024)f24[r.d.getMonth()]++;});
console.log("\n2024 filas/mes:",f24.map((c,i)=>`${MES[i]}:${c}`).join(" "));