import { Truck, DollarSign, Banknote, Calendar, Clock, Building2, TrendingDown, FileSpreadsheet } from "lucide-react";
import { fmtM } from "../utils.js";
import { parseNum } from "../utils.js";
import KpiCard from "../components/KpiCard.jsx";
import MiniTable from "../components/MiniTable.jsx";
import SectionCard from "../components/SectionCard.jsx";
import Pagination from "../components/Pagination.jsx";
import { usePagination } from "../hooks/usePagination.js";
import DashboardLink from "../components/DashboardLink.jsx";

export default function LeasingView({ C, T }) {
  const leasingDetRows = C.leasingDet || [];
  const { page: detPage, setPage: setDetPage, totalPages: detTotalPages, pageItems: detPageItems } = usePagination(leasingDetRows, 10);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:T.tx,letterSpacing:-0.5}}>Leasing</h2>
        <button onClick={async()=>{const{exportLeasingExcel}=await import("../services/exportExcel.js");exportLeasingExcel(C);}} style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,cursor:"pointer",color:T.green,padding:"7px 14px",fontSize:12,fontWeight:600,flexShrink:0}}>
          <FileSpreadsheet size={15}/>Excel
        </button>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <KpiCard icon={Truck} label="Contratos activos" value={String(C.leasingContratosActivos)} T={T} sub={`${C.leasingOperaciones} operaciones de financiamiento`} color={T.accent} colorBg={T.accentBg}/>
        <KpiCard icon={DollarSign} label="Cuota mensual s/IVA" value={fmtM(C.leasingTotalCuotaSinIVA)} T={T} sub={`${(C.leasingTotalUF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF`} color={T.amber} colorBg={T.amberBg}/>
        <KpiCard icon={DollarSign} label="Cuota mensual c/IVA" value={fmtM(C.leasingTotalCuotaIVA)} T={T} color={T.red} colorBg={T.redBg}/>
        <KpiCard icon={Banknote} label="Deuda pendiente" value={fmtM(C.leasingDeudaTotal)} T={T} sub={`${(C.leasingDeudaTotalUF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF · al día de hoy`} color={T.red} colorBg={T.redBg}/>
      </div>

      <SectionCard title="Distribución de cuotas por día de pago" icon={Calendar} T={T} color={T.accent}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 150px",background:T.accentBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.accent}22`}}>
            <div style={{fontSize:10,color:T.accent,fontWeight:600,marginBottom:4}}>DÍA 5</div>
            <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{(C.cuotaDia5UF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF</div>
            <div style={{fontSize:11,color:T.txM,marginTop:2}}>{C.leasingDet?.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===5).reduce((s,r)=>s+(r._tractos||0),0)||0} contratos</div>
          </div>
          <div style={{flex:"1 1 150px",background:T.amberBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.amber}22`}}>
            <div style={{fontSize:10,color:T.amber,fontWeight:600,marginBottom:4}}>DÍA 15</div>
            <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{(C.cuotaDia15UF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF</div>
            <div style={{fontSize:11,color:T.txM,marginTop:2}}>{C.leasingDet?.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===15).reduce((s,r)=>s+(r._tractos||0),0)||0} contratos</div>
          </div>
          <div style={{flex:"1 1 150px",background:T.redBg,borderRadius:10,padding:"12px 16px",border:`1px solid ${T.red}22`}}>
            <div style={{fontSize:10,color:T.red,fontWeight:600,marginBottom:4}}>TOTAL MENSUAL</div>
            <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{(C.leasingTotalUF||0).toLocaleString("es-CL",{maximumFractionDigits:0})} UF</div>
            <div style={{fontSize:11,color:T.txM,marginTop:2}}>c/IVA: {fmtM(C.leasingTotalCuotaIVA)}</div>
          </div>
        </div>
      </SectionCard>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:16}}>
        <SectionCard title="Cartera por emisor" icon={Building2} T={T} color={T.accent}><MiniTable T={T} headers={["Emisor","Contratos","Cuota c/IVA","Deuda"]} rows={[...(C.leasingEmisores||[]).map(e=>[e.emisor,e.contratos,fmtM(e.cuotaIVA),fmtM(e.deudaCLP)]),["TOTAL",C.leasingContratosActivos,fmtM(C.leasingTotalCuotaIVA),fmtM(C.leasingDeudaTotal)]]}/></SectionCard>
        <SectionCard title="Próximas cuotas a pagar" icon={Clock} T={T} color={T.amber}>
          {C.leasingProxCuotas?.length>0?(
            <MiniTable T={T} headers={["Fecha","Días","CLP c/IVA","Bancos","Estado"]} rows={C.leasingProxCuotas.map(r=>[r.fecha,r.dias,fmtM(r.cuotaIVA),r.bancos,<span key="e" style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:r.estado==="URGENTE"?T.redBg:T.greenBg,color:r.estado==="URGENTE"?T.red:T.green}}>{r.estado}</span>])}/>
          ):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin cuotas próximas cargadas</p>}
        </SectionCard>
      </div>

      <SectionCard title="Proyección mensual — cuándo baja la cuota" icon={TrendingDown} T={T} color={T.green}>
        {C.leasingProyeccion?.length>0?(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Mes","Año","Cuota UF","CLP s/IVA","CLP c/IVA","Contratos","Vence","Ahorro UF"].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:i===0?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",fontSize:11}}>{h}</th>))}</tr></thead>
              <tbody>
                {C.leasingProyeccion.map((r,ri)=>{
                  const hasVence=r.vence&&r.vence.length>0;
                  const hasAhorro=r.ahorroUF>0;
                  return(
                    <tr key={ri} style={{borderBottom:`1px solid ${T.border}22`,background:hasVence?T.greenBg:"transparent"}}>
                      <td style={{padding:"7px 10px",color:T.tx,fontWeight:hasVence?600:400}}>{r.mes}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.txM}}>{r.anio}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontFamily:"monospace"}}>{r.cuotaUF?.toLocaleString("es-CL",{maximumFractionDigits:0})}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.tx}}>{fmtM(r.cuotaCLP)}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.tx,fontWeight:500}}>{fmtM(r.cuotaIVA)}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:T.txM}}>{r.contratos}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:hasVence?T.green:T.txD,fontWeight:hasVence?600:400,fontSize:11}}>{r.vence||"—"}</td>
                      <td style={{padding:"7px 10px",textAlign:"right",color:hasAhorro?T.green:T.txD,fontWeight:hasAhorro?600:400}}>{hasAhorro?`${r.ahorroUF.toLocaleString("es-CL",{maximumFractionDigits:0})} UF`:"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ):<p style={{fontSize:12,color:T.txM,padding:8}}>Sin proyección disponible</p>}
      </SectionCard>

      <SectionCard title={`Detalle por operación de financiamiento (${leasingDetRows.length})`} icon={Truck} T={T}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr>{["ID","Banco","Tractos","Cuota UF","Día Vcto","Inicio","Vence","Cuotas Pagadas","Por Pagar"].map((h,i)=>(
                <th key={i} style={{padding:"7px 10px",textAlign:i<2?"left":"right",color:T.txM,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",fontSize:11,background:T.bg3}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {detPageItems.map((r,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}22`}}>
                  <td style={{padding:"6px 10px",color:T.txM,fontSize:11}}>{r.ID||r.id}</td>
                  <td style={{padding:"6px 10px",color:T.tx,fontWeight:500,whiteSpace:"nowrap"}}>{r["Banco / Emisor"]||r.Banco||r.banco}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.tx}}>{r["N Tractos"]||r.Tractos}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.tx,fontFamily:"monospace"}}>{r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]||"—"}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.txM}}>{r["Dia Vcto"]||r.DiaVcto}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.txD,fontSize:11}}>{r["Fecha Inicio"]||r.FechaInicio||"—"}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.txD,fontSize:11}}>{r["Fecha Fin\n(Vencimiento)"]||r["Fecha Fin (Vencimiento)"]||r["Fecha Fin"]||"—"}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.green}}>{r._pagadas!=null?r._pagadas:(r["Cuotas\nPagadas"]||r["Cuotas Pagadas"]||"—")}</td>
                  <td style={{padding:"6px 10px",textAlign:"right",color:T.amber}}>{r._porPagar!=null?r._porPagar:(r["Cuotas Por\nPagar"]||r["Cuotas Por Pagar"]||"—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={detPage} totalPages={detTotalPages} setPage={setDetPage} T={T}/>
      </SectionCard>

      <DashboardLink T={T} color={T.teal} colorBg={T.tealBg}
        url="https://centro-financiero-eight.vercel.app/"
        label="Centro Financiero — pestaña Leasing con detalle por contrato" />
    </div>
  );
}
