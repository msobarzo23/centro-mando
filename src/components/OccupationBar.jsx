import { occColor } from "../utils.js";

export default function OccupationBar({ label, activos, total, T }) {
  const pct = total > 0 ? (activos / total) * 100 : 0;
  const barColor = occColor(pct, T);
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:12,color:T.txM}}>{label}</span>
        <span style={{fontSize:12,fontWeight:600,color:barColor}}>{activos} / {total} ({pct.toFixed(1)}%)</span>
      </div>
      <div style={{height:8,borderRadius:4,background:T.bg3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(pct,100)}%`,borderRadius:4,background:barColor,transition:"width 0.5s"}}/>
      </div>
    </div>
  );
}
