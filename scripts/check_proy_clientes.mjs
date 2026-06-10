// Verificación independiente de "Top clientes por viajes" (OperacionesView)
// Replica la lógica de compute.js líneas 314-385 y compara con la captura.
import Papa from "papaparse";

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv";

const parseDate = (s) => {
  if(!s)return null; const str=String(s).trim();
  let p=str.split("/");
  if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);}
  p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);}
  const d=new Date(str);return isNaN(d)?null:d;
};

const res = await fetch(URL);
const text = await res.text();
const { data } = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase().replace(/\s+/g,"") });

const now = new Date(2026, 5, 10); // hoy 10-jun-2026
const curYear = 2026, curMonth = 5, prevMonth = 4;

const viajesRows = data.map(r=>{const d=parseDate(r.fechainicio||r.fecha);return{...r,_date:d,_cliente:(r.cliente||"")};}).filter(r=>r._date);
const viajesMesActual = viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
const maxDayWithData = viajesMesActual.length>0 ? Math.max(...viajesMesActual.map(r=>r._date.getDate())) : now.getDate();

const dkey=(dt)=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
const viajesPorDiaKey={};viajesRows.forEach(r=>{const k=dkey(r._date);viajesPorDiaKey[k]=(viajesPorDiaKey[k]||0)+1;});
const viajesMesPorDia={};viajesMesActual.forEach(r=>{const d=r._date.getDate();viajesMesPorDia[d]=(viajesMesPorDia[d]||0)+1;});

const ultimaFechaDatos=viajesMesActual.length>0?new Date(curYear,curMonth,maxDayWithData):now;
let viajes28=0;for(let i=0;i<28;i++){const d=new Date(ultimaFechaDatos);d.setDate(d.getDate()-i);viajes28+=viajesPorDiaKey[dkey(d)]||0;}
const ritmoDiaReciente=Math.round(viajes28/28);

const normaSemana=Array(7).fill(0);
{
  const muestras=Array.from({length:7},()=>[]);
  for(let i=1;i<=42;i++){const d=new Date(ultimaFechaDatos);d.setDate(d.getDate()-i);muestras[d.getDay()].push(viajesPorDiaKey[dkey(d)]||0);}
  for(let w=0;w<7;w++){let v=muestras[w];if(v.length>=4)v=[...v].sort((a,b)=>a-b).slice(1);normaSemana[w]=v.length?v.reduce((s,x)=>s+x,0)/v.length:ritmoDiaReciente;}
}

const wUlt=ultimaFechaDatos.getDay();
const viajesUlt=viajesMesPorDia[maxDayWithData]||0;
const ultimoDiaEnCurso=viajesMesActual.length>0&&(maxDayWithData>=now.getDate()||(normaSemana[wUlt]>0&&viajesUlt<0.5*normaSemana[wUlt]));
const diasCompletosMes=ultimoDiaEnCurso?Math.max(0,maxDayWithData-1):maxDayWithData;
const diasTotalesMes=new Date(curYear,curMonth+1,0).getDate();

console.log({maxDayWithData, viajesUlt, normaUlt: normaSemana[wUlt].toFixed(1), ultimoDiaEnCurso, diasCompletosMes, diasTotalesMes, viajesMesActual: viajesMesActual.length});
console.log("normaSemana (dom..sab):", normaSemana.map(x=>x.toFixed(1)).join(" "));

// Proyección total del mes con norma por día de semana (lo que muestra el KPI grande)
let acc=0;
for(let day=1;day<=diasTotalesMes;day++){
  const w=new Date(curYear,curMonth,day).getDay();
  const real=viajesMesPorDia[day]||0;
  if(day<=diasCompletosMes)acc+=real;
  else if(day===maxDayWithData&&ultimoDiaEnCurso)acc+=Math.max(real,normaSemana[w]);
  else acc+=normaSemana[w];
}
console.log("Proy total mes (norma día-semana):", Math.round(acc));

// Top clientes — réplica exacta de compute.js 377-385
const vClienteMap={};viajesMesActual.forEach(r=>{vClienteMap[r._cliente]=(vClienteMap[r._cliente]||0)+1;});
const top=(Object.entries(vClienteMap).sort((a,b)=>b[1]-a[1]).slice(0,8)).map(([name,count])=>{
  const dc=viajesMesActual.filter(r=>r._cliente===name&&r._date.getDate()<=diasCompletosMes).length;
  const mesAnt=viajesRows.filter(r=>r._cliente===name&&r._date.getMonth()===prevMonth&&r._date.getFullYear()===curYear).length;
  const proy=diasCompletosMes>0?Math.round(dc/diasCompletosMes*diasTotalesMes):count;
  const proyFinal=Math.max(proy,count);
  const pct=mesAnt>0?((proyFinal/mesAnt-1)*100).toFixed(1):"n/a";
  return {name, count, diasCompletos:dc, mesAnt, proy:proyFinal, "vsMesAnt%":pct};
});
console.table(top);
const sumaProyTop=top.reduce((s,c)=>s+c.proy,0);
console.log("Suma proy top 8:", sumaProyTop);

// Alternativa: proyección por cliente con norma día-semana propia (qué daría)
const topAlt=(Object.entries(vClienteMap).sort((a,b)=>b[1]-a[1]).slice(0,8)).map(([name])=>{
  const porDia={};viajesMesActual.forEach(r=>{if(r._cliente===name){const d=r._date.getDate();porDia[d]=(porDia[d]||0)+1;}});
  const porDiaKeyCli={};viajesRows.forEach(r=>{if(r._cliente===name){const k=dkey(r._date);porDiaKeyCli[k]=(porDiaKeyCli[k]||0)+1;}});
  const norma=Array(7).fill(0);
  const muestras=Array.from({length:7},()=>[]);
  for(let i=1;i<=42;i++){const d=new Date(ultimaFechaDatos);d.setDate(d.getDate()-i);muestras[d.getDay()].push(porDiaKeyCli[dkey(d)]||0);}
  for(let w=0;w<7;w++){let v=muestras[w];if(v.length>=4)v=[...v].sort((a,b)=>a-b).slice(1);norma[w]=v.length?v.reduce((s,x)=>s+x,0)/v.length:0;}
  let a=0;
  for(let day=1;day<=diasTotalesMes;day++){
    const w=new Date(curYear,curMonth,day).getDay();
    const real=porDia[day]||0;
    if(day<=diasCompletosMes)a+=real;
    else if(day===maxDayWithData&&ultimoDiaEnCurso)a+=Math.max(real,norma[w]);
    else a+=norma[w];
  }
  return {name, proyDiaSemana: Math.round(a)};
});
console.table(topAlt);
