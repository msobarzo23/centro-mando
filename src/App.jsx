import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line,
  Legend, ComposedChart, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Truck, CreditCard, Calendar,
  BarChart3, RefreshCw, Sun, Moon, ChevronRight, AlertTriangle,
  Banknote, PiggyBank, Building2, ArrowUpRight, ArrowDownRight, Clock,
  Target, Activity, Users, MapPin, Fuel, Menu, X, FileText, Zap,
  Sparkles, CircleDot, Flame, Gauge, ShieldCheck, ShieldAlert, Shield,
} from "lucide-react";

const CSV = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  viajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv",
  finResumen: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1738797304&single=true&output=csv",
  finBancos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1699395114&single=true&output=csv",
  finDAP: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1020614134&single=true&output=csv",
  finCalendario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1876759165&single=true&output=csv",
  finFondos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1691837276&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
  flotaEquipos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv",
  leasingDetalle: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=675670021&single=true&output=csv",
  leasingResumen: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=771027573&single=true&output=csv",
  credito: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1158539978&single=true&output=csv",
  expediciones: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=0&single=true&output=csv",
  conductoresActivos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=780336350&single=true&output=csv",
};

const AUTO_REFRESH_MIN = 15;
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COMODIN_TRACTO = "AA1111";
const COMODIN_CONDUCTOR = "CONDUCTOR, TRANSPORTES BELLO";
const MEPCO_ADJUSTMENT_MONTH = 5; // Mayo 2026
const MEPCO_CLIENTS_VISIBLE = ["Calidra", "CBB", "Novandino Litio", "Enaex", "Maxam", "Orica"];

const normName = (n) => String(n||"").toUpperCase().replace(/,/g,"").replace(/\s+/g," ").trim();

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
const todayMidnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const fmtM=(n)=>{if(n==null)return"$0";const abs=Math.abs(n),sign=n<0?"-":"";if(abs>=1e9)return sign+"$"+(abs/1e6).toLocaleString("es-CL",{maximumFractionDigits:0})+"M";if(abs>=1e6)return sign+"$"+Math.round(abs/1e6).toLocaleString("es-CL")+"M";if(abs>=1e3)return sign+"$"+Math.round(abs/1e3).toLocaleString("es-CL")+"K";return sign+"$"+Math.round(abs).toLocaleString("es-CL");};
const fmtFull=(n)=>"$"+Math.round(n).toLocaleString("es-CL");
const fmtPct=(n)=>(n>=0?"+":"")+n.toFixed(1)+"%";
const pctChange=(cur,prev)=>prev===0?(cur>0?100:0):((cur-prev)/prev)*100;

