export default function AlertasView({ C, T }) {
  const typeStyle = {
    danger: { bg:T.redBg, border:T.red, color:T.red },
    warning: { bg:T.amberBg, border:T.amber, color:T.amber },
    info: { bg:T.accentBg, border:T.accent, color:T.accent },
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Alertas</h2>

      {C.alertas?.length===0&&(
        <div style={{background:T.greenBg,border:`1px solid ${T.green}33`,borderRadius:12,padding:20,textAlign:"center"}}>
          <span style={{fontSize:14,color:T.green,fontWeight:600}}>Todo en orden — sin alertas activas</span>
        </div>
      )}

      {(C.alertas||[]).map((a,i)=>{
        const s = typeStyle[a.type] || typeStyle.info;
        return (
          <div key={i} style={{background:s.bg,border:`1px solid ${s.border}33`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{background:s.border+"22",borderRadius:8,padding:6,display:"flex",flexShrink:0}}><a.icon size={16} color={s.color}/></div>
            <div>
              <span style={{fontSize:10,fontWeight:600,color:s.color,textTransform:"uppercase",letterSpacing:0.5}}>
                {a.type==="danger"?"Crítico":a.type==="warning"?"Atención":"Info"}
              </span>
              <p style={{fontSize:13,color:T.tx,marginTop:2,lineHeight:1.4}}>{a.msg}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
