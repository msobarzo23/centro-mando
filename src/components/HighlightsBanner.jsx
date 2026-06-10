import { Sparkles, Zap, Truck, Users, Calendar, TrendingUp, TrendingDown, PiggyBank, Gauge } from "lucide-react";
import { fmtM, fmtPct, pctChange } from "../utils.js";

function computeHighlights(C) {
  const items = [];
  const now = new Date();

  if (C.pctOcupacionTractos > 0 && C.pctOcupacionTractos < 75) {
    items.push({ score:95, type:"danger", icon:Truck, title:"Ocupación de flota crítica", text:`Solo ${C.pctOcupacionTractos.toFixed(1)}% en operación (${C.tractosEnOperacion} de ${C.totalTractocamiones} tractos, últimos ${C.ventanaUtilDias||7} días) — meta >75%` });
  }
  if (C.pctOcupacionConductores > 0 && C.pctOcupacionConductores < 75) {
    items.push({ score:90, type:"danger", icon:Users, title:"Ocupación de conductores baja", text:`${C.pctOcupacionConductores.toFixed(1)}% en expedición (${C.totalEnExpedicion} de ${C.totalContratados})` });
  }

  (C.compromisosProx||[]).forEach(r => {
    const dias = Math.ceil((r.fecha - now) / 86400000);
    if (r.falta > 0 && r.monto > 50000000) {
      items.push({ score:85, type:"warning", icon:Calendar, title:`Pago grande en ${dias} día${dias!==1?"s":""}`, text:`${r.concepto.slice(0,50)}: ${fmtM(r.monto)} — falta ${fmtM(r.falta)}` });
    } else if (r.monto > 100000000 && dias <= 3) {
      items.push({ score:70, type:"info", icon:Calendar, title:`${r.concepto.slice(0,40)} próximo`, text:`${fmtM(r.monto)} el ${r.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"})} — ya cubierto` });
    }
  });

  if (C.acumCorteAnterior > 0) {
    const varCorte = pctChange(C.acumCorteActual, C.acumCorteAnterior);
    if (Math.abs(varCorte) >= 10) {
      items.push({ score:varCorte<0?80:65, type:varCorte<0?"warning":"success", icon:varCorte>0?TrendingUp:TrendingDown, title:varCorte<0?"Brecha de ventas vs año anterior":"Crecimiento de ventas vs año anterior", text:`Acumulado al ${now.getDate()}/${now.getMonth()+1}: ${fmtM(C.acumCorteActual)} vs ${fmtM(C.acumCorteAnterior)} en ${C.prevYear} (${fmtPct(varCorte)})` });
    }
  }

  (C.dapProximos||[]).slice(0, 2).forEach(r => {
    if (r.monto > 200000000) {
      const dias = Math.ceil((r.vencimiento - now) / 86400000);
      if (dias <= 10) {
        items.push({ score:60, type:"info", icon:PiggyBank, title:`DAP ${r.banco} vence en ${dias}d`, text:`${fmtM(r.monto)} al ${r.tasa||"—"} — ${r.vencimiento.toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}` });
      }
    }
  });

  if (C.topClientes?.length > 0) {
    const top = C.topClientes[0];
    if (top.total > 300000000) {
      items.push({ score:45, type:"info", icon:Users, title:"Cliente principal del mes", text:`${top.name.slice(0,35)} — ${fmtM(top.total)} (${((top.total/C.totalMesActual)*100).toFixed(1)}% del mes)` });
    }
  }

  if (C.viajesAyer > 0 && C.viajesPorMes) {
    const promDiario = C.viajesMesActual / C.dayOfMonth;
    if (C.viajesAyer < promDiario * 0.7) {
      items.push({ score:75, type:"warning", icon:TrendingDown, title:`Viajes bajos en ${C.lastFullDayLabel}`, text:`${C.viajesAyer} viajes vs promedio diario de ${Math.round(promDiario)} del mes` });
    }
  }

  if (C.mepcoActivo && C.impactoMepcoMes > 0) {
    items.push({ score:70, type:"success", icon:Zap, title:"Impacto MEPCO en facturación del mes", text:`+${fmtM(C.impactoMepcoMes)} atribuible al reajuste tarifario (calculado por factura)` });
  }

  if (C.primeraSemanaCritica) {
    const faltante = C.primeraSemanaCritica.falta;
    const esta = C.primeraSemanaCritica.semana;
    items.push({ score:esta===1?95:esta===2?85:75, type:esta===1?"danger":"warning", icon:Gauge, title:`Semana ${esta} con compromisos sin cubrir (${C.primeraSemanaCritica.label})`, text:`Faltan ${fmtM(faltante)} según calendario. Compromisos ${fmtM(C.primeraSemanaCritica.compromisos)} · Guardado ${fmtM(C.primeraSemanaCritica.guardado||0)}` });
  }

  if (C.projections?.seasonal > 0 && C.proyAnualPorViajes > 0) {
    const divPct = Math.abs(C.proyAnualPorViajes - C.projections.seasonal) / C.projections.seasonal * 100;
    if (divPct > 15) {
      const viajesMayor = C.proyAnualPorViajes > C.projections.seasonal;
      items.push({ score:68, type:"info", icon:Sparkles, title:"Proyecciones divergentes — revisar", text:`Estacional: ${fmtM(C.projections.seasonal)} vs Basada en viajes: ${fmtM(C.proyAnualPorViajes)} (${divPct.toFixed(0)}% diferencia — ${viajesMayor?"viajes anticipan mejor cierre":"viajes sugieren desaceleración"})` });
    }
  }

  return items.sort((a, b) => b.score - a.score).slice(0, 3);
}

export default function HighlightsBanner({ C, T }) {
  const highlights = computeHighlights(C);
  if (highlights.length === 0) return null;
  const styleByType = {
    danger: { bg:`linear-gradient(135deg, ${T.red}18, ${T.red}06)`, border:T.red, iconBg:`${T.red}22` },
    warning: { bg:`linear-gradient(135deg, ${T.amber}14, ${T.amber}04)`, border:T.amber, iconBg:`${T.amber}22` },
    success: { bg:`linear-gradient(135deg, ${T.green}14, ${T.green}04)`, border:T.green, iconBg:`${T.green}22` },
    info: { bg:`linear-gradient(135deg, ${T.accent}14, ${T.accent}04)`, border:T.accent, iconBg:`${T.accent}22` },
  };
  return (
    <div style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <Sparkles size={14} color={T.violet}/>
        <span style={{fontSize:12,fontWeight:700,color:T.tx,letterSpacing:0.3}}>Hoy destaca</span>
        <span style={{fontSize:11,color:T.txD,fontStyle:"italic"}}>ordenado por relevancia</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {highlights.map((h, i) => {
          const s = styleByType[h.type];
          return (
            <div key={i} style={{background:s.bg,border:`1px solid ${s.border}33`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{background:s.iconBg,borderRadius:6,padding:5,display:"flex",flexShrink:0}}><h.icon size={14} color={s.border}/></div>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:T.tx,marginBottom:2}}>{h.title}</div>
                <div style={{fontSize:11,color:T.txM,lineHeight:1.4}}>{h.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
