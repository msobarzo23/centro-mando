import { CircleDot, ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { fmtPct, pctChange } from "../utils.js";

function computeSemaforo(C) {
  const signals = [];

  if (C.coberturaRatio30 !== null) {
    const r = C.coberturaRatio30;
    let s;
    if (r >= 1.2) s = { level:"verde", text:`Liquidez 30d ${r.toFixed(2)}x` };
    else if (r >= 1.0) s = { level:"amarillo", text:`Liquidez 30d ${r.toFixed(2)}x` };
    else s = { level:"rojo", text:`Liquidez 30d ${r.toFixed(2)}x` };
    signals.push(s);
  }

  if (C.acumCorteAnterior > 0) {
    const varPct = pctChange(C.acumCorteActual, C.acumCorteAnterior);
    let s;
    if (varPct >= 0) s = { level:"verde", text:`Ventas ${fmtPct(varPct)} vs ${C.prevYear}` };
    else if (varPct >= -10) s = { level:"amarillo", text:`Ventas ${fmtPct(varPct)} vs ${C.prevYear}` };
    else s = { level:"rojo", text:`Ventas ${fmtPct(varPct)} vs ${C.prevYear}` };
    signals.push(s);
  }

  if (C.pctOcupacionTractos > 0) {
    let s;
    if (C.pctOcupacionTractos >= 85) s = { level:"verde", text:`Flota al ${C.pctOcupacionTractos.toFixed(0)}%` };
    else if (C.pctOcupacionTractos >= 75) s = { level:"amarillo", text:`Flota al ${C.pctOcupacionTractos.toFixed(0)}%` };
    else s = { level:"rojo", text:`Flota al ${C.pctOcupacionTractos.toFixed(0)}%` };
    signals.push(s);
  }

  const levels = signals.map(s => s.level);
  let global = "verde";
  if (levels.includes("rojo")) global = "rojo";
  else if (levels.includes("amarillo")) global = "amarillo";

  const labels = { verde:"Todo en orden", amarillo:"Requiere atención", rojo:"Acción urgente" };
  return { global, signals, label:labels[global] };
}

export default function SemaforoEjecutivo({ C, T }) {
  const sem = computeSemaforo(C);
  if (sem.signals.length === 0) return null;
  const colorMap = {
    verde: { c:T.green, bg:T.greenBg, icon:ShieldCheck },
    amarillo: { c:T.amber, bg:T.amberBg, icon:Shield },
    rojo: { c:T.red, bg:T.redBg, icon:ShieldAlert },
  };
  const g = colorMap[sem.global];
  const Icon = g.icon;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:g.bg,border:`1px solid ${g.c}33`,minWidth:0}}>
      <Icon size={20} color={g.c} style={{flexShrink:0}}/>
      <div style={{minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color:g.c,letterSpacing:0.3}}>{sem.label}</div>
        <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
          {sem.signals.map((s, i) => {
            const sc = colorMap[s.level];
            return (
              <span key={i} style={{fontSize:10,color:T.txM,display:"flex",alignItems:"center",gap:4}}>
                <CircleDot size={8} color={sc.c}/>{s.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
