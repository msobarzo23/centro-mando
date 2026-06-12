import { useState } from "react";
import { Zap } from "lucide-react";
import { MEPCO_ADJUSTMENT_MONTH, MEPCO_REAJUSTES_SIMPLE, MEPCO_REAJUSTES_ESPECIALES, MEPCO_REEMBOLSO_DIESEL } from "../data/mepcoReajustes.js";

export default function MepcoBanner({ T, year, lastMonth, compact = false, projections }) {
  const [expanded, setExpanded] = useState(false);
  const adjustmentActive = year > 2026 || (year === 2026 && lastMonth >= MEPCO_ADJUSTMENT_MONTH);
  const upliftTeo = projections?.upliftTeoricoPromedio || 0;
  const upliftApl = projections?.upliftAplicadoPromedio || 0;
  const upliftObs = projections?.upliftObservado; // null hasta cerrar el 1er mes post-reajuste
  const pct = (v) => (v * 100).toFixed(1);
  // ¿El observado está limitando al teórico? (proyección prudente)
  const upliftAcotado = upliftTeo > 0 && upliftObs != null && upliftApl < upliftTeo;
  const totalClientesMapa = Object.keys(MEPCO_REAJUSTES_SIMPLE).length
    + Object.keys(MEPCO_REAJUSTES_ESPECIALES).length
    + MEPCO_REEMBOLSO_DIESEL.size;

  return (
    <div style={{background:`linear-gradient(135deg, ${T.amber}18, ${T.amber}06)`,border:`1px solid ${T.amber}55`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"flex-start",gap:12,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:T.amber}}/>
      <div style={{background:`${T.amber}22`,borderRadius:8,padding:6,display:"flex",flexShrink:0}}><Zap size={16} color={T.amber}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
          <span style={{fontWeight:700,color:T.tx,fontSize:12}}>Ajuste Extraordinario de Tarifas Post-MEPCO</span>
          <span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:999,background:adjustmentActive?`${T.green}22`:`${T.amber}22`,color:adjustmentActive?T.green:T.amber,letterSpacing:0.4}}>
            {adjustmentActive ? "● VIGENTE" : "○ DESDE MAYO 2026"}
          </span>
          {upliftTeo > 0 && (
            <span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:999,background:`${T.violet}22`,color:T.violet,letterSpacing:0.4}}>
              {upliftAcotado
                ? `proyección +${pct(upliftApl)}% · teórico +${pct(upliftTeo)}%`
                : `+${pct(upliftApl)}% incluido en proyección`}
            </span>
          )}
        </div>
        <div style={{color:T.txM,fontSize:11,lineHeight:1.5}}>
          {compact
            ? <>Desde mayo 2026 aplica ajuste tarifario a {totalClientesMapa} clientes. {upliftAcotado ? `La proyección usa el uplift observado en facturación (+${pct(upliftApl)}%), no el teórico (+${pct(upliftTeo)}%).` : upliftTeo > 0 ? "Uplift incorporado en proyección anual." : "Se incorporará al activarse."} <button onClick={() => setExpanded(!expanded)} style={{background:"transparent",border:"none",color:T.amber,fontWeight:600,cursor:"pointer",fontSize:11,padding:0}}>{expanded ? "▲ Ocultar" : "▼ Ver más"}</button></>
            : <>Desde mayo 2026 aplica ajuste extraordinario de tarifas a {totalClientesMapa} clientes (Enaex, Maxam, CBB, Yura, Famesa, Orica, entre otros), como respuesta al alza del PBASE de diésel.{upliftAcotado ? ` El alza teórica del mix de clientes es +${pct(upliftTeo)}%, pero la facturación de los meses ya cerrados post-reajuste muestra +${pct(Math.max(0, upliftObs))}% efectivo — la proyección anual usa el menor de los dos (+${pct(upliftApl)}%) para no proyectar alzas que aún no aparecen en la facturación.` : upliftTeo > 0 ? " El uplift está incorporado en la proyección anual y el KPI «Impacto MEPCO» refleja el monto atribuible al reajuste." : " El uplift se incorporará automáticamente al activarse."} <button onClick={() => setExpanded(!expanded)} style={{background:"transparent",border:"none",color:T.amber,fontWeight:600,cursor:"pointer",fontSize:11,padding:0}}>{expanded ? "▲ Ocultar" : "▼ Ver más"}</button></>
          }
        </div>
        {expanded && (
          <div style={{marginTop:8,padding:"10px 12px",background:`${T.bg3}66`,borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
            <div style={{color:T.tx,fontWeight:600,marginBottom:4}}>Cómo se aplica:</div>
            <div>• <b>Datos reales</b>: las facturas desde mayo ya vienen con tarifa nueva — no se modifican.</div>
            <div>• <b>Proyección estacional</b>: a los meses no facturados les aplica el MENOR entre el uplift teórico (mix de clientes) y el observado en los meses ya cerrados post-reajuste — prudente, se ajusta solo al cerrar cada mes.</div>
            <div>• <b>KPI Impacto MEPCO</b>: calcula el monto atribuible al reajuste por cada factura post-mayo (neto × pct/(1+pct)).</div>
            <div>• <b>Casos especiales</b>: DYNO Nobel, MAXAM Nacional y Orica con transición mes a mes hasta entrar a su polinomio de contrato.</div>
          </div>
        )}
      </div>
    </div>
  );
}
