import { MESES_FULL } from "./constants.js";

export const normName = (n) => String(n||"").toUpperCase().replace(/,/g,"").replace(/\s+/g," ").trim();

export const parseNum = (v) => {
  if (v == null || v === "") return 0;
  let s = String(v).trim().replace(/\$/g,"").replace(/%/g,"");
  const dots=(s.match(/\./g)||[]).length, commas=(s.match(/,/g)||[]).length;
  if(commas===1&&dots>=1){s=s.replace(/\./g,"").replace(",",".");}
  else if(commas===0&&dots>1){s=s.replace(/\./g,"");}
  else if(commas===0&&dots===1){const ad=s.split(".")[1];if(ad&&ad.length===3)s=s.replace(".","");}
  else if(commas===1&&dots===0){s=s.replace(",",".");}
  const n=parseFloat(s); return isNaN(n)?0:n;
};

export const parseDate = (s) => {
  if(!s)return null; const str=String(s).trim();
  let p=str.split("/");
  if(p.length===3){const[a,b,c]=p.map(Number);if(c>1000)return new Date(c,b-1,a);if(a>1000)return new Date(a,b-1,c);}
  p=str.split("-");if(p.length===3){const[a,b,c]=p.map(Number);if(a>1000)return new Date(a,b-1,c);if(c>1000)return new Date(c,b-1,a);}
  const d=new Date(str);return isNaN(d)?null:d;
};

export const todayMidnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };

export const fmtM = (n) => {
  if(n==null)return"$0";
  const abs=Math.abs(n),sign=n<0?"-":"";
  if(abs>=1e9)return sign+"$"+(abs/1e6).toLocaleString("es-CL",{maximumFractionDigits:0})+"M";
  if(abs>=1e6)return sign+"$"+Math.round(abs/1e6).toLocaleString("es-CL")+"M";
  if(abs>=1e3)return sign+"$"+Math.round(abs/1e3).toLocaleString("es-CL")+"K";
  return sign+"$"+Math.round(abs).toLocaleString("es-CL");
};

export const fmtFull = (n) => "$"+Math.round(n).toLocaleString("es-CL");
export const fmtPct = (n) => (n>=0?"+":"")+n.toFixed(1)+"%";
// Variante con flecha: el signo no queda solo en el color (accesibilidad).
export const fmtPctArrow = (n) => `${n>=0?"▲":"▼"} ${Math.abs(n).toFixed(1)}%`;
export const pctChange = (cur,prev) => prev===0?(cur>0?100:0):((cur-prev)/prev)*100;
// Color tri-estado para ocupación: bajo 60 es problema, 60-75 es atención, 75+ ok.
export const occColor = (pct,T) => pct>=75?T.green:pct>=60?T.amber:T.red;
export const occBg = (pct,T) => pct>=75?T.greenBg:pct>=60?T.amberBg:T.redBg;

export const getSaludo = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
};

export const getFechaLarga = () => {
  const d = new Date();
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${MESES_FULL[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
};

export function businessDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function businessDaysElapsed(year, month, today) {
  const daysElapsed = Math.min(today.getDate(), new Date(year, month, 0).getDate());
  let count = 0;
  for (let d = 1; d <= daysElapsed; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}
