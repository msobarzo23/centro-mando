import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Line, Legend, ReferenceLine,
  PieChart, Pie, Cell,
} from "recharts";
import { useState } from "react";
import {
  DollarSign, TrendingUp, Target, BarChart3, Activity, Users, FileText, Zap, FileSpreadsheet, Search, Fuel,
} from "lucide-react";
import { Sparkles } from "lucide-react";
import { MESES, MESES_FULL, MEPCO_ADJUSTMENT_MONTH } from "../constants.js";
import { fmtM, fmtPct, pctChange } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import MiniTable from "../components/MiniTable.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";
import MepcoBanner from "../components/MepcoBanner.jsx";
import DashboardLink from "../components/DashboardLink.jsx";

export default function VentasView({ C, T, projectionMode, setProjectionMode }) {
  const [monthRange, setMonthRange] = useState(12);
  const [searchCliente, setSearchCliente] = useState("");
  const mesLabel = MESES_FULL[C.curMonth];
  const varMes = C.totalMesAnterior>0 ? pctChange(C.totalMesActual,C.totalMesAnterior) : 0;
  const varAno = C.ventasAnoAnterior>0 ? pctChange(C.ventasAnoActual,C.ventasAnoAnterior) : 0;
  const varAcumCorte = C.acumCorteAnterior>0 ? pctChange(C.acumCorteActual,C.acumCorteAnterior) : 0;
  const totalTop = (C.topClientes||[]).reduce((s,c)=>s+c.total,0);
  const pieData = (C.topClientes||[]).slice(0,6).map((c,i)=>({name:c.name.length>18?c.name.slice(0,16)+"...":c.name,value:c.total,pct:totalTop>0?((c.total/C.totalMesActual)*100).toFixed(1):0}));
  const mesActualAnterior = (C.ventasPorMesComparado||[])[C.curMonth];
  const varMesVsAnioAnt = mesActualAnterior && mesActualAnterior.anterior>0 ? pctChange(mesActualAnterior.actual,mesActualAnterior.anterior) : 0;

  const proj = C.projections || {};
  const projection = projectionMode==="lineal" ? proj.linear : projectionMode==="prorata" ? proj.prorata : proj.seasonal;
  const projPct = C.ventasAnoAnterior>0 ? pctChange(projection,C.ventasAnoAnterior) : 0;

  const projectionModes = [
    {id:"seasonal",label:"Estacional",desc:"Basada en patrón mensual del año anterior"},
    {id:"prorata",label:"Prorrateada",desc:"Prorrateo por días hábiles transcurridos"},
    {id:"lineal",label:"Lineal",desc:"Promedio simple × 12"},
  ];

  const chartDataAll = (C.ventasPorMesConProyeccion||[]).map((m,i) => {
    const proyV = (C.facturacionProyectadaPorViajes||[])[i] || 0;
    const showViajes = i >= C.curMonth && proyV > 0;
    const esMesActual = i === C.curMonth;
    const esMesFuturo = i > C.curMonth;
    const proyectadoVal = m.proyectado !== null ? m.proyectado/1e6 : null;
    return {
      mes: MESES[i],
      real: m.actual>0 ? m.actual/1e6 : null,
      proyectadoActual: esMesActual ? proyectadoVal : null,
      proyectadoFuturo: esMesFuturo ? proyectadoVal : null,
      anterior: m.anterior>0 ? m.anterior/1e6 : null,
      proyViajes: showViajes ? proyV/1e6 : null,
    };
  });

  const chartDataProj = monthRange >= 12
    ? chartDataAll
    : chartDataAll.slice(Math.max(0, C.curMonth - monthRange + 1));

  const clientesFiltrados = searchCliente.trim()
    ? (C.topClientes||[]).filter(c => c.name.toLowerCase().includes(searchCliente.toLowerCase()))
    : (C.topClientes||[]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Ventas y facturación</h2>
          <p style={{fontSize:12,color:T.txM,marginTop:3}}>Lectura ejecutiva de facturación con proyección del cierre anual</p>
        </div>
        <button onClick={async()=>{const{exportVentasExcel}=await import("../services/exportExcel.js");exportVentasExcel(C);}} style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,cursor:"pointer",color:T.green,padding:"7px 14px",fontSize:12,fontWeight:600,flexShrink:0}}>
          <FileSpreadsheet size={15}/>Excel
        </button>
      </div>

      <MepcoBanner T={T} year={C.curYear} lastMonth={C.curMonth+1} projections={C.projections}/>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={DollarSign} label={`Facturación ${mesLabel}`} value={fmtM(C.totalMesActual)} T={T} sub={varMes!==0?fmtPct(varMes)+" vs mes anterior":undefined} color={T.accent} colorBg={T.accentBg}/>
        <KpiCard icon={TrendingUp} label="Acumulado año" value={fmtM(C.ventasAnoActual)} T={T} sub={varAno!==0?fmtPct(varAno)+` vs ${C.prevYear}`:undefined} color={T.green} colorBg={T.greenBg}/>
        <KpiCard icon={Target} label="Proyección anual" value={fmtM(projection)} T={T} sub={`${fmtPct(projPct)} vs ${C.prevYear}`} color={T.amber} colorBg={T.amberBg} badge={projectionMode.toUpperCase()}/>
        <KpiCard icon={Zap} label="Impacto MEPCO acum." value={C.impactoMepcoAcum>0?"+"+fmtM(C.impactoMepcoAcum):"—"} T={T} sub={C.mepcoActivo?"Atribuible al reajuste · desde mayo 2026":"Inicia mayo 2026"} color={T.violet} colorBg={T.violetBg} badge={C.mepcoActivo?"VIGENTE":"PREVIO"}/>
        {C.pozoCombustibleAcum>0 && (() => {
          const cob = C.coberturaPozoMepco;
          const cobPct = cob !== null && cob !== undefined ? (cob*100).toFixed(0) : null;
          const cobLabel = cob === null ? "—" : cob >= 1 ? "Cubierto" : `${cobPct}% cubierto`;
          return (
            <KpiCard
              icon={Fuel}
              label="Pozo combustible MEPCO"
              value={"-"+fmtM(C.pozoCombustibleAcum)}
              T={T}
              color={T.red}
              colorBg={T.redBg}
              badge="ACUM."
              sub={`Brecha: ${C.brechaPozoMepco>0?"−":"+"}${fmtM(Math.abs(C.brechaPozoMepco))} · ${cobLabel}`}
            />
          );
        })()}
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={BarChart3} label={`${mesLabel} ${C.prevYear}`} value={fmtM(mesActualAnterior?.anterior||0)} T={T} sub={varMesVsAnioAnt!==0?`${C.curYear}: ${fmtPct(varMesVsAnioAnt)}`:undefined} color={T.purple} colorBg={T.purpleBg}/>
        <KpiCard icon={Activity} label={`Acum. al corte (día ${new Date().getDate()})`} value={fmtM(C.acumCorteActual)} T={T} sub={`${C.prevYear}: ${fmtM(C.acumCorteAnterior)} (${fmtPct(varAcumCorte)})`} color={varAcumCorte>=0?T.green:T.red} colorBg={varAcumCorte>=0?T.greenBg:T.redBg}/>
        <KpiCard icon={Target} label={`Meta: superar ${C.prevYear}`} value={fmtM(C.ventasAnoAnterior)} T={T} sub={`Falta ${fmtM(Math.max(0,C.ventasAnoAnterior-C.ventasAnoActual))}`} color={T.amber} colorBg={T.amberBg}/>
      </div>

      <div style={{background:T.card,borderRadius:14,padding:"14px 18px",border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:10}}>
          <div>
            <div style={{color:T.tx,fontWeight:700,fontSize:13,marginBottom:2}}>Método de proyección</div>
            <div style={{color:T.txD,fontSize:11}}>
              {proj.monthInProgress?`${MESES[proj.openMonth-1]} en curso (${proj.businessDaysElapsed}/${proj.businessDaysTotal} días hábiles · ${Math.round((proj.businessDaysElapsed/proj.businessDaysTotal)*100)}%)`:"Todos los meses cerrados"}
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {projectionModes.map(m=>(
              <button key={m.id} onClick={()=>setProjectionMode(m.id)} title={m.desc}
                style={{padding:"7px 13px",borderRadius:10,border:`1px solid ${projectionMode===m.id?T.amber:T.border}`,background:projectionMode===m.id?T.amberBg:"transparent",color:projectionMode===m.id?T.amber:T.txM,cursor:"pointer",fontSize:11,fontWeight:700}}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginTop:6}}>
          {projectionModes.map(m=>{
            const val = m.id==="lineal" ? proj.linear : m.id==="prorata" ? proj.prorata : proj.seasonal;
            const pct = C.ventasAnoAnterior>0 ? pctChange(val,C.ventasAnoAnterior) : 0;
            return(
              <div key={m.id} style={{padding:"8px 12px",borderRadius:10,background:projectionMode===m.id?`${T.amber}12`:T.bg3+"44",border:`1px solid ${projectionMode===m.id?T.amber+"55":T.border}`}}>
                <div style={{fontSize:10,color:T.txD,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{m.label}</div>
                <div style={{fontSize:14,fontWeight:800,color:T.tx}}>{fmtM(val)}</div>
                <div style={{fontSize:10,color:pct>=0?T.green:T.red,fontWeight:700}}>{fmtPct(pct)} vs {C.prevYear}</div>
              </div>
            );
          })}
        </div>
      </div>

      {C.proyAnualPorViajes>0&&(()=>{
        const seasonal = proj.seasonal||0;
        const viajes = C.proyAnualPorViajes||0;
        const divAbs = viajes-seasonal;
        const divPct = seasonal>0 ? Math.abs(divAbs)/seasonal*100 : 0;
        const isDiverge = divPct>15;
        const viajesMayor = viajes>seasonal;
        return(
          <SectionCard title="Proyección doble — Estacional vs. Basada en viajes" icon={Sparkles} T={T} color={T.violet} action={isDiverge?<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,background:T.amberBg,color:T.amber,letterSpacing:0.4}}>⚠ DIVERGENCIA {divPct.toFixed(0)}%</span>:<span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:999,background:T.greenBg,color:T.green,letterSpacing:0.4}}>✓ CONVERGEN</span>}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))",gap:12}}>
              <div style={{padding:"12px 14px",borderRadius:10,background:T.amberBg,border:`1px solid ${T.amber}33`}}>
                <div style={{fontSize:10,color:T.amber,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>⚡ Estacional</div>
                <div style={{fontSize:20,fontWeight:800,color:T.tx}}>{fmtM(seasonal)}</div>
                <div style={{fontSize:10,color:T.txM,marginTop:2}}>Basada en patrón histórico {C.prevYear}</div>
              </div>
              <div style={{padding:"12px 14px",borderRadius:10,background:T.tealBg,border:`1px solid ${T.teal}33`}}>
                <div style={{fontSize:10,color:T.teal,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>🚛 Basada en viajes</div>
                <div style={{fontSize:20,fontWeight:800,color:T.tx}}>{fmtM(viajes)}</div>
                <div style={{fontSize:10,color:T.txM,marginTop:2}}>Viajes ejecutados × tarifa $/viaje por cliente</div>
              </div>
              <div style={{padding:"12px 14px",borderRadius:10,background:isDiverge?T.redBg:T.greenBg,border:`1px solid ${isDiverge?T.red:T.green}33`}}>
                <div style={{fontSize:10,color:isDiverge?T.red:T.green,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Δ Diferencia</div>
                <div style={{fontSize:20,fontWeight:800,color:T.tx}}>{divAbs>=0?"+":""}{fmtM(divAbs)}</div>
                <div style={{fontSize:10,color:T.txM,marginTop:2}}>{divPct.toFixed(1)}% de gap · {viajesMayor?"viajes anticipan más":"estacional más optimista"}</div>
              </div>
            </div>
            <div style={{marginTop:12,padding:"10px 12px",background:T.bg3+"44",borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
              <strong style={{color:T.tx}}>Cómo leer esto: </strong>
              {isDiverge?(viajesMayor?`Los viajes ya ejecutados sugieren que el cierre será MAYOR al esperado. Señal positiva, posible efecto de mayor volumen o ajuste MEPCO.`:`Los viajes sugieren cierre MENOR al patrón histórico. Señal de desaceleración — revisar mix de clientes.`):`Ambos métodos convergen (diferencia ${divPct.toFixed(0)}%). Alta confianza en la proyección entre ${fmtM(Math.min(seasonal,viajes))} y ${fmtM(Math.max(seasonal,viajes))}.`}
              {" "}Tasa global histórica: <strong>{fmtM(C.tasaGlobal||0)}/viaje</strong>.
            </div>
          </SectionCard>
        );
      })()}

      {C.desgloseMesActualProy?.length>0&&(
        <details style={{background:T.card,borderRadius:14,padding:"12px 18px",border:`1px solid ${T.border}`}}>
          <summary style={{cursor:"pointer",fontSize:13,fontWeight:700,color:T.tx,listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
            <Sparkles size={14} color={T.teal}/>
            Auditoría: cálculo de proyección "{MESES[C.curMonth]}" basada en viajes de {C.curMonth>0?MESES[C.curMonth-1]:"Dic"}
            <span style={{marginLeft:"auto",fontSize:10,color:T.txD}}>▼ desplegar</span>
          </summary>
          <div style={{marginTop:14,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Cliente","Viajes","Tasa $/viaje","Aporte $","Confianza"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>
                {C.desgloseMesActualProy.slice(0,20).map((d,i)=>{
                  const confColor=d.confianza==="alta"?T.green:d.confianza==="baja"?T.amber:T.txD;
                  const confBg=d.confianza==="alta"?T.greenBg:d.confianza==="baja"?T.amberBg:T.bg3;
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                      <td style={{padding:"7px 10px",color:T.tx,fontWeight:500,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.cliente}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.tx}}>{d.viajes}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.txM,fontFamily:"monospace",fontSize:11}}>{fmtM(d.tasa)}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontWeight:600}}>{fmtM(d.aporte)}</td>
                      <td style={{padding:"7px 10px",textAlign:"right"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:999,background:confBg,color:confColor,textTransform:"uppercase"}}>{d.confianza}</span></td>
                    </tr>
                  );
                })}
                <tr style={{borderTop:`2px solid ${T.border}`,background:T.tealBg}}>
                  <td style={{padding:"9px 10px",color:T.teal,fontWeight:800}}>▶ TOTAL PROYECCIÓN</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:T.teal,fontWeight:700}}>{C.desgloseMesActualProy.reduce((s,d)=>s+d.viajes,0)}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:T.txD,fontSize:11}}>prom. {fmtM(C.tasaGlobal||0)}</td>
                  <td style={{padding:"9px 10px",textAlign:"right",color:T.teal,fontWeight:800}}>{fmtM(C.proyMesActualPorViajes||0)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      )}

      <SectionCard
        title={`Comparación mensual — ${C.curYear} vs ${C.prevYear}`}
        icon={BarChart3} T={T} color={T.accent}
        action={
          <div style={{display:"flex",gap:4}}>
            {[3,6,12].map(n=>(
              <button key={n} onClick={()=>setMonthRange(n)} style={{padding:"3px 9px",borderRadius:7,border:`1px solid ${monthRange===n?T.accent:T.border}`,background:monthRange===n?T.accentBg:"transparent",color:monthRange===n?T.accent:T.txM,cursor:"pointer",fontSize:11,fontWeight:700}}>
                {n===12?"Año":`${n}m`}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartDataProj}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}M`} width={55}/>
            <Tooltip content={<ChartTooltip T={T} valuesInM/>}/>
            <Legend wrapperStyle={{fontSize:11,color:T.txM}}/>
            <Bar dataKey="anterior" fill={T.txD} opacity={0.45} radius={[3,3,0,0]} name={String(C.prevYear)}/>
            <Bar dataKey="real" stackId="curr" fill={T.accent} radius={[3,3,0,0]} name={`${C.curYear} Real`}/>
            <Bar dataKey="proyectadoActual" stackId="curr" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name="Falta facturar mes"/>
            <Bar dataKey="proyectadoFuturo" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name="Estacional"/>
            <Line type="monotone" dataKey="proyViajes" stroke={T.teal} strokeWidth={2.5} dot={{fill:T.teal,r:4}} connectNulls={false} name="Por viajes"/>
            {C.curYear===2026&&(<ReferenceLine x={MESES[MEPCO_ADJUSTMENT_MONTH-1]} stroke={T.violet} strokeDasharray="4 3" strokeWidth={2} label={{value:"⚡ Ajuste MEPCO",position:"top",fill:T.violet,fontSize:10,fontWeight:700}}/>)}
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Detalle mensual" icon={FileText} T={T} color={T.accent}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>
              <th style={{padding:"8px 10px",textAlign:"left",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>Mes</th>
              <th style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>{C.prevYear}</th>
              <th style={{padding:"8px 10px",textAlign:"right",color:T.accent,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>{C.curYear}</th>
              <th style={{padding:"8px 10px",textAlign:"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11}}>Var %</th>
            </tr></thead>
            <tbody>
              {(C.ventasPorMesComparado||[]).filter(r=>r.actual>0||r.anterior>0).map((r,i)=>{
                const vp=r.anterior>0?pctChange(r.actual,r.anterior):0;
                return(<tr key={i} style={{borderBottom:`1px solid ${T.border}22`,background:r.mes===MESES[C.curMonth]?T.accentBg:"transparent"}}>
                  <td style={{padding:"6px 10px",color:T.tx,fontWeight:r.mes===MESES[C.curMonth]?600:400}}>{r.mes}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.txD}}>{fmtM(r.anterior)}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.tx,fontWeight:500}}>{fmtM(r.actual)}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:vp>=0?T.green:T.red,fontWeight:600}}>{r.anterior>0?fmtPct(vp):"—"}</td>
                </tr>);
              })}
              <tr style={{borderTop:`2px solid ${T.border}`}}>
                <td style={{padding:"8px 10px",color:T.tx,fontWeight:800}}>TOTAL YTD</td>
                <td style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:700}}>{fmtM(C.acumAnterior)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",color:T.accent,fontWeight:800}}>{fmtM(C.acumActual)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",color:C.acumActual>=C.acumAnterior?T.green:T.red,fontWeight:800}}>{C.acumAnterior>0?fmtPct(pctChange(C.acumActual,C.acumAnterior)):"—"}</td>
              </tr>
              <tr style={{background:T.amberBg}}>
                <td style={{padding:"8px 10px",color:T.amber,fontWeight:800}}>⚡ PROYECCIÓN ANUAL ({projectionMode})</td>
                <td style={{padding:"8px 10px",textAlign:"right",color:T.txD,fontWeight:700}}>{fmtM(C.ventasAnoAnterior)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",color:T.amber,fontWeight:800}}>{fmtM(projection)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",color:projPct>=0?T.green:T.red,fontWeight:800}}>{fmtPct(projPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
        <SectionCard title={`Participación clientes — ${mesLabel}`} icon={Users} T={T} color={T.purple}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({pct})=>`${pct}%`} labelLine={{stroke:T.txD}}>
                {pieData.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]}/>)}
              </Pie>
              <Tooltip content={<ChartTooltip T={T}/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,justifyContent:"center"}}>
            {pieData.map((d,i)=>(<span key={i} style={{fontSize:10,color:T.txM,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:T.chart[i%T.chart.length]}}/>{d.name}</span>))}
          </div>
        </SectionCard>
        <SectionCard title="Top clientes del mes" icon={Users} T={T} color={T.accent}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:T.bg3,borderRadius:8,padding:"6px 10px",border:`1px solid ${T.border}`}}>
            <Search size={13} color={T.txD}/>
            <input
              value={searchCliente} onChange={e=>setSearchCliente(e.target.value)}
              placeholder="Buscar cliente…" style={{background:"transparent",border:"none",outline:"none",color:T.tx,fontSize:12,flex:1,minWidth:0}}
            />
            {searchCliente&&<button onClick={()=>setSearchCliente("")} style={{background:"none",border:"none",color:T.txD,cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>}
          </div>
          <MiniTable T={T} headers={["#","Cliente","Monto","Sin MEPCO","Δ MEPCO","% Part."]} rows={clientesFiltrados.map((c,i)=>[
            i+1,
            c.name.length>22?c.name.slice(0,20)+"...":c.name,
            fmtM(c.total),
            (c.mepcoImpact||0)>0 ? fmtM(c.sinMepco) : <span key="sm" style={{color:T.txD}}>—</span>,
            (c.mepcoImpact||0)>0 ? <span key="dm" style={{color:T.violet,fontWeight:600}}>+{fmtM(c.mepcoImpact)}</span> : <span key="dm" style={{color:T.txD}}>—</span>,
            C.totalMesActual>0?((c.total/C.totalMesActual)*100).toFixed(1)+"%":"0%",
          ])}/>
        </SectionCard>
        <SectionCard title="Últimas facturas ingresadas" icon={FileText} T={T} color={T.green}>
          {(C.ultimasFacturas||[]).length>0?(
            <MiniTable T={T} maxRows={5} headers={["Fecha","Folio","Cliente","Tipo","Neto"]} rows={(C.ultimasFacturas||[]).map(r=>[
              r.fecha,r.folio,r.cliente.length>20?r.cliente.slice(0,18)+"...":r.cliente,
              <span key="tipo" style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:4,background:String(r.tipo).toLowerCase().includes("credito")||String(r.tipo).toLowerCase().includes("crédito")?T.redBg:T.greenBg,color:String(r.tipo).toLowerCase().includes("credito")||String(r.tipo).toLowerCase().includes("crédito")?T.red:T.green}}>{String(r.tipo).toLowerCase().includes("credito")||String(r.tipo).toLowerCase().includes("crédito")?"NC":"FAC"}</span>,
              <span key="neto" style={{color:r.neto<0?T.red:T.tx,fontWeight:500}}>{fmtM(r.neto)}</span>,
            ])}/>
          ):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin facturas recientes</p>}
        </SectionCard>
      </div>

      <DashboardLink T={T} color={T.accent} colorBg={T.accentBg}
        url="https://dashboard-ventas-seven.vercel.app/"
        label="Dashboard Comercial — clientes, MEPCO, briefing y proyecciones" />
    </div>
  );
}
