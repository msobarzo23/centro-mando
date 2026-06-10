// Diagnóstico: ¿por qué $/km 2025 sale mucho más alto que 2026?
import Papa from "papaparse";

const CSV = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  viajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
};
const parseNum = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).trim().replace(/\$/g,"").replace(/%/g,"");
  const dots=(s.match(/\./g)||[]).length, commas=(s.match(/,/g)||[]).length;
  if(commas===1&&dots>=1){s=s.replace(/\./g,"").replace(",",".");}
  else if(commas===0&&dots>1){s=s.replace(/\./g,"");}
  else if(commas===0&&dots===1){const ad=s.split(".")[1];if(ad&&ad.length===3)s=s.replace(".","");}
  else if(commas===1&&dots===0){s=s.replace(",",".");}
  const n=parseFloat(s); return isNaN(n)?0:n;
};
const parseDate = (s) => {
  if(!s)return null; const str=String(s).trim();
  let p=str.split("/");
  if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);}
  p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);}
  const d=new Date(str);return isNaN(d)?null:d;
};
const get = async (url) => {
  const text = await (await fetch(url)).text();
  return Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
};

const [ventas, viajes, flota] = await Promise.all([get(CSV.ventas), get(CSV.viajes), get(CSV.flotaViajes)]);

const vRows = ventas.map(r=>({d:parseDate(r.FECHA||r.Fecha||r.fecha), neto:parseNum(r.NETO||r.Neto||r.neto)})).filter(r=>r.d);
const jRows = viajes.map(r=>({d:parseDate(r.fechainicio||r.FechaInicio||r.fecha)})).filter(r=>r.d);
const fRows = flota.map(r=>({d:parseDate(r.Fecha||r.fecha||r.fechainicio), km:parseNum(r.Kilometro||r.kilometro||r.km)})).filter(r=>r.d);

const MES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
console.log("AÑO MES | ventas(M) | viajes | viajesFlota | km | km/viajeFlota | $/viaje(lag) | $/km(lag)");
for (const y of [2025, 2026]) {
  for (let m=0;m<12;m++){
    const v=vRows.filter(r=>r.d.getFullYear()===y&&r.d.getMonth()===m).reduce((s,r)=>s+r.neto,0);
    const j=jRows.filter(r=>r.d.getFullYear()===y&&r.d.getMonth()===m).length;
    const fr=fRows.filter(r=>r.d.getFullYear()===y&&r.d.getMonth()===m);
    const jf=fr.length;
    const km=fr.reduce((s,r)=>s+r.km,0);
    // lag: ventas de m+1 / km de m
    const my=m===11?0:m+1, yy=m===11?y+1:y;
    const vNext=vRows.filter(r=>r.d.getFullYear()===yy&&r.d.getMonth()===my).reduce((s,r)=>s+r.neto,0);
    const tViaje=j>0&&vNext>0?Math.round(vNext/j):null;
    const tKm=km>0&&vNext>0?Math.round(vNext/km):null;
    if(v>0||j>0||km>0) console.log(`${y} ${MES[m]} | ${(v/1e6).toFixed(0).padStart(6)} | ${String(j).padStart(5)} | ${String(jf).padStart(5)} | ${String(Math.round(km)).padStart(9)} | ${jf>0?(km/jf).toFixed(0).padStart(5):"    —"} | ${tViaje!=null?String(tViaje).padStart(9):"        —"} | ${tKm!=null?String(tKm).padStart(5):"    —"}`);
  }
}
// Cobertura de la planilla flota: primera y última fecha
const fSorted=[...fRows].sort((a,b)=>a.d-b.d);
console.log(`\nflotaViajes: ${fRows.length} filas, desde ${fSorted[0].d.toLocaleDateString("es-CL")} hasta ${fSorted[fSorted.length-1].d.toLocaleDateString("es-CL")}`);
const sinKm=fRows.filter(r=>r.km<=0).length;
console.log(`filas con km=0: ${sinKm} (${(sinKm/fRows.length*100).toFixed(1)}%)`);
const sinKm2025=fRows.filter(r=>r.d.getFullYear()===2025&&r.km<=0).length, tot2025=fRows.filter(r=>r.d.getFullYear()===2025).length;
const sinKm2026=fRows.filter(r=>r.d.getFullYear()===2026&&r.km<=0).length, tot2026=fRows.filter(r=>r.d.getFullYear()===2026).length;
console.log(`2025: ${tot2025} filas, ${sinKm2025} sin km (${tot2025>0?(sinKm2025/tot2025*100).toFixed(1):0}%)`);
console.log(`2026: ${tot2026} filas, ${sinKm2026} sin km (${tot2026>0?(sinKm2026/tot2026*100).toFixed(1):0}%)`);
