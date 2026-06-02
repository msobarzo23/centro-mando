import { Calendar, PiggyBank, TrendingDown, Users, Truck, AlertTriangle, CreditCard } from "lucide-react";
import {
  MESES, COMODIN_TRACTO, COMODIN_CONDUCTOR,
  UMBRAL_LIQUIDEZ_AMARILLA, UMBRAL_VIAJES_ALERTA, UMBRAL_OCUPACION_ALERTA, IVA_RATE,
} from "../constants.js";
import {
  parseNum, parseDate, normName, fmtM, pctChange,
  businessDaysInMonth, businessDaysElapsed, todayMidnight,
} from "../utils.js";
import { parseHistorico, computeComparativas } from "./historico.js";
import {
  getReajusteHistorico, getUpliftPonderado,
  MEPCO_ADJUSTMENT_MONTH, MEPCO_ADJUSTMENT_YEAR, MEPCO_TRIP_START_MONTH,
  MEPCO_HISTORICO_CORTE_YEAR, MEPCO_HISTORICO_CORTE_MONTH, MEPCO_HISTORICO_CORTE_LABEL,
} from "../data/mepcoReajustes.js";
import { POZO_COPEC_TOTALES, POZO_COPEC_POR_MES, POZO_COPEC_META } from "../data/copecSobrecosto.js";

