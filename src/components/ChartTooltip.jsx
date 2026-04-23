import { fmtM } from "../utils.js";

export default function ChartTooltip({ active, payload, label, T, prefix = "$" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:T.tooltipBg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>
      <div style={{color:T.tooltipTx,fontWeight:600,marginBottom:4}}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{color:p.color,display:"flex",gap:8}}>
          <span>{p.name}:</span>
          <span style={{fontWeight:600}}>{prefix==="$" ? fmtM(p.value) : p.value?.toLocaleString("es-CL")}</span>
        </div>
      ))}
    </div>
  );
}
