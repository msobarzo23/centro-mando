import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Area, Line, Legend, ReferenceLine,
} from "recharts";
import {
  DollarSign, Truck, Building2, PiggyBank, TrendingUp, BarChart3,
  Calendar, Users, AlertTriangle, Zap, Gauge, CreditCard,
} from "lucide-react";
import { Sparkles } from "lucide-react";
import { MESES, MESES_FULL, MEPCO_ADJUSTMENT_MONTH } from "../constants.js";
import { fmtM, fmtFull, fmtPct, pctChange, getSaludo, getFechaLarga } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import MiniTable from "../components/MiniTable.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";
import MepcoBanner from "../components/MepcoBanner.jsx";
import HighlightsBanner from "../components/HighlightsBanner.jsx";
import SemaforoEjecutivo from "../components/SemaforoEjecutivo.jsx";

export default function HomeView({ C, T, setTab }) {
  const saludo = getSaludo();
  const fecha = getFechaLarga();

  const trendVentas12m = [];
  if (C.ventasPorMesComparado && C.curMonth !== undefined) {
    for (let i = C.curMonth + 1; i < 12; i++) trendVentas12m.push(C.ventasPorMesComparado[i]?.anterior || 0);
    for (let i = 0; i <= C.curMonth; i++) {
      const v = C.ventasPorMesComparado[i]?.actual || 0;
      trendVentas12m.push(v > 0 ? v : null);
    }
  }
  const trendViajes = (C.viajesPorMes || [])
    .slice(0, (C.curMonth ?? -1) + 1)
    .map(m => m.total > 0 ? m.total : null);

  const chartData = (C.ventasPorMesConProyeccion||[]).map((m, i) => {
    const proyV = (C.facturacionProyectadaPorViajes||[])[i] || 0;
    const showViajes = i >= C.curMonth && proyV > 0;
    const esMesActual = i === C.curMonth;
    const esMesFuturo = i > C.curMonth;
    const proyectadoVal = m.proyectado !== null ? m.proyectado / 1e6 : null;
    return {
      mes: MESES[i],
      real: m.actual > 0 ? m.actual / 1e6 : null,
      proyectadoActual: esMesActual ? proyectadoVal : null,
      proyectadoFuturo: esMesFuturo ? proyectadoVal : null,
      anterior: m.anterior > 0 ? m.anterior / 1e6 : null,
      proyViajes: showViajes ? proyV / 1e6 : null,
    };
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,background:T.violetBg,border:`1px solid ${T.violet}33`,marginBottom:10}}>
            <Sparkles size={11} color={T.violet}/>
            <span style={{fontSize:10,color:T.violet,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase"}}>Resumen ejecutivo</span>
          </div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.tx,marginBottom:3,letterSpacing:-0.8}}>{saludo}, Don Luis</h1>
          <p style={{fontSize:13,color:T.txM,textTransform:"capitalize"}}>{fecha}</p>
        </div>
        <SemaforoEjecutivo C={C} T={T}/>
      </div>

      <MepcoBanner T={T} year={C.curYear} lastMonth={C.curMonth+1} compact={true}/>
      <HighlightsBanner C={C} T={T}/>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={DollarSign} label="Facturación mes" value={fmtM(C.totalMesActual)} T={T} sub={C.totalMesAnterior>0?fmtPct(pctChange(C.totalMesActual,C.totalMesAnterior))+" vs mes ant.":undefined} color={T.accent} colorBg={T.accentBg} trend={trendVentas12m} trendLabel="Últimos 12 meses"/>
        <KpiCard icon={Truck} label="Viajes mes" value={C.viajesMesActual?.toLocaleString("es-CL")} T={T} sub={`Corte día ${C.dayOfMonth}: ${C.viajesCorteActual} vs ${C.viajesCorteAnterior}`} color={T.green} colorBg={T.greenBg} trend={trendViajes} trendLabel={`${trendViajes.filter(Boolean).length} meses ${C.curYear}`}/>
        <KpiCard icon={Building2} label="Caja total" value={fmtM(C.totalCaja)} T={T} sub={Object.keys(C.saldosBancos||{}).length+" bancos"} color={T.teal} colorBg={T.tealBg}/>
        <KpiCard
          icon={Gauge} label="Liquidez 30d"
          value={C.coberturaRatio30!==null?`${C.coberturaRatio30.toFixed(2)}x`:"—"} T={T}
          sub={C.coberturaRatio30!==null?`${fmtM(C.liquidez30)} vs compromisos ${fmtM(C.comp30)}`:"Sin compromisos en 30 días"}
          color={C.coberturaRatio30===null?T.txM:C.coberturaRatio30>=1.2?T.green:C.coberturaRatio30>=1?T.amber:T.red}
          colorBg={C.coberturaRatio30===null?T.bg3:C.coberturaRatio30>=1.2?T.greenBg:C.coberturaRatio30>=1?T.amberBg:T.redBg}
          tooltip={<div>
            <div style={{fontWeight:700,color:T.tooltipTx,marginBottom:6,fontSize:12}}>Desglose Liquidez operativa 30d</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Caja bancaria</span><strong>{fmtM(C.totalCaja)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ DAP Trabajo (vence 30d)</span><strong>{fmtM(C.dapTrabajoVence30||0)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ Fondos mutuos (rescatables)</span><strong>{fmtM(C.totalFondos)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 3px",borderTop:`1px solid ${T.tooltipTx}22`,marginTop:3,fontWeight:700}}><span>= Liquidez disponible</span><strong>{fmtM(C.liquidez30)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>÷ Compromisos 30d</span><strong>{fmtM(C.comp30)}</strong></div>
            <div style={{fontSize:10,color:T.tooltipTx,opacity:0.7,marginTop:8,lineHeight:1.4,paddingTop:6,borderTop:`1px solid ${T.tooltipTx}22`}}>
              Excluye: DAP Crédito ({fmtM(C.dapCreditoVence30||0)} en 30d) y DAP Inversión ({fmtM(C.dapInversionVence30||0)} en 30d).
              {C.colchonAdicional30>0&&<><br/>Colchón adicional (DAP Inv.): <strong>{fmtM(C.colchonAdicional30)}</strong> → ratio total {C.coberturaRatio30ConColchon?.toFixed(2)}x</>}
            </div>
          </div>}
        />
        <KpiCard icon={PiggyBank} label="Inversión real" value={fmtM(C.totalInversionReal)} T={T} sub={`DAP Inv. ${fmtM(C.totalDAPInversion)} + FF.MM. ${fmtM(C.totalFondos)}`} color={T.purple} colorBg={T.purpleBg}/>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={TrendingUp} label={`Fact. proyectada ${C.curMonth<11?MESES[C.curMonth+1]:"Ene"}`} value={C.proyMesSiguientePorViajes>0?fmtM(C.proyMesSiguientePorViajes):"—"} T={T} sub={C.proyMesSiguientePorViajes>0?`Basada en viajes ${MESES[C.curMonth]} × tarifa hist.`:"Sin viajes mes actual"} color={T.teal} colorBg={T.tealBg} badge="PRÓX. MES"/>
        <KpiCard icon={Zap} label="Impacto MEPCO mes" value={C.impactoMepcoMes===0?"—":(C.impactoMepcoMes>0?"+":"")+fmtM(C.impactoMepcoMes)} T={T} sub={C.mepcoActivo?(C.impactoMepcoAcum!==0?`Acum. desde mayo: ${C.impactoMepcoAcum>0?"+":""}${fmtM(C.impactoMepcoAcum)}`:"Sin efecto medible aún"):"Pendiente (desde mayo 2026)"} color={T.amber} colorBg={T.amberBg} badge={C.mepcoActivo?"VIGENTE":"PREVIO"}/>
        <KpiCard icon={BarChart3} label="Margen estimado mes" value={fmtM(C.margenMesEstimado)} T={T} sub={`Fact. ${fmtM(C.totalMesActual)} − costos fijos`} color={C.margenMesEstimado>=0?T.green:T.red} colorBg={C.margenMesEstimado>=0?T.greenBg:T.redBg}/>
        <KpiCard icon={Truck} label="Leasing" value={fmtM(C.leasingTotalCuotaIVA)+" c/IVA"} T={T} sub={`${C.leasingContratosActivos} contratos · ${C.leasingTractosTotal} tractos`} color={T.violet} colorBg={T.violetBg}/>
        <KpiCard icon={CreditCard} label="Crédito Itaú" value={fmtM(C.creditoDeudaTotal)} T={T} sub={C.creditoProxima?`Próxima: ${fmtM(C.creditoProxima.valorCuota)} · cuota #${C.creditoProxima.cuota}`:"En gracia"} color={T.red} colorBg={T.redBg}/>
      </div>

      <SectionCard title={`Facturación mensual ${C.curYear} — con proyección estacional`} icon={BarChart3} T={T} color={T.accent} action={<span style={{fontSize:10,color:T.txD,fontStyle:"italic"}}>Proyección anual: <strong style={{color:T.amber}}>{fmtM(C.projections?.seasonal||0)}</strong></span>}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="mes" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}M`} width={55}/>
            <Tooltip content={<ChartTooltip T={T} valuesInM/>}/>
            <Legend wrapperStyle={{fontSize:11,color:T.txM}}/>
            <Bar dataKey="anterior" fill={T.txD} opacity={0.4} radius={[3,3,0,0]} name={String(C.prevYear)}/>
            <Bar dataKey="real" stackId="curr" fill={T.accent} radius={[3,3,0,0]} name={`${C.curYear} Real`}/>
            <Bar dataKey="proyectadoActual" stackId="curr" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name="Falta facturar mes"/>
            <Bar dataKey="proyectadoFuturo" fill={T.amber} fillOpacity={0.55} stroke={T.amber} strokeDasharray="4 2" radius={[3,3,0,0]} name="Proyectado estacional"/>
            <Line type="monotone" dataKey="proyViajes" stroke={T.teal} strokeWidth={2.5} dot={{fill:T.teal,r:4}} connectNulls={false} name="Proyectado por viajes"/>
            {C.curYear===2026&&(<ReferenceLine x={MESES[MEPCO_ADJUSTMENT_MONTH-1]} stroke={T.violet} strokeDasharray="4 3" strokeWidth={2} label={{value:"⚡ MEPCO",position:"top",fill:T.violet,fontSize:10,fontWeight:700}}/>)}
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>

      {C.alertas?.length>0&&(
        <div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:12,padding:"12px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <AlertTriangle size={14} color={T.red}/>
            <span style={{fontSize:12,fontWeight:600,color:T.red}}>Alertas ({C.alertas.length})</span>
            <button onClick={()=>setTab("alertas")} style={{marginLeft:"auto",background:"none",border:"none",color:T.accent,fontSize:11,cursor:"pointer",fontWeight:600}}>Ver todas</button>
          </div>
          {C.alertas.slice(0,3).map((a,i)=>(<div key={i} style={{fontSize:12,color:T.tx,padding:"3px 0",display:"flex",alignItems:"center",gap:6}}><a.icon size={12} color={a.type==="danger"?T.red:a.type==="warning"?T.amber:T.accent}/>{a.msg}</div>))}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
        <SectionCard title="Saldos bancarios" icon={Building2} T={T} color={T.teal}><MiniTable T={T} headers={["Banco","Saldo"]} rows={[...Object.entries(C.saldosBancos||{}).sort((a,b)=>b[1]-a[1]).map(([banco,saldo])=>[banco,fmtFull(saldo)]),["TOTAL",fmtFull(C.totalCaja)]]}/></SectionCard>
        <SectionCard title="Compromisos próximos 7 días" icon={Calendar} T={T} color={T.amber}>{C.compromisosProx?.length>0?(<MiniTable T={T} headers={["Fecha","Concepto","Monto"]} rows={C.compromisosProx.map(r=>[r.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.concepto.length>30?r.concepto.slice(0,28)+"...":r.concepto,fmtM(r.monto)])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin compromisos en los próximos 7 días</p>}</SectionCard>
        <SectionCard title={"Top clientes "+MESES[C.curMonth]} icon={Users} T={T} color={T.purple}><MiniTable T={T} headers={["Cliente","Facturación"]} rows={(C.topClientes||[]).map(c=>[c.name.length>25?c.name.slice(0,23)+"...":c.name,fmtM(c.total)])}/></SectionCard>
        <SectionCard title="DAP — próximos vencimientos" icon={PiggyBank} T={T} color={T.green}>{C.dapProximos?.length>0?(<MiniTable T={T} headers={["Banco","Monto","Vence","Tasa"]} rows={C.dapProximos.map(r=>[r.banco,fmtM(r.monto),r.vencimiento.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.tasa||""])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin DAPs vigentes</p>}</SectionCard>
      </div>
    </div>
  );
}
