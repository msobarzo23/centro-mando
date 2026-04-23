import { useState } from "react";
import { Zap } from "lucide-react";
import { MEPCO_ADJUSTMENT_MONTH, MEPCO_CLIENTS_VISIBLE } from "../constants.js";

export default function MepcoBanner({ T, year, lastMonth, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const adjustmentActive = year > 2026 || (year === 2026 && lastMonth >= MEPCO_ADJUSTMENT_MONTH);
  return (
    <div style={{background:`linear-gradient(135deg, ${T.amber}18, ${T.amber}06)`,border:`1px solid ${T.amber}55`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"flex-start",gap:12,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:T.amber}}/>
      <div style={{background:`${T.amber}22`,borderRadius:8,padding:6,display:"flex",flexShrink:0}}><Zap size={16} color={T.amber}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
          <span style={{fontWeight:700,color:T.tx,fontSize:12}}>Ajuste Extraordinario de Tarifas Post-MEPCO</span>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:999,background:adjustmentActive?`${T.green}22`:`${T.amber}22`,color:adjustmentActive?T.green:T.amber,letterSpacing:0.4}}>
            {adjustmentActive ? "● VIGENTE" : "○ DESDE MAYO 2026"}
          </span>
        </div>
        <div style={{color:T.txM,fontSize:11,lineHeight:1.5}}>
          {compact
            ? <>Desde mayo 2026 aplica ajuste tarifario a múltiples clientes. Impacto progresivo en facturación. <button onClick={() => setExpanded(!expanded)} style={{background:"transparent",border:"none",color:T.amber,fontWeight:600,cursor:"pointer",fontSize:11,padding:0}}>{expanded ? "▲ Ocultar" : "▼ Ver más"}</button></>
            : <>Desde mayo 2026 aplica ajuste extraordinario de tarifas a múltiples clientes (Calidra, CBB, Novandino Litio, Enaex, Maxam, Orica, entre otros) en distintos porcentajes, como respuesta al alza del PBASE de diésel. El impacto se reflejará progresivamente en la facturación a partir de mayo. <button onClick={() => setExpanded(!expanded)} style={{background:"transparent",border:"none",color:T.amber,fontWeight:600,cursor:"pointer",fontSize:11,padding:0}}>{expanded ? "▲ Ocultar" : "▼ Ver más"}</button></>
          }
        </div>
        {expanded && (
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
