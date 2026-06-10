import {
  Building2, PiggyBank, Gauge, Calendar, TrendingUp, Clock, FileSpreadsheet, Scale, Landmark,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { MESES_FULL } from "../constants.js";
import { fmtM, fmtFull, parseDate } from "../utils.js";
import ChartTooltip from "../components/ChartTooltip.jsx";
import KpiCard from "../components/KpiCard.jsx";
import MiniTable from "../components/MiniTable.jsx";
import SectionCard from "../components/SectionCard.jsx";
import DashboardLink from "../components/DashboardLink.jsx";

export default function FinanzasView({ C, T }) {
  const DapBadge = ({ label, color, bg }) => (
    <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,background:bg,color,letterSpacing:0.3}}>{label}</span>
  );
  const tipoLabel = { trabajo:"Trabajo", inversion:"Inversión", credito:"Crédito" };
  const tipoColor = { trabajo:T.accent, inversion:T.green, credito:T.amber };
  const tipoBg = { trabajo:T.accentBg, inversion:T.greenBg, credito:T.amberBg };

  // Capacidad de pago del leasing: inversión disponible (DAP Inversión + FF.MM.)
  // menos la deuda total de leasing. El crédito Itaú NO se considera (decisión de
  // gerencia). Responde: "si liquidáramos las inversiones hoy, ¿alcanza para pagar
  // todo el leasing?".
  const invDisponible = C.totalInversionReal || 0;
  // Deuda c/IVA: es lo que efectivamente saldría de caja si se pagara todo el
  // leasing hoy. Comparar contra la deuda s/IVA hacía ver la posición mejor de lo real.
  const deudaLeasing = C.leasingDeudaTotalIVA || C.leasingDeudaTotal || 0;
  const posicionNeta = invDisponible - deudaLeasing;
  const leasingAlcanza = posicionNeta >= 0;
  const coberturaLeasing = deudaLeasing > 0 ? (invDisponible / deudaLeasing) * 100 : null;
  const resColor = leasingAlcanza ? T.green : T.red;
  const resBg = leasingAlcanza ? T.greenBg : T.redBg;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Finanzas</h2>
        <button onClick={async()=>{const{exportFinanzasExcel}=await import("../services/exportExcel.js");exportFinanzasExcel(C);}} style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,cursor:"pointer",color:T.green,padding:"7px 14px",fontSize:12,fontWeight:600,flexShrink:0}}>
          <FileSpreadsheet size={15}/>Excel
        </button>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={Building2} label="Caja total" value={fmtM(C.totalCaja)} T={T} color={T.teal} colorBg={T.tealBg}/>
        <KpiCard
          icon={Gauge} label="Liquidez 30d"
          value={C.coberturaRatio30!==null?`${C.coberturaRatio30.toFixed(2)}x`:"—"} T={T}
          sub={C.coberturaRatio30!==null?`${fmtM(C.liquidez30)} vs ${fmtM(C.comp30)} compromisos`:""}
          color={C.coberturaRatio30===null?T.txM:C.coberturaRatio30>=1.2?T.green:C.coberturaRatio30>=1?T.amber:T.red}
          colorBg={C.coberturaRatio30===null?T.bg3:C.coberturaRatio30>=1.2?T.greenBg:C.coberturaRatio30>=1?T.amberBg:T.redBg}
          tooltip={<div>
            <div style={{fontWeight:700,color:T.tooltipTx,marginBottom:6,fontSize:12}}>Desglose Liquidez operativa 30d</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Caja bancaria</span><strong>{fmtM(C.totalCaja)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ DAP Trabajo (vence 30d)</span><strong>{fmtM(C.dapTrabajoVence30||0)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>+ Fondos mutuos</span><strong>{fmtM(C.totalFondos)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 3px",borderTop:`1px solid ${T.tooltipTx}22`,marginTop:3,fontWeight:700}}><span>= Liquidez disponible</span><strong>{fmtM(C.liquidez30)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>÷ Compromisos 30d</span><strong>{fmtM(C.comp30)}</strong></div>
            <div style={{fontSize:11,color:T.tooltipTx,opacity:0.7,marginTop:8,lineHeight:1.4,paddingTop:6,borderTop:`1px solid ${T.tooltipTx}22`}}>
              Excluye DAP Crédito (compra terrenos) e Inversión (ahorro largo plazo).
            </div>
          </div>}
        />
        <KpiCard icon={Building2} label="Inversión real" value={fmtM(C.totalInversionReal)} T={T} sub={`DAP Inv. ${fmtM(C.totalDAPInversion)} + FF.MM. ${fmtM(C.totalFondos)}`} color={T.green} colorBg={T.greenBg}/>
        <KpiCard icon={Calendar} label="Compromisos mes" value={fmtM(C.totalCompromisosMes)} T={T} sub={`Guardado: ${fmtM(C.totalGuardadoMes)}`} color={T.amber} colorBg={T.amberBg}/>
      </div>

      <SectionCard title="¿Alcanzan las inversiones para pagar todo el leasing hoy?" icon={Scale} T={T} color={resColor}
        action={coberturaLeasing!==null&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:10,background:resBg,color:resColor,whiteSpace:"nowrap"}}>Cubre {coberturaLeasing.toLocaleString("es-CL",{maximumFractionDigits:0})}%</span>}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"stretch",marginBottom:14}}>
          <div style={{flex:"1 1 180px",background:T.greenBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.green}22`}}>
            <div style={{fontSize:11,color:T.green,fontWeight:600,marginBottom:4}}>INVERSIÓN DISPONIBLE</div>
            <div style={{fontSize:22,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>{fmtM(invDisponible)}</div>
            <div style={{fontSize:11,color:T.txD,marginTop:4}}>DAP Inversión ({fmtM(C.totalDAPInversion)}) + FF.MM. ({fmtM(C.totalFondos)})</div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:T.txM,flex:"0 0 auto"}}>−</div>
          <div style={{flex:"1 1 180px",background:T.redBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.red}22`}}>
            <div style={{fontSize:11,color:T.red,fontWeight:600,marginBottom:4}}>DEUDA TOTAL LEASING (C/IVA)</div>
            <div style={{fontSize:22,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>{fmtM(deudaLeasing)}</div>
            <div style={{fontSize:11,color:T.txD,marginTop:4}}>Cuotas pendientes c/IVA de todos los contratos activos</div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:T.txM,flex:"0 0 auto"}}>=</div>
          <div style={{flex:"1 1 180px",background:resBg,borderRadius:10,padding:"12px 16px",border:`1.5px solid ${resColor}`}}>
            <div style={{fontSize:11,color:resColor,fontWeight:600,marginBottom:4}}>POSICIÓN NETA</div>
            <div style={{fontSize:22,fontWeight:800,color:resColor,letterSpacing:-0.5}}>{fmtM(posicionNeta)}</div>
            <div style={{fontSize:11,color:resColor,fontWeight:600,marginTop:4}}>{leasingAlcanza?"✓ Alcanza y sobra":"✗ No alcanza"}</div>
          </div>
        </div>
        <div style={{padding:"10px 14px",background:resBg,borderRadius:8,fontSize:12.5,color:T.tx,lineHeight:1.5,fontWeight:500,border:`1px solid ${resColor}33`}}>
          {leasingAlcanza
            ? <>Si se liquidaran las inversiones hoy, alcanzarían a pagar <strong>todo el leasing</strong> y sobrarían <strong style={{color:resColor}}>{fmtM(posicionNeta)}</strong>.</>
            : <>Las inversiones de hoy <strong>no alcanzan</strong> a cubrir todo el leasing: faltarían <strong style={{color:resColor}}>{fmtM(Math.abs(posicionNeta))}</strong>{coberturaLeasing!==null&&<> (cubren el {coberturaLeasing.toLocaleString("es-CL",{maximumFractionDigits:0})}% de la deuda)</>}.</>}
        </div>
        <div style={{marginTop:10,fontSize:11.5,color:T.txD,lineHeight:1.5}}>
          Inversión disponible = solo DAP de Inversión + Fondos mutuos. <strong>No</strong> incluye la caja en bancos, el DAP de trabajo ni la reserva del DAP de crédito. El crédito Itaú no se considera en este cálculo.
        </div>
      </SectionCard>

      <SectionCard title="Depósitos a plazo — desglose por tipo" icon={PiggyBank} T={T} color={T.purple}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
          <div style={{flex:"1 1 150px",background:T.accentBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.accent}22`}}>
            <div style={{fontSize:11,color:T.accent,fontWeight:600,marginBottom:4}}>DAP TRABAJO</div>
            <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAPTrabajo)}</div>
            <div style={{fontSize:11,color:T.txM,marginTop:2}}>Ganancia: {fmtM(C.gananciaDAPTrabajo)}</div>
            <div style={{fontSize:11,color:T.txD,marginTop:4}}>Capital de trabajo rotativo</div>
          </div>
          <div style={{flex:"1 1 150px",background:T.greenBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.green}22`}}>
            <div style={{fontSize:11,color:T.green,fontWeight:600,marginBottom:4}}>DAP INVERSIÓN</div>
            <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAPInversion)}</div>
            <div style={{fontSize:11,color:T.txM,marginTop:2}}>Ganancia: {fmtM(C.gananciaDAPInversion)}</div>
            <div style={{fontSize:11,color:T.txD,marginTop:4}}>Inversión a mayor plazo</div>
          </div>
          <div style={{flex:"1 1 150px",background:T.amberBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.amber}22`}}>
            <div style={{fontSize:11,color:T.amber,fontWeight:600,marginBottom:4}}>DAP CRÉDITO</div>
            <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAPCredito)}</div>
            <div style={{fontSize:11,color:T.txM,marginTop:2}}>Ganancia: {fmtM(C.gananciaDAPCredito)}</div>
            <div style={{fontSize:11,color:T.txD,marginTop:4}}>Reserva cuotas crédito Itaú</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${T.border}`}}>
          <span style={{fontSize:13,fontWeight:600,color:T.tx}}>Total DAPs vigentes</span>
          <span style={{fontSize:13,fontWeight:700,color:T.tx}}>{fmtM(C.totalDAP)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{fontSize:12,color:T.txM}}>Ganancia total DAPs</span>
          <span style={{fontSize:12,fontWeight:600,color:T.green}}>{fmtM(C.gananciaDAP)}</span>
        </div>
      </SectionCard>

      <SectionCard title="Cobertura de liquidez — próximas 4 semanas" icon={Gauge} T={T} color={T.teal} action={<span style={{fontSize:11,color:T.txD,fontStyle:"italic"}}>Basado en tu calendario (columna "Falta")</span>}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Semana","Período","Caja inicial","DAPs Trab.","Compromisos","Guardado","Falta","Estado"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i<=1?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
            <tbody>
              {(C.coberturaSemanas||[]).map((s,i)=>{
                const estadoColor=s.compCount===0?T.txD:s.falta===0?T.green:s.falta<s.compromisos*0.2?T.amber:T.red;
                const estadoBg=s.compCount===0?"transparent":s.falta===0?T.greenBg:s.falta<s.compromisos*0.2?T.amberBg:T.redBg;
                const estadoLabel=s.compCount===0?"—":s.falta===0?"✓ Cubierto":s.falta<s.compromisos*0.2?"⚠ Por ajustar":"✗ Descubierto";
                return(
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                    <td style={{padding:"9px 10px",color:T.tx,fontWeight:600}}>S{s.semana}{i===0&&<span style={{marginLeft:6,fontSize:11,padding:"2px 6px",borderRadius:4,background:T.accentBg,color:T.accent,fontWeight:700}}>ACTUAL</span>}</td>
                    <td style={{padding:"9px 10px",color:T.txM,fontSize:11}}>{s.label}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",color:s.cajaInicio>0?T.tx:T.txD}}>{fmtM(s.cajaInicio)}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",color:s.dapVence>0?T.green:T.txD,fontWeight:s.dapVence>0?600:400}}>{s.dapCount>0?`${fmtM(s.dapVence)} (${s.dapCount})`:"—"}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",color:T.tx,fontWeight:600}}>{s.compCount>0?`${fmtM(s.compromisos)} (${s.compCount})`:"—"}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",color:s.guardado>0?T.green:T.txD,fontWeight:s.guardado>0?500:400}}>{s.guardado>0?fmtM(s.guardado):"—"}</td>
                    <td style={{padding:"9px 10px",textAlign:"right",color:s.falta>0?T.red:T.txD,fontWeight:s.falta>0?700:400}}>{s.falta>0?fmtM(s.falta):"—"}</td>
                    <td style={{padding:"9px 10px",textAlign:"right"}}><span style={{background:estadoBg,color:estadoColor,padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{estadoLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:10,padding:"10px 12px",background:T.bg3+"44",borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
          <strong style={{color:T.tx}}>Lectura:</strong> estado basado en tu control manual (<strong>"Falta"</strong>). <span style={{color:T.green,fontWeight:600}}>✓ Cubierto</span> = falta = 0 · <span style={{color:T.amber,fontWeight:600}}>⚠ Por ajustar</span> = falta &lt; 20% · <span style={{color:T.red,fontWeight:600}}>✗ Descubierto</span> = falta ≥ 20%.
        </div>
      </SectionCard>

      {(C.servicioDeudaMensual||[]).length>0&&(()=>{
        const data=C.servicioDeudaMensual.map(r=>({label:r.label,Leasing:r.leasing/1e6,"Crédito Itaú":r.credito/1e6}));
        const actual=C.servicioDeudaMensual[0];
        const hitos=C.servicioDeudaMensual.filter((r,i)=>i>0&&r.total<C.servicioDeudaMensual[i-1].total*0.97).slice(0,3);
        return(
          <SectionCard title="Servicio de deuda mensual — leasing + crédito Itaú" icon={Landmark} T={T} color={T.red}
            action={<span style={{fontSize:11,color:T.txD,fontStyle:"italic"}}>Este mes: <strong style={{color:T.red}}>{fmtM(actual.total)}</strong></span>}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="label" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false} interval={Math.max(0,Math.floor(data.length/14)-1)}/>
                <YAxis tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}M`} width={55}/>
                <Tooltip content={<ChartTooltip T={T} valuesInM/>}/>
                <Legend wrapperStyle={{fontSize:11,color:T.txM}}/>
                <Bar dataKey="Leasing" stackId="d" fill={T.violet} radius={[0,0,0,0]}/>
                <Bar dataKey="Crédito Itaú" stackId="d" fill={T.red} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{marginTop:10,padding:"10px 12px",background:T.bg3+"44",borderRadius:8,fontSize:11,color:T.txM,lineHeight:1.5}}>
              <strong style={{color:T.tx}}>Cuánto sale por deuda cada mes</strong> (leasing c/IVA + cuota crédito), desde hoy hasta el último vencimiento.
              {hitos.length>0&&<> Próximos alivios de caja: {hitos.map((h,i)=>(<span key={i}>{i>0&&" · "}<strong style={{color:T.green}}>{h.label}</strong> (baja a {fmtM(h.total)}/mes)</span>))}.</>}
            </div>
          </SectionCard>
        );
      })()}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
        <SectionCard title="Saldos bancarios" icon={Building2} T={T} color={T.teal}><MiniTable T={T} headers={["Banco","Saldo"]} rows={[...Object.entries(C.saldosBancos||{}).sort((a,b)=>b[1]-a[1]).map(([banco,saldo])=>[banco,fmtFull(saldo)]),["TOTAL",fmtFull(C.totalCaja)]]}/></SectionCard>
        <SectionCard title="Fondos mutuos" icon={TrendingUp} T={T} color={T.purple}><MiniTable T={T} headers={["Fondo","Admin.","Invertido","Actual","Rent. %"]} rows={(C.fondosSaldos||[]).map(r=>[r.fondo,r.admin,fmtM(r.invertido),fmtM(r.actual),r.rentPct])}/>{C.totalFondos>0&&(<div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",borderTop:`1px solid ${T.border}`,marginTop:8}}><span style={{fontSize:12,fontWeight:600,color:T.tx}}>Total FF.MM.</span><span style={{fontSize:12,fontWeight:700,color:T.tx}}>{fmtM(C.totalFondos)}</span></div>)}</SectionCard>
        <SectionCard title="DAPs — próximos vencimientos" icon={PiggyBank} T={T} color={T.accent}><MiniTable T={T} headers={["Banco","Tipo","Monto","Final","Vence","Tasa"]} rows={(C.dapProximos||[]).map(r=>[r.banco,<DapBadge key="t" label={tipoLabel[r._tipoNorm]||r.tipo} color={tipoColor[r._tipoNorm]||T.txM} bg={tipoBg[r._tipoNorm]||T.bg3}/>,fmtM(r.monto),fmtM(r.montoFinal),r.vencimiento?.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.tasa||""])}/></SectionCard>
        <SectionCard title="Compromisos próximos 7 días" icon={Calendar} T={T} color={T.amber}>{C.compromisosProx?.length>0?(<MiniTable T={T} headers={["Fecha","Concepto","Monto","Guardado","Falta"]} rows={C.compromisosProx.map(r=>[r.fecha.toLocaleDateString("es-CL",{weekday:"short",day:"2-digit",month:"short"}),r.concepto.length>25?r.concepto.slice(0,23)+"...":r.concepto,fmtM(r.monto),fmtM(r.guardado),r.falta>0?fmtM(r.falta):"Ok"])}/>):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin compromisos pendientes</p>}</SectionCard>
        <SectionCard title={`Calendario del mes — ${MESES_FULL[C.curMonth]}`} icon={Clock} T={T} color={T.accent}><MiniTable T={T} maxRows={15} headers={["Fecha","Concepto","Monto","Estado"]} rows={(C.compromisosMes||[]).sort((a,b)=>a.fecha-b.fecha).map(r=>[r.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}),r.concepto.length>28?r.concepto.slice(0,26)+"...":r.concepto,fmtM(r.monto),r.estado||"-"])}/></SectionCard>
      </div>

      <DashboardLink T={T} color={T.teal} colorBg={T.tealBg}
        url="https://centro-financiero-eight.vercel.app/"
        label="Centro Financiero — bancos, flujo de caja, inversiones y cobranzas" />
    </div>
  );
}
