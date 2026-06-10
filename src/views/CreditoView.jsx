import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Banknote, DollarSign, Calendar, Target, CreditCard, Clock, TrendingDown, FileSpreadsheet } from "lucide-react";
import { fmtM, fmtFull, parseDate, todayMidnight } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import MiniTable from "../components/MiniTable.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";
import Pagination from "../components/Pagination.jsx";
import { usePagination } from "../hooks/usePagination.js";
import DashboardLink from "../components/DashboardLink.jsx";

export default function CreditoView({ C, T }) {
  const proxFecha = C.creditoProxima ? parseDate(C.creditoProxima.fecha) : null;
  const proxLabel = proxFecha ? proxFecha.toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}) : "—";

  const allCuotas = C.creditoRows || [];
  const { page, setPage, totalPages, pageItems } = usePagination(allCuotas, 10);
  const now = todayMidnight();

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Crédito comercial — Banco Itaú</h2>
        <button onClick={async()=>{const{exportCreditoExcel}=await import("../services/exportExcel.js");exportCreditoExcel(C);}} style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,cursor:"pointer",color:T.green,padding:"7px 14px",fontSize:12,fontWeight:600,flexShrink:0}}>
          <FileSpreadsheet size={15}/>Excel
        </button>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={Banknote} label="Deuda total pendiente" value={fmtM(C.creditoDeudaTotal)} T={T} sub={`Capital ${fmtM(C.creditoCapitalPendiente)} + Intereses ${fmtM(C.creditoInteresesPendientes)}`} color={T.red} colorBg={T.redBg}/>
        <KpiCard icon={DollarSign} label="Cuota mensual" value={fmtM(C.creditoValorCuota)} T={T} sub={`${C.creditoTotalCuotas} cuotas totales`} color={T.amber} colorBg={T.amberBg}/>
        <KpiCard icon={Calendar} label="Próximo pago" value={proxLabel} T={T} sub={C.creditoProxima?`Cuota #${C.creditoProxima.cuota} · Capital ${fmtM(C.creditoProxima.capital)} + Interés ${fmtM(C.creditoProxima.interes)}`:"En período de gracia"} color={T.accent} colorBg={T.accentBg}/>
        <KpiCard icon={Target} label="Avance" value={`${C.creditoCuotasPagadas}/${C.creditoTotalCuotas}`} T={T} sub={`${C.creditoCuotasPorPagar} cuotas restantes`} color={T.green} colorBg={T.greenBg}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
        <SectionCard title="Resumen del crédito" icon={CreditCard} T={T} color={T.accent}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              ["Monto original", fmtFull(C.creditoMontoOriginal||0)],
              ["Plazo", `${C.creditoTotalCuotas} cuotas (${(C.creditoTotalCuotas||0)-(C.creditoCuotasGracia||0)} meses + ${C.creditoCuotasGracia||0} gracia)`],
              ["Cuota mensual", fmtFull(C.creditoValorCuota)],
              ["Cuotas pagadas", String(C.creditoCuotasPagadas)],
              ["Cuotas restantes", String(C.creditoCuotasPorPagar)],
              ["Saldo insoluto (capital)", fmtFull(C.creditoSaldoActual)],
              ["Intereses pendientes", fmtM(C.creditoInteresesPendientes)],
              ["Deuda total (cap+int)", fmtM(C.creditoDeudaTotal)],
              ["Total intereses del crédito", fmtM(C.creditoTotalIntereses)],
            ].map(([label,val],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<8?`1px solid ${T.border}22`:"none"}}>
                <span style={{fontSize:12,color:T.txM}}>{label}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.tx}}>{val}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Próximas cuotas" icon={Clock} T={T} color={T.amber}>
          <MiniTable T={T} maxRows={6} headers={["#","Fecha","Capital","Interés","Cuota","Saldo"]} rows={(C.creditoRows||[]).filter(r=>{const fd=parseDate(r.fecha);return fd&&fd>=now&&r.valorCuota>0;}).slice(0,6).map(r=>[r.cuota,r.fecha,fmtM(r.capital),fmtM(r.interes),fmtM(r.valorCuota),fmtM(r.saldo)])}/>
        </SectionCard>

        <SectionCard title="Evolución del saldo" icon={TrendingDown} T={T} color={T.green}>
          {allCuotas.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={allCuotas.filter(r=>r.saldo>0).map(r=>({cuota:`#${r.cuota}`,saldo:r.saldo}))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="cuota" tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false} interval={9}/>
                <YAxis tick={{fill:T.txM,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>fmtM(v)} width={55}/>
                <Tooltip content={<ChartTooltip T={T}/>}/>
                <Area type="monotone" dataKey="saldo" stroke={T.red} fill={T.redBg} name="Saldo"/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p style={{fontSize:12,color:T.txM}}>Sin datos</p>}
        </SectionCard>
      </div>

      <SectionCard title={`Tabla completa de cuotas (${allCuotas.length} cuotas)`} icon={CreditCard} T={T} color={T.accent}>
        {allCuotas.length > 0 ? (
          <>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr>{["#","Fecha","Capital","Interés","Cuota","Saldo","Estado"].map((h,i)=>(
                    <th key={i} style={{padding:"7px 10px",textAlign:i===0?"center":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,fontSize:11,whiteSpace:"nowrap",background:T.bg3}}>
                      {h}
                    </th>
                  ))}</tr>
                </thead>
                <tbody>
                  {pageItems.map((r,i)=>{
                    const fd = parseDate(r.fecha);
                    const pagada = fd && fd < now;
                    return (
                      <tr key={i} style={{borderBottom:`1px solid ${T.border}22`,background:pagada?T.greenBg+"88":"transparent",opacity:pagada?0.7:1}}>
                        <td style={{padding:"6px 10px",textAlign:"center",color:T.txM,fontSize:11}}>{r.cuota}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:T.tx}}>{r.fecha}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:T.tx}}>{fmtM(r.capital)}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:T.txM}}>{fmtM(r.interes)}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:T.tx,fontWeight:600}}>{fmtM(r.valorCuota)}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:T.txD}}>{fmtM(r.saldo)}</td>
                        <td style={{padding:"6px 10px",textAlign:"right"}}>
                          <span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:999,background:pagada?T.greenBg:T.accentBg,color:pagada?T.green:T.accent}}>
                            {pagada?"Pagada":"Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} T={T}/>
            <p style={{textAlign:"center",fontSize:11,color:T.txD,marginTop:6}}>
              Cuotas {page*10+1}–{Math.min((page+1)*10, allCuotas.length)} de {allCuotas.length}
            </p>
          </>
        ) : <p style={{fontSize:12,color:T.txM}}>Sin datos de cuotas</p>}
      </SectionCard>

      <DashboardLink T={T} color={T.teal} colorBg={T.tealBg}
        url="https://centro-financiero-eight.vercel.app/"
        label="Centro Financiero — pestaña Crédito con cronograma completo" />
    </div>
  );
}