// Saludo dinámico según hora
const getSaludo = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
};
const getFechaLarga = () => {
  const d = new Date();
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${MESES_FULL[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
};

// Días hábiles (lunes-viernes, sin feriados)
function businessDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}
function businessDaysElapsed(year, month, today) {
  const daysElapsed = Math.min(today.getDate(), new Date(year, month, 0).getDate());
  let count = 0;
  for (let d = 1; d <= daysElapsed; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

const fetchCSV=(url)=>new Promise((resolve)=>{Papa.parse(url,{download:true,header:true,skipEmptyLines:true,complete:(r)=>resolve(r.data||[]),error:()=>resolve([])});});
const fetchFinCSV=(url,knownHeaders)=>new Promise((resolve)=>{Papa.parse(url,{download:true,header:false,skipEmptyLines:true,complete:(r)=>{const rows=r.data||[];let headerIdx=-1,bestScore=0;for(let i=0;i<Math.min(rows.length,20);i++){const row=rows[i].map(c=>String(c||"").trim().toLowerCase());const score=knownHeaders.reduce((s,h)=>s+(row.some(c=>c.includes(h.toLowerCase()))?1:0),0);if(score>bestScore){bestScore=score;headerIdx=i;}}if(headerIdx===-1||bestScore<2){resolve([]);return;}const headers=rows[headerIdx].map(c=>String(c||"").trim());const data=[];for(let i=headerIdx+1;i<rows.length;i++){const row=rows[i];if(!row||row.every(c=>!c||String(c).trim()===""))continue;const obj={};headers.forEach((h,ci)=>{if(h)obj[h]=row[ci]||"";});data.push(obj);}resolve(data);},error:()=>resolve([])});});
const fetchRawCSV=(url)=>new Promise((resolve)=>{Papa.parse(url,{download:true,header:false,skipEmptyLines:false,complete:(r)=>resolve(r.data||[]),error:()=>resolve([])});});

const parseLeasingResumen=(raw)=>{const result={emisores:[],totalRow:null,proxCuotas:[],proyeccion:[],refs:{}};if(!raw||raw.length===0)return result;let secEmisor=-1,secProxCuotas=-1,secProyeccion=-1,secRefs=-1;for(let i=0;i<raw.length;i++){const first=String(raw[i]?.[0]||"").toUpperCase();if(first.includes("RESUMEN POR EMISOR"))secEmisor=i;if(first.includes("PROXIMAS CUOTAS"))secProxCuotas=i;if(first.includes("PROYECCION MENSUAL"))secProyeccion=i;if(first.includes("CELDAS DE REFERENCIA"))secRefs=i;}if(secEmisor>=0){const hdrRow=secEmisor+1;for(let i=hdrRow+1;i<raw.length;i++){const r=raw[i];if(!r||!r[0]||String(r[0]).trim()==="")break;const emisor=String(r[0]).trim();if(emisor.includes("TOTAL")){result.totalRow={emisor,contratos:parseNum(r[1]),tractos:parseNum(r[2]),cuotaUF:parseNum(r[3]),cuotaCLP:parseNum(r[4]),cuotaIVA:parseNum(r[5]),deudaUF:parseNum(r[6]),deudaCLP:parseNum(r[7])};}else{result.emisores.push({emisor,contratos:parseNum(r[1]),tractos:parseNum(r[2]),cuotaUF:parseNum(r[3]),cuotaCLP:parseNum(r[4]),cuotaIVA:parseNum(r[5]),deudaUF:parseNum(r[6]),deudaCLP:parseNum(r[7])});}}}if(secProxCuotas>=0){const hdrRow=secProxCuotas+1;const hoy=todayMidnight();for(let i=hdrRow+1;i<raw.length;i++){const r=raw[i];if(!r||!r[0]||String(r[0]).trim()==="")break;const fechaStr=String(r[0]).trim();const fechaParsed=parseDate(fechaStr);const diasCalc=fechaParsed?Math.ceil((fechaParsed.getTime()-hoy.getTime())/86400000):parseNum(r[1]);result.proxCuotas.push({fecha:fechaStr,dias:diasCalc,cuotaUF:parseNum(r[2]),cuotaCLP:parseNum(r[3]),cuotaIVA:parseNum(r[4]),bancos:String(r[5]||"").trim(),estado:String(r[6]||"").trim()});}}if(secProyeccion>=0){let hdrRow=secProyeccion+2;for(let i=hdrRow+1;i<raw.length;i++){const r=raw[i];if(!r)continue;const mes=String(r[0]||"").trim();const anio=parseNum(r[1]);if(!mes||anio<2020){if(mes===""&&anio===0)continue;break;}result.proyeccion.push({mes,anio,cuotaUF:parseNum(r[2]),cuotaCLP:parseNum(r[3]),cuotaIVA:parseNum(r[4]),bciDia5:parseNum(r[5]),bciDia15:parseNum(r[6]),vfs:parseNum(r[7]),bchile:parseNum(r[8]),contratos:parseNum(r[9]),vence:String(r[10]||"").trim(),deltaUF:parseNum(r[11]),ahorroUF:parseNum(r[12]),nota:String(r[13]||"").trim()});}}if(secRefs>=0){for(let i=secRefs+1;i<raw.length;i++){const r=raw[i];if(!r||!r[0])break;const key=String(r[0]).trim();const val=String(r[1]||"").trim();if(key)result.refs[key]=val;}}return result;};

const themes={dark:{bg:"#0b1120",bg2:"#111827",bg3:"#1e293b",card:"#151f32",tx:"#e2e8f0",txM:"#94a3b8",txD:"#64748b",border:"#1e3a5f",accent:"#3b82f6",accentBg:"rgba(59,130,246,0.12)",green:"#22c55e",greenBg:"rgba(34,197,94,0.12)",red:"#ef4444",redBg:"rgba(239,68,68,0.12)",amber:"#f59e0b",amberBg:"rgba(245,158,11,0.12)",purple:"#a855f7",purpleBg:"rgba(168,85,247,0.12)",teal:"#14b8a6",tealBg:"rgba(20,184,166,0.12)",violet:"#8b5cf6",violetBg:"rgba(139,92,246,0.12)",tooltipBg:"#101a2d",tooltipTx:"#e2e8f0",chart:["#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7","#14b8a6","#ec4899","#6366f1"]},light:{bg:"#f0f4f8",bg2:"#ffffff",bg3:"#e2e8f0",card:"#ffffff",tx:"#0f172a",txM:"#475569",txD:"#94a3b8",border:"#e2e8f0",accent:"#2563eb",accentBg:"rgba(37,99,235,0.08)",green:"#16a34a",greenBg:"rgba(22,163,74,0.08)",red:"#dc2626",redBg:"rgba(220,38,38,0.08)",amber:"#d97706",amberBg:"rgba(217,119,6,0.08)",purple:"#9333ea",purpleBg:"rgba(147,51,234,0.08)",teal:"#0d9488",tealBg:"rgba(13,148,136,0.08)",violet:"#7c3aed",violetBg:"rgba(124,58,237,0.08)",tooltipBg:"#1e293b",tooltipTx:"#f8fafc",chart:["#2563eb","#16a34a","#d97706","#dc2626","#9333ea","#0d9488","#db2777","#4f46e5"]}};

const TABS=[{id:"home",label:"Inicio",icon:Activity},{id:"ventas",label:"Ventas",icon:DollarSign},{id:"operaciones",label:"Operaciones",icon:Truck},{id:"finanzas",label:"Finanzas",icon:Banknote},{id:"leasing",label:"Leasing",icon:Truck},{id:"credito",label:"Crédito",icon:CreditCard},{id:"alertas",label:"Alertas",icon:AlertTriangle}];


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTES BASE
// ═════════════════════════════════════════════════════════════════════════════

const KpiCard=({icon:Icon,label,value,sub,color,colorBg,T,badge,tooltip})=>{
  const [hover,setHover]=useState(false);
  return(<div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{background:T.card,borderRadius:14,padding:"16px 18px",border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:8,minWidth:0,flex:"1 1 160px",position:"relative",overflow:"visible",cursor:tooltip?"help":"default"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg, ${color}, transparent 70%)`,borderRadius:"14px 14px 0 0"}}/>
    <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{background:colorBg,borderRadius:8,padding:6,display:"flex"}}><Icon size={16} color={color}/></div>
        <span style={{fontSize:11,color:T.txM,fontWeight:500,letterSpacing:0.3,display:"flex",alignItems:"center",gap:4}}>{label}{tooltip&&<span style={{fontSize:10,color:T.txD,marginLeft:2}}>ⓘ</span>}</span>
      </div>
      {badge&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:999,background:colorBg,color,letterSpacing:0.5}}>{badge}</span>}
    </div>
    <div style={{fontSize:22,fontWeight:700,color:T.tx,letterSpacing:-0.5}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:sub.startsWith("+")?T.green:sub.startsWith("-")?T.red:T.txM}}>{sub}</div>}
    {tooltip&&hover&&(
      <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:6,background:T.tooltipBg,border:`1px solid ${color}55`,borderRadius:10,padding:"12px 14px",fontSize:11,color:T.tooltipTx,lineHeight:1.5,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",minWidth:260}}>
        {tooltip}
      </div>
    )}
  </div>);
};

const MiniTable=({headers,rows,T,maxRows=8})=>(<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{headers.map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",fontSize:11}}>{h}</th>))}</tr></thead><tbody>{rows.slice(0,maxRows).map((row,ri)=>(<tr key={ri} style={{borderBottom:`1px solid ${T.border}22`}}>{row.map((cell,ci)=>(<td key={ci} style={{padding:"7px 10px",textAlign:ci===0?"left":"right",color:T.tx,whiteSpace:"nowrap"}}>{cell}</td>))}</tr>))}</tbody></table></div>);

const SectionCard=({title,icon:Icon,children,T,color,action})=>(<div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${T.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:8}}>{Icon&&<Icon size={16} color={color||T.accent}/>}<span style={{fontSize:14,fontWeight:600,color:T.tx}}>{title}</span></div>{action}</div>{children}</div>);

// Tooltip de charts que SÍ respeta el tema (fix del bug original)
const ChartTooltip=({active,payload,label,T,prefix="$"})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.tooltipBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
    <div style={{color:T.tooltipTx,fontWeight:600,marginBottom:4}}>{label}</div>
    {payload.map((p,i)=>(<div key={i} style={{color:p.color,display:"flex",gap:8}}><span>{p.name}:</span><span style={{fontWeight:600}}>{prefix==="$"?fmtM(p.value):p.value?.toLocaleString("es-CL")}</span></div>))}
  </div>);
};

const OccupationBar=({label,activos,total,T})=>{const pct=total>0?(activos/total)*100:0;const isLow=pct<75;const barColor=isLow?T.red:pct<85?T.amber:T.green;return(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:T.txM}}>{label}</span><span style={{fontSize:12,fontWeight:600,color:barColor}}>{activos} / {total} ({pct.toFixed(1)}%)</span></div><div style={{height:8,borderRadius:4,background:T.bg3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct,100)}%`,borderRadius:4,background:barColor,transition:"width 0.5s"}}/></div></div>);};


// ═════════════════════════════════════════════════════════════════════════════
// BANNER MEPCO (mismo estilo que dashboard-ventas)
// ═════════════════════════════════════════════════════════════════════════════

function MepcoBanner({T,year,lastMonth,compact=false}){
  const [expanded,setExpanded]=useState(false);
  const adjustmentActive = year>2026 || (year===2026 && lastMonth>=MEPCO_ADJUSTMENT_MONTH);
  return(
    <div style={{
      background:`linear-gradient(135deg, ${T.amber}18, ${T.amber}06)`,
      border:`1px solid ${T.amber}55`,
      borderRadius:12,padding:"12px 16px",
      display:"flex",alignItems:"flex-start",gap:12,
      position:"relative",overflow:"hidden",
    }}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:T.amber}}/>
      <div style={{background:`${T.amber}22`,borderRadius:8,padding:6,display:"flex",flexShrink:0}}><Zap size={16} color={T.amber}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
          <span style={{fontWeight:700,color:T.tx,fontSize:12}}>Ajuste Extraordinario de Tarifas Post-MEPCO</span>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:999,background:adjustmentActive?`${T.green}22`:`${T.amber}22`,color:adjustmentActive?T.green:T.amber,letterSpacing:0.4}}>
            {adjustmentActive?"● VIGENTE":"○ DESDE MAYO 2026"}
          </span>
        </div>
        <div style={{color:T.txM,fontSize:11,lineHeight:1.5}}>
          {compact?
            <>Desde mayo 2026 aplica ajuste tarifario a múltiples clientes. Impacto progresivo en facturación. <button onClick={()=>setExpanded(!expanded)} style={{background:"transparent",border:"none",color:T.amber,fontWeight:600,cursor:"pointer",fontSize:11,padding:0}}>{expanded?"▲ Ocultar":"▼ Ver más"}</button></>
            :
            <>Desde mayo 2026 aplica ajuste extraordinario de tarifas a múltiples clientes (Calidra, CBB, Novandino Litio, Enaex, Maxam, Orica, entre otros) en distintos porcentajes, como respuesta al alza del PBASE de diésel. El impacto se reflejará progresivamente en la facturación a partir de mayo. <button onClick={()=>setExpanded(!expanded)} style={{background:"transparent",border:"none",color:T.amber,fontWeight:600,cursor:"pointer",fontSize:11,padding:0}}>{expanded?"▲ Ocultar":"▼ Ver más"}</button></>
          }
        </div>
        {expanded&&(
          <div style={{marginTop:8,padding:"10px 12px",background:`${T.bg3}66`,borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
            <div style={{color:T.tx,fontWeight:600,marginBottom:4}}>Consideraciones de lectura:</div>
            <div>• Proyecciones basadas en meses previos a mayo NO reflejan el ajuste.</div>
            <div>• La línea vertical violeta en mayo marca el inicio del ajuste.</div>
            <div>• Variaciones vs año anterior serán atípicas desde mayo en adelante.</div>
            <div>• Clientes con ajuste conocido: {MEPCO_CLIENTS_VISIBLE.join(", ")}.</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// BANNER "HOY DESTACA" — ranking inteligente de eventos
// ═════════════════════════════════════════════════════════════════════════════

function computeHighlights(C){
  const items=[];
  const now=new Date();

  // 1. Alertas críticas (ocupación < 75%)
  if(C.pctOcupacionTractos>0 && C.pctOcupacionTractos<75){
    items.push({score:95,type:"danger",icon:Truck,title:"Ocupación de flota crítica",text:`Promedio ${C.pctOcupacionTractos.toFixed(1)}% (${C.tractosActivosMes} de ${C.totalTractocamiones} tractos) — meta >75%`});
  }
  if(C.pctOcupacionConductores>0 && C.pctOcupacionConductores<75){
    items.push({score:90,type:"danger",icon:Users,title:"Ocupación de conductores baja",text:`${C.pctOcupacionConductores.toFixed(1)}% en expedición (${C.totalEnExpedicion} de ${C.totalContratados})`});
  }

  // 2. Pagos grandes próximos (>$100M o falta cobertura)
  (C.compromisosProx||[]).forEach(r=>{
    const dias=Math.ceil((r.fecha-now)/86400000);
    if(r.falta>0 && r.monto>50000000){
      items.push({score:85,type:"warning",icon:Calendar,title:`Pago grande en ${dias} día${dias!==1?"s":""}`,text:`${r.concepto.slice(0,50)}: ${fmtM(r.monto)} — falta ${fmtM(r.falta)}`});
    } else if(r.monto>100000000 && dias<=3){
      items.push({score:70,type:"info",icon:Calendar,title:`${r.concepto.slice(0,40)} próximo`,text:`${fmtM(r.monto)} el ${r.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"})} — ya cubierto`});
    }
  });

  // 3. Variación ventas significativa
  if(C.acumCorteAnterior>0){
    const varCorte=pctChange(C.acumCorteActual,C.acumCorteAnterior);
    if(Math.abs(varCorte)>=10){
      items.push({
        score:varCorte<0?80:65,
        type:varCorte<0?"warning":"success",
        icon:varCorte>0?TrendingUp:TrendingDown,
        title:varCorte<0?"Brecha de ventas vs año anterior":"Crecimiento de ventas vs año anterior",
        text:`Acumulado al ${now.getDate()}/${now.getMonth()+1}: ${fmtM(C.acumCorteActual)} vs ${fmtM(C.acumCorteAnterior)} en ${C.prevYear} (${fmtPct(varCorte)})`
      });
    }
  }

  // 4. DAP grandes próximos a vencer
  (C.dapProximos||[]).slice(0,2).forEach(r=>{
    if(r.monto>200000000){
      const dias=Math.ceil((r.vencimiento-now)/86400000);
      if(dias<=10){
        items.push({score:60,type:"info",icon:PiggyBank,title:`DAP ${r.banco} vence en ${dias}d`,text:`${fmtM(r.monto)} al ${r.tasa||"—"} — ${r.vencimiento.toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}`});
      }
    }
  });

  // 5. Top cliente crecimiento/caída
  if(C.topClientes?.length>0){
    const top=C.topClientes[0];
    if(top.total>300000000){
      items.push({score:45,type:"info",icon:Users,title:"Cliente principal del mes",text:`${top.name.slice(0,35)} — ${fmtM(top.total)} (${((top.total/C.totalMesActual)*100).toFixed(1)}% del mes)`});
    }
  }

  // 6. Viajes ayer si bajó fuerte
  if(C.viajesAyer>0 && C.viajesPorMes){
    const promDiario=C.viajesMesActual/C.dayOfMonth;
    if(C.viajesAyer<promDiario*0.7){
      items.push({score:75,type:"warning",icon:TrendingDown,title:`Viajes bajos en ${C.lastFullDayLabel}`,text:`${C.viajesAyer} viajes vs promedio diario de ${Math.round(promDiario)} del mes`});
    }
  }

  // 7. Impacto MEPCO vigente
  if(C.mepcoActivo && C.impactoMepcoMes!==0){
    items.push({
      score:70,
      type:C.impactoMepcoMes>0?"success":"info",
      icon:Zap,
      title:"Impacto MEPCO en facturación del mes",
      text:`${C.impactoMepcoMes>0?"+":""}${fmtM(C.impactoMepcoMes)} vs proyección estacional base (sin ajuste)`
    });
  }

  // 8. Cobertura semana crítica — usa columna "Falta" del calendario (tu control real)
  if(C.primeraSemanaCritica){
    const faltante=C.primeraSemanaCritica.falta;
    const esta=C.primeraSemanaCritica.semana;
    items.push({
      score:esta===1?95:esta===2?85:75,
      type:esta===1?"danger":"warning",
      icon:Gauge,
      title:`Semana ${esta} con compromisos sin cubrir (${C.primeraSemanaCritica.label})`,
      text:`Faltan ${fmtM(faltante)} según calendario. Compromisos ${fmtM(C.primeraSemanaCritica.compromisos)} · Guardado ${fmtM(C.primeraSemanaCritica.guardado||0)}`
    });
  }

  // 9. Divergencia entre proyección estacional y por viajes (>15%)
  if(C.projections?.seasonal>0 && C.proyAnualPorViajes>0){
    const divPct=Math.abs(C.proyAnualPorViajes-C.projections.seasonal)/C.projections.seasonal*100;
    if(divPct>15){
      const viajesMayor=C.proyAnualPorViajes>C.projections.seasonal;
      items.push({
        score:68,
        type:"info",
        icon:Sparkles,
        title:"Proyecciones divergentes — revisar",
        text:`Estacional: ${fmtM(C.projections.seasonal)} vs Basada en viajes: ${fmtM(C.proyAnualPorViajes)} (${divPct.toFixed(0)}% diferencia — ${viajesMayor?"viajes anticipan mejor cierre":"viajes sugieren desaceleración"})`
      });
    }
  }

  return items.sort((a,b)=>b.score-a.score).slice(0,3);
}

function HighlightsBanner({C,T}){
  const highlights=computeHighlights(C);
  if(highlights.length===0)return null;
  const styleByType={
    danger:{bg:`linear-gradient(135deg, ${T.red}18, ${T.red}06)`,border:T.red,iconBg:`${T.red}22`},
    warning:{bg:`linear-gradient(135deg, ${T.amber}14, ${T.amber}04)`,border:T.amber,iconBg:`${T.amber}22`},
    success:{bg:`linear-gradient(135deg, ${T.green}14, ${T.green}04)`,border:T.green,iconBg:`${T.green}22`},
    info:{bg:`linear-gradient(135deg, ${T.accent}14, ${T.accent}04)`,border:T.accent,iconBg:`${T.accent}22`},
  };
  return(
    <div style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <Sparkles size={14} color={T.violet}/>
        <span style={{fontSize:12,fontWeight:700,color:T.tx,letterSpacing:0.3}}>Hoy destaca</span>
        <span style={{fontSize:10,color:T.txD,fontStyle:"italic"}}>ordenado por relevancia</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {highlights.map((h,i)=>{const s=styleByType[h.type];return(
          <div key={i} style={{background:s.bg,border:`1px solid ${s.border}33`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{background:s.iconBg,borderRadius:6,padding:5,display:"flex",flexShrink:0}}><h.icon size={14} color={s.border}/></div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:T.tx,marginBottom:2}}>{h.title}</div>
              <div style={{fontSize:11,color:T.txM,lineHeight:1.4}}>{h.text}</div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// SEMÁFORO EJECUTIVO
// ═════════════════════════════════════════════════════════════════════════════

function computeSemaforo(C){
  // 3 señales con peso igual
  const signals=[];

  // 1. Cobertura de liquidez próximos 30 días (caja + DAPs que vencen / compromisos)
  if(C.coberturaRatio30!==null){
    let s;
    const r=C.coberturaRatio30;
    if(r>=1.2) s={level:"verde",text:`Liquidez 30d ${r.toFixed(2)}x`};
    else if(r>=1.0) s={level:"amarillo",text:`Liquidez 30d ${r.toFixed(2)}x`};
    else s={level:"rojo",text:`Liquidez 30d ${r.toFixed(2)}x`};
    signals.push(s);
  }

  // 2. Ventas acumuladas vs año anterior (usando corte al día actual para comparación justa)
  if(C.acumCorteAnterior>0){
    const varPct=pctChange(C.acumCorteActual,C.acumCorteAnterior);
    let s;
    if(varPct>=0) s={level:"verde",text:`Ventas ${fmtPct(varPct)} vs ${C.prevYear}`};
    else if(varPct>=-10) s={level:"amarillo",text:`Ventas ${fmtPct(varPct)} vs ${C.prevYear}`};
    else s={level:"rojo",text:`Ventas ${fmtPct(varPct)} vs ${C.prevYear}`};
    signals.push(s);
  }

  // 3. Ocupación flota (promedio mes)
  if(C.pctOcupacionTractos>0){
    let s;
    if(C.pctOcupacionTractos>=85) s={level:"verde",text:`Flota al ${C.pctOcupacionTractos.toFixed(0)}%`};
    else if(C.pctOcupacionTractos>=75) s={level:"amarillo",text:`Flota al ${C.pctOcupacionTractos.toFixed(0)}%`};
    else s={level:"rojo",text:`Flota al ${C.pctOcupacionTractos.toFixed(0)}%`};
    signals.push(s);
  }

  // Nivel global: peor señal domina
  const levels=signals.map(s=>s.level);
  let global="verde";
  if(levels.includes("rojo")) global="rojo";
  else if(levels.includes("amarillo")) global="amarillo";

  const labels={verde:"Todo en orden",amarillo:"Requiere atención",rojo:"Acción urgente"};
  return {global,signals,label:labels[global]};
}

function SemaforoEjecutivo({C,T}){
  const sem=computeSemaforo(C);
  if(sem.signals.length===0)return null;
  const colorMap={verde:{c:T.green,bg:T.greenBg,icon:ShieldCheck},amarillo:{c:T.amber,bg:T.amberBg,icon:Shield},rojo:{c:T.red,bg:T.redBg,icon:ShieldAlert}};
  const g=colorMap[sem.global];
  const Icon=g.icon;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:g.bg,border:`1px solid ${g.c}33`,minWidth:0}}>
      <Icon size={20} color={g.c} style={{flexShrink:0}}/>
      <div style={{minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color:g.c,letterSpacing:0.3}}>{sem.label}</div>
        <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
          {sem.signals.map((s,i)=>{const sc=colorMap[s.level];return(
            <span key={i} style={{fontSize:10,color:T.txM,display:"flex",alignItems:"center",gap:4}}>
              <CircleDot size={8} color={sc.c}/>{s.text}
            </span>
          );})}
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

export default function App(){
  const[dark,setDark]=useState(()=>{try{return localStorage.getItem("cm-theme")!=="light";}catch{return true;}});
  const[tab,setTab]=useState("home");const[data,setData]=useState({});const[loading,setLoading]=useState(true);const[lastUpdate,setLastUpdate]=useState(null);const[mobileMenu,setMobileMenu]=useState(false);
  const[projectionMode,setProjectionMode]=useState("seasonal");
  const T=dark?themes.dark:themes.light;
  const toggleTheme=()=>{setDark(d=>{const n=!d;try{localStorage.setItem("cm-theme",n?"dark":"light");}catch{}return n;});};

  const loadData=useCallback(async()=>{
    setLoading(true);
    try{
      const[ventas,viajes,flotaViajes,flotaEquipos,expediciones,conductoresActivos]=await Promise.all([fetchCSV(CSV.ventas),fetchCSV(CSV.viajes),fetchCSV(CSV.flotaViajes),fetchCSV(CSV.flotaEquipos),fetchCSV(CSV.expediciones),fetchCSV(CSV.conductoresActivos)]);
      const[finResumen,finBancos,finDAP,finCalendario,finFondos,leasingDetalle,leasingResumenRaw,credito]=await Promise.all([fetchFinCSV(CSV.finResumen,["Concepto","Monto","Ganancia","Mes","Comprometido","Guardado"]),fetchFinCSV(CSV.finBancos,["Fecha","Banco","Saldo Inicial","Saldo Final","Monto"]),fetchFinCSV(CSV.finDAP,["Fecha Inicio","Vencimiento","Tasa","Monto Inicial","Monto Final","Ganancia","Vigente"]),fetchFinCSV(CSV.finCalendario,["Fecha","Monto","Guardado","Falta","Concepto","Estado"]),fetchFinCSV(CSV.finFondos,["Empresa","Fondo","Administradora","Monto Invertido","Valor Actual","Rentabilidad"]),fetchFinCSV(CSV.leasingDetalle,["ID","Banco","Emisor","Tractos","Cuota UF","Dia Vcto","Fecha Inicio","Fecha Fin","Estado"]),fetchRawCSV(CSV.leasingResumen),fetchCSV(CSV.credito)]);
      const leasingResumen=parseLeasingResumen(leasingResumenRaw);
      setData({ventas,viajes,finResumen,finBancos,finDAP,finCalendario,finFondos,flotaViajes,flotaEquipos,leasingDetalle,leasingResumen,credito,expediciones,conductoresActivos});
      setLastUpdate(new Date());
    }catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{if(AUTO_REFRESH_MIN<=0)return;const id=setInterval(loadData,AUTO_REFRESH_MIN*60000);return()=>clearInterval(id);},[loadData]);

  const computed=useMemo(()=>{
    if(!data.ventas)return null;
    const now=new Date(),curMonth=now.getMonth(),curYear=now.getFullYear();

    // ══════════ VENTAS ══════════
    const ventasRows=(data.ventas||[]).map(r=>{const d=parseDate(r.FECHA||r.Fecha||r.fecha);return{...r,_date:d,_neto:parseNum(r.NETO||r.Neto||r.neto)};}).filter(r=>r._date);
    const ventasMesActual=ventasRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
    const ventasMesAnterior=ventasRows.filter(r=>{const pm=curMonth===0?11:curMonth-1;const py=curMonth===0?curYear-1:curYear;return r._date.getMonth()===pm&&r._date.getFullYear()===py;});
    const totalMesActual=ventasMesActual.reduce((s,r)=>s+r._neto,0);
    const totalMesAnterior=ventasMesAnterior.reduce((s,r)=>s+r._neto,0);
    const ventasPorMes=[];for(let m=0;m<12;m++){const rows=ventasRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===curYear);ventasPorMes.push({mes:MESES[m],total:rows.reduce((s,r)=>s+r._neto,0),count:rows.length});}
    const clienteMap={};ventasMesActual.forEach(r=>{const name=r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"Sin nombre";clienteMap[name]=(clienteMap[name]||0)+r._neto;});
    const topClientes=Object.entries(clienteMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,total])=>({name,total}));
    const ventasAnoActual=ventasRows.filter(r=>r._date.getFullYear()===curYear).reduce((s,r)=>s+r._neto,0);
    const ventasAnoAnterior=ventasRows.filter(r=>r._date.getFullYear()===curYear-1).reduce((s,r)=>s+r._neto,0);

    const prevYear = curYear - 1;
    const ventasPorMesComparado = [];
    let acumActual = 0, acumAnterior = 0;
    for (let m = 0; m < 12; m++) {
      const totalActual = ventasRows.filter(r => r._date.getMonth() === m && r._date.getFullYear() === curYear).reduce((s, r) => s + r._neto, 0);
      const totalAnterior = ventasRows.filter(r => r._date.getMonth() === m && r._date.getFullYear() === prevYear).reduce((s, r) => s + r._neto, 0);
      const var_pct = totalAnterior > 0 ? pctChange(totalActual, totalAnterior) : (totalActual > 0 ? 100 : 0);
      ventasPorMesComparado.push({ mes: MESES[m], actual: totalActual, anterior: totalAnterior, var_pct });
      if (m <= curMonth) { acumActual += totalActual; acumAnterior += totalAnterior; }
    }

    const dayOfYear = Math.floor((now - new Date(curYear, 0, 1)) / 86400000);
    const acumCorteActual = ventasRows.filter(r => { if (r._date.getFullYear() !== curYear) return false; const doy = Math.floor((r._date - new Date(curYear, 0, 1)) / 86400000); return doy <= dayOfYear; }).reduce((s, r) => s + r._neto, 0);
    const acumCorteAnterior = ventasRows.filter(r => { if (r._date.getFullYear() !== prevYear) return false; const doy = Math.floor((r._date - new Date(prevYear, 0, 1)) / 86400000); return doy <= dayOfYear; }).reduce((s, r) => s + r._neto, 0);

    const ultimasFacturas = [...ventasRows].sort((a, b) => b._date - a._date).slice(0, 5).map(r => ({
      fecha: r._date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      folio: r.FOLIO || r.Folio || r.folio || "—",
      tipo: r.TIPO || r.Tipo || r.tipo || r["TIPO DOCUMENTO"] || r["Tipo Documento"] || "Factura",
      cliente: r["RAZON SOCIAL"] || r["Razon Social"] || r.razon_social || "—",
      neto: r._neto,
    }));

    // ══════════ PROYECCIÓN ESTACIONAL ══════════
    // Lógica idéntica al dashboard de ventas
    const monthsWithData=ventasPorMesComparado.map((m,i)=>m.actual>0?i+1:0).filter(m=>m>0);
    const lastDataMonth=monthsWithData[monthsWithData.length-1]||0;
    const monthInProgress=lastDataMonth===curMonth+1;
    const closedMonths=monthInProgress?monthsWithData.slice(0,-1):monthsWithData;
    const openMonth=monthInProgress?lastDataMonth:null;
    const ytdClosed=closedMonths.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.actual||0),0);
    const ytdOpen=openMonth?(ventasPorMesComparado[openMonth-1]?.actual||0):0;
    const ytdTotal=ytdClosed+ytdOpen;

    // Lineal
    const allMonthsCount=monthsWithData.length;
    const projLinear=allMonthsCount>0?(ytdTotal/allMonthsCount)*12:0;

    // Prorrateada
    let projProrata=0;
    if(closedMonths.length>0){
      const avgClosed=ytdClosed/closedMonths.length;
      let openProjected=ytdOpen;
      if(openMonth){
        const elapsed=businessDaysElapsed(curYear,openMonth,now);
        const total=businessDaysInMonth(curYear,openMonth);
        if(elapsed>0)openProjected=ytdOpen*(total/elapsed);
      }
      const remainingMonths=12-allMonthsCount;
      projProrata=ytdClosed+openProjected+(avgClosed*remainingMonths);
    }else if(openMonth){
      const elapsed=businessDaysElapsed(curYear,openMonth,now);
      const total=businessDaysInMonth(curYear,openMonth);
      const openProjected=elapsed>0?ytdOpen*(total/elapsed):ytdOpen;
      projProrata=openProjected*12;
    }

    // Estacional (basada en patrón año anterior)
    let projSeasonal=0;
    const totalPrev=ventasAnoAnterior;
    if(totalPrev>0){
      const weights=ventasPorMesComparado.map(m=>m.anterior/totalPrev);
      const weightsClosed=closedMonths.reduce((s,m)=>s+weights[m-1],0);
      if(closedMonths.length>0 && weightsClosed>0){
        const annualFromClosed=ytdClosed/weightsClosed;
        let openContribution=ytdOpen;
        if(openMonth){
          const weightOpen=weights[openMonth-1];
          const expectedOpen=annualFromClosed*weightOpen;
          const elapsed=businessDaysElapsed(curYear,openMonth,now);
          const total=businessDaysInMonth(curYear,openMonth);
          const openProrata=elapsed>0?ytdOpen*(total/elapsed):ytdOpen;
          openContribution=Math.max(openProrata,expectedOpen);
        }
        const futureMonths=[];
        for(let m=1;m<=12;m++){
          if(!closedMonths.includes(m)&&m!==openMonth)futureMonths.push(m);
        }
        const futureContribution=futureMonths.reduce((s,m)=>s+(annualFromClosed*weights[m-1]),0);
        projSeasonal=ytdClosed+openContribution+futureContribution;
      }
    }
    if(projSeasonal===0 && projProrata>0)projSeasonal=projProrata;

    const projections={
      monthInProgress,openMonth,closedMonthsCount:closedMonths.length,
      ytdClosed,ytdOpen,ytdTotal,
      linear:Math.round(projLinear),prorata:Math.round(projProrata),seasonal:Math.round(projSeasonal),
      businessDaysElapsed:openMonth?businessDaysElapsed(curYear,openMonth,now):0,
      businessDaysTotal:openMonth?businessDaysInMonth(curYear,openMonth):0,
    };

    // ══════════ PROYECCIÓN POR MES (para graficar futuro con colores distintos) ══════════
    // Para meses sin datos reales, usar weights del año anterior × proyección estacional
    const ventasPorMesConProyeccion=ventasPorMesComparado.map((m,i)=>{
      const mNum=i+1;
      if(m.actual>0 && mNum!==openMonth){
        // Mes cerrado con datos reales
        return {...m,proyectado:null,tipo:"real"};
      }else if(mNum===openMonth){
        // Mes en curso: mostrar real + proyección parcial
        const weight=totalPrev>0?m.anterior/totalPrev:(1/12);
        const expected=projSeasonal*weight;
        const faltante=Math.max(0,expected-m.actual);
        return {...m,proyectado:faltante,tipo:"parcial"};
      }else{
        // Mes futuro: proyección estacional
        const weight=totalPrev>0?m.anterior/totalPrev:(1/12);
        const proy=projSeasonal*weight;
        return {...m,actual:0,proyectado:proy,tipo:"futuro"};
      }
    });

    // ══════════ IMPACTO MEPCO ══════════
    // Cálculo: desde mayo, diferencia entre facturación real y proyección estacional base (con patrón de año anterior y ventas ene-abr reales)
    const mepcoActivo = curYear>2026 || (curYear===2026 && curMonth+1>=MEPCO_ADJUSTMENT_MONTH);
    let impactoMepcoAcum=0;
    let impactoMepcoMes=0;
    // Base "sin ajuste": promedio ene-abr del año actual aplicando pesos estacionales del año anterior
    const mesesPreMepco=[1,2,3,4].filter(m=>monthsWithData.includes(m));
    const ventasPreMepco=mesesPreMepco.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.actual||0),0);
    if(totalPrev>0 && mesesPreMepco.length>0 && mepcoActivo){
      const weightsPreMepco=mesesPreMepco.reduce((s,m)=>s+((ventasPorMesComparado[m-1]?.anterior||0)/totalPrev),0);
      if(weightsPreMepco>0){
        const baseAnualSinMepco=ventasPreMepco/weightsPreMepco;
        // Para cada mes desde mayo con datos, calcular esperado vs real
        for(let m=MEPCO_ADJUSTMENT_MONTH;m<=12;m++){
          if(monthsWithData.includes(m)){
            const weight=(ventasPorMesComparado[m-1]?.anterior||0)/totalPrev;
            const esperado=baseAnualSinMepco*weight;
            const real=ventasPorMesComparado[m-1]?.actual||0;
            const diff=real-esperado;
            impactoMepcoAcum+=diff;
            if(m===curMonth+1)impactoMepcoMes=diff;
          }
        }
      }
    }

    // ══════════ VIAJES ══════════
    const viajesRows=(data.viajes||[]).map(r=>{const d=parseDate(r.fechainicio||r.FechaInicio||r.fecha);return{...r,_date:d,_cliente:r.Cliente||r.cliente||"",_equipo:r.tipoequipo||r.TipoEquipo||""};}).filter(r=>r._date);
    const viajesMesActual=viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
    const viajesMesAnterior=viajesRows.filter(r=>{const pm=curMonth===0?11:curMonth-1;const py=curMonth===0?curYear-1:curYear;return r._date.getMonth()===pm&&r._date.getFullYear()===py;});
    const maxDayWithData=viajesMesActual.length>0?Math.max(...viajesMesActual.map(r=>r._date.getDate())):now.getDate();
    const dayOfMonth=maxDayWithData;
    const viajesCorteActual=viajesMesActual.filter(r=>r._date.getDate()<=dayOfMonth).length;
    const viajesCorteAnterior=viajesMesAnterior.filter(r=>r._date.getDate()<=dayOfMonth).length;
    const viajesPorMes=[];for(let m=0;m<12;m++){const rows=viajesRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===curYear);viajesPorMes.push({mes:MESES[m],total:rows.length});}

    // ══════════ PROYECCIÓN POR VIAJES (lag 1 mes: viajes de mes N → facturación mes N+1) ══════════
    // ÍNDICES: todos los meses se manejan 0-based (Ene=0, Dic=11)
    // Estrategia: aprender tasa $/viaje por cliente del histórico 2025, aplicarla a viajes 2026
    // Fallback a tasa global cuando cliente tiene <3 meses de histórico
    const normClienteKey=(s)=>normName(s).replace(/\s+/g," ").trim();

    // Mapas año anterior, índices 0-based:
    //   viajesByClienteMesPrev[clienteKey][m] = # viajes mes m año anterior
    //   ventasByClienteMesPrev[clienteKey][m] = $ facturación mes m año anterior
    const viajesByClienteMesPrev={};
    const ventasByClienteMesPrev={};
    viajesRows.forEach(r=>{
      if(r._date.getFullYear()!==prevYear)return;
      const k=normClienteKey(r._cliente);if(!k)return;
      const m=r._date.getMonth(); // 0-based
      if(!viajesByClienteMesPrev[k])viajesByClienteMesPrev[k]=Array(12).fill(0);
      viajesByClienteMesPrev[k][m]+=1;
    });
    ventasRows.forEach(r=>{
      if(r._date.getFullYear()!==prevYear)return;
      const rawName=r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"";
      const k=normClienteKey(rawName);if(!k)return;
      const m=r._date.getMonth(); // 0-based
      if(!ventasByClienteMesPrev[k])ventasByClienteMesPrev[k]=Array(12).fill(0);
      ventasByClienteMesPrev[k][m]+=r._neto;
    });

    // Tasa $/viaje por cliente: suma ventas mes m+1 / suma viajes mes m (lag 1 mes)
    const tasaPorCliente={};
    let globalVentasLagged=0, globalViajesLagged=0;
    Object.keys(viajesByClienteMesPrev).forEach(k=>{
      const vj=viajesByClienteMesPrev[k]; // viajes
      const vt=ventasByClienteMesPrev[k]||Array(12).fill(0); // ventas
      let sumViajes=0, sumVentas=0, mesesConData=0;
      // Para cada par (mes viajes, mes ventas = mes viajes + 1)
      for(let m=0;m<11;m++){ // m es índice del mes de viajes; las ventas van a m+1
        if(vj[m]>0 && vt[m+1]>0){
          sumViajes+=vj[m];
          sumVentas+=vt[m+1];
          mesesConData++;
        }
      }
      if(mesesConData>=3 && sumViajes>0){
        tasaPorCliente[k]={tasa:sumVentas/sumViajes,meses:mesesConData,confianza:"alta"};
      }else if(mesesConData>=1 && sumViajes>0){
        tasaPorCliente[k]={tasa:sumVentas/sumViajes,meses:mesesConData,confianza:"baja"};
      }
      if(sumViajes>0){globalVentasLagged+=sumVentas;globalViajesLagged+=sumViajes;}
    });
    const tasaGlobal=globalViajesLagged>0?globalVentasLagged/globalViajesLagged:0;

    // Aplicamos la tasa: viajes del mes mV (año actual) → facturación esperada mes mV+1
    // facturacionProyectadaPorViajes[mF] = proyección para el mes mF (0-based)
    const facturacionProyectadaPorViajes=Array(12).fill(0);
    const desglosePorMesFactura={}; // debug por mes-factura
    for(let mV=0;mV<12;mV++){ // mV = mes de viajes, 0-based
      const mF=mV+1; // mes de factura esperada, 0-based
      if(mF>11)continue; // viajes de diciembre → facturan en enero siguiente, fuera de alcance
      // Agrupar viajes de mV (año actual) por cliente
      const viajesMesCliente={};
      viajesRows.forEach(r=>{
        if(r._date.getFullYear()!==curYear||r._date.getMonth()!==mV)return;
        const k=normClienteKey(r._cliente);if(!k)return;
        viajesMesCliente[k]=(viajesMesCliente[k]||0)+1;
      });
      let totalProy=0;
      const desglose=[];
      Object.entries(viajesMesCliente).forEach(([k,count])=>{
        const t=tasaPorCliente[k];
        const tasa=(t&&t.tasa)||tasaGlobal;
        const aporte=count*tasa;
        totalProy+=aporte;
        desglose.push({cliente:k,viajes:count,tasa,aporte,confianza:t?t.confianza:"global"});
      });
      facturacionProyectadaPorViajes[mF]=totalProy;
      desglosePorMesFactura[mF]=desglose.sort((a,b)=>b.aporte-a.aporte);
    }
    // Proyección del mes actual (curMonth, 0-based) y del siguiente
    const proyMesActualPorViajes=facturacionProyectadaPorViajes[curMonth]||0;
    const proyMesSiguientePorViajes=curMonth<11?facturacionProyectadaPorViajes[curMonth+1]||0:0;
    const desgloseMesActualProy=desglosePorMesFactura[curMonth]||[];

    // Proyección anual por viajes:
    //   - meses cerrados (< curMonth con actual>0): usar real
    //   - mes en curso (= curMonth): max(real ya facturado, proyección por viajes)
    //   - meses futuros (> curMonth): si hay proyección por viajes (porque hay viajes del mes anterior), usarla; si no, cae a 0 y luego mezclamos con estacional
    let proyAnualPorViajes=0;
    let mesesConProyViajes=0;
    for(let m=0;m<12;m++){
      const real=ventasPorMesComparado[m]?.actual||0;
      if(m<curMonth && real>0){
        proyAnualPorViajes+=real;
      }else if(m===curMonth){
        proyAnualPorViajes+=Math.max(real,facturacionProyectadaPorViajes[m]);
      }else{
        // mes futuro: usar proyección por viajes si existe, si no caer a estacional del mes
        const proyV=facturacionProyectadaPorViajes[m]||0;
        if(proyV>0){
          proyAnualPorViajes+=proyV;
          mesesConProyViajes++;
        }else if(projSeasonal>0 && totalPrev>0){
          // fallback estacional
          const w=(ventasPorMesComparado[m]?.anterior||0)/totalPrev;
          proyAnualPorViajes+=projSeasonal*w;
        }
      }
    }
    const vClienteMap={};viajesMesActual.forEach(r=>{vClienteMap[r._cliente]=(vClienteMap[r._cliente]||0)+1;});
    const topClientesViajes=Object.entries(vClienteMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));
    const equipoMap={};viajesMesActual.forEach(r=>{const e=r._equipo||"Sin tipo";equipoMap[e]=(equipoMap[e]||0)+1;});
    const viajesPorEquipo=Object.entries(equipoMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name:name.length>25?name.slice(0,22)+"...":name,count}));

    // ══════════ CONDUCTORES ══════════
    const contratadosSet=new Set();(data.conductoresActivos||[]).forEach(r=>{const n=normName(r.personal||r.Personal||"");if(n)contratadosSet.add(n);});
    const totalContratados=contratadosSet.size;
    const enProcesoNames=new Set();(data.expediciones||[]).forEach(r=>{const estado=(r.estado||r.Estado||"").trim();const conductor=(r.conductor||r.Conductor||"").trim();if(estado==="En proceso"&&conductor!==COMODIN_CONDUCTOR){enProcesoNames.add(normName(conductor));}});
    const conductoresEnExpedicion=new Set();enProcesoNames.forEach(n=>{if(contratadosSet.has(n))conductoresEnExpedicion.add(n);});
    const totalEnExpedicion=conductoresEnExpedicion.size;
    const totalNoActivos=totalContratados-totalEnExpedicion;
    const pctOcupacionConductores=totalContratados>0?(totalEnExpedicion/totalContratados)*100:0;

    // ══════════ TRACTOS ══════════
    const flotaRows=(data.flotaViajes||[]).map(r=>({...r,_date:parseDate(r.Fecha||r.fecha||r.fechainicio),_km:parseNum(r.Kilometro||r.kilometro||r.km),_tracto:(r.Tracto||r.tracto||"").trim(),_origen:r.Origen||r.origen||"",_destino:r.Destino||r.destino||"",_cliente:r.Cliente||r.cliente||""})).filter(r=>r._date);
    const flotaMesActual=flotaRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
    const kmMesActual=flotaMesActual.reduce((s,r)=>s+r._km,0);
    const totalTractocamiones=(data.flotaEquipos||[]).filter(r=>{const t=(r.tipoequipo||r.TipoEquipo||"").toUpperCase();return t.includes("TRACTOCAMION");}).length;

    const tripsByDate={};flotaRows.forEach(r=>{if(r._date.getFullYear()===curYear){const key=r._date.toISOString().slice(0,10);tripsByDate[key]=(tripsByDate[key]||0)+1;}});
    const sortedDates=Object.entries(tripsByDate).sort((a,b)=>b[0].localeCompare(a[0]));
    const lastFullDayEntry=sortedDates.find(([_,cnt])=>cnt>=50);
    const lastFullDay=lastFullDayEntry?lastFullDayEntry[0]:null;
    const lastFullDayDate=lastFullDay?new Date(lastFullDay+"T12:00:00"):null;
    const lastFullDayLabel=lastFullDayDate?lastFullDayDate.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}):"—";
    const viajesAyer=lastFullDayEntry?lastFullDayEntry[1]:0;

    const tractosAyerSet=new Set();if(lastFullDayDate){flotaRows.forEach(r=>{if(r._date.toISOString().slice(0,10)===lastFullDay&&r._tracto&&r._tracto!==COMODIN_TRACTO)tractosAyerSet.add(r._tracto);});}
    const tractosActivosAyer=tractosAyerSet.size;
    const tractosMesSet=new Set();flotaMesActual.forEach(r=>{if(r._tracto&&r._tracto!==COMODIN_TRACTO)tractosMesSet.add(r._tracto);});
    const tractosUnicosMes=tractosMesSet.size;
    const tractosPorDia={};flotaMesActual.forEach(r=>{if(r._tracto&&r._tracto!==COMODIN_TRACTO){const dayKey=r._date.getDate();if(!tractosPorDia[dayKey])tractosPorDia[dayKey]=new Set();tractosPorDia[dayKey].add(r._tracto);}});
    const diasConDatosTractos=Object.keys(tractosPorDia).length;
    const sumaTractosDiarios=Object.values(tractosPorDia).reduce((s,set)=>s+set.size,0);
    const tractosActivosMes=diasConDatosTractos>0?Math.round(sumaTractosDiarios/diasConDatosTractos):0;
    const tractosActivos=tractosActivosMes;
    const pctOcupacionTractos=totalTractocamiones>0?(tractosActivosMes/totalTractocamiones)*100:0;
    const pctOcupacionTractosAyer=totalTractocamiones>0?(tractosActivosAyer/totalTractocamiones)*100:0;

    // ══════════ FINANZAS ══════════
    const bancosRows=(data.finBancos||[]).filter(r=>r.Banco||r.banco);const saldosBancos={};bancosRows.forEach(r=>{const banco=r.Banco||r.banco;const sf=parseNum(r["Saldo Final"]||r.saldo_final||r.SaldoFinal);if(sf>0)saldosBancos[banco]=sf;});const totalCaja=Object.values(saldosBancos).reduce((s,v)=>s+v,0);
    const dapRows=(data.finDAP||[]).filter(r=>{const v=(r.Vigente||r.vigente||"").toString().toLowerCase();return v==="si"||v==="sí"||v==="yes";});
    const getDapType=(r)=>{const t=(r.Tipo||r.tipo||"").toString().toLowerCase().trim();if(t.includes("credito")||t.includes("crédito"))return"credito";if(t.includes("inversion")||t.includes("inversión"))return"inversion";return"trabajo";};
    const dapTrabajo=dapRows.filter(r=>getDapType(r)==="trabajo"),dapInversion=dapRows.filter(r=>getDapType(r)==="inversion"),dapCredito=dapRows.filter(r=>getDapType(r)==="credito");
    const totalDAPTrabajo=dapTrabajo.reduce((s,r)=>s+parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),0);const totalDAPInversion=dapInversion.reduce((s,r)=>s+parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),0);const totalDAPCredito=dapCredito.reduce((s,r)=>s+parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),0);const totalDAP=totalDAPTrabajo+totalDAPInversion+totalDAPCredito;
    const gananciaDAPTrabajo=dapTrabajo.reduce((s,r)=>s+parseNum(r.Ganancia||r.ganancia),0);const gananciaDAPInversion=dapInversion.reduce((s,r)=>s+parseNum(r.Ganancia||r.ganancia),0);const gananciaDAPCredito=dapCredito.reduce((s,r)=>s+parseNum(r.Ganancia||r.ganancia),0);const gananciaDAP=gananciaDAPTrabajo+gananciaDAPInversion+gananciaDAPCredito;
    const dapProximos=dapRows.map(r=>({banco:r.Banco||r.banco,monto:parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final),vencimiento:parseDate(r.Vencimiento||r.vencimiento),tipo:r.Tipo||r.tipo,tasa:r.Tasa||r.tasa,_tipoNorm:getDapType(r)})).filter(r=>r.vencimiento&&r.vencimiento>=now).sort((a,b)=>a.vencimiento-b.vencimiento).slice(0,10);
    const fondosRows=(data.finFondos||[]).filter(r=>r.Fondo||r.fondo);const fondosSaldos=fondosRows.filter(r=>parseNum(r["Valor Actual"]||r.ValorActual||r.valor_actual)>0).map(r=>({fondo:r.Fondo||r.fondo,admin:r.Administradora||r.administradora,invertido:parseNum(r["Monto Invertido"]||r.MontoInvertido||r.monto_invertido),actual:parseNum(r["Valor Actual"]||r.ValorActual||r.valor_actual),rentPct:r["Rentabilidad %"]||r.rentabilidad_pct||""}));const totalFondos=fondosSaldos.reduce((s,r)=>s+r.actual,0);const totalInversionReal=totalDAPInversion+totalFondos;const totalInversiones=totalDAP+totalFondos;
    const calRows=(data.finCalendario||[]).map(r=>({fecha:parseDate(r.Fecha||r.fecha),monto:parseNum(r.Monto||r.monto),guardado:parseNum(r.Guardado||r.guardado),falta:parseNum(r.Falta||r.falta),concepto:r.Concepto||r.concepto||"",estado:r.Estado||r.estado||"",mes:r.Mes||r.mes,semana:r.Semana||r.semana})).filter(r=>r.fecha);
    const nextWeek=new Date(now);nextWeek.setDate(nextWeek.getDate()+7);const compromisosProx=calRows.filter(r=>r.fecha>=now&&r.fecha<=nextWeek).sort((a,b)=>a.fecha-b.fecha);const totalCompromisosProx=compromisosProx.reduce((s,r)=>s+r.monto,0);
    const compromisosMes=calRows.filter(r=>r.fecha&&r.fecha.getMonth()===curMonth&&r.fecha.getFullYear()===curYear);const totalCompromisosMes=compromisosMes.reduce((s,r)=>s+r.monto,0);const totalGuardadoMes=compromisosMes.reduce((s,r)=>s+r.guardado,0);

    // ══════════ COBERTURA SEMANAL — realista: caja + DAP TRABAJO que vence esa semana vs compromisos ══════════
    // Solo DAP Trabajo entra (Crédito reservado compra terrenos, Inversión es ahorro)
    const startOfWeek=(d)=>{const day=d.getDay();const diff=d.getDate()-day+(day===0?-6:1);return new Date(d.getFullYear(),d.getMonth(),diff);};
    const weekStart0=startOfWeek(now);
    const dapVigentes=(data.finDAP||[]).filter(r=>{const v=(r.Vigente||r.vigente||"").toString().toLowerCase();return v==="si"||v==="sí"||v==="yes";}).map(r=>({vencimiento:parseDate(r.Vencimiento||r.vencimiento),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final)||parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),banco:r.Banco||r.banco,tipo:getDapType(r)})).filter(r=>r.vencimiento);
    const coberturaSemanas=[];
    let cajaRestante=totalCaja;
    for(let w=0;w<4;w++){
      const ws=new Date(weekStart0); ws.setDate(ws.getDate()+w*7);
      const we=new Date(ws); we.setDate(we.getDate()+6);we.setHours(23,59,59,999);
      const compSemana=calRows.filter(r=>r.fecha>=ws&&r.fecha<=we);
      const compMonto=compSemana.reduce((s,r)=>s+r.monto,0);
      // Solo DAP Trabajo aporta a la liquidez operativa semanal
      const dapSemana=dapVigentes.filter(r=>r.tipo==="trabajo"&&r.vencimiento>=ws&&r.vencimiento<=we);
      const dapMonto=dapSemana.reduce((s,r)=>s+r.montoFinal,0);
      // Caja disponible al inicio de la semana: solo la tenemos en w=0, luego se arrastra lo que sobró
      const cajaInicio = w===0 ? cajaRestante : cajaRestante;
      const ingresosSemana = cajaInicio + dapMonto;
      const neto = ingresosSemana - compMonto;
      cajaRestante = Math.max(0, neto); // no arrastramos faltantes
      const ratio = compMonto>0 ? ingresosSemana/compMonto : null;
      // Confianza en el control manual de Miguel: columnas "Guardado" y "Falta" del calendario
      const guardadoSemana=compSemana.reduce((s,r)=>s+r.guardado,0);
      const faltaSemana=compSemana.reduce((s,r)=>s+r.falta,0);
      coberturaSemanas.push({
        semana:w+1,
        inicio:ws,fin:we,
        label:`${ws.getDate().toString().padStart(2,"0")}/${(ws.getMonth()+1).toString().padStart(2,"0")} — ${we.getDate().toString().padStart(2,"0")}/${(we.getMonth()+1).toString().padStart(2,"0")}`,
        compromisos:compMonto,
        dapVence:dapMonto,
        cajaInicio,
        ingresos:ingresosSemana,
        neto,
        ratio,
        dapCount:dapSemana.length,
        compCount:compSemana.length,
        guardado:guardadoSemana,
        falta:faltaSemana,
      });
    }
    // Cobertura global próx 30d — criterio "liquidez operativa del mes":
    //   = Caja + DAP TRABAJO que vence 30d + FFMM (rescatables 1-3 días)
    //   Excluye DAP Crédito (reservado a compra terrenos/mejoras) y DAP Inversión (ahorro largo plazo)
    const dapVigentesConTipo=(data.finDAP||[]).filter(r=>{const v=(r.Vigente||r.vigente||"").toString().toLowerCase();return v==="si"||v==="sí"||v==="yes";}).map(r=>({vencimiento:parseDate(r.Vencimiento||r.vencimiento),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final)||parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),banco:r.Banco||r.banco,tipo:getDapType(r)})).filter(r=>r.vencimiento);
    const next30=new Date(now);next30.setDate(next30.getDate()+30);
    const comp30=calRows.filter(r=>r.fecha>=now&&r.fecha<=next30).reduce((s,r)=>s+r.monto,0);
    // Desglose DAP 30d por tipo (para tooltip)
    const dapTrabajoVence30=dapVigentesConTipo.filter(r=>r.tipo==="trabajo"&&r.vencimiento>=now&&r.vencimiento<=next30).reduce((s,r)=>s+r.montoFinal,0);
    const dapCreditoVence30=dapVigentesConTipo.filter(r=>r.tipo==="credito"&&r.vencimiento>=now&&r.vencimiento<=next30).reduce((s,r)=>s+r.montoFinal,0);
    const dapInversionVence30=dapVigentesConTipo.filter(r=>r.tipo==="inversion"&&r.vencimiento>=now&&r.vencimiento<=next30).reduce((s,r)=>s+r.montoFinal,0);
    const dap30=dapTrabajoVence30+dapCreditoVence30+dapInversionVence30; // total DAPs 30d (para referencia)
    // Liquidez operativa real: solo caja + DAP trabajo + FFMM
    const liquidez30 = totalCaja + dapTrabajoVence30 + totalFondos;
    // Además, colchón si se necesitara: + DAP inversión (DAP crédito NO, está amarrado a proyectos)
    const colchonAdicional30 = dapInversionVence30;
    const liquidez30Total = liquidez30 + colchonAdicional30;
    const coberturaRatio30 = comp30>0 ? liquidez30/comp30 : null;
    const coberturaRatio30ConColchon = comp30>0 ? liquidez30Total/comp30 : null;
    // La semana es crítica solo si TÚ marcaste "falta" > 0 en el calendario (no por cálculo derivado)
    const primeraSemanaCritica = coberturaSemanas.find(s=>s.falta>0);

    // ══════════ MARGEN MES ESTIMADO ══════════
    // Facturación mes actual - (compromisos del mes + cuota leasing c/IVA + cuota crédito)
    // Nota: es solo un proxy, no es contable.

    // ══════════ ALERTAS ══════════
    const alertas=[];
    calRows.filter(r=>r.falta>0&&r.fecha>=now&&r.fecha<=nextWeek).forEach(r=>{alertas.push({type:"warning",icon:Calendar,msg:`${r.concepto}: falta ${fmtM(r.falta)} para el ${r.fecha.toLocaleDateString("es-CL")}`});});
    dapProximos.filter(r=>r.vencimiento<=nextWeek).forEach(r=>{alertas.push({type:"info",icon:PiggyBank,msg:`DAP ${r.banco} por ${fmtM(r.monto)} vence el ${r.vencimiento.toLocaleDateString("es-CL")}`});});
    if(viajesCorteAnterior>0&&viajesCorteActual<viajesCorteAnterior*0.85){alertas.push({type:"danger",icon:TrendingDown,msg:`Viajes al día ${dayOfMonth}: ${viajesCorteActual} vs ${viajesCorteAnterior} mes anterior (${fmtPct(pctChange(viajesCorteActual,viajesCorteAnterior))})`});}
    if(totalContratados>0&&pctOcupacionConductores<75){alertas.push({type:"warning",icon:Users,msg:`Ocupación conductores: ${pctOcupacionConductores.toFixed(1)}% — ${totalEnExpedicion} de ${totalContratados} en expedición`});}
    if(totalTractocamiones>0&&pctOcupacionTractos<75){alertas.push({type:"warning",icon:Truck,msg:`Ocupación tractos prom. diario: ${pctOcupacionTractos.toFixed(1)}% — ${tractosActivosMes} de ${totalTractocamiones} (prom. ${diasConDatosTractos} días)`});}
    if(totalTractocamiones>0&&pctOcupacionTractosAyer<75&&lastFullDay){alertas.push({type:"danger",icon:Truck,msg:`Ocupación tractos ${lastFullDayLabel}: ${pctOcupacionTractosAyer.toFixed(1)}% — ${tractosActivosAyer} de ${totalTractocamiones}`});}
    if(primeraSemanaCritica){alertas.push({type:"danger",icon:AlertTriangle,msg:`Semana ${primeraSemanaCritica.label}: faltan ${fmtM(primeraSemanaCritica.falta)} por cubrir (de ${fmtM(primeraSemanaCritica.compromisos)} en compromisos, ${fmtM(primeraSemanaCritica.guardado||0)} guardado)`});}
    if(coberturaRatio30!==null && coberturaRatio30<1){alertas.push({type:"warning",icon:AlertTriangle,msg:`Liquidez 30d insuficiente: caja+DAPs ${fmtM(liquidez30)} vs compromisos ${fmtM(comp30)} (${(coberturaRatio30*100).toFixed(0)}% cobertura)`});}

    // ══════════ LEASING ══════════
    const leasingDet=(data.leasingDetalle||[]).filter(r=>(r.Estado||r.estado||"").toUpperCase()==="ACTIVO");const leasingContratosActivos=leasingDet.length;const leasingTractosTotal=leasingDet.reduce((s,r)=>s+parseNum(r["N Tractos"]||r.Tractos||r.tractos),0);
    const lrParsed=data.leasingResumen||{emisores:[],totalRow:null,proxCuotas:[],proyeccion:[],refs:{}};const leasingEmisores=lrParsed.emisores;const leasingTotalRow=lrParsed.totalRow;
    const leasingTotalCuotaIVA=leasingTotalRow?.cuotaIVA||leasingEmisores.reduce((s,e)=>s+e.cuotaIVA,0);const leasingTotalCuotaSinIVA=leasingTotalRow?.cuotaCLP||leasingEmisores.reduce((s,e)=>s+e.cuotaCLP,0);const leasingDeudaTotal=leasingTotalRow?.deudaCLP||leasingEmisores.reduce((s,e)=>s+e.deudaCLP,0);const leasingTotalUF=leasingTotalRow?.cuotaUF||leasingEmisores.reduce((s,e)=>s+e.cuotaUF,0);
    const leasingProxCuotas=lrParsed.proxCuotas;const leasingProyeccion=lrParsed.proyeccion;
    const dia5=leasingDet.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===5);const dia15=leasingDet.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===15);
    const cuotaDia5UF=dia5.reduce((s,r)=>s+parseNum(r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]),0);const cuotaDia15UF=dia15.reduce((s,r)=>s+parseNum(r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]),0);
    leasingProxCuotas.filter(r=>r.dias<=5&&r.dias>=0).forEach(r=>{alertas.push({type:"warning",icon:Truck,msg:`Leasing: cuota de ${fmtM(r.cuotaIVA)} c/IVA vence en ${r.dias} día${r.dias!==1?"s":""}`});});

    // ══════════ CREDITO ══════════
    const creditoRows=(data.credito||[]).map(r=>({cuota:parseNum(r["N° Cuota"]||r.Cuota||r.cuota),fecha:r["Fecha Vencimiento"]||r.Fecha||r.fecha||"",capital:parseNum(r["Amortización Capital"]||r["Amortizacion Capital"]||r.capital),interes:parseNum(r["Monto Interés"]||r["Monto Interes"]||r.interes),valorCuota:parseNum(r["Valor Cuota"]||r.ValorCuota||r.valor_cuota),saldo:parseNum(r["Saldo Insoluto"]||r.SaldoInsoluto||r.saldo)})).filter(r=>r.cuota>0);
    const creditoProxima=creditoRows.find(r=>{const fd=parseDate(r.fecha);return fd&&fd>=now&&r.valorCuota>0;});const creditoCuotasFuturas=creditoRows.filter(r=>{const fd=parseDate(r.fecha);return fd&&fd>=now;});
    const creditoSaldoActual=creditoCuotasFuturas.length>0?creditoCuotasFuturas[0].saldo:(creditoRows.length>0?creditoRows[creditoRows.length-1].saldo:0);const creditoDeudaTotal=creditoCuotasFuturas.reduce((s,r)=>s+r.valorCuota,0);const creditoValorCuota=creditoRows.find(r=>r.valorCuota>0)?.valorCuota||0;const creditoTotalCuotas=creditoRows.length;
    const creditoCuotasPagadas=creditoRows.filter(r=>{const fd=parseDate(r.fecha);return fd&&fd<now;}).length;const creditoCuotasPorPagar=creditoTotalCuotas-creditoCuotasPagadas;const creditoTotalIntereses=creditoRows.reduce((s,r)=>s+r.interes,0);const creditoTotalCapital=creditoRows.reduce((s,r)=>s+r.capital,0);const creditoInteresesPendientes=creditoCuotasFuturas.reduce((s,r)=>s+r.interes,0);
    if(creditoProxima){const fd=parseDate(creditoProxima.fecha);if(fd){const dc=Math.ceil((fd-now)/86400000);if(dc<=7&&dc>=0){alertas.push({type:"info",icon:CreditCard,msg:`Crédito Itaú: cuota #${creditoProxima.cuota} de ${fmtM(creditoProxima.valorCuota)} vence en ${dc} días`});}}}

    // Margen mes estimado (proxy simple)
    const leasingMesEstimado=leasingTotalCuotaIVA;
    const creditoMesEstimado=creditoValorCuota;
    const margenMesEstimado=totalMesActual-(totalCompromisosMes+leasingMesEstimado+creditoMesEstimado);

    return{totalMesActual,totalMesAnterior,ventasPorMes,topClientes,ventasAnoActual,ventasAnoAnterior,ventasRows,viajesMesActual:viajesMesActual.length,viajesMesAnteriorCount:viajesMesAnterior.length,viajesCorteActual,viajesCorteAnterior,viajesPorMes,topClientesViajes,viajesPorEquipo,dayOfMonth,totalCaja,saldosBancos,totalDAP,gananciaDAP,dapProximos,totalFondos,fondosSaldos,totalInversiones,totalDAPTrabajo,totalDAPInversion,totalDAPCredito,gananciaDAPTrabajo,gananciaDAPInversion,gananciaDAPCredito,totalInversionReal,totalCompromisosProx,compromisosProx,totalCompromisosMes,totalGuardadoMes,compromisosMes,alertas,kmMesActual,tractosActivos,totalContratados,totalEnExpedicion,totalNoActivos,pctOcupacionConductores,tractosActivosAyer,tractosActivosMes,totalTractocamiones,pctOcupacionTractos,pctOcupacionTractosAyer,lastFullDayLabel,viajesAyer,leasingContratosActivos,leasingTractosTotal,leasingEmisores,leasingTotalCuotaIVA,leasingTotalCuotaSinIVA,leasingDeudaTotal,leasingTotalUF,leasingProxCuotas,leasingProyeccion,cuotaDia5UF,cuotaDia15UF,leasingDet,creditoRows,creditoSaldoActual,creditoDeudaTotal,creditoValorCuota,creditoTotalCuotas,creditoProxima,creditoCuotasPagadas,creditoCuotasPorPagar,creditoTotalIntereses,creditoTotalCapital,creditoInteresesPendientes,curMonth,curYear,ventasPorMesComparado,ventasPorMesConProyeccion,acumActual,acumAnterior,acumCorteActual,acumCorteAnterior,prevYear,ultimasFacturas,tractosUnicosMes,diasConDatosTractos,projections,mepcoActivo,impactoMepcoMes,impactoMepcoAcum,margenMesEstimado,leasingMesEstimado,creditoMesEstimado,coberturaSemanas,coberturaRatio30,coberturaRatio30ConColchon,liquidez30,liquidez30Total,colchonAdicional30,comp30,dap30,dapTrabajoVence30,dapCreditoVence30,dapInversionVence30,primeraSemanaCritica,proyMesActualPorViajes,proyMesSiguientePorViajes,proyAnualPorViajes,tasaGlobal,tasaPorCliente,desgloseMesActualProy,facturacionProyectadaPorViajes,desglosePorMesFactura,comp60Total:comp30*2};
  },[data]);

  if(loading&&!computed){return(<div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:T.tx,fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><RefreshCw size={32} color={T.accent} style={{animation:"spin 1s linear infinite"}}/><p style={{marginTop:16,color:T.txM}}>Cargando datos...</p><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></div>);}

  const C=computed||{};const activeAlerts=(C.alertas||[]).length;

  return(<div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",color:T.tx}}>
    <header style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setMobileMenu(!mobileMenu)} style={{background:"none",border:"none",cursor:"pointer",display:"none",color:T.tx,padding:4}} className="mobile-menu-btn">{mobileMenu?<X size={20}/>:<Menu size={20}/>}</button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg, ${T.accent}, ${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:14,boxShadow:`0 4px 12px ${T.accent}44`}}>CM</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:T.tx,letterSpacing:-0.3}}>Centro de Mando — Don Luis Bello</div>
            <div style={{fontSize:10,color:T.txD}}>Transportes Bello e Hijos Ltda.</div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {lastUpdate&&<span style={{fontSize:10,color:T.txD}}>{lastUpdate.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</span>}
        <button onClick={loadData} style={{background:"none",border:"none",cursor:"pointer",color:T.txM,padding:4}} title="Actualizar"><RefreshCw size={16} className={loading?"spinning":""}/></button>
        <button onClick={toggleTheme} style={{background:"none",border:"none",cursor:"pointer",color:T.txM,padding:4}}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button>
      </div>
    </header>
    <div style={{display:"flex",minHeight:"calc(100vh - 52px)"}}>
      <nav className="sidebar" style={{width:200,background:T.bg2,borderRight:`1px solid ${T.border}`,padding:"16px 8px",flexShrink:0,display:"flex",flexDirection:"column",gap:2}}>
        {TABS.map(t=>{const active=tab===t.id;return(<button key={t.id} onClick={()=>{setTab(t.id);setMobileMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:active?T.accentBg:"transparent",color:active?T.accent:T.txM,fontWeight:active?600:400,fontSize:13,transition:"all 0.15s"}}><t.icon size={16}/>{t.label}{t.id==="alertas"&&activeAlerts>0&&(<span style={{marginLeft:"auto",background:T.red,color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 7px"}}>{activeAlerts}</span>)}</button>);})}
      </nav>
      {mobileMenu&&(<div className="mobile-nav-overlay" style={{position:"fixed",top:52,left:0,right:0,bottom:0,zIndex:99,background:"rgba(0,0,0,0.5)"}} onClick={()=>setMobileMenu(false)}><div style={{width:220,background:T.bg2,height:"100%",padding:"16px 8px",display:"flex",flexDirection:"column",gap:2}} onClick={e=>e.stopPropagation()}>{TABS.map(t=>{const active=tab===t.id;return(<button key={t.id} onClick={()=>{setTab(t.id);setMobileMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:active?T.accentBg:"transparent",color:active?T.accent:T.txM,fontWeight:active?600:400,fontSize:14}}><t.icon size={18}/> {t.label}{t.id==="alertas"&&activeAlerts>0&&(<span style={{marginLeft:"auto",background:T.red,color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 8px"}}>{activeAlerts}</span>)}</button>);})}</div></div>)}
      <main style={{flex:1,padding:"20px 24px",maxWidth:1200,overflowX:"hidden"}}>
        {tab==="home"&&<HomeView C={C} T={T} setTab={setTab}/>}
        {tab==="ventas"&&<VentasView C={C} T={T} projectionMode={projectionMode} setProjectionMode={setProjectionMode}/>}
        {tab==="operaciones"&&<OperacionesView C={C} T={T}/>}
        {tab==="finanzas"&&<FinanzasView C={C} T={T}/>}
        {tab==="leasing"&&<LeasingView C={C} T={T}/>}
        {tab==="credito"&&<CreditoView C={C} T={T}/>}
        {tab==="alertas"&&<AlertasView C={C} T={T}/>}
      </main>
    </div>
    <nav className="bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:T.bg2,borderTop:`1px solid ${T.border}`,display:"none",padding:"6px 0 env(safe-area-inset-bottom,8px)",zIndex:100}}><div style={{display:"flex",justifyContent:"space-around"}}>{TABS.map(t=>{const active=tab===t.id;return(<button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",color:active?T.accent:T.txD,fontSize:10,fontWeight:active?600:400,position:"relative"}}><t.icon size={18}/>{t.label}{t.id==="alertas"&&activeAlerts>0&&(<span style={{position:"absolute",top:0,right:2,background:T.red,color:"#fff",fontSize:8,fontWeight:700,borderRadius:6,padding:"0 4px",lineHeight:"14px"}}>{activeAlerts}</span>)}</button>);})}</div></nav>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinning{animation:spin 1s linear infinite}@media(max-width:768px){.sidebar{display:none!important}.bottom-nav{display:block!important}.mobile-menu-btn{display:block!important}main{padding:14px 12px 80px!important}}`}</style>
  </div>);
}


// ═════════════════════════════════════════════════════════════════════════════
// HOME VIEW — la vista principal de Don Luis
// ═════════════════════════════════════════════════════════════════════════════

function HomeView({C,T,setTab}){
  const mesLabel=MESES_FULL[C.curMonth]+" "+C.curYear;
  const saludo=getSaludo();
  const fecha=getFechaLarga();

  // Datos del chart con proyección estacional + proyección por viajes
  // proyectadoActual = solo para el mes en curso (se apila con real)
  // proyectadoFuturo = para meses posteriores (barra sola, sin apilar)
  const chartData=(C.ventasPorMesConProyeccion||[]).map((m,i)=>{
    const proyV=(C.facturacionProyectadaPorViajes||[])[i]||0;
    const showViajes=i>=C.curMonth && proyV>0;
    const esMesActual=i===C.curMonth;
    const esMesFuturo=i>C.curMonth;
    const proyectadoVal=m.proyectado!==null?m.proyectado/1e6:null;
    return {
      mes:MESES[i],
      real:m.actual>0?m.actual/1e6:null,
      proyectadoActual:esMesActual?proyectadoVal:null,
      proyectadoFuturo:esMesFuturo?proyectadoVal:null,
      anterior:m.anterior>0?m.anterior/1e6:null,
      proyViajes:showViajes?proyV/1e6:null,
    };
  });

  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>

    {/* Header con saludo + semáforo ejecutivo */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
      <div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,background:T.violetBg,border:`1px solid ${T.violet}33`,marginBottom:10}}>
          <Sparkles size={11} color={T.violet}/>
          <span style={{fontSize:10,color:T.violet,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase"}}>Resumen ejecutivo</span>
        </div>
        <h1 style={{fontSize:24,fontWeight:800,color:T.tx,marginBottom:3,letterSpacing:-0.8}}>{saludo}, Don Luis</h1>
        <p style={{fontSize:13,color:T.txM,textTransform:"capitalize"}}>{fecha}</p>
      </div>
      <SemaforoEjecutivo C={C} T={T}/>
    </div>

    {/* Banner MEPCO */}
    <MepcoBanner T={T} year={C.curYear} lastMonth={C.curMonth+1} compact={true}/>

    {/* Banner Hoy Destaca */}
    <HighlightsBanner C={C} T={T}/>

    {/* KPIs principales — fila 1 */}
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={DollarSign} label="Facturación mes" value={fmtM(C.totalMesActual)} T={T} sub={C.totalMesAnterior>0?fmtPct(pctChange(C.totalMesActual,C.totalMesAnterior))+" vs mes ant.":undefined} color={T.accent} colorBg={T.accentBg}/>
      <KpiCard icon={Truck} label="Viajes mes" value={C.viajesMesActual?.toLocaleString("es-CL")} T={T} sub={`Corte día ${C.dayOfMonth}: ${C.viajesCorteActual} vs ${C.viajesCorteAnterior}`} color={T.green} colorBg={T.greenBg}/>
      <KpiCard icon={Building2} label="Caja total" value={fmtM(C.totalCaja)} T={T} sub={Object.keys(C.saldosBancos||{}).length+" bancos"} color={T.teal} colorBg={T.tealBg}/>
      <KpiCard icon={Gauge} label="Liquidez 30d" value={C.coberturaRatio30!==null?`${C.coberturaRatio30.toFixed(2)}x`:"—"} T={T} sub={C.coberturaRatio30!==null?`${fmtM(C.liquidez30)} vs compromisos ${fmtM(C.comp30)}`:"Sin compromisos en 30 días"} color={C.coberturaRatio30===null?T.txM:C.coberturaRatio30>=1.2?T.green:C.coberturaRatio30>=1?T.amber:T.red} colorBg={C.coberturaRatio30===null?T.bg3:C.coberturaRatio30>=1.2?T.greenBg:C.coberturaRatio30>=1?T.amberBg:T.redBg}
        tooltip={<div>
          <div style={{fontWeight:700,color:T.tooltipTx,marginBottom:6,fontSize:12}}>Desglose Liquidez operativa 30d</div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Caja bancaria</span><strong>{fmtM(C.totalCaja)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ DAP Trabajo (vence 30d)</span><strong>{fmtM(C.dapTrabajoVence30||0)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ Fondos mutuos (rescatables)</span><strong>{fmtM(C.totalFondos)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 3px",borderTop:`1px solid ${T.tooltipTx}22`,marginTop:3,fontWeight:700}}><span>= Liquidez disponible</span><strong>{fmtM(C.liquidez30)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>÷ Compromisos 30d</span><strong>{fmtM(C.comp30)}</strong></div>
          <div style={{fontSize:10,color:T.tooltipTx,opacity:0.7,marginTop:8,lineHeight:1.4,paddingTop:6,borderTop:`1px solid ${T.tooltipTx}22`}}>
            Excluye: DAP Crédito ({fmtM(C.dapCreditoVence30||0)} en 30d, reservado a compra de terrenos) y DAP Inversión ({fmtM(C.dapInversionVence30||0)} en 30d, ahorro largo plazo).
            {C.colchonAdicional30>0&&<><br/>Colchón adicional si emergencia (DAP Inv. 30d): <strong>{fmtM(C.colchonAdicional30)}</strong> → ratio total {C.coberturaRatio30ConColchon?.toFixed(2)}x</>}
          </div>
        </div>}
      />
      <KpiCard icon={PiggyBank} label="Inversión real" value={fmtM(C.totalInversionReal)} T={T} sub={`DAP Inv. ${fmtM(C.totalDAPInversion)} + FF.MM. ${fmtM(C.totalFondos)}`} color={T.purple} colorBg={T.purpleBg}/>
    </div>

    {/* KPIs fila 2 — proyección próximo mes + MEPCO + margen */}
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard
        icon={TrendingUp}
        label={`Fact. proyectada ${C.curMonth<11?MESES[C.curMonth+1]:"Ene"}`}
        value={C.proyMesSiguientePorViajes>0?fmtM(C.proyMesSiguientePorViajes):"—"}
        T={T}
        sub={C.proyMesSiguientePorViajes>0?`Basada en viajes ${MESES[C.curMonth]} × tarifa hist.`:"Sin viajes mes actual"}
        color={T.teal} colorBg={T.tealBg}
        badge="PRÓX. MES"
      />
      <KpiCard
        icon={Zap}
        label="Impacto MEPCO mes"
        value={C.impactoMepcoMes===0?"—":(C.impactoMepcoMes>0?"+":"")+fmtM(C.impactoMepcoMes)}
        T={T}
        sub={C.mepcoActivo?(C.impactoMepcoAcum!==0?`Acum. desde mayo: ${C.impactoMepcoAcum>0?"+":""}${fmtM(C.impactoMepcoAcum)}`:"Sin efecto medible aún"):"Pendiente (desde mayo 2026)"}
        color={T.amber} colorBg={T.amberBg}
        badge={C.mepcoActivo?"VIGENTE":"PREVIO"}
      />
      <KpiCard icon={BarChart3} label="Margen estimado mes" value={fmtM(C.margenMesEstimado)} T={T} sub={`Fact. ${fmtM(C.totalMesActual)} − costos fijos`} color={C.margenMesEstimado>=0?T.green:T.red} colorBg={C.margenMesEstimado>=0?T.greenBg:T.redBg}/>
      <KpiCard icon={Truck} label="Leasing" value={fmtM(C.leasingTotalCuotaIVA)+" c/IVA"} T={T} sub={`${C.leasingContratosActivos} contratos · ${C.leasingTractosTotal} tractos`} color={T.violet} colorBg={T.violetBg}/>
      <KpiCard icon={CreditCard} label="Crédito Itaú" value={fmtM(C.creditoDeudaTotal)} T={T} sub={C.creditoProxima?`Próxima: ${fmtM(C.creditoProxima.valorCuota)} · cuota #${C.creditoProxima.cuota}`:"En gracia"} color={T.red} colorBg={T.redBg}/>
    </div>

    {/* Gráfico principal con proyección estacional + línea MEPCO */}
    <SectionCard
      title={`Facturación mensual ${C.curYear} — con proyección estacional`}
      icon={BarChart3} T={T} color={T.accent}
      action={<span style={{fontSize:10,color:T.txD,fontStyle:"italic"}}>Proyección anual: <strong style={{color:T.amber}}>{fmtM(C.projections?.seasonal||0)}</strong></span>}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}M`} width={55}/>
          <Tooltip content={<ChartTooltip T={T}/>} formatter={(v)=>v!=null?`$${v.toFixed(1)}M`:"-"}/>
          <Legend wrapperStyle={{fontSize:11,color:T.txM}}/>
          <Bar dataKey="anterior" fill={T.txD} opacity={0.4} radius={[3,3,0,0]} name={String(C.prevYear)}/>
          <Bar dataKey="real" stackId="curr" fill={T.accent} radius={[3,3,0,0]} name={`${C.curYear} Real`}/>
          <Bar dataKey="proyectadoActual" stackId="curr" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name={`Falta facturar mes`}/>
          <Bar dataKey="proyectadoFuturo" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name={`Proyectado estacional`}/>
          <Line type="monotone" dataKey="proyViajes" stroke={T.teal} strokeWidth={2.5} dot={{fill:T.teal,r:4}} connectNulls={false} name={`Proyectado por viajes`}/>
          {C.curYear===2026 && (
            <ReferenceLine x={MESES[MEPCO_ADJUSTMENT_MONTH-1]} stroke={T.violet} strokeDasharray="4 3" strokeWidth={2} label={{value:"⚡ MEPCO",position:"top",fill:T.violet,fontSize:10,fontWeight:700}}/>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </SectionCard>

    {/* Alertas */}
    {C.alertas?.length>0&&(
      <div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:12,padding:"12px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <AlertTriangle size={14} color={T.red}/>
          <span style={{fontSize:12,fontWeight:600,color:T.red}}>Alertas ({C.alertas.length})</span>
          <button onClick={()=>setTab("alertas")} style={{marginLeft:"auto",background:"none",border:"none",color:T.accent,fontSize:11,cursor:"pointer",fontWeight:600}}>Ver todas</button>
        </div>
        {C.alertas.slice(0,3).map((a,i)=>(<div key={i} style={{fontSize:12,color:T.tx,padding:"3px 0",display:"flex",alignItems:"center",gap:6}}><a.icon size={12} color={a.type==="danger"?T.red:a.type==="warning"?T.amber:T.accent}/>{a.msg}</div>))}
      </div>
    )}

    {/* Grid de tarjetas secundarias */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
      <SectionCard title="Saldos bancarios" icon={Building2} T={T} color={T.teal}><MiniTable T={T} headers={["Banco","Saldo"]} rows={[...Object.entries(C.saldosBancos||{}).sort((a,b)=>b[1]-a[1]).map(([banco,saldo])=>[banco,fmtFull(saldo)]),["TOTAL",fmtFull(C.totalCaja)]]}/></SectionCard>
      <SectionCard title="Compromisos próximos 7 días" icon={Calendar} T={T} color={T.amber}>{C.compromisosProx?.length>0?(<MiniTable T={T} headers={["Fecha","Concepto","Monto"]} rows={C.compromisosProx.map(r=>[r.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.concepto.length>30?r.concepto.slice(0,28)+"...":r.concepto,fmtM(r.monto)])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin compromisos en los próximos 7 días</p>}</SectionCard>
      <SectionCard title={"Top clientes "+MESES[C.curMonth]} icon={Users} T={T} color={T.purple}><MiniTable T={T} headers={["Cliente","Facturación"]} rows={(C.topClientes||[]).map(c=>[c.name.length>25?c.name.slice(0,23)+"...":c.name,fmtM(c.total)])}/></SectionCard>
      <SectionCard title="DAP — próximos vencimientos" icon={PiggyBank} T={T} color={T.green}>{C.dapProximos?.length>0?(<MiniTable T={T} headers={["Banco","Monto","Vence","Tasa"]} rows={C.dapProximos.map(r=>[r.banco,fmtM(r.monto),r.vencimiento.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.tasa||""])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin DAPs vigentes</p>}</SectionCard>
    </div>
  </div>);
}


// ═════════════════════════════════════════════════════════════════════════════
// VENTAS VIEW — con toggle de proyección estacional/prorrateada/lineal + MEPCO
// ═════════════════════════════════════════════════════════════════════════════

function VentasView({C,T,projectionMode,setProjectionMode}){
  const mesLabel=MESES_FULL[C.curMonth];
  const varMes=C.totalMesAnterior>0?pctChange(C.totalMesActual,C.totalMesAnterior):0;
  const varAno=C.ventasAnoAnterior>0?pctChange(C.ventasAnoActual,C.ventasAnoAnterior):0;
  const varAcumCorte=C.acumCorteAnterior>0?pctChange(C.acumCorteActual,C.acumCorteAnterior):0;
  const totalTop=(C.topClientes||[]).reduce((s,c)=>s+c.total,0);
  const pieData=(C.topClientes||[]).slice(0,6).map((c,i)=>({name:c.name.length>18?c.name.slice(0,16)+"...":c.name,value:c.total,pct:totalTop>0?((c.total/C.totalMesActual)*100).toFixed(1):0}));
  const mesActualAnterior = (C.ventasPorMesComparado||[])[C.curMonth];
  const varMesVsAnioAnt = mesActualAnterior && mesActualAnterior.anterior > 0 ? pctChange(mesActualAnterior.actual, mesActualAnterior.anterior) : 0;

  const proj=C.projections||{};
  const projection=projectionMode==="lineal"?proj.linear:projectionMode==="prorata"?proj.prorata:proj.seasonal;
  const projPct=C.ventasAnoAnterior>0?pctChange(projection,C.ventasAnoAnterior):0;

  const projectionModes=[
    {id:"seasonal",label:"Estacional",desc:"Basada en patrón mensual del año anterior"},
    {id:"prorata",label:"Prorrateada",desc:"Prorrateo por días hábiles transcurridos"},
    {id:"lineal",label:"Lineal",desc:"Promedio simple × 12"},
  ];

  // Chart data con proyección por mes (estacional apilada solo mes actual + línea viajes)
  const chartDataProj=(C.ventasPorMesConProyeccion||[]).map((m,i)=>{
    const proyV=(C.facturacionProyectadaPorViajes||[])[i]||0;
    const showViajes=i>=C.curMonth && proyV>0;
    const esMesActual=i===C.curMonth;
    const esMesFuturo=i>C.curMonth;
    const proyectadoVal=m.proyectado!==null?m.proyectado/1e6:null;
    return{
      mes:MESES[i],
      real:m.actual>0?m.actual/1e6:null,
      proyectadoActual:esMesActual?proyectadoVal:null,
      proyectadoFuturo:esMesFuturo?proyectadoVal:null,
      anterior:m.anterior>0?m.anterior/1e6:null,
      proyViajes:showViajes?proyV/1e6:null,
    };
  });

  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div>
      <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Ventas y facturación</h2>
      <p style={{fontSize:12,color:T.txM,marginTop:3}}>Lectura ejecutiva de facturación con proyección del cierre anual</p>
    </div>

    <MepcoBanner T={T} year={C.curYear} lastMonth={C.curMonth+1}/>

    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={DollarSign} label={`Facturación ${mesLabel}`} value={fmtM(C.totalMesActual)} T={T} sub={varMes!==0?fmtPct(varMes)+" vs mes anterior":undefined} color={T.accent} colorBg={T.accentBg}/>
      <KpiCard icon={TrendingUp} label="Acumulado año" value={fmtM(C.ventasAnoActual)} T={T} sub={varAno!==0?fmtPct(varAno)+` vs ${C.prevYear}`:undefined} color={T.green} colorBg={T.greenBg}/>
      <KpiCard icon={Target} label={`Proyección anual`} value={fmtM(projection)} T={T} sub={`${fmtPct(projPct)} vs ${C.prevYear}`} color={T.amber} colorBg={T.amberBg} badge={projectionMode.toUpperCase()}/>
      <KpiCard icon={Zap} label="Impacto MEPCO acum." value={C.impactoMepcoAcum===0?"—":(C.impactoMepcoAcum>0?"+":"")+fmtM(C.impactoMepcoAcum)} T={T} sub={C.mepcoActivo?"Desde mayo 2026":"Inicia mayo 2026"} color={T.violet} colorBg={T.violetBg} badge={C.mepcoActivo?"VIGENTE":"PREVIO"}/>
    </div>

    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={BarChart3} label={`${mesLabel} ${C.prevYear}`} value={fmtM(mesActualAnterior?.anterior || 0)} T={T} sub={varMesVsAnioAnt!==0?`${C.curYear}: ${fmtPct(varMesVsAnioAnt)}`:undefined} color={T.purple} colorBg={T.purpleBg}/>
      <KpiCard icon={Activity} label={`Acum. al corte (día ${new Date().getDate()})`} value={fmtM(C.acumCorteActual)} T={T} sub={`${C.prevYear}: ${fmtM(C.acumCorteAnterior)} (${fmtPct(varAcumCorte)})`} color={varAcumCorte>=0?T.green:T.red} colorBg={varAcumCorte>=0?T.greenBg:T.redBg}/>
      <KpiCard icon={Target} label={`Meta: superar ${C.prevYear}`} value={fmtM(C.ventasAnoAnterior)} T={T} sub={`Falta ${fmtM(Math.max(0, C.ventasAnoAnterior - C.ventasAnoActual))}`} color={T.amber} colorBg={T.amberBg}/>
    </div>

    {/* Selector de método de proyección */}
    <div style={{background:T.card,borderRadius:14,padding:"14px 18px",border:`1px solid ${T.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:10}}>
        <div>
          <div style={{color:T.tx,fontWeight:700,fontSize:13,marginBottom:2}}>Método de proyección</div>
          <div style={{color:T.txD,fontSize:11}}>
            {proj.monthInProgress?`${MESES[proj.openMonth-1]} en curso (${proj.businessDaysElapsed}/${proj.businessDaysTotal} días hábiles · ${Math.round((proj.businessDaysElapsed/proj.businessDaysTotal)*100)}%)`:"Todos los meses cerrados"}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {projectionModes.map(m=>(
            <button key={m.id} onClick={()=>setProjectionMode(m.id)} title={m.desc}
              style={{padding:"7px 13px",borderRadius:10,border:`1px solid ${projectionMode===m.id?T.amber:T.border}`,background:projectionMode===m.id?T.amberBg:"transparent",color:projectionMode===m.id?T.amber:T.txM,cursor:"pointer",fontSize:11,fontWeight:700}}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginTop:6}}>
        {projectionModes.map(m=>{
          const val=m.id==="lineal"?proj.linear:m.id==="prorata"?proj.prorata:proj.seasonal;
          const pct=C.ventasAnoAnterior>0?pctChange(val,C.ventasAnoAnterior):0;
          return(
            <div key={m.id} style={{padding:"8px 12px",borderRadius:10,background:projectionMode===m.id?`${T.amber}12`:T.bg3+"44",border:`1px solid ${projectionMode===m.id?T.amber+"55":T.border}`}}>
              <div style={{fontSize:10,color:T.txD,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{m.label}</div>
              <div style={{fontSize:14,fontWeight:800,color:T.tx}}>{fmtM(val)}</div>
              <div style={{fontSize:10,color:pct>=0?T.green:T.red,fontWeight:700}}>{fmtPct(pct)} vs {C.prevYear}</div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Proyección doble: estacional vs viajes */}
    {C.proyAnualPorViajes>0 && (() => {
      const seasonal=proj.seasonal||0;
      const viajes=C.proyAnualPorViajes||0;
      const divAbs=viajes-seasonal;
      const divPct=seasonal>0?Math.abs(divAbs)/seasonal*100:0;
      const isDiverge=divPct>15;
      const viajesMayor=viajes>seasonal;
      return(
        <SectionCard title="Proyección doble — Estacional vs. Basada en viajes" icon={Sparkles} T={T} color={T.violet} action={isDiverge?<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,background:T.amberBg,color:T.amber,letterSpacing:0.4}}>⚠ DIVERGENCIA {divPct.toFixed(0)}%</span>:<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,background:T.greenBg,color:T.green,letterSpacing:0.4}}>✓ CONVERGEN</span>}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))",gap:12}}>
            <div style={{padding:"12px 14px",borderRadius:10,background:T.amberBg,border:`1px solid ${T.amber}33`}}>
              <div style={{fontSize:10,color:T.amber,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>⚡ Estacional</div>
              <div style={{fontSize:20,fontWeight:800,color:T.tx}}>{fmtM(seasonal)}</div>
              <div style={{fontSize:10,color:T.txM,marginTop:2}}>Basada en patrón histórico {C.prevYear}</div>
            </div>
            <div style={{padding:"12px 14px",borderRadius:10,background:T.tealBg,border:`1px solid ${T.teal}33`}}>
              <div style={{fontSize:10,color:T.teal,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>🚛 Basada en viajes</div>
              <div style={{fontSize:20,fontWeight:800,color:T.tx}}>{fmtM(viajes)}</div>
              <div style={{fontSize:10,color:T.txM,marginTop:2}}>Viajes ejecutados × tarifa $/viaje por cliente</div>
            </div>
            <div style={{padding:"12px 14px",borderRadius:10,background:isDiverge?T.redBg:T.greenBg,border:`1px solid ${isDiverge?T.red:T.green}33`}}>
              <div style={{fontSize:10,color:isDiverge?T.red:T.green,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Δ Diferencia</div>
              <div style={{fontSize:20,fontWeight:800,color:T.tx}}>{divAbs>=0?"+":""}{fmtM(divAbs)}</div>
              <div style={{fontSize:10,color:T.txM,marginTop:2}}>{divPct.toFixed(1)}% de gap · {viajesMayor?"viajes anticipan más":"estacional más optimista"}</div>
            </div>
          </div>
          <div style={{marginTop:12,padding:"10px 12px",background:T.bg3+"44",borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
            <strong style={{color:T.tx}}>Cómo leer esto: </strong>
            {isDiverge?
              (viajesMayor?
                `Los viajes ya ejecutados sugieren que el cierre será MAYOR al esperado por patrón histórico. Señal positiva temprana, posible efecto de mayor volumen o ajuste de tarifas MEPCO.`
                :
                `Los viajes ya ejecutados sugieren que el cierre será MENOR al esperado por patrón histórico. Señal temprana de desaceleración — revisar mix de clientes o caída operacional.`
              )
              :
              `Ambos métodos convergen (diferencia ${divPct.toFixed(0)}%). Alta confianza en la proyección anual entre ${fmtM(Math.min(seasonal,viajes))} y ${fmtM(Math.max(seasonal,viajes))}.`
            }
            {" "}Tasa global histórica: <strong>{fmtM(C.tasaGlobal||0)}/viaje</strong>.
          </div>
        </SectionCard>
      );
    })()}

    {/* Auditoría del cálculo: desglose de proyección por viajes del mes actual */}
    {C.desgloseMesActualProy && C.desgloseMesActualProy.length>0 && (
      <details style={{background:T.card,borderRadius:14,padding:"12px 18px",border:`1px solid ${T.border}`}}>
        <summary style={{cursor:"pointer",fontSize:13,fontWeight:700,color:T.tx,listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
          <Sparkles size={14} color={T.teal}/>
          Auditoría: cálculo de proyección "{MESES[C.curMonth]}" basada en viajes de {C.curMonth>0?MESES[C.curMonth-1]:"Dic"}
          <span style={{marginLeft:"auto",fontSize:10,color:T.txD}}>▼ desplegar</span>
        </summary>
        <div style={{marginTop:14,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Cliente","Viajes","Tasa $/viaje","Aporte $","Confianza"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
            <tbody>
              {C.desgloseMesActualProy.slice(0,20).map((d,i)=>{
                const confColor=d.confianza==="alta"?T.green:d.confianza==="baja"?T.amber:T.txD;
                const confBg=d.confianza==="alta"?T.greenBg:d.confianza==="baja"?T.amberBg:T.bg3;
                return(
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                    <td style={{padding:"7px 10px",color:T.tx,fontWeight:500,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.cliente}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",color:T.tx}}>{d.viajes}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",color:T.txM,fontFamily:"monospace",fontSize:11}}>{fmtM(d.tasa)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontWeight:600}}>{fmtM(d.aporte)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:999,background:confBg,color:confColor,textTransform:"uppercase"}}>{d.confianza}</span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{borderTop:`2px solid ${T.border}`,background:T.tealBg}}>
                <td style={{padding:"9px 10px",color:T.teal,fontWeight:800}}>▶ TOTAL PROYECCIÓN</td>
                <td style={{padding:"9px 10px",textAlign:"right",color:T.teal,fontWeight:700}}>{C.desgloseMesActualProy.reduce((s,d)=>s+d.viajes,0)}</td>
                <td style={{padding:"9px 10px",textAlign:"right",color:T.txD,fontSize:11}}>prom. {fmtM(C.tasaGlobal||0)}</td>
                <td style={{padding:"9px 10px",textAlign:"right",color:T.teal,fontWeight:800}}>{fmtM(C.proyMesActualPorViajes||0)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          {C.desgloseMesActualProy.length>20 && <div style={{marginTop:8,fontSize:11,color:T.txD,fontStyle:"italic"}}>Mostrando top 20 de {C.desgloseMesActualProy.length} clientes</div>}
        </div>
        <div style={{marginTop:10,padding:"8px 12px",background:T.bg3+"44",borderRadius:8,fontSize:10,color:T.txM,lineHeight:1.5}}>
          <strong style={{color:T.tx}}>Confianza:</strong> <span style={{color:T.green,fontWeight:600}}>Alta</span> = cliente con ≥3 meses de histórico consistente. <span style={{color:T.amber,fontWeight:600}}>Baja</span> = 1-2 meses. <span style={{color:T.txD,fontWeight:600}}>Global</span> = sin histórico, aplica tasa promedio del año anterior. Si un cliente no te cuadra (matcheo distinto entre viajes y facturación), avisa y afinamos el match.
        </div>
      </details>
    )}

    {/* Gráfico principal con proyección estacional + MEPCO */}
    <SectionCard title={`Comparación mensual — ${C.curYear} vs ${C.prevYear} (con proyección)`} icon={BarChart3} T={T} color={T.accent}>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartDataProj}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}M`} width={55}/>
          <Tooltip content={<ChartTooltip T={T}/>} formatter={(v)=>v!=null?`$${v.toFixed(1)}M`:"-"}/>
          <Legend wrapperStyle={{fontSize:11,color:T.txM}}/>
          <Bar dataKey="anterior" fill={T.txD} opacity={0.45} radius={[3,3,0,0]} name={String(C.prevYear)}/>
          <Bar dataKey="real" stackId="curr" fill={T.accent} radius={[3,3,0,0]} name={`${C.curYear} Real`}/>
          <Bar dataKey="proyectadoActual" stackId="curr" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name={`Falta facturar mes`}/>
          <Bar dataKey="proyectadoFuturo" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name={`Estacional`}/>
          <Line type="monotone" dataKey="proyViajes" stroke={T.teal} strokeWidth={2.5} dot={{fill:T.teal,r:4}} connectNulls={false} name={`Por viajes`}/>
          {C.curYear===2026 && (
            <ReferenceLine x={MESES[MEPCO_ADJUSTMENT_MONTH-1]} stroke={T.violet} strokeDasharray="4 3" strokeWidth={2} label={{value:"⚡ Ajuste MEPCO",position:"top",fill:T.violet,fontSize:10,fontWeight:700}}/>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </SectionCard>

    {/* Tabla detallada mensual */}
    <SectionCard title="Detalle mensual" icon={FileText} T={T} color={T.accent}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr><th style={{padding:"8px 10px",textAlign:"left",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>Mes</th><th style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>{C.prevYear}</th><th style={{padding:"8px 10px",textAlign:"right",color:T.accent,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>{C.curYear}</th><th style={{padding:"8px 10px",textAlign:"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>Var %</th></tr></thead>
          <tbody>
            {(C.ventasPorMesComparado||[]).filter(r=>r.actual>0||r.anterior>0).map((r,i)=>{const vp=r.anterior>0?pctChange(r.actual,r.anterior):0;const isPos=vp>=0;return(<tr key={i} style={{borderBottom:`1px solid ${T.border}22`,background:r.mes===MESES[C.curMonth]?T.accentBg:"transparent"}}><td style={{padding:"6px 10px",color:T.tx,fontWeight:r.mes===MESES[C.curMonth]?600:400}}>{r.mes}</td><td style={{padding:"6px 10px",textAlign:"right",color:T.txD}}>{fmtM(r.anterior)}</td><td style={{padding:"6px 10px",textAlign:"right",color:T.tx,fontWeight:500}}>{fmtM(r.actual)}</td><td style={{padding:"6px 10px",textAlign:"right",color:isPos?T.green:T.red,fontWeight:600}}>{r.anterior>0?fmtPct(vp):"—"}</td></tr>);})}
            <tr style={{borderTop:`2px solid ${T.border}`}}><td style={{padding:"8px 10px",color:T.tx,fontWeight:800}}>TOTAL YTD</td><td style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:700}}>{fmtM(C.acumAnterior)}</td><td style={{padding:"8px 10px",textAlign:"right",color:T.accent,fontWeight:800}}>{fmtM(C.acumActual)}</td><td style={{padding:"8px 10px",textAlign:"right",color:C.acumActual>=C.acumAnterior?T.green:T.red,fontWeight:800}}>{C.acumAnterior>0?fmtPct(pctChange(C.acumActual,C.acumAnterior)):"—"}</td></tr>
            <tr style={{background:T.amberBg}}><td style={{padding:"8px 10px",color:T.amber,fontWeight:800}}>⚡ PROYECCIÓN ANUAL ({projectionMode})</td><td style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:700}}>{fmtM(C.ventasAnoAnterior)}</td><td style={{padding:"8px 10px",textAlign:"right",color:T.amber,fontWeight:800}}>{fmtM(projection)}</td><td style={{padding:"8px 10px",textAlign:"right",color:projPct>=0?T.green:T.red,fontWeight:800}}>{fmtPct(projPct)}</td></tr>
          </tbody>
        </table>
      </div>
    </SectionCard>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
      <SectionCard title={`Participación clientes — ${mesLabel}`} icon={Users} T={T} color={T.purple}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({pct})=>`${pct}%`} labelLine={{stroke:T.txD}}>
              {pieData.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]}/>)}
            </Pie>
            <Tooltip content={<ChartTooltip T={T}/>}/>
          </PieChart>
        </ResponsiveContainer>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,justifyContent:"center"}}>
          {pieData.map((d,i)=>(<span key={i} style={{fontSize:10,color:T.txM,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:T.chart[i%T.chart.length]}}/>{d.name}</span>))}
        </div>
      </SectionCard>
      <SectionCard title="Top clientes del mes" icon={Users} T={T} color={T.accent}>
        <MiniTable T={T} headers={["#","Cliente","Monto","% Part."]} rows={(C.topClientes||[]).map((c,i)=>[i+1,c.name.length>22?c.name.slice(0,20)+"...":c.name,fmtM(c.total),C.totalMesActual>0?((c.total/C.totalMesActual)*100).toFixed(1)+"%":"0%"])}/>
      </SectionCard>
      <SectionCard title="Últimas facturas ingresadas" icon={FileText} T={T} color={T.green}>
        {(C.ultimasFacturas||[]).length > 0 ? (
          <MiniTable T={T} maxRows={5} headers={["Fecha","Folio","Cliente","Tipo","Neto"]} rows={(C.ultimasFacturas||[]).map(r => [
            r.fecha,r.folio,r.cliente.length > 20 ? r.cliente.slice(0, 18) + "..." : r.cliente,
            <span key="tipo" style={{fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4,background: String(r.tipo).toLowerCase().includes("credito") || String(r.tipo).toLowerCase().includes("crédito") ? T.redBg : T.greenBg,color: String(r.tipo).toLowerCase().includes("credito") || String(r.tipo).toLowerCase().includes("crédito") ? T.red : T.green}}>{String(r.tipo).toLowerCase().includes("credito") || String(r.tipo).toLowerCase().includes("crédito") ? "NC" : "FAC"}</span>,
            <span key="neto" style={{color: r.neto < 0 ? T.red : T.tx,fontWeight: 500}}>{fmtM(r.neto)}</span>,
          ])}/>
        ) : <p style={{fontSize:12,color:T.txM,padding:8}}>Sin facturas recientes</p>}
      </SectionCard>
    </div>
  </div>);
}


// ═════════════════════════════════════════════════════════════════════════════
// OPERACIONES / FINANZAS / LEASING / CREDITO / ALERTAS
// ═════════════════════════════════════════════════════════════════════════════

function OperacionesView({C,T}){
  const varViajes=C.viajesMesAnteriorCount>0?pctChange(C.viajesMesActual,C.viajesMesAnteriorCount):0;
  const varCorte=C.viajesCorteAnterior>0?pctChange(C.viajesCorteActual,C.viajesCorteAnterior):0;
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Operaciones</h2>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={Truck} label="Viajes mes completo" value={C.viajesMesActual?.toLocaleString("es-CL")} T={T} sub={varViajes!==0?fmtPct(varViajes)+" vs mes anterior":undefined} color={T.green} colorBg={T.greenBg}/>
      <KpiCard icon={Activity} label={`Corte al día ${C.dayOfMonth}`} value={C.viajesCorteActual?.toLocaleString("es-CL")} T={T} sub={`${C.viajesCorteAnterior} mes ant. (${fmtPct(varCorte)})`} color={varCorte>=0?T.green:T.red} colorBg={varCorte>=0?T.greenBg:T.redBg}/>
      <KpiCard icon={BarChart3} label={`Viajes ${C.lastFullDayLabel}`} value={C.viajesAyer?.toLocaleString("es-CL")} T={T} sub="Último día completo" color={T.accent} colorBg={T.accentBg}/>
      <KpiCard icon={MapPin} label="KM mes actual" value={C.kmMesActual?.toLocaleString("es-CL")} T={T} color={T.teal} colorBg={T.tealBg}/>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={Users} label="Conductores contratados" value={String(C.totalContratados||0)} T={T} color={T.accent} colorBg={T.accentBg}/>
      <KpiCard icon={Users} label="En expedición" value={String(C.totalEnExpedicion||0)} T={T} sub={`${C.pctOcupacionConductores?.toFixed(1)}% ocupación`} color={C.pctOcupacionConductores>=75?T.green:T.red} colorBg={C.pctOcupacionConductores>=75?T.greenBg:T.redBg}/>
      <KpiCard icon={Users} label="No activos" value={String(C.totalNoActivos||0)} T={T} sub="Descanso / licencia / entre turnos" color={T.amber} colorBg={T.amberBg}/>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={Truck} label="Flota tractocamiones" value={String(C.totalTractocamiones||0)} T={T} color={T.accent} colorBg={T.accentBg}/>
      <KpiCard icon={Truck} label={`Tractos activos ${C.lastFullDayLabel}`} value={String(C.tractosActivosAyer||0)} T={T} sub={`${C.pctOcupacionTractosAyer?.toFixed(1)}% ocupación`} color={C.pctOcupacionTractosAyer>=75?T.green:T.red} colorBg={C.pctOcupacionTractosAyer>=75?T.greenBg:T.redBg}/>
      <KpiCard icon={Truck} label="Promedio tractos/día" value={String(C.tractosActivosMes||0)} T={T} sub={`${C.pctOcupacionTractos?.toFixed(1)}% ocupación · ${C.diasConDatosTractos||0} días · ${C.tractosUnicosMes||0} únicos`} color={C.pctOcupacionTractos>=75?T.green:T.red} colorBg={C.pctOcupacionTractos>=75?T.greenBg:T.redBg}/>
    </div>
    <SectionCard title="Ocupación de recursos" icon={Target} T={T} color={T.accent}>
      <OccupationBar label="Conductores" activos={C.totalEnExpedicion||0} total={C.totalContratados||0} T={T}/>
      <OccupationBar label={`Tractos — ${C.lastFullDayLabel} (último día)`} activos={C.tractosActivosAyer||0} total={C.totalTractocamiones||0} T={T}/>
      <OccupationBar label={`Tractos — ${MESES_FULL[C.curMonth]} (promedio diario)`} activos={C.tractosActivosMes||0} total={C.totalTractocamiones||0} T={T}/>
      <div style={{marginTop:8,fontSize:11,color:T.txD,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={12}/> Se genera alerta cuando la ocupación baja del 75%</div>
    </SectionCard>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
      <SectionCard title="Viajes por mes" icon={BarChart3} T={T} color={T.green}><ResponsiveContainer width="100%" height={200}><BarChart data={C.viajesPorMes}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} width={40}/><Tooltip content={<ChartTooltip T={T} prefix="#"/>}/><Bar dataKey="total" fill={T.green} radius={[4,4,0,0]} name="Viajes"/></BarChart></ResponsiveContainer></SectionCard>
      <SectionCard title="Top clientes por viajes" icon={Users} T={T} color={T.accent}><MiniTable T={T} headers={["Cliente","Viajes","% Part."]} rows={(C.topClientesViajes||[]).map(c=>[c.name.length>22?c.name.slice(0,20)+"...":c.name,c.count,C.viajesMesActual>0?((c.count/C.viajesMesActual)*100).toFixed(1)+"%":"0%"])}/></SectionCard>
      <SectionCard title="Viajes por tipo de equipo" icon={Truck} T={T} color={T.purple}>{C.viajesPorEquipo?.length>0?(<ResponsiveContainer width="100%" height={200}><PieChart><Pie data={C.viajesPorEquipo} dataKey="count" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={2} label={({count})=>`${count}`} labelLine={{stroke:T.txD}}>{C.viajesPorEquipo.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]}/>)}</Pie><Tooltip content={<ChartTooltip T={T} prefix="#"/>}/></PieChart></ResponsiveContainer>):<p style={{fontSize:12,color:T.txM}}>Sin datos</p>}<div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6,justifyContent:"center"}}>{(C.viajesPorEquipo||[]).slice(0,6).map((d,i)=>(<span key={i} style={{fontSize:9,color:T.txM,display:"flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:2,background:T.chart[i%T.chart.length]}}/>{d.name}</span>))}</div></SectionCard>
    </div>
  </div>);
}

function FinanzasView({C,T}){
  const DapBadge=({label,color,bg})=>(<span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:6,background:bg,color,letterSpacing:0.3}}>{label}</span>);
  const tipoLabel={trabajo:"Trabajo",inversion:"Inversión",credito:"Crédito"};const tipoColor={trabajo:T.accent,inversion:T.green,credito:T.amber};const tipoBg={trabajo:T.accentBg,inversion:T.greenBg,credito:T.amberBg};
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Finanzas</h2>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <KpiCard icon={Building2} label="Caja total" value={fmtM(C.totalCaja)} T={T} color={T.teal} colorBg={T.tealBg}/>
      <KpiCard icon={Gauge} label="Liquidez 30d" value={C.coberturaRatio30!==null?`${C.coberturaRatio30.toFixed(2)}x`:"—"} T={T} sub={C.coberturaRatio30!==null?`${fmtM(C.liquidez30)} vs ${fmtM(C.comp30)} compromisos`:""} color={C.coberturaRatio30===null?T.txM:C.coberturaRatio30>=1.2?T.green:C.coberturaRatio30>=1?T.amber:T.red} colorBg={C.coberturaRatio30===null?T.bg3:C.coberturaRatio30>=1.2?T.greenBg:C.coberturaRatio30>=1?T.amberBg:T.redBg}
        tooltip={<div>
          <div style={{fontWeight:700,color:T.tooltipTx,marginBottom:6,fontSize:12}}>Desglose Liquidez operativa 30d</div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Caja bancaria</span><strong>{fmtM(C.totalCaja)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ DAP Trabajo (vence 30d)</span><strong>{fmtM(C.dapTrabajoVence30||0)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ Fondos mutuos</span><strong>{fmtM(C.totalFondos)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 3px",borderTop:`1px solid ${T.tooltipTx}22`,marginTop:3,fontWeight:700}}><span>= Liquidez disponible</span><strong>{fmtM(C.liquidez30)}</strong></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>÷ Compromisos 30d</span><strong>{fmtM(C.comp30)}</strong></div>
          <div style={{fontSize:10,color:T.tooltipTx,opacity:0.7,marginTop:8,lineHeight:1.4,paddingTop:6,borderTop:`1px solid ${T.tooltipTx}22`}}>
            Excluye DAP Crédito (compra terrenos) e Inversión (ahorro largo plazo).
          </div>
        </div>}
      />
      <KpiCard icon={Target} label="Inversión real" value={fmtM(C.totalInversionReal)} T={T} sub={`DAP Inv. ${fmtM(C.totalDAPInversion)} + FF.MM. ${fmtM(C.totalFondos)}`} color={T.green} colorBg={T.greenBg}/>
      <KpiCard icon={Calendar} label="Compromisos mes" value={fmtM(C.totalCompromisosMes)} T={T} sub={`Guardado: ${fmtM(C.totalGuardadoMes)}`} color={T.amber} colorBg={T.amberBg}/>
    </div>
    <SectionCard title="Depósitos a plazo — desglose por tipo" icon={PiggyBank} T={T} color={T.purple}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
        <div style={{flex:"1 1 150px",background:T.accentBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.accent}22`}}><div style={{fontSize:10,color:T.accent,fontWeight:600,marginBottom:4}}>DAP TRABAJO</div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAPTrabajo)}</div><div style={{fontSize:11,color:T.txM,marginTop:2}}>Ganancia: {fmtM(C.gananciaDAPTrabajo)}</div><div style={{fontSize:10,color:T.txD,marginTop:4}}>Capital de trabajo rotativo</div></div>
        <div style={{flex:"1 1 150px",background:T.greenBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.green}22`}}><div style={{fontSize:10,color:T.green,fontWeight:600,marginBottom:4}}>DAP INVERSIÓN</div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAPInversion)}</div><div style={{fontSize:11,color:T.txM,marginTop:2}}>Ganancia: {fmtM(C.gananciaDAPInversion)}</div><div style={{fontSize:10,color:T.txD,marginTop:4}}>Inversión a mayor plazo</div></div>
        <div style={{flex:"1 1 150px",background:T.amberBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.amber}22`}}><div style={{fontSize:10,color:T.amber,fontWeight:600,marginBottom:4}}>DAP CRÉDITO</div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAPCredito)}</div><div style={{fontSize:11,color:T.txM,marginTop:2}}>Ganancia: {fmtM(C.gananciaDAPCredito)}</div><div style={{fontSize:10,color:T.txD,marginTop:4}}>Reserva cuotas crédito Itaú</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${T.border}`}}><span style={{fontSize:13,fontWeight:600,color:T.tx}}>Total DAPs vigentes</span><span style={{fontSize:13,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAP)}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}><span style={{fontSize:12,color:T.txM}}>Ganancia total DAPs</span><span style={{fontSize:12,fontWeight:600,color:T.green}}>{fmtM(C.gananciaDAP)}</span></div>
    </SectionCard>

    <SectionCard title="Cobertura de liquidez — próximas 4 semanas" icon={Gauge} T={T} color={T.teal} action={<span style={{fontSize:10,color:T.txD,fontStyle:"italic"}}>Basado en tu calendario (columna "Falta")</span>}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Semana","Período","Caja inicial","DAPs Trab.","Compromisos","Guardado","Falta","Estado"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i<=1?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
          <tbody>
            {(C.coberturaSemanas||[]).map((s,i)=>{
              // Semáforo basado en el control manual del calendario (columna Falta)
              const estadoColor=s.compCount===0?T.txD:s.falta===0?T.green:s.falta<s.compromisos*0.2?T.amber:T.red;
              const estadoBg=s.compCount===0?"transparent":s.falta===0?T.greenBg:s.falta<s.compromisos*0.2?T.amberBg:T.redBg;
              const estadoLabel=s.compCount===0?"—":s.falta===0?"✓ Cubierto":s.falta<s.compromisos*0.2?"⚠ Por ajustar":"✗ Descubierto";
              return(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                  <td style={{padding:"9px 10px",color:T.tx,fontWeight:600}}>S{s.semana}{i===0&&<span style={{marginLeft:6,fontSize:9,padding:"2px 6px",borderRadius:4,background:T.accentBg,color:T.accent,fontWeight:700}}>ACTUAL</span>}</td>
                  <td style={{padding:"9px 10px",color:T.txM,fontSize:11}}>{s.label}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:s.cajaInicio>0?T.tx:T.txD}}>{fmtM(s.cajaInicio)}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:s.dapVence>0?T.green:T.txD,fontWeight:s.dapVence>0?600:400}}>{s.dapCount>0?`${fmtM(s.dapVence)} (${s.dapCount})`:"—"}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:T.tx,fontWeight:600}}>{s.compCount>0?`${fmtM(s.compromisos)} (${s.compCount})`:"—"}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:s.guardado>0?T.green:T.txD,fontWeight:s.guardado>0?500:400}}>{s.guardado>0?fmtM(s.guardado):"—"}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:s.falta>0?T.red:T.txD,fontWeight:s.falta>0?700:400}}>{s.falta>0?fmtM(s.falta):"—"}</td>
                  <td style={{padding:"9px 10px",textAlign:"right"}}><span style={{background:estadoBg,color:estadoColor,padding:"3px 10px",borderRadius:10,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{estadoLabel}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:10,padding:"10px 12px",background:T.bg3+"44",borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
        <strong style={{color:T.tx}}>Lectura:</strong> el estado se basa en tu control manual del calendario (columna <strong>"Falta"</strong>), no en un cálculo derivado. <span style={{color:T.green,fontWeight:600}}>✓ Cubierto</span> = falta = 0 · <span style={{color:T.amber,fontWeight:600}}>⚠ Por ajustar</span> = falta &lt; 20% compromisos · <span style={{color:T.red,fontWeight:600}}>✗ Descubierto</span> = falta ≥ 20%.
        {" "}Las columnas Caja inicial y DAPs Trabajo son referencia de de dónde viene el dinero para cubrir lo guardado.
      </div>
    </SectionCard>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
      <SectionCard title="Saldos bancarios" icon={Building2} T={T} color={T.teal}><MiniTable T={T} headers={["Banco","Saldo"]} rows={[...Object.entries(C.saldosBancos||{}).sort((a,b)=>b[1]-a[1]).map(([banco,saldo])=>[banco,fmtFull(saldo)]),["TOTAL",fmtFull(C.totalCaja)]]}/></SectionCard>
      <SectionCard title="Fondos mutuos" icon={TrendingUp} T={T} color={T.purple}><MiniTable T={T} headers={["Fondo","Admin.","Invertido","Actual","Rent. %"]} rows={(C.fondosSaldos||[]).map(r=>[r.fondo,r.admin,fmtM(r.invertido),fmtM(r.actual),r.rentPct])}/>{C.totalFondos>0&&(<div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",borderTop:`1px solid ${T.border}`,marginTop:8}}><span style={{fontSize:12,fontWeight:600,color:T.tx}}>Total FF.MM.</span><span style={{fontSize:12,fontWeight:700,color:T.tx}}>{fmtM(C.totalFondos)}</span></div>)}</SectionCard>
      <SectionCard title="DAPs — próximos vencimientos" icon={PiggyBank} T={T} color={T.accent}><MiniTable T={T} headers={["Banco","Tipo","Monto","Final","Vence","Tasa"]} rows={(C.dapProximos||[]).map(r=>[r.banco,<DapBadge key="t" label={tipoLabel[r._tipoNorm]||r.tipo} color={tipoColor[r._tipoNorm]||T.txM} bg={tipoBg[r._tipoNorm]||T.bg3}/>,fmtM(r.monto),fmtM(r.montoFinal),r.vencimiento?.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.tasa||""])}/></SectionCard>
      <SectionCard title="Compromisos próximos 7 días" icon={Calendar} T={T} color={T.amber}>{C.compromisosProx?.length>0?(<MiniTable T={T} headers={["Fecha","Concepto","Monto","Guardado","Falta"]} rows={C.compromisosProx.map(r=>[r.fecha.toLocaleDateString("es-CL",{weekday:"short",day:"2-digit",month:"short"}),r.concepto.length>25?r.concepto.slice(0,23)+"...":r.concepto,fmtM(r.monto),fmtM(r.guardado),r.falta>0?fmtM(r.falta):"Ok"])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin compromisos pendientes</p>}</SectionCard>
      <SectionCard title={`Calendario del mes — ${MESES_FULL[C.curMonth]}`} icon={Clock} T={T} color={T.accent}><MiniTable T={T} maxRows={15} headers={["Fecha","Concepto","Monto","Estado"]} rows={(C.compromisosMes||[]).sort((a,b)=>a.fecha-b.fecha).map(r=>[r.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.concepto.length>28?r.concepto.slice(0,26)+"...":r.concepto,fmtM(r.monto),r.estado||"-"])}/></SectionCard>
    </div>
  </div>);
}

function LeasingView({C,T}){
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Leasing</h2>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><KpiCard icon={Truck} label="Contratos activos" value={String(C.leasingContratosActivos)} T={T} sub={`${C.leasingTractosTotal} tractos en total`} color={T.accent} colorBg={T.accentBg}/><KpiCard icon={DollarSign} label="Cuota mensual s/IVA" value={fmtM(C.leasingTotalCuotaSinIVA)} T={T} sub={`${(C.leasingTotalUF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF`} color={T.amber} colorBg={T.amberBg}/><KpiCard icon={DollarSign} label="Cuota mensual c/IVA" value={fmtM(C.leasingTotalCuotaIVA)} T={T} color={T.red} colorBg={T.redBg}/><KpiCard icon={Banknote} label="Deuda pendiente" value={fmtM(C.leasingDeudaTotal)} T={T} color={T.red} colorBg={T.redBg}/></div>
    <SectionCard title="Distribución de cuotas por día de pago" icon={Calendar} T={T} color={T.accent}><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><div style={{flex:"1 1 150px",background:T.accentBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.accent}22`}}><div style={{fontSize:10,color:T.accent,fontWeight:600,marginBottom:4}}>DÍA 5</div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{(C.cuotaDia5UF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF</div><div style={{fontSize:11,color:T.txM,marginTop:2}}>{C.leasingDet?.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===5).length||0} contratos</div></div><div style={{flex:"1 1 150px",background:T.amberBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.amber}22`}}><div style={{fontSize:10,color:T.amber,fontWeight:600,marginBottom:4}}>DÍA 15</div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{(C.cuotaDia15UF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF</div><div style={{fontSize:11,color:T.txM,marginTop:2}}>{C.leasingDet?.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===15).length||0} contratos</div></div><div style={{flex:"1 1 150px",background:T.redBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.red}22`}}><div style={{fontSize:10,color:T.red,fontWeight:600,marginBottom:4}}>TOTAL MENSUAL</div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{(C.leasingTotalUF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF</div><div style={{fontSize:11,color:T.txM,marginTop:2}}>c/IVA: {fmtM(C.leasingTotalCuotaIVA)}</div></div></div></SectionCard>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
      <SectionCard title="Cartera por emisor" icon={Building2} T={T} color={T.accent}><MiniTable T={T} headers={["Emisor","Contratos","Tractos","Cuota c/IVA","Deuda"]} rows={[...(C.leasingEmisores||[]).map(e=>[e.emisor,e.contratos,e.tractos,fmtM(e.cuotaIVA),fmtM(e.deudaCLP)]),["TOTAL",C.leasingContratosActivos,C.leasingTractosTotal,fmtM(C.leasingTotalCuotaIVA),fmtM(C.leasingDeudaTotal)]]}/></SectionCard>
      <SectionCard title="Próximas cuotas a pagar" icon={Clock} T={T} color={T.amber}>{C.leasingProxCuotas?.length>0?(<MiniTable T={T} headers={["Fecha","Días","CLP c/IVA","Bancos","Estado"]} rows={C.leasingProxCuotas.map(r=>[r.fecha,r.dias,fmtM(r.cuotaIVA),r.bancos,<span key="e" style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:r.estado==="URGENTE"?T.redBg:T.greenBg,color:r.estado==="URGENTE"?T.red:T.green}}>{r.estado}</span>])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin cuotas próximas cargadas</p>}</SectionCard>
    </div>
    <SectionCard title="Proyección mensual — cuándo baja la cuota" icon={TrendingDown} T={T} color={T.green}>{C.leasingProyeccion?.length>0?(<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Mes","Año","Cuota UF","CLP s/IVA","CLP c/IVA","Contratos","Vence","Ahorro UF"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",fontSize:11}}>{h}</th>))}</tr></thead><tbody>{C.leasingProyeccion.map((r,ri)=>{const hasVence=r.vence&&r.vence.length>0;const hasAhorro=r.ahorroUF>0;return(<tr key={ri} style={{borderBottom:`1px solid ${T.border}22`,background:hasVence?T.greenBg:"transparent"}}><td style={{padding:"7px 10px",color:T.tx,fontWeight:hasVence?600:400}}>{r.mes}</td><td style={{padding:"7px 10px",textAlign:"right",color:T.txM}}>{r.anio}</td><td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontFamily:"monospace"}}>{r.cuotaUF?.toLocaleString("es-CL",{maximumFractionDigits:0})}</td><td style={{padding:"7px 10px",textAlign:"right",color:T.tx}}>{fmtM(r.cuotaCLP)}</td><td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontWeight:500}}>{fmtM(r.cuotaIVA)}</td><td style={{padding:"7px 10px",textAlign:"right",color:T.txM}}>{r.contratos}</td><td style={{padding:"7px 10px",textAlign:"right",color:hasVence?T.green:T.txD,fontWeight:hasVence?600:400,fontSize:11}}>{r.vence||"—"}</td><td style={{padding:"7px 10px",textAlign:"right",color:hasAhorro?T.green:T.txD,fontWeight:hasAhorro?600:400}}>{hasAhorro?`${r.ahorroUF.toLocaleString("es-CL",{maximumFractionDigits:0})} UF`:"—"}</td></tr>);})}</tbody></table></div>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin proyección disponible</p>}</SectionCard>
    <SectionCard title="Detalle de contratos activos" icon={Truck} T={T}><MiniTable T={T} maxRows={15} headers={["ID","Banco","Tractos","Cuota UF","Día","Inicio","Vence","Pagadas","Restantes"]} rows={(C.leasingDet||[]).map(r=>[r.ID||r.id,r["Banco / Emisor"]||r.Banco||r.banco,r["N Tractos"]||r.Tractos,r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]||"",r["Dia Vcto"]||r.DiaVcto,r["Fecha Inicio"]||r.FechaInicio||"",r["Fecha Fin\n(Vencimiento)"]||r["Fecha Fin (Vencimiento)"]||r["Fecha Fin"]||"",r["Cuotas\nPagadas"]||r["Cuotas Pagadas"]||"",r["Cuotas Por\nPagar"]||r["Cuotas Por Pagar"]||""])}/></SectionCard>
  </div>);
}

function CreditoView({C,T}){
  const proxFecha=C.creditoProxima?parseDate(C.creditoProxima.fecha):null;const proxLabel=proxFecha?proxFecha.toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}):"—";
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Crédito comercial — Banco Itaú</h2>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><KpiCard icon={Banknote} label="Deuda total pendiente" value={fmtM(C.creditoDeudaTotal)} T={T} sub={`Capital ${fmtM(C.creditoSaldoActual)} + Intereses ${fmtM(C.creditoInteresesPendientes)}`} color={T.red} colorBg={T.redBg}/><KpiCard icon={DollarSign} label="Cuota mensual" value={fmtM(C.creditoValorCuota)} T={T} sub={`${C.creditoTotalCuotas} cuotas totales`} color={T.amber} colorBg={T.amberBg}/><KpiCard icon={Calendar} label="Próximo pago" value={proxLabel} T={T} sub={C.creditoProxima?`Cuota #${C.creditoProxima.cuota} · Capital ${fmtM(C.creditoProxima.capital)} + Interés ${fmtM(C.creditoProxima.interes)}`:"En período de gracia"} color={T.accent} colorBg={T.accentBg}/><KpiCard icon={Target} label="Avance" value={`${C.creditoCuotasPagadas}/${C.creditoTotalCuotas}`} T={T} sub={`${C.creditoCuotasPorPagar} cuotas restantes`} color={T.green} colorBg={T.greenBg}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
      <SectionCard title="Resumen del crédito" icon={CreditCard} T={T} color={T.accent}><div style={{display:"flex",flexDirection:"column",gap:8}}>{[["Monto original",fmtFull(5000000000)],["Plazo","60 cuotas (58 meses + 2 gracia)"],["Cuota mensual",fmtFull(C.creditoValorCuota)],["Cuotas pagadas",String(C.creditoCuotasPagadas)],["Cuotas restantes",String(C.creditoCuotasPorPagar)],["Saldo insoluto (capital)",fmtFull(C.creditoSaldoActual)],["Intereses pendientes",fmtM(C.creditoInteresesPendientes)],["Deuda total (cap+int)",fmtM(C.creditoDeudaTotal)],["Total intereses del crédito",fmtM(C.creditoTotalIntereses)]].map(([label,val],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<8?`1px solid ${T.border}22`:"none"}}><span style={{fontSize:12,color:T.txM}}>{label}</span><span style={{fontSize:12,fontWeight:500,color:T.tx}}>{val}</span></div>))}</div></SectionCard>
      <SectionCard title="Próximas cuotas" icon={Clock} T={T} color={T.amber}><MiniTable T={T} maxRows={6} headers={["#","Fecha","Capital","Interés","Cuota","Saldo"]} rows={(C.creditoRows||[]).filter(r=>{const fd=parseDate(r.fecha);return fd&&fd>=new Date()&&r.valorCuota>0;}).slice(0,6).map(r=>[r.cuota,r.fecha,fmtM(r.capital),fmtM(r.interes),fmtM(r.valorCuota),fmtM(r.saldo)])}/></SectionCard>
      <SectionCard title="Evolución del saldo" icon={TrendingDown} T={T} color={T.green}>{C.creditoRows?.length>0?(<ResponsiveContainer width="100%" height={200}><AreaChart data={(C.creditoRows||[]).filter(r=>r.saldo>0).map(r=>({cuota:`#${r.cuota}`,saldo:r.saldo}))}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="cuota" tick={{fill:T.txM,fontSize:9}} axisLine={false} tickLine={false} interval={9}/><YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>fmtM(v)} width={55}/><Tooltip content={<ChartTooltip T={T}/>}/><Area type="monotone" dataKey="saldo" stroke={T.red} fill={T.redBg} name="Saldo"/></AreaChart></ResponsiveContainer>):<p style={{fontSize:12,color:T.txM}}>Sin datos</p>}</SectionCard>
    </div>
  </div>);
}

