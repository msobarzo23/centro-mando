import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Banknote, DollarSign, Calendar, Target, CreditCard, Clock, TrendingDown, FileSpreadsheet } from "lucide-react";
import { fmtM, fmtFull, parseDate } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import MiniTable from "../components/MiniTable.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ChartTooltip from "../components/ChartTooltip.jsx";

export default function CreditoView({ C, T }) {
  const proxFecha = C.creditoProxima ? parseDate(C.creditoProxima.fecha) : null;
  const proxLabel = proxFecha ? proxFecha.toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"}) : "—";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Crédito comercial — Banco Itaú</h2>
        <button onClick={async()=>{const{exportCreditoExcel}=await import("../services/exportExcel.js");exportCreditoExcel(C);}} style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,cursor:"pointer",color:T.green,padding:"7px 14px",fontSize:12,fontWeight:600,flexShrink:0}}>
          <FileSpreadsheet size={15}/>Excel
        </button>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={Banknote} label="Deuda total pendiente" value={fmtM(C.creditoDeudaTotal)} T={T} sub={`Capital ${fmtM(C.creditoSaldoActual)} + Intereses ${fmtM(C.creditoInteresesPendientes)}`} color={T.red} colorBg={T.redBg}/>
        <KpiCard icon={DollarSign} label="Cuota mensual" value={fmtM(C.creditoValorCuota)} T={T} sub={`${C.creditoTotalCuotas} cuotas totales`} color={T.amber} colorBg={T.amberBg}/>
        <KpiCard icon={Calendar} label="Próximo pago" value={proxLabel} T={T} sub={C.creditoProxima?`Cuota #${C.creditoProxima.cuota} · Capital ${fmtM(C.creditoProxima.capital)} + Interés ${fmtM(C.creditoProxima.interes)}`:"En período de gracia"} color={T.accent} colorBg={T.accentBg}/>
        <KpiCard icon={Target} label="Avance" value={`${C.creditoCuotasPagadas}/${C.creditoTotalCuotas}`} T={T} sub={`${C.creditoCuotasPorPagar} cuotas restantes`} color={T.green} colorBg={T.greenBg}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
        <SectionCard title="Resumen del crédito" icon={CreditCard} T={T} color={T.accent}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              ["Monto original", fmtFull(5000000000)],
              ["Plazo", "60 cuotas (58 meses + 2 gracia)"],
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
          <MiniTable T={T} maxRows={6} headers={["#","Fecha","Capital","Interés","Cuota","Saldo"]} rows={(C.creditoRows||[]).filter(r=>{const fd=parseDate(r.fecha);return fd&&fd>=new Date()&&r.valorCuota>0;}).slice(0,6).map(r=>[r.cuota,r.fecha,fmtM(r.capital),fmtM(r.interes),fmtM(r.valorCuota),fmtM(r.saldo)])}/>
        </SectionCard>

        <SectionCard title="Evolución del saldo" icon={TrendingDown} T={T} color={T.green}>
          {C.creditoRows?.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={(C.creditoRows||[]).filter(r=>r.saldo>0).map(r=>({cuota:`#${r.cuota}`,saldo:r.saldo}))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                <XAxis dataKey="cuota" tick={{fill:T.txM,fontSize:9}} axisLine={false} tickLine={false} interval={9}/>
                <YAxis tick={{fill:T.txM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>fmtM(v)} width={55}/>
                <Tooltip content={<ChartTooltip T={T}/>}/>
                <Area type="monotone" dataKey="saldo" stroke={T.red} fill={T.redBg} name="Saldo"/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p style={{fontSize:12,color:T.txM}}>Sin datos</p>}
        </SectionCard>
      </div>
    </div>
  );
}
