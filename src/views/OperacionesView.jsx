import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  Truck, Activity, BarChart3, MapPin, Target, Users, AlertTriangle,
} from "lucide-react";
import { MESES, MESES_FULL } from "../constants.js";
import { fmtM, fmtPct, pctChange } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";
import OccupationBar from "../components/OccupationBar.jsx";

export default function OperacionesView({ C, T }) {
  const varViajes = C.viajesMesAnteriorCount>0 ? pctChange(C.viajesMesActual,C.viajesMesAnteriorCount) : 0;
  const varCorte = C.viajesCorteAnterior>0 ? pctChange(C.viajesCorteActual,C.viajesCorteAnterior) : 0;

  const viajesChartData = (C.viajesPorMes||[]).map((m,i)=>({
    mes: m.mes,
    real: m.total,
    proyectado: i===C.curMonth ? (C.viajesProyectadosFaltantes||0) : null,
  }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Operaciones</h2>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={Truck} label="Viajes mes completo" value={C.viajesMesActual?.toLocaleString("es-CL")} T={T} sub={varViajes!==0?fmtPct(varViajes)+" vs mes anterior":undefined} color={T.green} colorBg={T.greenBg}/>
        <KpiCard icon={Activity} label={`Corte al día ${C.dayOfMonth}`} value={C.viajesCorteActual?.toLocaleString("es-CL")} T={T} sub={`${C.viajesCorteAnterior} mes ant. (${fmtPct(varCorte)})`} color={varCorte>=0?T.green:T.red} colorBg={varCorte>=0?T.greenBg:T.redBg}/>
        <KpiCard icon={BarChart3} label={`Viajes ${C.lastFullDayLabel}`} value={C.viajesAyer?.toLocaleString("es-CL")} T={T} sub="Último día completo" color={T.accent} colorBg={T.accentBg}/>
        <KpiCard icon={MapPin} label="KM mes actual" value={C.kmMesActual?.toLocaleString("es-CL")} T={T} color={T.teal} colorBg={T.tealBg}/>
        <KpiCard
          icon={Target} label={`Proy. cierre ${MESES[C.curMonth]}`} value={C.proyViajesHibrido?.toLocaleString("es-CL")} T={T}
          sub={`Faltan ~${C.viajesProyectadosFaltantes?.toLocaleString("es-CL")} viajes al cierre`}
          color={T.amber} colorBg={T.amberBg} badge="HÍBRIDO"
          tooltip={<div>
            <div style={{fontWeight:700,color:T.tooltipTx,marginBottom:6,fontSize:12}}>Método híbrido (prorrateo + estacional)</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Avance del mes</span><strong>{C.diasTranscurridosMes}/{C.diasTotalesMes} días</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Prorrateo simple</span><strong>{C.proyViajesProrrateoSimple?.toLocaleString("es-CL")}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Estacional (vs {C.prevYear})</span><strong>{C.proyViajesEstacional?.toLocaleString("es-CL")}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 3px",borderTop:`1px solid ${T.tooltipTx}22`,marginTop:3,fontWeight:700}}><span>= Proyección híbrida</span><strong>{C.proyViajesHibrido?.toLocaleString("es-CL")}</strong></div>
            <div style={{fontSize:10,color:T.tooltipTx,opacity:0.7,marginTop:8,lineHeight:1.4,paddingTop:6,borderTop:`1px solid ${T.tooltipTx}22`}}>
              Peso del prorrateo crece linealmente del día 1 al 15. Antes del 15 pesa más el patrón estacional.
            </div>
          </div>}
        />
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
        <SectionCard title="Viajes por mes — con proyección de cierre" icon={BarChart3} T={T} color={T.green} action={<span style={{fontSize:10,color:T.txD,fontStyle:"italic"}}>Barra punteada: proyectado</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={viajesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} width={40}/>
              <Tooltip content={<ChartTooltip T={T} prefix="#"/>}/>
              <Bar dataKey="real" stackId="v" fill={T.green} radius={[0,0,0,0]} name="Real"/>
              <Bar dataKey="proyectado" stackId="v" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[4,4,0,0]} name="Falta al cierre"/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{marginTop:8,padding:"8px 10px",background:T.bg3+"44",borderRadius:6,fontSize:10,color:T.txM,lineHeight:1.4}}>
            <strong style={{color:T.tx}}>{MESES[C.curMonth]}:</strong> {C.viajesMesActual?.toLocaleString("es-CL")} ejecutados + <span style={{color:T.amber,fontWeight:600}}>{C.viajesProyectadosFaltantes?.toLocaleString("es-CL")} proyectados</span> = <strong style={{color:T.tx}}>{C.proyViajesHibrido?.toLocaleString("es-CL")} al cierre</strong>
          </div>
        </SectionCard>

        <SectionCard title="Top clientes por viajes" icon={Users} T={T} color={T.accent}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Cliente","Viajes","Mes ant.","Proy. cierre","Avance"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>
                {(C.topClientesViajesProy||[]).map((c,i)=>{
                  const deltaMes=c.mesAnt>0?pctChange(c.proyCierre,c.mesAnt):0;
                  const avanceColor=c.avancePct>=90?T.green:c.avancePct>=70?T.amber:T.red;
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                      <td style={{padding:"7px 10px",color:T.tx,fontWeight:500,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name.length>22?c.name.slice(0,20)+"...":c.name}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontWeight:600}}>{c.count.toLocaleString("es-CL")}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.txD,fontSize:11}}>{c.mesAnt>0?c.mesAnt.toLocaleString("es-CL"):"—"}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.amber,fontWeight:700}}>
                        {c.proyCierre.toLocaleString("es-CL")}
                        {c.mesAnt>0&&<div style={{fontSize:9,color:deltaMes>=0?T.green:T.red,fontWeight:600}}>{fmtPct(deltaMes)} vs mes ant.</div>}
                      </td>
                      <td style={{padding:"7px 10px",textAlign:"right"}}><span style={{fontSize:10,fontWeight:700,color:avanceColor}}>{c.avancePct.toFixed(0)}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Viajes por tipo de equipo" icon={Truck} T={T} color={T.purple}>
          {C.viajesPorEquipo?.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={C.viajesPorEquipo} dataKey="count" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={2} label={({count})=>`${count}`} labelLine={{stroke:T.txD}}>
                  {C.viajesPorEquipo.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]}/>)}
                </Pie>
                <Tooltip content={<ChartTooltip T={T} prefix="#"/>}/>
              </PieChart>
            </ResponsiveContainer>
          ):<p style={{fontSize:12,color:T.txM}}>Sin datos</p>}
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6,justifyContent:"center"}}>
            {(C.viajesPorEquipo||[]).slice(0,6).map((d,i)=>(<span key={i} style={{fontSize:9,color:T.txM,display:"flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:2,background:T.chart[i%T.chart.length]}}/>{d.name}</span>))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