function AlertasView({C,T}){
  const typeStyle={danger:{bg:T.redBg,border:T.red,color:T.red},warning:{bg:T.amberBg,border:T.amber,color:T.amber},info:{bg:T.accentBg,border:T.accent,color:T.accent}};
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Alertas</h2>
    {C.alertas?.length===0&&(<div style={{background:T.greenBg,border:`1px solid ${T.green}33`,borderRadius:12,padding:20,textAlign:"center"}}><span style={{fontSize:14,color:T.green,fontWeight:600}}>Todo en orden — sin alertas activas</span></div>)}
    {(C.alertas||[]).map((a,i)=>{const s=typeStyle[a.type]||typeStyle.info;return(<div key={i} style={{background:s.bg,border:`1px solid ${s.border}33`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:12}}><div style={{background:s.border+"22",borderRadius:8,padding:6,display:"flex",flexShrink:0}}><a.icon size={16} color={s.color}/></div><div><span style={{fontSize:10,fontWeight:600,color:s.color,textTransform:"uppercase",letterSpacing:0.5}}>{a.type==="danger"?"Crítico":a.type==="warning"?"Atención":"Info"}</span><p style={{fontSize:13,color:T.tx,marginTop:2,lineHeight:1.4}}>{a.msg}</p></div></div>);})}
  </div>);
}
