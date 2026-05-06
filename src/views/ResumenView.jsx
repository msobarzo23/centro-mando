import { TrendingUp, TrendingDown, AlertTriangle, Calendar, PiggyBank, CreditCard, Truck, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { fmtM, fmtPct, pctChange, getSaludo, getFechaLarga } from "../utils.js";
import { MESES } from "../constants.js";

function BigStat({ T, label, value, sub, color, icon:Icon }) {
  return (
    <div style={{flex:"1 1 220px",minWidth:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:color,opacity:0.7}}/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        {Icon && <Icon size={16} color={color}/>}
        <span style={{fontSize:11,color:T.txM,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{fontSize:30,fontWeight:800,color:T.tx,letterSpacing:-1,lineHeight:1.1}}>{value}</div>
      {sub && <div style={{fontSize:12,color:T.txM,marginTop:6}}>{sub}</div>}
    </div>
  );
}

export default function ResumenView({ C, T, setTab }) {
  const saludo = getSaludo();
  const fecha = getFechaLarga();

  const margen = C.margenMesEstimadoCaja || 0;
  const margenPositivo = margen >= 0;
  const varVentas = C.totalMesAnterior > 0 ? pctChange(C.totalMesActual, C.totalMesAnterior) : null;
  const mesAnt = C.curMonth === 0 ? 11 : C.curMonth - 1;

  const alertas = (C.alertas || []);
  const danger = alertas.filter(a => a.type === "danger");
  const warning = alertas.filter(a => a.type === "warning");
  const topAlertas = [...danger, ...warning].slice(0, 5);

  const compromisos7d = C.compromisosProx || [];
  const totalComp7d = C.totalCompromisosProx || 0;
  const compromisosConFalta = compromisos7d.filter(r => (r.falta || 0) > 0);

  const dapProx = (C.dapProximos || []).slice(0, 3);
  const proxLeasing = (C.leasingProxCuotas || [])[0];
  const proxCredito = C.creditoProxima;

  const semaforoLiquidez = C.coberturaRatio30 === null ? null : C.coberturaRatio30 >= 1.2 ? "verde" : C.coberturaRatio30 >= 1 ? "amarillo" : "rojo";
  const semaforoColor = semaforoLiquidez === "verde" ? T.green : semaforoLiquidez === "amarillo" ? T.amber : semaforoLiquidez === "rojo" ? T.red : T.txM;
  const semaforoLabel = semaforoLiquidez === "verde" ? "Liquidez sana" : semaforoLiquidez === "amarillo" ? "Liquidez ajustada" : semaforoLiquidez === "rojo" ? "Liquidez crítica" : "Sin compromisos";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:22,maxWidth:900,margin:"0 auto"}}>
      <div style={{textAlign:"center",padding:"4px 0 8px"}}>
        <div style={{fontSize:12,color:T.txD,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Resumen del día</div>
        <h1 style={{fontSize:28,fontWeight:800,color:T.tx,margin:"4px 0 4px",letterSpacing:-0.8}}>{saludo}, Don Luis</h1>
        <p style={{fontSize:13,color:T.txM,textTransform:"capitalize",margin:0}}>{fecha}</p>
      </div>

      <section>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"0 4px"}}>
          <div style={{width:28,height:28,borderRadius:8,background:margenPositivo?T.greenBg:T.redBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {margenPositivo ? <TrendingUp size={15} color={T.green}/> : <TrendingDown size={15} color={T.red}/>}
          </div>
          <h2 style={{fontSize:16,fontWeight:700,color:T.tx,margin:0,letterSpacing:-0.3}}>¿Estamos ganando plata?</h2>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <BigStat T={T} label="Margen estimado mes" value={fmtM(margen)} sub={`Fact. ${MESES[mesAnt]||"mes ant."} ${fmtM(C.totalMesAnteriorBruto)} c/IVA − egresos ${MESES[C.curMonth]||""}`} color={margenPositivo?T.green:T.red} icon={margenPositivo?TrendingUp:TrendingDown}/>
          <BigStat T={T} label={`Facturación ${MESES[C.curMonth]||""}`} value={fmtM(C.totalMesActual)} sub={varVentas!==null?`${fmtPct(varVentas)} vs ${MESES[C.curMonth===0?11:C.curMonth-1]||"mes ant."}`:"Sin comparativa"} color={T.accent}/>
          <BigStat T={T} label={semaforoLabel} value={C.coberturaRatio30!==null?`${C.coberturaRatio30.toFixed(2)}x`:"—"} sub={C.coberturaRatio30!==null?`${fmtM(C.liquidez30)} cubre ${fmtM(C.comp30)} a 30d`:"Sin compromisos en 30d"} color={semaforoColor}/>
        </div>
      </section>

      <section>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"0 4px"}}>
          <div style={{width:28,height:28,borderRadius:8,background:topAlertas.length>0?T.redBg:T.greenBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {topAlertas.length>0 ? <AlertTriangle size={15} color={T.red}/> : <CheckCircle2 size={15} color={T.green}/>}
          </div>
          <h2 style={{fontSize:16,fontWeight:700,color:T.tx,margin:0,letterSpacing:-0.3}}>¿Hay algo urgente?</h2>
          {alertas.length>0 && <span style={{marginLeft:"auto",fontSize:11,color:T.txM,fontWeight:600}}>{alertas.length} alerta{alertas.length!==1?"s":""} activa{alertas.length!==1?"s":""}</span>}
        </div>
        {topAlertas.length === 0 ? (
          <div style={{background:T.greenBg,border:`1px solid ${T.green}33`,borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:12}}>
            <CheckCircle2 size={22} color={T.green}/>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:T.green}}>Sin alertas críticas</div>
              <div style={{fontSize:12,color:T.txM,marginTop:2}}>Todo dentro de los rangos esperados al día de hoy.</div>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {topAlertas.map((a, i) => {
              const c = a.type==="danger"?T.red:a.type==="warning"?T.amber:T.accent;
              const cBg = a.type==="danger"?T.redBg:a.type==="warning"?T.amberBg:T.accentBg;
              return (
                <div key={i} style={{background:cBg,border:`1px solid ${c}33`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
                  <a.icon size={16} color={c} style={{flexShrink:0,marginTop:1}}/>
                  <div style={{fontSize:13,color:T.tx,lineHeight:1.45,fontWeight:500}}>{a.msg}</div>
                </div>
              );
            })}
            {alertas.length > topAlertas.length && (
              <button onClick={()=>setTab && setTab("alertas")} style={{background:"none",border:"none",color:T.accent,fontSize:12,fontWeight:600,cursor:"pointer",padding:"8px 4px",display:"flex",alignItems:"center",gap:4,alignSelf:"flex-start"}}>
                Ver las {alertas.length - topAlertas.length} restantes <ArrowRight size={13}/>
              </button>
            )}
          </div>
        )}
      </section>

      <section>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"0 4px"}}>
          <div style={{width:28,height:28,borderRadius:8,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Clock size={15} color={T.accent}/>
          </div>
          <h2 style={{fontSize:16,fontWeight:700,color:T.tx,margin:0,letterSpacing:-0.3}}>Para tu atención esta semana</h2>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:12}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <Calendar size={14} color={T.amber}/>
              <span style={{fontSize:11,color:T.txM,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"}}>Compromisos 7 días</span>
            </div>
            {compromisos7d.length > 0 ? (
              <>
                <div style={{fontSize:22,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>{fmtM(totalComp7d)}</div>
                <div style={{fontSize:12,color:T.txM,marginTop:4}}>{compromisos7d.length} pago{compromisos7d.length!==1?"s":""} programado{compromisos7d.length!==1?"s":""}</div>
                {compromisosConFalta.length > 0 && (
                  <div style={{marginTop:8,padding:"6px 10px",background:T.redBg,borderRadius:8,fontSize:11,color:T.red,fontWeight:600}}>
                    Falta cubrir {fmtM(compromisosConFalta.reduce((s,r)=>s+r.falta,0))} en {compromisosConFalta.length} pago{compromisosConFalta.length!==1?"s":""}
                  </div>
                )}
              </>
            ) : (
              <div style={{fontSize:13,color:T.txM,padding:"4px 0"}}>Sin compromisos próximos.</div>
            )}
          </div>

          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <PiggyBank size={14} color={T.green}/>
              <span style={{fontSize:11,color:T.txM,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"}}>Próximos DAP</span>
            </div>
            {dapProx.length > 0 ? (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {dapProx.map((d, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"3px 0",borderBottom:i<dapProx.length-1?`1px dashed ${T.border}`:"none"}}>
                    <div>
                      <div style={{color:T.tx,fontWeight:600}}>{d.banco}</div>
                      <div style={{color:T.txD,fontSize:10}}>{d.vencimiento.toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}</div>
                    </div>
                    <div style={{color:T.green,fontWeight:700}}>{fmtM(d.monto)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{fontSize:13,color:T.txM}}>Sin DAPs por vencer.</div>
            )}
          </div>

          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <Truck size={14} color={T.violet}/>
              <span style={{fontSize:11,color:T.txM,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"}}>Próximas cuotas</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {proxLeasing ? (
                <div style={{fontSize:12}}>
                  <div style={{color:T.txM,fontSize:10,fontWeight:600,marginBottom:2}}>LEASING</div>
                  <div style={{color:T.tx,fontWeight:700}}>{fmtM(proxLeasing.cuotaIVA)} <span style={{color:T.txD,fontWeight:400,fontSize:11}}>en {proxLeasing.dias}d</span></div>
                </div>
              ) : null}
              {proxCredito ? (
                <div style={{fontSize:12}}>
                  <div style={{color:T.txM,fontSize:10,fontWeight:600,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><CreditCard size={10}/>CRÉDITO ITAÚ</div>
                  <div style={{color:T.tx,fontWeight:700}}>{fmtM(proxCredito.valorCuota)} <span style={{color:T.txD,fontWeight:400,fontSize:11}}>cuota #{proxCredito.cuota}</span></div>
                </div>
              ) : null}
              {!proxLeasing && !proxCredito && <div style={{fontSize:13,color:T.txM}}>Sin cuotas próximas.</div>}
            </div>
          </div>
        </div>
      </section>

      <button onClick={()=>setTab && setTab("home")} style={{background:T.accentBg,border:`1px solid ${T.accent}33`,borderRadius:12,padding:"14px 18px",color:T.accent,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4}}>
        Ver el dashboard completo <ArrowRight size={15}/>
      </button>
    </div>
  );
}
