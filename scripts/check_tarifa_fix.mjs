// Valida la tarifa $/km corregida (solo tramos con cliente) para ambos años
import Papa from "papaparse";
const CSV = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
};
const parseNum = (v) => { if(v==null||v==="")return 0; let s=String(v).trim().replace(/\$/g,""); const dots=(s.match(/\./g)||[]).length,commas=(s.match(/,/g)||[]).length; if(commas===1&&dots>=1){s=s.replace(/\./g,"").replace(",",".");}else if(commas===0&&dots>1){s=s.replace(/\./g,"");}else if(commas===0&&dots===1){const ad=s.split(".")[1];if(ad&&ad.length===3)s=s.replace(".","");}else if(commas===1&&dots===0){s=s.replace(",",".");} const n=parseFloat(s);return isNaN(n)?0:n; };
const parseDate = (s) => { if(!s)return null; const str=String(s).trim(); let p=str.split("/"); if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);} p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);} const d=new Date(str);return isNaN(d)?null:d; };
const get = async (url) => Papa.parse(await (await fetch(url)).text(), { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
const [ventas, flota] = await Promise.all([get(CSV.ventas), get(CSV.flotaViajes)]);
const vRows = ventas.map(r=>({d:parseDate(r.FECHA||r.Fecha||r.fecha), neto:parseNum(r.NETO||r.Neto||r.neto)})).filter(r=>r.d);
const fRows = flota.map(r=>({d:parseDate(r.Fecha), km:parseNum(r.Kilometro), cliente:(r.Cliente||"").trim()})).filter(r=>r.d&&r.cliente!=="");
const MES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const km=(y,m)=>fRows.filter(r=>r.d.getFullYear()===y&&r.d.getMonth()===m).reduce((s,r)=>s+r.km,0);
const vts=(y,m)=>vRows.filter(r=>r.d.getFullYear()===y&&r.d.getMonth()===m).reduce((s,r)=>s+r.neto,0);
console.log("Mes(label) | $/km 2025 | $/km 2026 (km con carga, lag facturación)");
for(let mF=1;mF<6;mF++){
  const t25=km(2025,mF-1)>0?Math.round(vts(2025,mF)/km(2025,mF-1)):null;
  const t26=km(2026,mF-1)>0?Math.round(vts(2026,mF)/km(2026,mF-1)):null;
  console.log(`${MES[mF]} | ${t25} | ${t26}`);
}
