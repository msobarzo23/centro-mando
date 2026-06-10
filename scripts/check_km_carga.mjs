// ¿La columna Carga (o Cliente) distingue tramos cargados vs vacíos entre años?
import Papa from "papaparse";
const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const parseNum = (v) => { if(v==null||v==="")return 0; let s=String(v).trim().replace(/\$/g,""); const dots=(s.match(/\./g)||[]).length,commas=(s.match(/,/g)||[]).length; if(commas===1&&dots>=1){s=s.replace(/\./g,"").replace(",",".");}else if(commas===0&&dots>1){s=s.replace(/\./g,"");}else if(commas===0&&dots===1){const ad=s.split(".")[1];if(ad&&ad.length===3)s=s.replace(".","");}else if(commas===1&&dots===0){s=s.replace(",",".");} const n=parseFloat(s);return isNaN(n)?0:n; };
const parseDate = (s) => { if(!s)return null; const str=String(s).trim(); let p=str.split("/"); if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);} p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);} const d=new Date(str);return isNaN(d)?null:d; };
const text = await (await fetch(URL)).text();
const data = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
const rows = data.map(r=>({d:parseDate(r.Fecha), km:parseNum(r.Kilometro), carga:(r.Carga||"").trim(), cliente:(r.Cliente||"").trim(), guia:(r.Guia||"").trim(), exp:(r.Expedicion||"").trim()})).filter(r=>r.d);

const MES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
for (const y of [2025, 2026]) {
  const yr = rows.filter(r=>r.d.getFullYear()===y);
  const conCarga = yr.filter(r=>r.carga!=="").length;
  const conCliente = yr.filter(r=>r.cliente!=="").length;
  const conGuia = yr.filter(r=>r.guia!=="").length;
  console.log(`${y}: ${yr.length} filas | con Carga: ${conCarga} (${(conCarga/yr.length*100).toFixed(0)}%) | con Cliente: ${conCliente} (${(conCliente/yr.length*100).toFixed(0)}%) | con Guia: ${conGuia} (${(conGuia/yr.length*100).toFixed(0)}%)`);
  // muestra de valores de Carga
  const vals = {};
  yr.forEach(r=>{const v=r.carga===""?"(vacío)":r.carga.toUpperCase().slice(0,20);vals[v]=(vals[v]||0)+1;});
  const top = Object.entries(vals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  console.log(`   Carga top: ${top.map(([v,c])=>`${v}:${c}`).join(" | ")}`);
}
// Si "con Cliente" es el discriminador: filas y km por mes solo con cliente
console.log("\nkm mensuales SOLO filas con Cliente:");
for (const y of [2025, 2026]) {
  const linea=[];
  for(let m=0;m<12;m++){
    const fr=rows.filter(r=>r.d.getFullYear()===y&&r.d.getMonth()===m&&r.cliente!=="");
    if(fr.length>0)linea.push(`${MES[m]}: ${fr.length}f/${Math.round(fr.reduce((s,r)=>s+r.km,0)/1000)}mil-km`);
  }
  console.log(`${y}: ${linea.join("  ")}`);
}