// Orquestador único del cómputo del dashboard. Recibe el objeto `data` con
// las planillas crudas (ventas, viajes, finBancos, etc.) y devuelve TODAS las
// métricas que las vistas consumen via la prop `C`. Es función pura: misma
// entrada → misma salida.
export function computeAll(data) {
  if (!data || !data.ventas) return null;
  const now = new Date(), curMonth = now.getMonth(), curYear = now.getFullYear();
  const nowMid = todayMidnight();

  // ══════════ VENTAS ══════════
  const ventasRows = (data.ventas||[]).map(r => {
    const d = parseDate(r.FECHA||r.Fecha||r.fecha);
    const neto = parseNum(r.NETO||r.Neto||r.neto);
    const docStr = (r.DOCUMENTO||r.Documento||r.documento||r.TIPO||r.Tipo||r.tipo||"").toString().toUpperCase();
    const exenta = docStr.includes("EXENTA") || docStr.includes("NO AFECTA");
    const bruto = exenta ? neto : neto * (1 + IVA_RATE);
    return {...r, _date:d, _neto:neto, _bruto:bruto, _exenta:exenta, _rut:(r.RUT||r.Rut||r.rut||"").toString().trim()};
  }).filter(r => r._date);
  const ventasMesActual = ventasRows.filter(r => r._date.getMonth()===curMonth && r._date.getFullYear()===curYear);
  const ventasMesAnterior = ventasRows.filter(r => { const pm=curMonth===0?11:curMonth-1; const py=curMonth===0?curYear-1:curYear; return r._date.getMonth()===pm && r._date.getFullYear()===py; });
  const totalMesActual = ventasMesActual.reduce((s,r) => s+r._neto, 0);
  const totalMesAnterior = ventasMesAnterior.reduce((s,r) => s+r._neto, 0);
  const totalMesAnteriorBruto = ventasMesAnterior.reduce((s,r) => s+r._bruto, 0);
  const ventasPorMes = []; for (let m=0; m<12; m++) { const rows=ventasRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===curYear); ventasPorMes.push({mes:MESES[m],total:rows.reduce((s,r)=>s+r._neto,0),count:rows.length}); }
  const clienteMap = {};
  ventasMesActual.forEach(r => {
    const name = r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"Sin nombre";
    if (!clienteMap[name]) clienteMap[name] = { total: 0, rut: r._rut || "" };
    clienteMap[name].total += r._neto;
    if (!clienteMap[name].rut && r._rut) clienteMap[name].rut = r._rut;
  });
  const mesActualNum = curMonth + 1;
  const topClientes = Object.entries(clienteMap)
    .sort((a,b)=>b[1].total-a[1].total)
    .slice(0,8)
    .map(([name, info]) => {
      const aplica = curYear >= MEPCO_ADJUSTMENT_YEAR && mesActualNum >= MEPCO_ADJUSTMENT_MONTH;
      // Histórico: el aporte MEPCO solo se atribuye dentro de la ventana de
      // transición (≤ mayo 2026); desde junio la tarifa ya es "normal".
      const { pct } = aplica ? getReajusteHistorico(info.rut, mesActualNum, curYear) : { pct: 0 };
      const mepcoImpact = pct > 0 ? info.total * pct / (1 + pct) : 0;
      return { name, total: info.total, rut: info.rut, sinMepco: info.total - mepcoImpact, mepcoImpact };
    });
  const ventasAnoActual = ventasRows.filter(r=>r._date.getFullYear()===curYear).reduce((s,r)=>s+r._neto,0);
  const ventasAnoAnterior = ventasRows.filter(r=>r._date.getFullYear()===curYear-1).reduce((s,r)=>s+r._neto,0);

  const prevYear = curYear - 1;
  const ventasPorMesComparado = [];
  let acumActual = 0, acumAnterior = 0;
  for (let m=0; m<12; m++) {
    const totalActual = ventasRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===curYear).reduce((s,r)=>s+r._neto,0);
    const totalAnterior = ventasRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===prevYear).reduce((s,r)=>s+r._neto,0);
    const var_pct = totalAnterior>0 ? pctChange(totalActual,totalAnterior) : (totalActual>0?100:0);
    ventasPorMesComparado.push({mes:MESES[m],actual:totalActual,anterior:totalAnterior,var_pct});
    if (m<=curMonth) { acumActual+=totalActual; acumAnterior+=totalAnterior; }
  }

  const dayOfYear = Math.floor((now - new Date(curYear,0,1)) / 86400000);
  const acumCorteActual = ventasRows.filter(r=>{if(r._date.getFullYear()!==curYear)return false;const doy=Math.floor((r._date-new Date(curYear,0,1))/86400000);return doy<=dayOfYear;}).reduce((s,r)=>s+r._neto,0);
  const acumCorteAnterior = ventasRows.filter(r=>{if(r._date.getFullYear()!==prevYear)return false;const doy=Math.floor((r._date-new Date(prevYear,0,1))/86400000);return doy<=dayOfYear;}).reduce((s,r)=>s+r._neto,0);

  const ultimasFacturas = [...ventasRows].sort((a,b)=>b._date-a._date).slice(0,5).map(r=>({
    fecha:r._date.toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"}),
    folio:r.FOLIO||r.Folio||r.folio||"—",
    tipo:r.TIPO||r.Tipo||r.tipo||r["TIPO DOCUMENTO"]||r["Tipo Documento"]||"Factura",
    cliente:r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"—",
    neto:r._neto,
  }));

  // ══════════ PROYECCIÓN ESTACIONAL ══════════
  const monthsWithData = ventasPorMesComparado.map((m,i)=>m.actual>0?i+1:0).filter(m=>m>0);
  const lastDataMonth = monthsWithData[monthsWithData.length-1]||0;
  const monthInProgress = lastDataMonth===curMonth+1;
  const closedMonths = monthInProgress ? monthsWithData.slice(0,-1) : monthsWithData;
  const openMonth = monthInProgress ? lastDataMonth : null;
  const ytdClosed = closedMonths.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.actual||0),0);
  const ytdOpen = openMonth ? (ventasPorMesComparado[openMonth-1]?.actual||0) : 0;
  const ytdTotal = ytdClosed + ytdOpen;

  const allMonthsCount = monthsWithData.length;
  const projLinear = allMonthsCount>0 ? (ytdTotal/allMonthsCount)*12 : 0;

  let projProrata = 0;
  if (closedMonths.length>0) {
    const avgClosed = ytdClosed/closedMonths.length;
    let openProjected = ytdOpen;
    if (openMonth) { const elapsed=businessDaysElapsed(curYear,openMonth,now); const total=businessDaysInMonth(curYear,openMonth); if(elapsed>0)openProjected=ytdOpen*(total/elapsed); }
    const remainingMonths = 12-allMonthsCount;
    projProrata = ytdClosed+openProjected+(avgClosed*remainingMonths);
  } else if (openMonth) {
    const elapsed=businessDaysElapsed(curYear,openMonth,now); const total=businessDaysInMonth(curYear,openMonth);
    const openProjected = elapsed>0 ? ytdOpen*(total/elapsed) : ytdOpen;
    projProrata = openProjected*12;
  }

  // ══════════ UPLIFT MEPCO PARA PROYECCIONES ══════════
  // Construir lista {rut, prev} del año previo, ponderada por mix de clientes.
  const clientPrevByRut = {};
  ventasRows.forEach(r => {
    if (r._date.getFullYear() !== prevYear || !r._rut) return;
    clientPrevByRut[r._rut] = (clientPrevByRut[r._rut] || 0) + r._neto;
  });
  const clientPrevList = Object.entries(clientPrevByRut).map(([rut, prev]) => ({ rut, prev }));

  const upliftPorMes = {};
  for (let m = 1; m <= 12; m++) {
    if (curYear === MEPCO_ADJUSTMENT_YEAR && m >= MEPCO_TRIP_START_MONTH) {
      upliftPorMes[m] = getUpliftPonderado(clientPrevList, m);
    } else if (curYear > MEPCO_ADJUSTMENT_YEAR) {
      upliftPorMes[m] = getUpliftPonderado(clientPrevList, MEPCO_ADJUSTMENT_MONTH);
    } else {
      upliftPorMes[m] = 0;
    }
  }

  let projSeasonal = 0;
  const totalPrev = ventasAnoAnterior;
  if (totalPrev>0) {
    const weights = ventasPorMesComparado.map(m=>m.anterior/totalPrev);
    const weightsClosed = closedMonths.reduce((s,m)=>s+weights[m-1],0);
    if (closedMonths.length>0 && weightsClosed>0) {
      const annualFromClosed = ytdClosed/weightsClosed;
      let openContribution = ytdOpen;
      if (openMonth) {
        const weightOpen=weights[openMonth-1];
        const upliftOpen=upliftPorMes[openMonth]||0;
        const expectedOpen=annualFromClosed*weightOpen*(1+upliftOpen);
        const elapsed=businessDaysElapsed(curYear,openMonth,now); const total=businessDaysInMonth(curYear,openMonth);
        const openProrata=elapsed>0?ytdOpen*(total/elapsed):ytdOpen;
        openContribution=Math.max(openProrata,expectedOpen);
      }
      const futureMonths = []; for(let m=1;m<=12;m++){if(!closedMonths.includes(m)&&m!==openMonth)futureMonths.push(m);}
      const futureContribution = futureMonths.reduce((s,m)=>s+(annualFromClosed*weights[m-1]*(1+(upliftPorMes[m]||0))),0);
      projSeasonal = ytdClosed+openContribution+futureContribution;
    }
  }
  if (projSeasonal===0 && projProrata>0) projSeasonal=projProrata;

  const futureMonthsList = []; for(let m=1;m<=12;m++){if(!monthsWithData.includes(m))futureMonthsList.push(m);}
  const upliftFuturos = futureMonthsList.map(m => upliftPorMes[m]||0).filter(v=>v>0);
  const upliftAplicadoPromedio = upliftFuturos.length>0 ? upliftFuturos.reduce((s,v)=>s+v,0)/upliftFuturos.length : 0;

  const projections = {
    monthInProgress, openMonth, closedMonthsCount:closedMonths.length,
    ytdClosed, ytdOpen, ytdTotal,
    linear:Math.round(projLinear), prorata:Math.round(projProrata), seasonal:Math.round(projSeasonal),
    businessDaysElapsed:openMonth?businessDaysElapsed(curYear,openMonth,now):0,
    businessDaysTotal:openMonth?businessDaysInMonth(curYear,openMonth):0,
    upliftPorMes, upliftAplicadoPromedio, upliftAplicado: upliftAplicadoPromedio>0,
  };

  const ventasPorMesConProyeccion = ventasPorMesComparado.map((m,i) => {
    const mNum = i+1;
    if (m.actual>0 && mNum!==openMonth) return {...m, proyectado:null, tipo:"real"};
    else if (mNum===openMonth) {
      const weight = totalPrev>0 ? m.anterior/totalPrev : (1/12);
      const expected = projSeasonal*weight;
      const faltante = Math.max(0, expected-m.actual);
      return {...m, proyectado:faltante, tipo:"parcial"};
    } else {
      const weight = totalPrev>0 ? m.anterior/totalPrev : (1/12);
      return {...m, actual:0, proyectado:projSeasonal*weight, tipo:"futuro"};
    }
  });

  // ══════════ IMPACTO MEPCO (registro histórico de la transición) ══════════
  // Para cada factura dentro de la ventana de transición (mayo 2026), calcular
  // el aporte atribuible al reajuste: neto × pct/(1+pct). El neto facturado ya
  // viene con tarifa nueva, así que la "contribución MEPCO" se obtiene despejando.
  // Se usa getReajusteHistorico: desde junio 2026 devuelve 0, de modo que el
  // impacto queda CONGELADO como cierre del capítulo MEPCO (ver mepcoReajustes.js).
  const mepcoActivo = curYear>=MEPCO_ADJUSTMENT_YEAR && (curYear>MEPCO_ADJUSTMENT_YEAR || curMonth+1>=MEPCO_ADJUSTMENT_MONTH);
  // ¿ya pasamos el corte? (estamos viendo un mes posterior a la ventana)
  const mepcoHistoricoCerrado = curYear>MEPCO_HISTORICO_CORTE_YEAR ||
    (curYear===MEPCO_HISTORICO_CORTE_YEAR && curMonth+1>MEPCO_HISTORICO_CORTE_MONTH);
  const mepcoCorteLabel = MEPCO_HISTORICO_CORTE_LABEL;
  let impactoMepcoMes=0, impactoMepcoAcum=0;
  if (mepcoActivo) {
    ventasRows.forEach(r => {
      if (r._date.getFullYear() !== curYear) return;
      const mes = r._date.getMonth() + 1;
      if (mes < MEPCO_ADJUSTMENT_MONTH) return;
      const { pct } = getReajusteHistorico(r._rut, mes, curYear);
      if (pct <= 0) return;
      const impacto = r._neto * pct / (1 + pct);
      impactoMepcoAcum += impacto;
      if (mes === curMonth + 1) impactoMepcoMes += impacto;
    });
  }

  // ══════════ POZO COMBUSTIBLE (sobrecosto MEPCO pagado a COPEC) ══════════
  // Sobrecosto acumulado de petróleo desde que empezó a regir el precio
  // post-MEPCO (vencimientos ≥ 30/04/2026). Fuente: COPEC DETALLADO 2 (SII).
  // Se compara contra `impactoMepcoAcum` para ver si el reajuste cobrado a
  // clientes alcanza a cubrir lo que pagamos de más a COPEC.
  const pozoCombustibleAcum = POZO_COPEC_TOTALES.pozoAcumulado;
  const pozoCombustibleVolM3 = POZO_COPEC_TOTALES.volumenTotalM3;
  const pozoCombustibleDocs = POZO_COPEC_TOTALES.docs;
  const pozoCombustibleMesKey = `${curYear}-${String(curMonth+1).padStart(2,"0")}`;
  const pozoCombustibleMes = POZO_COPEC_POR_MES[pozoCombustibleMesKey]?.pozo || 0;
  const pozoCombustibleMeta = POZO_COPEC_META;
  const coberturaPozoMepco = pozoCombustibleAcum > 0
    ? impactoMepcoAcum / pozoCombustibleAcum
    : null;
  const brechaPozoMepco = pozoCombustibleAcum - impactoMepcoAcum;

  // ══════════ VIAJES ══════════
  const viajesRows = (data.viajes||[]).map(r=>{const d=parseDate(r.fechainicio||r.FechaInicio||r.fecha);return{...r,_date:d,_cliente:r.Cliente||r.cliente||"",_equipo:r.tipoequipo||r.TipoEquipo||""};}).filter(r=>r._date);
  const viajesMesActual = viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
  const viajesMesAnterior = viajesRows.filter(r=>{const pm=curMonth===0?11:curMonth-1;const py=curMonth===0?curYear-1:curYear;return r._date.getMonth()===pm&&r._date.getFullYear()===py;});
  const maxDayWithData = viajesMesActual.length>0 ? Math.max(...viajesMesActual.map(r=>r._date.getDate())) : now.getDate();
  const dayOfMonth = maxDayWithData;
  const viajesCorteActual = viajesMesActual.filter(r=>r._date.getDate()<=dayOfMonth).length;
  const viajesCorteAnterior = viajesMesAnterior.filter(r=>r._date.getDate()<=dayOfMonth).length;
  const viajesPorMes = []; for(let m=0;m<12;m++){const rows=viajesRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===curYear);viajesPorMes.push({mes:MESES[m],total:rows.length});}
  const viajesPorMesComparado = [];
  for(let m=0;m<12;m++){
    const actual=viajesRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===curYear).length;
    const anterior=viajesRows.filter(r=>r._date.getMonth()===m&&r._date.getFullYear()===prevYear).length;
    const var_pct=anterior>0?pctChange(actual,anterior):(actual>0?100:0);
    viajesPorMesComparado.push({mes:MESES[m],actual,anterior,var_pct});
  }

  // ══════════ PROYECCIÓN POR VIAJES ══════════
  const normClienteKey = (s) => normName(s).replace(/\s+/g," ").trim();
  const viajesByClienteMesPrev = {}, ventasByClienteMesPrev = {};
  viajesRows.forEach(r=>{if(r._date.getFullYear()!==prevYear)return;const k=normClienteKey(r._cliente);if(!k)return;const m=r._date.getMonth();if(!viajesByClienteMesPrev[k])viajesByClienteMesPrev[k]=Array(12).fill(0);viajesByClienteMesPrev[k][m]+=1;});
  ventasRows.forEach(r=>{if(r._date.getFullYear()!==prevYear)return;const rawName=r["RAZON SOCIAL"]||r["Razon Social"]||r.razon_social||"";const k=normClienteKey(rawName);if(!k)return;const m=r._date.getMonth();if(!ventasByClienteMesPrev[k])ventasByClienteMesPrev[k]=Array(12).fill(0);ventasByClienteMesPrev[k][m]+=r._neto;});

  const tasaPorCliente = {};
  let globalVentasLagged=0, globalViajesLagged=0;
  Object.keys(viajesByClienteMesPrev).forEach(k=>{
    const vj=viajesByClienteMesPrev[k],vt=ventasByClienteMesPrev[k]||Array(12).fill(0);
    let sumViajes=0,sumVentas=0,mesesConData=0;
    for(let m=0;m<11;m++){if(vj[m]>0&&vt[m+1]>0){sumViajes+=vj[m];sumVentas+=vt[m+1];mesesConData++;}}
    if(mesesConData>=3&&sumViajes>0)tasaPorCliente[k]={tasa:sumVentas/sumViajes,meses:mesesConData,confianza:"alta"};
    else if(mesesConData>=1&&sumViajes>0)tasaPorCliente[k]={tasa:sumVentas/sumViajes,meses:mesesConData,confianza:"baja"};
    if(sumViajes>0){globalVentasLagged+=sumVentas;globalViajesLagged+=sumViajes;}
  });
  const tasaGlobal = globalViajesLagged>0 ? globalVentasLagged/globalViajesLagged : 0;

  const facturacionProyectadaPorViajes = Array(12).fill(0);
  const facturacionProyViajesSinMepco = Array(12).fill(0);
  const desglosePorMesFactura = {};
  for(let mV=0;mV<12;mV++){
    const mF=mV+1; if(mF>11)continue;
    const viajesMesCliente={};
    viajesRows.forEach(r=>{if(r._date.getFullYear()!==curYear||r._date.getMonth()!==mV)return;const k=normClienteKey(r._cliente);if(!k)return;viajesMesCliente[k]=(viajesMesCliente[k]||0)+1;});
    let totalProy=0; const desglose=[];
    Object.entries(viajesMesCliente).forEach(([k,count])=>{const t=tasaPorCliente[k];const tasa=(t&&t.tasa)||tasaGlobal;const aporte=count*tasa;totalProy+=aporte;desglose.push({cliente:k,viajes:count,tasa,aporte,confianza:t?t.confianza:"global"});});
    // Uplift MEPCO: las tasas vienen del año previo (pre-reajuste). Para meses con
    // alza vigente, aplicar el mismo uplift ponderado por mix de clientes que usa
    // la proyección estacional, así "Por viajes" queda comparable con "Falta facturar mes".
    const upliftMes = upliftPorMes[mF] || 0;
    facturacionProyViajesSinMepco[mF]=totalProy;
    if (upliftMes > 0) {
      totalProy = totalProy * (1 + upliftMes);
      desglose.forEach(d => { d.tasa = d.tasa * (1 + upliftMes); d.aporte = d.aporte * (1 + upliftMes); });
    }
    facturacionProyectadaPorViajes[mF]=totalProy;
    desglosePorMesFactura[mF]=desglose.sort((a,b)=>b.aporte-a.aporte);
  }
  const proyMesActualPorViajes = facturacionProyectadaPorViajes[curMonth]||0;
  const proyMesSiguientePorViajes = curMonth<11 ? facturacionProyectadaPorViajes[curMonth+1]||0 : 0;
  const desgloseMesActualProy = desglosePorMesFactura[curMonth]||[];

  let proyAnualPorViajes=0;
  for(let m=0;m<12;m++){
    const real=ventasPorMesComparado[m]?.actual||0;
    if(m<curMonth&&real>0)proyAnualPorViajes+=real;
    else if(m===curMonth)proyAnualPorViajes+=Math.max(real,facturacionProyectadaPorViajes[m]);
    else{const proyV=facturacionProyectadaPorViajes[m]||0;if(proyV>0)proyAnualPorViajes+=proyV;else if(projSeasonal>0&&totalPrev>0){const w=(ventasPorMesComparado[m]?.anterior||0)/totalPrev;proyAnualPorViajes+=projSeasonal*w;}}
  }

  const vClienteMap={};viajesMesActual.forEach(r=>{vClienteMap[r._cliente]=(vClienteMap[r._cliente]||0)+1;});
  const topClientesViajes=Object.entries(vClienteMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));
  const equipoMap={};viajesMesActual.forEach(r=>{const e=r._equipo||"Sin tipo";equipoMap[e]=(equipoMap[e]||0)+1;});
  const viajesPorEquipo=Object.entries(equipoMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name:name.length>25?name.slice(0,22)+"...":name,count}));

  const diasTotalesMes=new Date(curYear,curMonth+1,0).getDate();
  const diasTranscurridosMes=dayOfMonth;
  const pesoProrrateo=Math.min(diasTranscurridosMes/15,1);
  const pesoEstacional=1-pesoProrrateo;
  const proyViajesProrrateoSimple=diasTranscurridosMes>0?Math.round(viajesMesActual.length/diasTranscurridosMes*diasTotalesMes):0;
  const viajesMismoMesAnioAnt=viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===prevYear).length;
  const viajesAnioAntMismoCorte=viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===prevYear&&r._date.getDate()<=dayOfMonth).length;
  const proyViajesEstacional=viajesAnioAntMismoCorte>0&&viajesMismoMesAnioAnt>0?Math.round(viajesMesActual.length*(viajesMismoMesAnioAnt/viajesAnioAntMismoCorte)):(viajesMismoMesAnioAnt>0?viajesMismoMesAnioAnt:proyViajesProrrateoSimple);
  const proyViajesHibrido=Math.round(proyViajesProrrateoSimple*pesoProrrateo+proyViajesEstacional*pesoEstacional);
  const viajesProyectadosFaltantes=Math.max(0,proyViajesHibrido-viajesMesActual.length);

  const topClientesViajesProy=(Object.entries(vClienteMap).sort((a,b)=>b[1]-a[1]).slice(0,8)).map(([name,count])=>{
    const clienteViajesAnioAnt=viajesRows.filter(r=>r._cliente===name&&r._date.getMonth()===curMonth&&r._date.getFullYear()===prevYear).length;
    const clienteViajesAnioAntCorte=viajesRows.filter(r=>r._cliente===name&&r._date.getMonth()===curMonth&&r._date.getFullYear()===prevYear&&r._date.getDate()<=dayOfMonth).length;
    const clienteViajesMesAnt=viajesRows.filter(r=>r._cliente===name&&r._date.getMonth()===(curMonth===0?11:curMonth-1)&&r._date.getFullYear()===(curMonth===0?curYear-1:curYear)).length;
    const proyProrrateoCliente=diasTranscurridosMes>0?Math.round(count/diasTranscurridosMes*diasTotalesMes):count;
    let proyEstacionalCliente;
    if(clienteViajesAnioAntCorte>0&&clienteViajesAnioAnt>0)proyEstacionalCliente=Math.round(count*(clienteViajesAnioAnt/clienteViajesAnioAntCorte));
    else if(clienteViajesAnioAnt>0)proyEstacionalCliente=clienteViajesAnioAnt;
    else proyEstacionalCliente=proyProrrateoCliente;
    const proyCierreCliente=Math.round(proyProrrateoCliente*pesoProrrateo+proyEstacionalCliente*pesoEstacional);
    const avancePct=proyCierreCliente>0?(count/proyCierreCliente)*100:100;
    return{name,count,proyCierre:Math.max(proyCierreCliente,count),avancePct:Math.min(avancePct,100),mesAnt:clienteViajesMesAnt};
  });

  // ══════════ CONDUCTORES ══════════
  const contratadosSet=new Set();(data.conductoresActivos||[]).forEach(r=>{const n=normName(r.personal||r.Personal||"");if(n)contratadosSet.add(n);});
  const totalContratados=contratadosSet.size;
  const enProcesoNames=new Set();(data.expediciones||[]).forEach(r=>{const estado=(r.estado||r.Estado||"").trim();const conductor=(r.conductor||r.Conductor||"").trim();if(estado==="En proceso"&&conductor!==COMODIN_CONDUCTOR)enProcesoNames.add(normName(conductor));});
  const conductoresEnExpedicion=new Set();enProcesoNames.forEach(n=>{if(contratadosSet.has(n))conductoresEnExpedicion.add(n);});
  const totalEnExpedicion=conductoresEnExpedicion.size;
  const totalNoActivos=totalContratados-totalEnExpedicion;
  const pctOcupacionConductores=totalContratados>0?(totalEnExpedicion/totalContratados)*100:0;

  // ══════════ TRACTOS ══════════
  const flotaRows=(data.flotaViajes||[]).map(r=>({...r,_date:parseDate(r.Fecha||r.fecha||r.fechainicio),_km:parseNum(r.Kilometro||r.kilometro||r.km),_tracto:(r.Tracto||r.tracto||"").trim(),_origen:r.Origen||r.origen||"",_destino:r.Destino||r.destino||"",_cliente:r.Cliente||r.cliente||""})).filter(r=>r._date);
  const flotaMesActual=flotaRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
  const kmMesActual=flotaMesActual.reduce((s,r)=>s+r._km,0);
  const kmAnioActual=flotaRows.filter(r=>r._date.getFullYear()===curYear).reduce((s,r)=>s+r._km,0);
  const kmPorDiaMap={};flotaRows.forEach(r=>{const k=r._date.toISOString().slice(0,10);kmPorDiaMap[k]=(kmPorDiaMap[k]||0)+r._km;});
  const kmPorDia=Object.entries(kmPorDiaMap).map(([fecha,km])=>({fecha,km})).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const totalTractocamiones=(data.flotaEquipos||[]).filter(r=>{const t=(r.tipoequipo||r.TipoEquipo||"").toUpperCase();return t.includes("TRACTOCAMION");}).length;
  const tripsByDate={};flotaRows.forEach(r=>{if(r._date.getFullYear()===curYear){const key=r._date.toISOString().slice(0,10);tripsByDate[key]=(tripsByDate[key]||0)+1;}});
  const sortedDates=Object.entries(tripsByDate).sort((a,b)=>b[0].localeCompare(a[0]));
  const lastFullDayEntry=sortedDates.find(([_,cnt])=>cnt>=50);
  const lastFullDay=lastFullDayEntry?lastFullDayEntry[0]:null;
  const lastFullDayDate=lastFullDay?new Date(lastFullDay+"T12:00:00"):null;
  const lastFullDayLabel=lastFullDayDate?lastFullDayDate.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}):"—";
  const viajesAyer=lastFullDayEntry?lastFullDayEntry[1]:0;
  const tractosAyerSet=new Set();if(lastFullDayDate){flotaRows.forEach(r=>{if(r._date.toISOString().slice(0,10)===lastFullDay&&r._tracto&&r._tracto!==COMODIN_TRACTO)tractosAyerSet.add(r._tracto);});}
  const tractosActivosAyer=tractosAyerSet.size;
  const tractosMesSet=new Set();flotaMesActual.forEach(r=>{if(r._tracto&&r._tracto!==COMODIN_TRACTO)tractosMesSet.add(r._tracto);});
  const tractosUnicosMes=tractosMesSet.size;
  const tractosPorDia={};flotaMesActual.forEach(r=>{if(r._tracto&&r._tracto!==COMODIN_TRACTO){const dayKey=r._date.getDate();if(!tractosPorDia[dayKey])tractosPorDia[dayKey]=new Set();tractosPorDia[dayKey].add(r._tracto);}});
  const diasConDatosTractos=Object.keys(tractosPorDia).length;
  const sumaTractosDiarios=Object.values(tractosPorDia).reduce((s,set)=>s+set.size,0);
  const tractosActivosMes=diasConDatosTractos>0?Math.round(sumaTractosDiarios/diasConDatosTractos):0;
  const tractosActivos=tractosActivosMes;
  const pctOcupacionTractos=totalTractocamiones>0?(tractosActivosMes/totalTractocamiones)*100:0;
  const pctOcupacionTractosAyer=totalTractocamiones>0?(tractosActivosAyer/totalTractocamiones)*100:0;

  // ══════════ FINANZAS ══════════
  // Saldo por banco: tomamos el "Saldo Final" de la fila con la FECHA más reciente
  // de cada banco (en empate de fecha, o sin fecha, la última fila del archivo). Así
  // el saldo de caja no depende de que las filas estén escritas en orden cronológico.
  const bancosRows=(data.finBancos||[]).filter(r=>r.Banco||r.banco);
  const saldoBancoSel={};
  bancosRows.forEach((r,idx)=>{
    const banco=r.Banco||r.banco;
    const sf=parseNum(r["Saldo Final"]||r.saldo_final||r.SaldoFinal);
    if(sf<=0)return;
    const fecha=parseDate(r.Fecha||r.fecha);
    const fTime=fecha?fecha.getTime():0;
    const prev=saldoBancoSel[banco];
    if(!prev||fTime>prev.fTime||(fTime===prev.fTime&&idx>=prev.idx))saldoBancoSel[banco]={fTime,idx,sf};
  });
  const saldosBancos={};Object.entries(saldoBancoSel).forEach(([b,m])=>{saldosBancos[b]=m.sf;});
  const totalCaja=Object.values(saldosBancos).reduce((s,v)=>s+v,0);
  const dapRows=(data.finDAP||[]).filter(r=>{const v=(r.Vigente||r.vigente||"").toString().toLowerCase();return v==="si"||v==="sí"||v==="yes";});
  const getDapType=(r)=>{const t=(r.Tipo||r.tipo||"").toString().toLowerCase().trim();if(t.includes("credito")||t.includes("crédito"))return"credito";if(t.includes("inversion")||t.includes("inversión"))return"inversion";return"trabajo";};
  const dapTrabajo=dapRows.filter(r=>getDapType(r)==="trabajo"),dapInversion=dapRows.filter(r=>getDapType(r)==="inversion"),dapCredito=dapRows.filter(r=>getDapType(r)==="credito");
  const totalDAPTrabajo=dapTrabajo.reduce((s,r)=>s+parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),0);const totalDAPInversion=dapInversion.reduce((s,r)=>s+parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),0);const totalDAPCredito=dapCredito.reduce((s,r)=>s+parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),0);const totalDAP=totalDAPTrabajo+totalDAPInversion+totalDAPCredito;
  const gananciaDAPTrabajo=dapTrabajo.reduce((s,r)=>s+parseNum(r.Ganancia||r.ganancia),0);const gananciaDAPInversion=dapInversion.reduce((s,r)=>s+parseNum(r.Ganancia||r.ganancia),0);const gananciaDAPCredito=dapCredito.reduce((s,r)=>s+parseNum(r.Ganancia||r.ganancia),0);const gananciaDAP=gananciaDAPTrabajo+gananciaDAPInversion+gananciaDAPCredito;
  const dapProximos=dapRows.map(r=>({banco:r.Banco||r.banco,monto:parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final),vencimiento:parseDate(r.Vencimiento||r.vencimiento),tipo:r.Tipo||r.tipo,tasa:r.Tasa||r.tasa,_tipoNorm:getDapType(r)})).filter(r=>r.vencimiento&&r.vencimiento>=nowMid).sort((a,b)=>a.vencimiento-b.vencimiento).slice(0,10);
  const fondosRows=(data.finFondos||[]).filter(r=>r.Fondo||r.fondo);const fondosSaldos=fondosRows.filter(r=>parseNum(r["Valor Actual"]||r.ValorActual||r.valor_actual)>0).map(r=>({fondo:r.Fondo||r.fondo,admin:r.Administradora||r.administradora,invertido:parseNum(r["Monto Invertido"]||r.MontoInvertido||r.monto_invertido),actual:parseNum(r["Valor Actual"]||r.ValorActual||r.valor_actual),rentPct:r["Rentabilidad %"]||r.rentabilidad_pct||""}));const totalFondos=fondosSaldos.reduce((s,r)=>s+r.actual,0);const totalInversionReal=totalDAPInversion+totalFondos;const totalInversiones=totalDAP+totalFondos;
  const calRows=(data.finCalendario||[]).map(r=>({fecha:parseDate(r.Fecha||r.fecha),monto:parseNum(r.Monto||r.monto),guardado:parseNum(r.Guardado||r.guardado),falta:parseNum(r.Falta||r.falta),concepto:r.Concepto||r.concepto||"",estado:r.Estado||r.estado||"",mes:r.Mes||r.mes,semana:r.Semana||r.semana})).filter(r=>r.fecha);
  const nextWeek=new Date(nowMid);nextWeek.setDate(nextWeek.getDate()+7);const compromisosProx=calRows.filter(r=>r.fecha>=nowMid&&r.fecha<=nextWeek).sort((a,b)=>a.fecha-b.fecha);const totalCompromisosProx=compromisosProx.reduce((s,r)=>s+r.monto,0);
  const compromisosMes=calRows.filter(r=>r.fecha&&r.fecha.getMonth()===curMonth&&r.fecha.getFullYear()===curYear);const totalCompromisosMes=compromisosMes.reduce((s,r)=>s+r.monto,0);const totalGuardadoMes=compromisosMes.reduce((s,r)=>s+r.guardado,0);

  // ══════════ COBERTURA SEMANAL ══════════
  const startOfWeek=(d)=>{const day=d.getDay();const diff=d.getDate()-day+(day===0?-6:1);return new Date(d.getFullYear(),d.getMonth(),diff);};
  const weekStart0=startOfWeek(now);
  const dapVigentes=(data.finDAP||[]).filter(r=>{const v=(r.Vigente||r.vigente||"").toString().toLowerCase();return v==="si"||v==="sí"||v==="yes";}).map(r=>({vencimiento:parseDate(r.Vencimiento||r.vencimiento),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final)||parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),banco:r.Banco||r.banco,tipo:getDapType(r)})).filter(r=>r.vencimiento);
  const coberturaSemanas=[];
  let cajaRestante=totalCaja;
  for(let w=0;w<4;w++){
    const ws=new Date(weekStart0);ws.setDate(ws.getDate()+w*7);
    const we=new Date(ws);we.setDate(we.getDate()+6);we.setHours(23,59,59,999);
    const compSemana=calRows.filter(r=>r.fecha>=ws&&r.fecha<=we);
    const compMonto=compSemana.reduce((s,r)=>s+r.monto,0);
    const dapSemana=dapVigentes.filter(r=>r.tipo==="trabajo"&&r.vencimiento>=ws&&r.vencimiento<=we);
    const dapMonto=dapSemana.reduce((s,r)=>s+r.montoFinal,0);
    const cajaInicio=cajaRestante;
    const ingresosSemana=cajaInicio+dapMonto;
    const neto=ingresosSemana-compMonto;
    cajaRestante=Math.max(0,neto);
    const ratio=compMonto>0?ingresosSemana/compMonto:null;
    const guardadoSemana=compSemana.reduce((s,r)=>s+r.guardado,0);
    const faltaSemana=compSemana.reduce((s,r)=>s+r.falta,0);
    coberturaSemanas.push({semana:w+1,inicio:ws,fin:we,label:`${ws.getDate().toString().padStart(2,"0")}/${(ws.getMonth()+1).toString().padStart(2,"0")} — ${we.getDate().toString().padStart(2,"0")}/${(we.getMonth()+1).toString().padStart(2,"0")}`,compromisos:compMonto,dapVence:dapMonto,cajaInicio,ingresos:ingresosSemana,neto,ratio,dapCount:dapSemana.length,compCount:compSemana.length,guardado:guardadoSemana,falta:faltaSemana});
  }
  const dapVigentesConTipo=(data.finDAP||[]).filter(r=>{const v=(r.Vigente||r.vigente||"").toString().toLowerCase();return v==="si"||v==="sí"||v==="yes";}).map(r=>({vencimiento:parseDate(r.Vencimiento||r.vencimiento),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final)||parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),banco:r.Banco||r.banco,tipo:getDapType(r)})).filter(r=>r.vencimiento);
  const next30=new Date(nowMid);next30.setDate(next30.getDate()+30);
  const comp30=calRows.filter(r=>r.fecha>=nowMid&&r.fecha<=next30).reduce((s,r)=>s+r.monto,0);
  const dapTrabajoVence30=dapVigentesConTipo.filter(r=>r.tipo==="trabajo"&&r.vencimiento>=nowMid&&r.vencimiento<=next30).reduce((s,r)=>s+r.montoFinal,0);
  const dapCreditoVence30=dapVigentesConTipo.filter(r=>r.tipo==="credito"&&r.vencimiento>=nowMid&&r.vencimiento<=next30).reduce((s,r)=>s+r.montoFinal,0);
  const dapInversionVence30=dapVigentesConTipo.filter(r=>r.tipo==="inversion"&&r.vencimiento>=nowMid&&r.vencimiento<=next30).reduce((s,r)=>s+r.montoFinal,0);
  const dap30=dapTrabajoVence30+dapCreditoVence30+dapInversionVence30;
  const liquidez30=totalCaja+dapTrabajoVence30+totalFondos;
  const colchonAdicional30=dapInversionVence30;
  const liquidez30Total=liquidez30+colchonAdicional30;
  const coberturaRatio30=comp30>0?liquidez30/comp30:null;
  const coberturaRatio30ConColchon=comp30>0?liquidez30Total/comp30:null;
  const primeraSemanaCritica=coberturaSemanas.find(s=>s.falta>0);

  // ══════════ ALERTAS ══════════
  const alertas=[];
  calRows.filter(r=>r.falta>0&&r.fecha>=nowMid&&r.fecha<=nextWeek).forEach(r=>{alertas.push({type:"warning",icon:Calendar,msg:`${r.concepto}: falta ${fmtM(r.falta)} para el ${r.fecha.toLocaleDateString("es-CL")}`});});
  dapProximos.filter(r=>r.vencimiento<=nextWeek).forEach(r=>{alertas.push({type:"info",icon:PiggyBank,msg:`DAP ${r.banco} por ${fmtM(r.monto)} vence el ${r.vencimiento.toLocaleDateString("es-CL")}`});});
  if(viajesCorteAnterior>0&&viajesCorteActual<viajesCorteAnterior*UMBRAL_VIAJES_ALERTA){alertas.push({type:"danger",icon:TrendingDown,msg:`Viajes al día ${dayOfMonth}: ${viajesCorteActual} vs ${viajesCorteAnterior} mes anterior (${pctChange(viajesCorteActual,viajesCorteAnterior).toFixed(1)}%)`});}
  if(totalContratados>0&&pctOcupacionConductores<UMBRAL_OCUPACION_ALERTA){alertas.push({type:"warning",icon:Users,msg:`Ocupación conductores: ${pctOcupacionConductores.toFixed(1)}% — ${totalEnExpedicion} de ${totalContratados} en expedición`});}
  if(totalTractocamiones>0&&pctOcupacionTractos<UMBRAL_OCUPACION_ALERTA){alertas.push({type:"warning",icon:Truck,msg:`Ocupación tractos prom. diario: ${pctOcupacionTractos.toFixed(1)}% — ${tractosActivosMes} de ${totalTractocamiones}`});}
  if(totalTractocamiones>0&&pctOcupacionTractosAyer<UMBRAL_OCUPACION_ALERTA&&lastFullDay){alertas.push({type:"danger",icon:Truck,msg:`Ocupación tractos ${lastFullDayLabel}: ${pctOcupacionTractosAyer.toFixed(1)}% — ${tractosActivosAyer} de ${totalTractocamiones}`});}
  if(primeraSemanaCritica){alertas.push({type:"danger",icon:AlertTriangle,msg:`Semana ${primeraSemanaCritica.label}: faltan ${fmtM(primeraSemanaCritica.falta)} por cubrir`});}
  if(coberturaRatio30!==null&&coberturaRatio30<UMBRAL_LIQUIDEZ_AMARILLA){alertas.push({type:"warning",icon:AlertTriangle,msg:`Liquidez 30d insuficiente: ${fmtM(liquidez30)} vs compromisos ${fmtM(comp30)}`});}

  // ══════════ LEASING ══════════
  const leasingDet=(data.leasingDetalle||[]).filter(r=>(r.Estado||r.estado||"").toUpperCase()==="ACTIVO");const leasingContratosActivos=leasingDet.length;const leasingTractosTotal=leasingDet.reduce((s,r)=>s+parseNum(r["N Tractos"]||r.Tractos||r.tractos),0);
  const lrParsed=data.leasingResumen||{emisores:[],totalRow:null,proxCuotas:[],proyeccion:[],refs:{}};const leasingEmisores=lrParsed.emisores;const leasingTotalRow=lrParsed.totalRow;
  const leasingTotalCuotaIVA=leasingTotalRow?.cuotaIVA||leasingEmisores.reduce((s,e)=>s+e.cuotaIVA,0);const leasingTotalCuotaSinIVA=leasingTotalRow?.cuotaCLP||leasingEmisores.reduce((s,e)=>s+e.cuotaCLP,0);const leasingDeudaTotal=leasingTotalRow?.deudaCLP||leasingEmisores.reduce((s,e)=>s+e.deudaCLP,0);const leasingTotalUF=leasingTotalRow?.cuotaUF||leasingEmisores.reduce((s,e)=>s+e.cuotaUF,0);
  const leasingProxCuotas=lrParsed.proxCuotas;const leasingProyeccion=lrParsed.proyeccion;
  const dia5=leasingDet.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===5);const dia15=leasingDet.filter(r=>parseNum(r["Dia Vcto"]||r.DiaVcto)===15);
  const cuotaDia5UF=dia5.reduce((s,r)=>s+parseNum(r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]),0);const cuotaDia15UF=dia15.reduce((s,r)=>s+parseNum(r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]),0);
  leasingProxCuotas.filter(r=>r.dias<=5&&r.dias>=0).forEach(r=>{alertas.push({type:"warning",icon:Truck,msg:`Leasing: cuota de ${fmtM(r.cuotaIVA)} c/IVA vence en ${r.dias} día${r.dias!==1?"s":""}`});});

  // ══════════ CREDITO ══════════
  const creditoRows=(data.credito||[]).map(r=>({cuota:parseNum(r["N° Cuota"]||r.Cuota||r.cuota),fecha:r["Fecha Vencimiento"]||r.Fecha||r.fecha||"",capital:parseNum(r["Amortización Capital"]||r["Amortizacion Capital"]||r.capital),interes:parseNum(r["Monto Interés"]||r["Monto Interes"]||r.interes),valorCuota:parseNum(r["Valor Cuota"]||r.ValorCuota||r.valor_cuota),saldo:parseNum(r["Saldo Insoluto"]||r.SaldoInsoluto||r.saldo)})).filter(r=>r.cuota>0);
  const creditoProxima=creditoRows.find(r=>{const fd=parseDate(r.fecha);return fd&&fd>=nowMid&&r.valorCuota>0;});const creditoCuotasFuturas=creditoRows.filter(r=>{const fd=parseDate(r.fecha);return fd&&fd>=nowMid;});
  // Saldo insoluto VIGENTE hoy = saldo de la última cuota ya pagada (no el de la
  // próxima cuota, que es el saldo DESPUÉS de pagarla). Si aún no se paga ninguna,
  // es el monto original (saldo de la 1ª cuota + su amortización).
  const creditoPagadasRows=creditoRows.filter(r=>{const fd=parseDate(r.fecha);return fd&&fd<nowMid;});
  const creditoSaldoActual=creditoPagadasRows.length>0?creditoPagadasRows[creditoPagadasRows.length-1].saldo:(creditoRows.length>0?creditoRows[0].saldo+creditoRows[0].capital:0);
  const creditoDeudaTotal=creditoCuotasFuturas.reduce((s,r)=>s+r.valorCuota,0);const creditoValorCuota=creditoRows.find(r=>r.valorCuota>0)?.valorCuota||0;const creditoTotalCuotas=creditoRows.length;
  const creditoCuotasPagadas=creditoPagadasRows.length;const creditoCuotasPorPagar=creditoTotalCuotas-creditoCuotasPagadas;const creditoTotalIntereses=creditoRows.reduce((s,r)=>s+r.interes,0);const creditoTotalCapital=creditoRows.reduce((s,r)=>s+r.capital,0);const creditoInteresesPendientes=creditoCuotasFuturas.reduce((s,r)=>s+r.interes,0);
  // Capital pendiente = deuda total en cuotas − intereses pendientes. Se define así
  // (en vez de sumar amortizaciones) para que el desglose "Capital + Intereses" cuadre
  // EXACTO con la deuda total, sin arrastrar los redondeos de la tabla de amortización.
  const creditoCapitalPendiente=creditoDeudaTotal-creditoInteresesPendientes;
  if(creditoProxima){const fd=parseDate(creditoProxima.fecha);if(fd){const dc=Math.ceil((fd-nowMid)/86400000);if(dc<=7&&dc>=0){alertas.push({type:"info",icon:CreditCard,msg:`Crédito Itaú: cuota #${creditoProxima.cuota} de ${fmtM(creditoProxima.valorCuota)} vence en ${dc} días`});}}}

  const leasingMesEstimado=leasingTotalCuotaIVA;
  const creditoMesEstimado=creditoValorCuota;
  const margenMesEstimado=totalMesActual-(totalCompromisosMes+leasingMesEstimado+creditoMesEstimado);
  const margenMesEstimadoCaja=totalMesAnteriorBruto-(totalCompromisosMes+leasingMesEstimado+creditoMesEstimado);

  // ══════════ HISTORIZACIÓN ══════════
  const histRows=parseHistorico(data.historico);
  const comparativas=computeComparativas(histRows,now);

  return {histRows,comparativas,totalMesActual,totalMesAnterior,ventasPorMes,topClientes,ventasAnoActual,ventasAnoAnterior,ventasRows,viajesMesActual:viajesMesActual.length,viajesMesAnteriorCount:viajesMesAnterior.length,viajesCorteActual,viajesCorteAnterior,viajesPorMes,viajesPorMesComparado,topClientesViajes,viajesPorEquipo,dayOfMonth,totalCaja,saldosBancos,totalDAP,gananciaDAP,dapProximos,totalFondos,fondosSaldos,totalInversiones,totalDAPTrabajo,totalDAPInversion,totalDAPCredito,gananciaDAPTrabajo,gananciaDAPInversion,gananciaDAPCredito,totalInversionReal,totalCompromisosProx,compromisosProx,totalCompromisosMes,totalGuardadoMes,compromisosMes,alertas,kmMesActual,kmAnioActual,kmPorDia,tractosActivos,totalContratados,totalEnExpedicion,totalNoActivos,pctOcupacionConductores,tractosActivosAyer,tractosActivosMes,totalTractocamiones,pctOcupacionTractos,pctOcupacionTractosAyer,lastFullDayLabel,viajesAyer,leasingContratosActivos,leasingTractosTotal,leasingEmisores,leasingTotalCuotaIVA,leasingTotalCuotaSinIVA,leasingDeudaTotal,leasingTotalUF,leasingProxCuotas,leasingProyeccion,cuotaDia5UF,cuotaDia15UF,leasingDet,creditoRows,creditoSaldoActual,creditoCapitalPendiente,creditoDeudaTotal,creditoValorCuota,creditoTotalCuotas,creditoProxima,creditoCuotasPagadas,creditoCuotasPorPagar,creditoTotalIntereses,creditoTotalCapital,creditoInteresesPendientes,curMonth,curYear,ventasPorMesComparado,ventasPorMesConProyeccion,acumActual,acumAnterior,acumCorteActual,acumCorteAnterior,prevYear,ultimasFacturas,tractosUnicosMes,diasConDatosTractos,projections,mepcoActivo,mepcoHistoricoCerrado,mepcoCorteLabel,impactoMepcoMes,impactoMepcoAcum,pozoCombustibleAcum,pozoCombustibleMes,pozoCombustibleVolM3,pozoCombustibleDocs,pozoCombustibleMeta,coberturaPozoMepco,brechaPozoMepco,margenMesEstimado,margenMesEstimadoCaja,totalMesAnteriorBruto,leasingMesEstimado,creditoMesEstimado,coberturaSemanas,coberturaRatio30,coberturaRatio30ConColchon,liquidez30,liquidez30Total,colchonAdicional30,comp30,dap30,dapTrabajoVence30,dapCreditoVence30,dapInversionVence30,primeraSemanaCritica,proyMesActualPorViajes,proyMesSiguientePorViajes,proyAnualPorViajes,tasaGlobal,tasaPorCliente,desgloseMesActualProy,facturacionProyectadaPorViajes,facturacionProyViajesSinMepco,upliftPorMes,desglosePorMesFactura,comp60Total:comp30*2,proyViajesHibrido,viajesProyectadosFaltantes,proyViajesProrrateoSimple,proyViajesEstacional,topClientesViajesProy,diasTranscurridosMes,diasTotalesMes};
}
