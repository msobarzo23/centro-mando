// ¿Se está cobrando el alza MEPCO? Tarifa implícita por mes de factura 2026:
// ventas del mes f (razón social) / viajes del mes f-1 (clave de viajes),
// para los clientes grandes y para el total. Si el reajuste (~17.5% ponderado)
// se facturara desde mayo, la tarifa implícita may/jun debería saltar vs ene-abr.
import Papa from "papaparse";
import { CSV as CSV_URLS } from "../src/constants.js";
import { normName, parseDate, parseNum } from "../src/utils.js";

const fetchCSV = async (url) => {
  const text = await (await fetch(url)).text();
  return Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
};
const [ventas, viajes] = await Promise.all([fetchCSV(CSV_URLS.ventas), fetchCSV(CSV_URLS.viajes)]);
const normKey = (s) => normName(s).replace(/\s+/g," ").trim();

const vjRows = viajes.map(r=>{const d=parseDate(r.fechainicio||r.FechaInicio||r.fecha);return {...r,_date:d,_k:normKey(r.Cliente||r.cliente||"")};}).filter(r=>r._date);
const vtRows = ventas.map(r=>{const d=parseDate(r.FECHA||r.Fecha||r.fecha);return {...r,_date:d,_k:normKey(r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||""),_neto:parseNum(r.NETO||r.Neto||r.neto)};}).filter(r=>r._date);

const CASOS=[
  {label:"ORICA", vk:(k)=>k==="ORICA", fk:(k)=>k.startsWith("ORICA")},
  {label:"MAXAM", vk:(k)=>k.startsWith("MAXAM"), fk:(k)=>k.startsWith("MAXAM")},
  {label:"SQM (todas)", vk:(k)=>k.startsWith("SQM"), fk:(k)=>k.startsWith("SQM")},
  {label:"TOTAL", vk:()=>true, fk:()=>true},
];
const MES=["Ene","Feb","Mar","Abr","May","Jun"];
for(const c of CASOS){
  const line=[c.label.padEnd(12)];
  for(let f=0;f<6;f++){
    const vY=f===0?2025:2026, vM=f===0?11:f-1;
    const nv=vjRows.filter(r=>r._date.getFullYear()===vY&&r._date.getMonth()===vM&&c.vk(r._k)).length;
    const fact=vtRows.filter(r=>r._date.getFullYear()===2026&&r._date.getMonth()===f&&c.fk(r._k)).reduce((s,r)=>s+r._neto,0);
    line.push(nv>0?`${MES[f]} $${(fact/nv/1e3).toFixed(0)}k(${nv}v)`:`${MES[f]} —`);
  }
  console.log(line.join(" | "));
}
// referencia 2025: tarifa implícita promedio por caso (feb-dic ventas / ene-nov viajes)
for(const c of CASOS){
  let sV=0,sJ=0;
  for(let f=1;f<12;f++){
    const nv=vjRows.filter(r=>r._date.getFullYear()===2025&&r._date.getMonth()===f-1&&c.vk(r._k)).length;
    const fact=vtRows.filter(r=>r._date.getFullYear()===2025&&r._date.getMonth()===f&&c.fk(r._k)).reduce((s,r)=>s+r._neto,0);
    sV+=fact;sJ+=nv;
  }
  console.log(`${c.label.padEnd(12)} tarifa implícita 2025: $${(sV/sJ/1e3).toFixed(0)}k/viaje`);
}
