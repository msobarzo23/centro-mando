import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { useState } from "react";
import {
  Truck, Activity, BarChart3, MapPin, Target, Users, AlertTriangle, FileSpreadsheet, Search,
} from "lucide-react";
import { MESES, MESES_FULL } from "../constants.js";
import { fmtM, fmtPct, pctChange } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";
import OccupationBar from "../components/OccupationBar.jsx";
import DashboardLink from "../components/DashboardLink.jsx";
import ContadorSinAccidentes from "../components/ContadorSinAccidentes.jsx";

export default function OperacionesView({ C, T }) {
  const [monthRange, setMonthRange] = useState(12);
  const [searchCliente, setSearchCliente] = useState("");
  // Comparar el mes-a-la-fecha (parcial) contra el mes anterior COMPLETO no tiene
  // sentido (siempre da un -% alarmante). Comparamos la proyección de cierre vs el
  // total del mes anterior, que es la lectura útil de "¿venimos mejor o peor?".
  const varProyVsAnt = C.viajesMesAnteriorCount>0 ? pctChange(C.proyViajesHibrido,C.viajesMesAnteriorCount) : 0;
  const varCorte = C.viajesCorteAnterior>0 ? pctChange(C.viajesCorteActual,C.viajesCorteAnterior) : 0;

  const viajesChartAll = (C.viajesPorMes||[]).map((m,i)=>({
    mes: m.mes,
    real: m.total,
    proyectado: i===C.curMonth ? (C.viajesProyectadosFaltantes||0) : null,
  }));
  const viajesChartData = monthRange >= 12
    ? viajesChartAll
    : viajesChartAll.slice(Math.max(0, C.curMonth - monthRange + 1));

  const clientesFiltrados = searchCliente.trim()
    ? (C.topClientesViajesProy||[]).filter(c => c.name.toLowerCase().includes(searchCliente.toLowerCase()))
    : (C.topClientesViajesProy||[]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Operaciones</h2>
        <button onClick={async()=>{const{exportOperacionesExcel}=await import("../services/exportExcel.js");exportOperacionesExcel(C);}} style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,cursor:"pointer",color:T.green,padding:"7px 14px",fontSize:12,fontWeight:600,flexShrink:0}}>
          <FileSpreadsheet size={15}/>Excel
        </button>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={Truck} label={`Viajes ${MESES[C.curMonth]} (en curso)`} value={C.viajesMesActual?.toLocaleString("es-CL")} T={T} sub={`Proy. ${C.proyViajesHibrido?.toLocaleString("es-CL")} al cierre (${fmtPct(varProyVsAnt)} vs mes ant.)`} color={varProyVsAnt>=0?T.green:T.red} colorBg={varProyVsAnt>=0?T.greenBg:T.redBg}/>
        <KpiCard icon={Activity} label={`Corte al día ${C.dayOfMonth}`} value={C.viajesCorteActual?.toLocaleString("es-CL")} T={T} sub={`${C.viajesCorteAnterior} mes ant. (${fmtPct(varCorte)})`} color={varCorte>=0?T.green:T.red} colorBg={varCorte>=0?T.greenBg:T.redBg}/>
        <KpiCard icon={BarChart3} label={`Viajes ${C.lastFullDayLabel}`} value={C.viajesAyer?.toLocaleString("es-CL")} T={T} sub="Último día completo" color={T.accent} colorBg={T.accentBg}/>
        <KpiCard icon={MapPin} label="KM mes actual" value={C.kmMesActual?.toLocaleString("es-CL")} T={T} color={T.teal} colorBg={T.tealBg}/>
        <KpiCard
          icon={Target} label={`Proy. cierre ${MESES[C.curMonth]}`} value={C.proyViajesHibrido?.toLocaleString("es-CL")} T={T}
          sub={`Faltan ~${C.viajesProyectadosFaltantes?.toLocaleString("es-CL")} viajes al cierre`}
          color={T.amber} colorBg={T.amberBg} badge="RITMO"
          tooltip={<div>
            <div style={{fontWeight:700,color:T.tooltipTx,marginBottom:6,fontSize:12}}>Cierre por ritmo reciente</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Avance del mes</span><strong>{C.diasTranscurridosMes}/{C.diasTotalesMes} días ({C.diasCompletosMes} cerrados)</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Ritmo reciente</span><strong>~{C.ritmoDiaReciente?.toLocaleString("es-CL")}/día</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Prorrateo (días cerrados)</span><strong>{C.proyViajesProrrateoSimple?.toLocaleString("es-CL")}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Run-rate plano × mes</span><strong>{C.proyViajesRunRatePlano?.toLocaleString("es-CL")}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Por día de semana</span><strong>{C.proyViajesDiaSemana?.toLocaleString("es-CL")}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 3px",borderTop:`1px solid ${T.tooltipTx}22`,marginTop:3,fontWeight:700}}><span>= Proyección cierre</span><strong>{C.proyViajesHibrido?.toLocaleString("es-CL")}</strong></div>
            <div style={{fontSize:10,color:T.tooltipTx,opacity:0.7,marginTop:8,lineHeight:1.4,paddingTop:6,borderTop:`1px solid ${T.tooltipTx}22`}}>
              Proyecta cada día que falta según el ritmo de las últimas semanas, por día de semana. Excluye el día en curso (aún no termina) y refleja la demanda reciente, no el patrón de {C.prevYear}.
            </div>
          </div>}
        />
      </div>

      <ContadorSinAccidentes C={C} T={T} variant="panel"/>

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
        <SectionCard title="Viajes por mes — con proyección de cierre" icon={BarChart3} T={T} color={T.green} action={
          <div style={{display:"flex",gap:4}}>
            {[3,6,12].map(n=>(
              <button key={n} onClick={()=>setMonthRange(n)} style={{padding:"3px 9px",borderRadius:7,border:`1px solid ${monthRange===n?T.green:T.border}`,background:monthRange===n?T.greenBg:"transparent",color:monthRange===n?T.green:T.txM,cursor:"pointer",fontSize:11,fontWeight:700}}>
                {n===12?"Año":`${n}m`}
              </button>
            ))}
          </div>
        }>
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
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:T.bg3,borderRadius:8,padding:"6px 10px",border:`1px solid ${T.border}`}}>
            <Search size={13} color={T.txD}/>
            <input
              value={searchCliente} onChange={e=>setSearchCliente(e.target.value)}
              placeholder="Buscar cliente…" style={{background:"transparent",border:"none",outline:"none",color:T.tx,fontSize:12,flex:1,minWidth:0}}
            />
            {searchCliente&&<button onClick={()=>setSearchCliente("")} style={{background:"none",border:"none",color:T.txD,cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Cliente","Viajes","Mes ant.","Proy. cierre","Avance"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>
                {clientesFiltrados.map((c,i)=>{
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

        <SectionCard title={`Viajes por mes — ${C.prevYear} vs ${C.curYear}`} icon={BarChart3} T={T} color={T.purple}>
          {(C.viajesPorMesComparado||[]).some(m=>m.actual>0||m.anterior>0)?(
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={C.viajesPorMesComparado}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} width={40}/>
                <Tooltip content={<ChartTooltip T={T} prefix="#"/>}/>
                <Legend wrapperStyle={{fontSize:11,color:T.txM}}/>
                <Bar dataKey="anterior" fill={T.txD} opacity={0.45} radius={[3,3,0,0]} name={String(C.prevYear)}/>
                <Bar dataKey="actual" fill={T.purple} radius={[3,3,0,0]} name={String(C.curYear)}/>
              </BarChart>
            </ResponsiveContainer>
          ):<p style={{fontSize:12,color:T.txM}}>Sin datos</p>}
          {(()=>{
            const filas=(C.viajesPorMesComparado||[]).filter(m=>m.actual>0||m.anterior>0);
            if(filas.length===0)return null;
            // El total compara solo los meses que ya tienen viajes este ano,
            // para no castigar el acumulado con meses futuros aun sin datos.
            const mesesConViajes=filas.filter(m=>m.actual>0);
            const totActual=mesesConViajes.reduce((s,m)=>s+m.actual,0);
            const totAnterior=mesesConViajes.reduce((s,m)=>s+m.anterior,0);
            const totDif=totActual-totAnterior;
            const totPct=totAnterior>0?pctChange(totActual,totAnterior):0;
            const primerMes=mesesConViajes[0]?.mes, ultimoMes=mesesConViajes[mesesConViajes.length-1]?.mes;
            const rango=mesesConViajes.length>0?(primerMes===ultimoMes?primerMes:`${primerMes}–${ultimoMes}`):"";
            const cellR={padding:"6px 10px",textAlign:"right",fontSize:11};
            return (
              <div style={{overflowX:"auto",marginTop:12}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr>
                    <th style={{padding:"8px 10px",textAlign:"left",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>Mes</th>
                    <th style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>{C.prevYear}</th>
                    <th style={{padding:"8px 10px",textAlign:"right",color:T.purple,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>{C.curYear}</th>
                    <th style={{padding:"8px 10px",textAlign:"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>Diferencia</th>
                  </tr></thead>
                  <tbody>
                    {filas.map((m,i)=>{
                      const dif=m.actual-m.anterior;
                      const col=dif>=0?T.green:T.red;
                      const sinDato=m.actual===0; // mes aun no transcurrido este ano
                      return(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                          <td style={{padding:"6px 10px",color:T.tx,fontWeight:500}}>{m.mes}</td>
                          <td style={{...cellR,color:T.txD}}>{m.anterior.toLocaleString("es-CL")}</td>
                          <td style={{...cellR,color:sinDato?T.txD:T.tx,fontWeight:600}}>{sinDato?"—":m.actual.toLocaleString("es-CL")}</td>
                          <td style={{...cellR,color:sinDato?T.txD:col,fontWeight:700}}>
                            {sinDato?"—":<>
                              {dif>=0?"+":""}{dif.toLocaleString("es-CL")}
                              {m.anterior>0&&<div style={{fontSize:9,fontWeight:600}}>{fmtPct(m.var_pct)}</div>}
                            </>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:`2px solid ${T.border}`}}>
                      <td style={{padding:"8px 10px",color:T.tx,fontWeight:800}}>Total<div style={{fontSize:9,color:T.txD,fontWeight:600}}>{rango}</div></td>
                      <td style={{...cellR,color:T.tx,fontWeight:700,fontSize:12}}>{totAnterior.toLocaleString("es-CL")}</td>
                      <td style={{...cellR,color:T.tx,fontWeight:800,fontSize:12}}>{totActual.toLocaleString("es-CL")}</td>
                      <td style={{...cellR,color:totDif>=0?T.green:T.red,fontWeight:800,fontSize:12}}>
                        {totDif>=0?"+":""}{totDif.toLocaleString("es-CL")}
                        {totAnterior>0&&<div style={{fontSize:9,fontWeight:700}}>{fmtPct(totPct)}</div>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}
        </SectionCard>
      </div>

      <DashboardLink T={T} color={T.green} colorBg={T.greenBg}
        url="https://dashboard-operaciones.vercel.app/"
        label="Dashboard de Operaciones — viajes, rutas, ocupación y conductores" />
    </div>
  );
}
