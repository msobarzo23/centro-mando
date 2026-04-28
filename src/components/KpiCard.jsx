import { useState } from "react";
import Sparkline from "./Sparkline.jsx";

export default function KpiCard({ icon:Icon, label, value, sub, color, colorBg, T, badge, tooltip, trend, trendLabel }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{background:T.card,borderRadius:14,padding:"16px 18px",border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:8,minWidth:0,flex:"1 1 160px",position:"relative",overflow:"visible",cursor:tooltip?"help":"default"}}
    >
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg, ${color}, transparent 70%)`,borderRadius:"14px 14px 0 0"}}/>
      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{background:colorBg,borderRadius:8,padding:6,display:"flex"}}><Icon size={16} color={color}/></div>
          <span style={{fontSize:11,color:T.txM,fontWeight:500,letterSpacing:0.3,display:"flex",alignItems:"center",gap:4}}>
            {label}{tooltip&&<span style={{fontSize:10,color:T.txD,marginLeft:2}}>ⓘ</span>}
          </span>
        </div>
        {badge&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:999,background:colorBg,color,letterSpacing:0.5}}>{badge}</span>}
      </div>
      <div style={{fontSize:22,fontWeight:700,color:T.tx,letterSpacing:-0.5}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:sub.startsWith("+")?T.green:sub.startsWith("-")?T.red:T.txM}}>{sub}</div>}
      {trend&&trend.length>=2&&(
        <div style={{marginTop:2}}>
          <Sparkline data={trend} color={color} T={T}/>
          {trendLabel&&<div style={{fontSize:9,color:T.txD,marginTop:2,letterSpacing:0.3,textTransform:"uppercase",fontWeight:600}}>{trendLabel}</div>}
        </div>
      )}
      {tooltip&&hover&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:6,background:T.tooltipBg,border:`1px solid ${color}55`,borderRadius:10,padding:"12px 14px",fontSize:11,color:T.tooltipTx,lineHeight:1.5,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",minWidth:260}}>
          {tooltip}
        </div>
      )}
    </div>
  );
}
