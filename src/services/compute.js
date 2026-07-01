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

// Cuenta cuántas cuotas de leasing faltan por pagar en un contrato: número de
// vencimientos (el día `diaVcto` de cada mes) desde hoy hasta la fecha de término,
// ambos inclusive. Reemplaza el conteo estático de la planilla, que no baja a
// medida que se van pagando las cuotas.
function cuotasLeasingPorPagar(fechaFin, diaVcto, hoy) {
  if (!fechaFin || !diaVcto) return null;
  let venc = new Date(hoy.getFullYear(), hoy.getMonth(), diaVcto);
  if (venc.getTime() < hoy.getTime()) venc = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVcto);
  if (venc.getTime() > fechaFin.getTime()) return 0;
  let count = 0, d = venc;
  while (d.getTime() <= fechaFin.getTime() && count < 600) {
    count++;
    d = new Date(d.getFullYear(), d.getMonth() + 1, diaVcto);
  }
  return count;
}

// Núcleo del nombre de un cliente: quita puntuación y palabras legales/genéricas
// (S.A., SPA, LTDA, CHILE, …) para poder calzar el nombre corto de la planilla de
// Viajes ("MAXAM") con la razón social completa de flotaViajes ("MAXAM CHILE S.A").
const CLIENTE_LEGAL_TOKENS = new Set(["SA","S","A","SPA","LTDA","LTD","LIMITADA","SCM","EIRL","SAC","CHILE","CIA","COMPANIA","COMPAÑIA","SOCIEDAD","CONTRACTUAL","DE","DEL","LA","EL","Y","E"]);
function clienteCoreTokens(name) {
  return String(name||"").toUpperCase().replace(/[^A-ZÑ0-9 ]/g," ").split(/\s+/).filter(t => t && !CLIENTE_LEGAL_TOKENS.has(t));
}
// ¿Los tokens `a` son prefijo de los tokens `b`? ("MAXAM" ⊑ "MAXAM CHILE S.A").
function tokensPrefix(a, b) {
  if (a.length === 0 || a.length > b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

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
  const totalMesActualBruto = ventasMesActual.reduce((s,r) => s+r._bruto, 0);
  // Corte para comparar el mes EN CURSO contra el anterior al MISMO día: mes
  // parcial vs mes completo siempre da un -% alarmante sin significado.
  const ventasDiaCorte = ventasMesActual.length>0 ? Math.max(...ventasMesActual.map(r=>r._date.getDate())) : now.getDate();
  const totalMesAnteriorCorte = ventasMesAnterior.filter(r=>r._date.getDate()<=ventasDiaCorte).reduce((s,r)=>s+r._neto,0);
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
  // Concentración comercial: qué % de la facturación del mes está en los 2 mayores
  // clientes. Riesgo de cartera para lectura ejecutiva.
  const concentracionTop2 = (() => {
    const t = topClientes.slice(0, 2);
    if (t.length === 0 || totalMesActual <= 0) return null;
    const sum = t.reduce((s,c) => s+c.total, 0);
    return { pct: (sum/totalMesActual)*100, names: t.map(c => c.name) };
  })();
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
  // Promedio simple × 12 usando SOLO meses cerrados: antes el mes en curso entraba
  // al promedio como si fuera un mes completo y arrastraba la proyección hacia
  // abajo (con junio al 45% se perdían ~$5.000M artificiales). Si aún no hay meses
  // cerrados (enero en curso), se prorratea el mes abierto por días hábiles.
  let projLinear = 0;
  if (closedMonths.length>0) projLinear = (ytdClosed/closedMonths.length)*12;
  else if (openMonth) {
    const elapsed=businessDaysElapsed(curYear,openMonth,now); const total=businessDaysInMonth(curYear,openMonth);
    projLinear = (elapsed>0?ytdOpen*(total/elapsed):ytdOpen)*12;
  }

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

  // Uplift indexado por MES DE FACTURACIÓN (1-12): la factura del mes f cobra los
  // viajes del mes f-1, y getUpliftPonderado espera el MES DE VIAJE. Antes el mapa
  // guardaba mes-de-viaje y cada consumidor lo leía con una convención distinta:
  // la proyección estacional y la tabla de cumplimiento quedaban corridas un mes
  // (abril aparecía con uplift aunque se factura con viajes de marzo, pre-alza).
  const upliftPorMes = {};
  for (let f = 1; f <= 12; f++) {
    const mesViaje = f - 1; // f=1 (enero) factura viajes de diciembre del año previo
    if (curYear === MEPCO_ADJUSTMENT_YEAR) {
      upliftPorMes[f] = mesViaje >= MEPCO_TRIP_START_MONTH ? getUpliftPonderado(clientPrevList, mesViaje) : 0;
    } else if (curYear === MEPCO_ADJUSTMENT_YEAR + 1) {
      // Las tasas/pesos base vienen del año del reajuste: desde la factura de mayo
      // la base YA incluye el alza (aplicarla de nuevo la contaría dos veces);
      // solo ene-abr comparan contra base pre-reajuste.
      upliftPorMes[f] = f < MEPCO_ADJUSTMENT_MONTH ? getUpliftPonderado(clientPrevList, MEPCO_ADJUSTMENT_MONTH) : 0;
    } else {
      upliftPorMes[f] = 0; // base posterior al reajuste: ya viene con tarifa nueva
    }
  }

  // ── Uplift OBSERVADO (solo informativo) ──
  // El uplift teórico (mapa de reajustes × mix de clientes) es el alza CONTRATADA.
  // El "observado" compara lo facturado post-reajuste contra el contrafactual
  // "mismo mes del año anterior × crecimiento de los meses PRE-reajuste"; se
  // calcula SOLO para mostrarlo en el banner (referencia de cuánto se ha
  // materializado a la fecha). YA NO acota la proyección: el alza es contractual
  // y sigue vigente, y un déficit de facturación es lag (facturación pendiente),
  // no alza inexistente — eso se vigila en la tabla de cumplimiento, no se
  // descuenta de la proyección. Alinea con dashboard-ventas, que proyecta el alza
  // completa.
  const mesesPreCerrados = closedMonths.filter(m=>m<MEPCO_ADJUSTMENT_MONTH);
  const mesesPostCerrados = curYear===MEPCO_ADJUSTMENT_YEAR ? closedMonths.filter(m=>m>=MEPCO_ADJUSTMENT_MONTH) : [];
  let upliftObservado = null;
  if (mesesPreCerrados.length>0 && mesesPostCerrados.length>0) {
    const actPre=mesesPreCerrados.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.actual||0),0);
    const antPre=mesesPreCerrados.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.anterior||0),0);
    const actPost=mesesPostCerrados.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.actual||0),0);
    const antPost=mesesPostCerrados.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.anterior||0),0);
    if (antPre>0 && antPost>0) {
      const growthPre=actPre/antPre;
      upliftObservado=actPost/(antPost*growthPre)-1;
    }
  }
  // La proyección estacional usa el uplift TEÓRICO (alza vigente), igual que
  // "por viajes" y que dashboard-ventas. Sin tope al observado.
  const upliftProyPorMes={};
  for(let m=1;m<=12;m++){
    upliftProyPorMes[m]=upliftPorMes[m]||0;
  }

  let projSeasonal = 0;
  const totalPrev = ventasAnoAnterior;
  // Aporte esperado por mes con la MISMA fórmula que projSeasonal (incluido el
  // uplift por mes): las barras del gráfico se reparten desde acá para que su
  // suma reproduzca EXACTO el KPI "Proyección anual". Antes se repartía
  // projSeasonal × peso sin uplift y los meses no sumaban el titular.
  const proyMesEsperado = Array(12).fill(null);
  if (totalPrev>0) {
    const weights = ventasPorMesComparado.map(m=>m.anterior/totalPrev);
    const weightsClosed = closedMonths.reduce((s,m)=>s+weights[m-1],0);
    if (closedMonths.length>0 && weightsClosed>0) {
      const annualFromClosed = ytdClosed/weightsClosed;
      let openContribution = ytdOpen;
      if (openMonth) {
        const weightOpen=weights[openMonth-1];
        const upliftOpen=upliftProyPorMes[openMonth]||0;
        const expectedOpen=annualFromClosed*weightOpen*(1+upliftOpen);
        const elapsed=businessDaysElapsed(curYear,openMonth,now); const total=businessDaysInMonth(curYear,openMonth);
        const openProrata=elapsed>0?ytdOpen*(total/elapsed):ytdOpen;
        openContribution=Math.max(openProrata,expectedOpen);
        proyMesEsperado[openMonth-1]=openContribution;
      }
      const futureMonths = []; for(let m=1;m<=12;m++){if(!closedMonths.includes(m)&&m!==openMonth)futureMonths.push(m);}
      let futureContribution = 0;
      futureMonths.forEach(m=>{const v=annualFromClosed*weights[m-1]*(1+(upliftProyPorMes[m]||0));proyMesEsperado[m-1]=v;futureContribution+=v;});
      projSeasonal = ytdClosed+openContribution+futureContribution;
    }
  }
  if (projSeasonal===0 && projProrata>0) projSeasonal=projProrata;

  const futureMonthsList = []; for(let m=1;m<=12;m++){if(!monthsWithData.includes(m))futureMonthsList.push(m);}
  const upliftFutTeo = futureMonthsList.map(m => upliftPorMes[m]||0).filter(v=>v>0);
  const upliftTeoricoPromedio = upliftFutTeo.length>0 ? upliftFutTeo.reduce((s,v)=>s+v,0)/upliftFutTeo.length : 0;
  // Promedio realmente aplicado en la proyección (acotado por el observado).
  const upliftFutApl = futureMonthsList.filter(m=>(upliftPorMes[m]||0)>0).map(m=>upliftProyPorMes[m]||0);
  const upliftAplicadoPromedio = upliftFutApl.length>0 ? upliftFutApl.reduce((s,v)=>s+v,0)/upliftFutApl.length : 0;

  const projections = {
    monthInProgress, openMonth, closedMonthsCount:closedMonths.length,
    ytdClosed, ytdOpen, ytdTotal,
    linear:Math.round(projLinear), prorata:Math.round(projProrata), seasonal:Math.round(projSeasonal),
    businessDaysElapsed:openMonth?businessDaysElapsed(curYear,openMonth,now):0,
    businessDaysTotal:openMonth?businessDaysInMonth(curYear,openMonth):0,
    upliftPorMes, upliftAplicadoPromedio, upliftAplicado: upliftAplicadoPromedio>0,
    upliftTeoricoPromedio, upliftObservado,
  };

  const ventasPorMesConProyeccion = ventasPorMesComparado.map((m,i) => {
    const mNum = i+1;
    const fallback = projSeasonal*(totalPrev>0 ? m.anterior/totalPrev : (1/12));
    if (m.actual>0 && mNum!==openMonth) return {...m, proyectado:null, tipo:"real"};
    else if (mNum===openMonth) {
      const expected = proyMesEsperado[i]!=null ? proyMesEsperado[i] : fallback;
      const faltante = Math.max(0, expected-m.actual);
      return {...m, proyectado:faltante, tipo:"parcial"};
    } else {
      const expected = proyMesEsperado[i]!=null ? proyMesEsperado[i] : fallback;
      return {...m, actual:0, proyectado:expected, tipo:"futuro"};
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
      // Ventana congelada: SIEMPRE el año del corte. Si se filtrara por el año en
      // curso, el 1-ene-2027 el registro histórico se pondría a cero solo.
      if (r._date.getFullYear() !== MEPCO_HISTORICO_CORTE_YEAR) return;
      const mes = r._date.getMonth() + 1;
      if (mes < MEPCO_ADJUSTMENT_MONTH) return;
      const { pct } = getReajusteHistorico(r._rut, mes, MEPCO_HISTORICO_CORTE_YEAR);
      if (pct <= 0) return;
      const impacto = r._neto * pct / (1 + pct);
      impactoMepcoAcum += impacto;
      if (curYear === MEPCO_HISTORICO_CORTE_YEAR && mes === curMonth + 1) impactoMepcoMes += impacto;
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

  // El nombre del cliente difiere entre planillas (Viajes lo abrevia: "MAXAM";
  // facturación trae la razón social: "MAXAM CHILE S.A."). El cruce por igualdad
  // exacta dejaba a esos clientes sin tarifa propia (caían a la tarifa global).
  // Se resuelve por núcleo de tokens, igual que el cruce viajes↔flota del
  // diagnóstico; si varias razones sociales calzan el nombre corto, se suman.
  const ventasClienteKeys = Object.keys(ventasByClienteMesPrev);
  const ventasCoreMap = new Map(ventasClienteKeys.map(k => [k, clienteCoreTokens(k)]));
  const ventasArrDeViajesKey = (vKey) => {
    if (ventasByClienteMesPrev[vKey]) return ventasByClienteMesPrev[vKey];
    const vc = clienteCoreTokens(vKey);
    if (!vc.length) return null;
    let m = ventasClienteKeys.filter(fk => { const fc = ventasCoreMap.get(fk); return fc.length === vc.length && tokensPrefix(vc, fc); });
    if (!m.length) m = ventasClienteKeys.filter(fk => tokensPrefix(vc, ventasCoreMap.get(fk)));
    if (!m.length) m = ventasClienteKeys.filter(fk => tokensPrefix(ventasCoreMap.get(fk), vc));
    if (!m.length) return null;
    const out = Array(12).fill(0);
    m.forEach(fk => ventasByClienteMesPrev[fk].forEach((v, i) => { out[i] += v; }));
    return out;
  };

  const tasaPorCliente = {};
  let globalVentasLagged=0, globalViajesLagged=0;
  Object.keys(viajesByClienteMesPrev).forEach(k=>{
    const vj=viajesByClienteMesPrev[k],vt=ventasArrDeViajesKey(k)||Array(12).fill(0);
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
  // mF = mes de facturación (índice 0-11); sus viajes son del mes anterior. Para
  // enero los viajes son de diciembre del año previo, así el registro de
  // cumplimiento proyectado vs real cubre todos los meses cerrados del año.
  for(let mF=0;mF<12;mF++){
    const vYear=mF===0?prevYear:curYear, vMonth=mF===0?11:mF-1;
    const viajesMesCliente={};
    viajesRows.forEach(r=>{if(r._date.getFullYear()!==vYear||r._date.getMonth()!==vMonth)return;const k=normClienteKey(r._cliente);if(!k)return;viajesMesCliente[k]=(viajesMesCliente[k]||0)+1;});
    let totalProy=0; const desglose=[];
    Object.entries(viajesMesCliente).forEach(([k,count])=>{const t=tasaPorCliente[k];const tasa=(t&&t.tasa)||tasaGlobal;const aporte=count*tasa;totalProy+=aporte;desglose.push({cliente:k,viajes:count,tasa,aporte,confianza:t?t.confianza:"global"});});
    // Uplift MEPCO: las tasas vienen del año previo (pre-reajuste). "Esperado por
    // viajes" = viajes × TARIFA CONTRATADA, y la tarifa contratada incluye el
    // reajuste vigente (el alza es contractual y no se ha revertido). Por eso se
    // usa SIEMPRE el uplift teórico, igual en meses cerrados, en curso y futuros.
    // Si la facturación queda corta frente a esto, eso es facturación pendiente
    // (posibles viajes sin facturar) y se refleja como DESVÍO en la tabla de
    // meses cerrados — no se descuenta de la expectativa. Acotarlo al "observado"
    // de un solo mes cerrado (mayo) lo contamina con el lag de facturación y
    // contradice esa misma lectura de "viajes sin facturar".
    const upliftMes = upliftPorMes[mF + 1] || 0; // upliftPorMes es 1-indexado (mes de factura)
    facturacionProyViajesSinMepco[mF]=totalProy;
    if (upliftMes > 0) {
      totalProy = totalProy * (1 + upliftMes);
      desglose.forEach(d => { d.tasa = d.tasa * (1 + upliftMes); d.aporte = d.aporte * (1 + upliftMes); });
    }
    facturacionProyectadaPorViajes[mF]=totalProy;
    desglosePorMesFactura[mF]=desglose.sort((a,b)=>b.aporte-a.aporte);
  }
  const proyMesActualPorViajes = facturacionProyectadaPorViajes[curMonth]||0;
  // En diciembre el "mes siguiente" es ENERO del año próximo (viajes de este
  // diciembre × tarifa); el arreglo anual no cruza el año, se calcula aparte.
  let proyMesSiguientePorViajes = 0;
  if (curMonth<11) proyMesSiguientePorViajes = facturacionProyectadaPorViajes[curMonth+1]||0;
  else {
    const viajesDicCli={};viajesRows.forEach(r=>{if(r._date.getFullYear()===curYear&&r._date.getMonth()===11){const k=normClienteKey(r._cliente);if(k)viajesDicCli[k]=(viajesDicCli[k]||0)+1;}});
    Object.entries(viajesDicCli).forEach(([k,c])=>{const t=tasaPorCliente[k];proyMesSiguientePorViajes+=c*((t&&t.tasa)||tasaGlobal);});
    const upliftEneroProx = curYear===MEPCO_ADJUSTMENT_YEAR ? getUpliftPonderado(clientPrevList, 12) : 0;
    proyMesSiguientePorViajes *= 1+upliftEneroProx;
  }
  const desgloseMesActualProy = desglosePorMesFactura[curMonth]||[];

  let proyAnualPorViajes=0;
  for(let m=0;m<12;m++){
    const real=ventasPorMesComparado[m]?.actual||0;
    if(m<curMonth&&real>0)proyAnualPorViajes+=real;
    else if(m===curMonth)proyAnualPorViajes+=Math.max(real,facturacionProyectadaPorViajes[m]);
    else{const proyV=facturacionProyectadaPorViajes[m]||0;if(proyV>0)proyAnualPorViajes+=proyV;else if(projSeasonal>0){const esp=proyMesEsperado[m];if(esp!=null)proyAnualPorViajes+=esp;else if(totalPrev>0)proyAnualPorViajes+=projSeasonal*((ventasPorMesComparado[m]?.anterior||0)/totalPrev);}}
  }

  // ══════════ CUMPLIMIENTO PROYECTADO VS REAL (meses cerrados) ══════════
  // Las proyecciones "en vivo" se recalculan cada día y no quedan guardadas, así
  // que para cada mes ya cerrado se reconstruye lo esperado con dos métodos
  // reproducibles y se compara contra lo facturado:
  //  - "por viajes": viajes reales del mes anterior × tarifa por cliente. Si lo
  //    facturado quedó por debajo, los viajes ejecutados valían más de lo que se
  //    facturó → posible facturación pendiente.
  //  - "estacional": el mismo mes del año anterior escalado por el crecimiento
  //    real de los DEMÁS meses cerrados (se excluye el propio mes para no ser
  //    circular). Si se facturó lo que daban los viajes pero igual quedó bajo el
  //    estacional, fue menor demanda / error de estimación, no facturación.
  const TOLERANCIA_CUMPLIMIENTO=0.03; // ±3% se considera "en línea"
  const cumplimientoMensual=closedMonths.map(mNum=>{
    const i=mNum-1;
    const real=ventasPorMesComparado[i]?.actual||0;
    const espViajes=facturacionProyectadaPorViajes[i]>0?facturacionProyectadaPorViajes[i]:null;
    const otros=closedMonths.filter(m=>m!==mNum);
    const sumAct=otros.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.actual||0),0);
    const sumAnt=otros.reduce((s,m)=>s+(ventasPorMesComparado[m-1]?.anterior||0),0);
    const anterior=ventasPorMesComparado[i]?.anterior||0;
    const espEstacional=otros.length>0&&sumAnt>0&&anterior>0?anterior*(sumAct/sumAnt)*(1+(upliftPorMes[mNum]||0)):null;
    const base=espViajes!=null?espViajes:espEstacional;
    const desvio=base!=null?real-base:null;
    const desvioPct=base?((real-base)/base)*100:null;
    let lectura="ok";
    if(espViajes!=null&&real<espViajes*(1-TOLERANCIA_CUMPLIMIENTO))lectura="facturacion";
    else if(espEstacional!=null&&real<espEstacional*(1-TOLERANCIA_CUMPLIMIENTO))lectura="estimacion";
    else if(base!=null&&real>base*(1+TOLERANCIA_CUMPLIMIENTO))lectura="superado";
    return {mes:MESES[i],mesNum:mNum,real,espViajes,espEstacional,desvio,desvioPct,lectura};
  });

  // Agrupado por nombre NORMALIZADO (dos escrituras del mismo cliente no deben
  // partir la fila); se conserva el primer nombre crudo para mostrar.
  const vClienteMap={};viajesMesActual.forEach(r=>{const k=normClienteKey(r._cliente);if(!k)return;if(!vClienteMap[k])vClienteMap[k]={name:r._cliente,count:0};vClienteMap[k].count++;});
  const topClientesViajes=Object.values(vClienteMap).sort((a,b)=>b.count-a.count).slice(0,8).map(c=>({name:c.name,count:c.count}));
  const equipoMap={};viajesMesActual.forEach(r=>{const e=r._equipo||"Sin tipo";equipoMap[e]=(equipoMap[e]||0)+1;});
  const viajesPorEquipo=Object.entries(equipoMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name:name.length>25?name.slice(0,22)+"...":name,count}));

  // ══════════ PROYECCIÓN DE CIERRE POR VIAJES (ritmo reciente) ══════════
  // Antes mezclábamos un prorrateo simple con el patrón estacional del año pasado,
  // dándole mucho peso a este último. Eso arrastraba la proyección hacia abajo
  // cuando la demanda reciente venía fuerte (caso jun-2026). El método nuevo:
  //  1) NO usa el último día con datos para medir el ritmo: casi siempre está EN
  //     CURSO (aún no termina), así que dividir por él subestima. Solo sumamos lo
  //     que ese día ya lleva.
  //  2) Proyecta cada día que falta según el ritmo de las últimas semanas, pero
  //     diferenciando por día de semana (un sábado rinde menos que un martes).
  //  3) El patrón del año anterior queda solo como referencia, no mueve el número.
  const diasTotalesMes=new Date(curYear,curMonth+1,0).getDate();
  const diasTranscurridosMes=dayOfMonth;
  const dkey=(dt)=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
  const viajesPorDiaKey={};viajesRows.forEach(r=>{const k=dkey(r._date);viajesPorDiaKey[k]=(viajesPorDiaKey[k]||0)+1;});
  const viajesMesPorDia={};viajesMesActual.forEach(r=>{const d=r._date.getDate();viajesMesPorDia[d]=(viajesMesPorDia[d]||0)+1;});

  // Ritmo reciente plano: viajes/día de los últimos 28 días ANTERIORES al último
  // día con datos (ese día casi siempre está en curso y subestimaría el ritmo;
  // el tooltip promete "excluye el día en curso").
  const ultimaFechaDatos=viajesMesActual.length>0?new Date(curYear,curMonth,maxDayWithData):now;
  let viajes28=0;for(let i=1;i<=28;i++){const d=new Date(ultimaFechaDatos);d.setDate(d.getDate()-i);viajes28+=viajesPorDiaKey[dkey(d)]||0;}
  const ritmoDiaRecienteExact=viajes28/28;
  const ritmoDiaReciente=Math.round(ritmoDiaRecienteExact);

  // Norma por día de semana: 6 semanas previas al último día con datos, descartando
  // el valor más bajo de cada día (probable feriado) para no ensuciar el promedio.
  const normaSemana=Array(7).fill(0);
  {
    const muestras=Array.from({length:7},()=>[]);
    for(let i=1;i<=42;i++){const d=new Date(ultimaFechaDatos);d.setDate(d.getDate()-i);muestras[d.getDay()].push(viajesPorDiaKey[dkey(d)]||0);}
    for(let w=0;w<7;w++){let v=muestras[w];if(v.length>=4)v=[...v].sort((a,b)=>a-b).slice(1);normaSemana[w]=v.length?v.reduce((s,x)=>s+x,0)/v.length:ritmoDiaRecienteExact;}
  }
  const hayNorma=normaSemana.some(x=>x>0);

  // ¿El último día con datos está en curso? Sí si es hoy (o posterior) o si su
  // volumen va por debajo de lo normal para ese día de semana (sheet a medio cargar).
  // Umbral 0.75: la planilla suele ir con ~1 día de rezago y un día al 60-70% de su
  // norma casi siempre está incompleto; tratarlo como cerrado subestimaba todo el mes.
  // El costo de equivocarse es bajo: ese día se proyecta con max(real, norma).
  const wUlt=ultimaFechaDatos.getDay();
  const viajesUlt=viajesMesPorDia[maxDayWithData]||0;
  const ultimoDiaEnCurso=viajesMesActual.length>0&&(maxDayWithData>=now.getDate()||(normaSemana[wUlt]>0&&viajesUlt<0.75*normaSemana[wUlt]));
  const diasCompletosMes=ultimoDiaEnCurso?Math.max(0,maxDayWithData-1):maxDayWithData;
  const viajesDiasCompletos=Object.entries(viajesMesPorDia).reduce((s,[d,c])=>s+(Number(d)<=diasCompletosMes?c:0),0);

  // Proyección día a día: real en días cerrados, lo ya hecho o la norma para hoy, norma para el futuro.
  let proyViajesDiaSemana;
  if(hayNorma){
    let acc=0;
    for(let day=1;day<=diasTotalesMes;day++){
      const w=new Date(curYear,curMonth,day).getDay();
      const real=viajesMesPorDia[day]||0;
      if(day<=diasCompletosMes)acc+=real;
      else if(day===maxDayWithData&&ultimoDiaEnCurso)acc+=Math.max(real,normaSemana[w]);
      else acc+=normaSemana[w];
    }
    proyViajesDiaSemana=Math.round(acc);
  }else proyViajesDiaSemana=Math.round(ritmoDiaRecienteExact*diasTotalesMes);

  // Referencias para el tooltip (no mueven el número principal).
  const proyViajesRunRatePlano=Math.round(ritmoDiaRecienteExact*diasTotalesMes);
  const proyViajesProrrateoSimple=diasCompletosMes>0?Math.round(viajesDiasCompletos/diasCompletosMes*diasTotalesMes):Math.round(ritmoDiaRecienteExact*diasTotalesMes);
  const viajesMismoMesAnioAnt=viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===prevYear).length;
  const viajesAnioAntMismoCorte=viajesRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===prevYear&&r._date.getDate()<=diasCompletosMes).length;
  const proyViajesEstacional=viajesAnioAntMismoCorte>0&&viajesMismoMesAnioAnt>0?Math.round(viajesDiasCompletos*(viajesMismoMesAnioAnt/viajesAnioAntMismoCorte)):(viajesMismoMesAnioAnt>0?viajesMismoMesAnioAnt:proyViajesProrrateoSimple);

  const proyViajesHibrido=Math.max(proyViajesDiaSemana,viajesMesActual.length);
  const viajesProyectadosFaltantes=Math.max(0,proyViajesHibrido-viajesMesActual.length);

  const topClientesViajesProy=(Object.entries(vClienteMap).sort((a,b)=>b[1].count-a[1].count).slice(0,8)).map(([cliKey,cliInfo])=>{
    const name=cliInfo.name, count=cliInfo.count;
    // Mismo método que el KPI de cierre del mes (norma por día de semana sobre las
    // últimas 6 semanas del cliente), para que la tabla y el total cuenten la misma
    // historia. Antes la tabla usaba prorrateo lineal solo con los días de junio y
    // divergía del KPI. Si el cliente es nuevo (sin norma), cae al prorrateo simple.
    // Los filtros usan la clave normalizada, la misma con que se agrupó el top.
    const esCli=(r)=>normClienteKey(r._cliente)===cliKey;
    const clienteViajesMesAnt=viajesRows.filter(r=>esCli(r)&&r._date.getMonth()===(curMonth===0?11:curMonth-1)&&r._date.getFullYear()===(curMonth===0?curYear-1:curYear)).length;
    const porDiaKeyCli={};viajesRows.forEach(r=>{if(esCli(r)){const k=dkey(r._date);porDiaKeyCli[k]=(porDiaKeyCli[k]||0)+1;}});
    const porDiaMesCli={};viajesMesActual.forEach(r=>{if(esCli(r)){const d=r._date.getDate();porDiaMesCli[d]=(porDiaMesCli[d]||0)+1;}});
    const normaCli=Array(7).fill(0);
    {
      const muestras=Array.from({length:7},()=>[]);
      for(let i=1;i<=42;i++){const d=new Date(ultimaFechaDatos);d.setDate(d.getDate()-i);muestras[d.getDay()].push(porDiaKeyCli[dkey(d)]||0);}
      for(let w=0;w<7;w++){let v=muestras[w];if(v.length>=4)v=[...v].sort((a,b)=>a-b).slice(1);normaCli[w]=v.length?v.reduce((s,x)=>s+x,0)/v.length:0;}
    }
    let proyCierreCliente;
    if(normaCli.some(x=>x>0)){
      let acc=0;
      for(let day=1;day<=diasTotalesMes;day++){
        const w=new Date(curYear,curMonth,day).getDay();
        const real=porDiaMesCli[day]||0;
        if(day<=diasCompletosMes)acc+=real;
        else if(day===maxDayWithData&&ultimoDiaEnCurso)acc+=Math.max(real,normaCli[w]);
        else acc+=normaCli[w];
      }
      proyCierreCliente=Math.round(acc);
    }else{
      const clienteViajesDiasCompletos=viajesMesActual.filter(r=>esCli(r)&&r._date.getDate()<=diasCompletosMes).length;
      proyCierreCliente=diasCompletosMes>0?Math.round(clienteViajesDiasCompletos/diasCompletosMes*diasTotalesMes):count;
    }
    const proyCierre=Math.max(proyCierreCliente,count);
    const avancePct=proyCierre>0?(count/proyCierre)*100:100;
    return{name,count,proyCierre,avancePct:Math.min(avancePct,100),mesAnt:clienteViajesMesAnt};
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
  const flotaRows=(data.flotaViajes||[]).map(r=>({...r,_date:parseDate(r.Fecha||r.fecha||r.fechainicio),_km:parseNum(r.Kilometro||r.kilometro||r.km),_tracto:(r.Tracto||r.tracto||"").trim(),_origen:r.Origen||r.origen||"",_destino:r.Destino||r.destino||"",_cliente:r.Cliente||r.cliente||"",_carga:(r.Carga||r.carga||"").trim(),_cond:`${(r.Nombre||r.nombre||"").trim()} ${(r.Apellido||r.apellido||"").trim()}`.trim()})).filter(r=>r._date);
  const flotaMesActual=flotaRows.filter(r=>r._date.getMonth()===curMonth&&r._date.getFullYear()===curYear);
  const kmMesActual=flotaMesActual.reduce((s,r)=>s+r._km,0);
  const kmAnioActual=flotaRows.filter(r=>r._date.getFullYear()===curYear).reduce((s,r)=>s+r._km,0);
  const kmPorDiaMap={};flotaRows.forEach(r=>{const k=dkey(r._date);kmPorDiaMap[k]=(kmPorDiaMap[k]||0)+r._km;});
  const kmPorDia=Object.entries(kmPorDiaMap).map(([fecha,km])=>({fecha,km})).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  // Patentes normalizadas y DEDUPLICADAS del padrón (el sufijo -dv y las filas
  // repetidas inflaban el denominador de ocupación: contaban filas, no tractos).
  const normPat=(p)=>(p==null?"":String(p)).trim().toUpperCase().split("-")[0].replace(/\s+/g,"");
  const padronTractoSet=new Set((data.flotaEquipos||[]).filter(r=>(r.tipoequipo||r.TipoEquipo||"").toUpperCase().includes("TRACTOCAMION")).map(r=>normPat(r.patente||r.Patente)).filter(Boolean));
  const totalTractocamiones=padronTractoSet.size;
  const tripsByDate={};flotaRows.forEach(r=>{if(r._date.getFullYear()===curYear){const key=dkey(r._date);tripsByDate[key]=(tripsByDate[key]||0)+1;}});
  const sortedDates=Object.entries(tripsByDate).sort((a,b)=>b[0].localeCompare(a[0]));
  // "Último día completo" DE FLOTA (tramos): ancla las ventanas de ocupación. El
  // día de hoy casi nunca está cerrado, así que se busca el día más reciente con
  // volumen normal (>=50 tramos) anterior a hoy.
  const hoyKey=dkey(now);
  const lastFullDayEntry=sortedDates.find(([d,cnt])=>cnt>=50&&d<hoyKey)||sortedDates.find(([_,cnt])=>cnt>=50);
  const lastFullDay=lastFullDayEntry?lastFullDayEntry[0]:null;
  const lastFullDayDate=lastFullDay?new Date(lastFullDay+"T12:00:00"):null;
  const lastFullDayLabel=lastFullDayDate?lastFullDayDate.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}):"—";
  // "Viajes de ayer": desde la planilla de VIAJES (viajes reales), no desde
  // flotaViajes (tramos por tracto, ~3× más e incluye retornos vacíos). Mezclar
  // fuentes hacía incomparable el KPI diario con el mensual y la alerta de
  // "viajes bajos" no disparaba nunca.
  const viajesDiasCerrados=Object.entries(viajesPorDiaKey).filter(([d])=>d<hoyKey).sort((a,b)=>b[0].localeCompare(a[0]));
  const umbralViajesDiaCompleto=Math.max(10,ritmoDiaRecienteExact*0.4);
  const viajesAyerEntry=viajesDiasCerrados.find(([,c])=>c>=umbralViajesDiaCompleto)||viajesDiasCerrados[0]||null;
  const viajesAyer=viajesAyerEntry?viajesAyerEntry[1]:0;
  const viajesAyerLabel=viajesAyerEntry?new Date(viajesAyerEntry[0]+"T12:00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short"}):"—";
  // ── Ocupación de flota ────────────────────────────────────────────────
  // La planilla solo registra la fecha de INICIO del viaje, no su duración. Un
  // tracto en una ruta de varios días sigue trabajando aunque no genere registro
  // ese día, así que "tractos con viaje hoy ÷ flota" SUBESTIMA la ocupación: castiga
  // a los que están en ruta. Medimos la utilización real con ventana móvil: % de la
  // flota que inició ≥1 viaje en los últimos 7 días cerrados. Además contamos solo
  // patentes que son TRACTOCAMION en el padrón (el campo Tracto a veces trae
  // camiones/camionetas), normalizando el dígito verificador (PDGW41 ≡ PDGW41-x).
  const comodinNorm=normPat(COMODIN_TRACTO);
  const flotaTractoDia={};
  flotaRows.forEach(r=>{const t=normPat(r._tracto);if(!t||t===comodinNorm||!padronTractoSet.has(t))return;const k=dkey(r._date);if(!flotaTractoDia[k])flotaTractoDia[k]=new Set();flotaTractoDia[k].add(t);});

  // Utilización: ventana móvil de 7 días cerrados terminando en el último día completo.
  const ventanaUtilDias=7;
  const finUtil=lastFullDayDate||new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
  const tractosEnOperacionSet=new Set();
  for(let i=0;i<ventanaUtilDias;i++){const d=new Date(finUtil);d.setDate(d.getDate()-i);const s=flotaTractoDia[dkey(d)];if(s)s.forEach(t=>tractosEnOperacionSet.add(t));}
  const tractosEnOperacion=tractosEnOperacionSet.size;
  const pctOcupacionTractos=totalTractocamiones>0?(tractosEnOperacion/totalTractocamiones)*100:0;
  const tractosParados=Math.max(0,totalTractocamiones-tractosEnOperacion);

  // Despachos por día (intensidad diaria, NO ocupación): promedio de días cerrados.
  const tractosActivosAyer=lastFullDayDate&&flotaTractoDia[dkey(lastFullDayDate)]?flotaTractoDia[dkey(lastFullDayDate)].size:0;
  const pctTractosAyer=totalTractocamiones>0?(tractosActivosAyer/totalTractocamiones)*100:0;
  let despachosDiaCerrado=Object.entries(flotaTractoDia).filter(([k])=>{const dt=new Date(k+"T12:00:00");return dt.getFullYear()===curYear&&dt.getMonth()===curMonth&&dt.getDate()<now.getDate();});
  let despachosMesIdx=curMonth;
  if(despachosDiaCerrado.length===0){
    // Día 1 del mes: aún no hay días cerrados del mes en curso y el KPI mostraba
    // "0 despachos/día" como si la flota estuviera detenida. Cae al mes anterior.
    const pmD=curMonth===0?11:curMonth-1, pyD=curMonth===0?curYear-1:curYear;
    despachosDiaCerrado=Object.entries(flotaTractoDia).filter(([k])=>{const dt=new Date(k+"T12:00:00");return dt.getFullYear()===pyD&&dt.getMonth()===pmD;});
    despachosMesIdx=pmD;
  }
  const despachosMesLabel=MESES[despachosMesIdx];
  const diasConDatosTractos=despachosDiaCerrado.length;
  const tractosDespachadosDia=diasConDatosTractos>0?Math.round(despachosDiaCerrado.reduce((s,[,set])=>s+set.size,0)/diasConDatosTractos):0;
  const pctDespachadosDia=totalTractocamiones>0?(tractosDespachadosDia/totalTractocamiones)*100:0;

  // Tractos distintos que operaron en el mes a la fecha (padrón).
  const tractosMesSet=new Set();Object.entries(flotaTractoDia).forEach(([k,set])=>{const dt=new Date(k+"T12:00:00");if(dt.getFullYear()===curYear&&dt.getMonth()===curMonth)set.forEach(t=>tractosMesSet.add(t));});
  const tractosUnicosMes=tractosMesSet.size;

  // Detalle de tractos parados: para cada tractocamión del padrón que NO está en
  // operación (sin viaje en la ventana), su último viaje y cuántos días lleva parado.
  const ultimoViajeTracto={};
  flotaRows.forEach(r=>{const t=normPat(r._tracto);if(!t||t===comodinNorm||!padronTractoSet.has(t))return;if(!ultimoViajeTracto[t]||r._date>ultimoViajeTracto[t])ultimoViajeTracto[t]=r._date;});
  const hoyMid=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  // Deduplicado por patente normalizada: una patente repetida en el padrón
  // aparecía dos veces en la tabla e inflaba el conteo de parados.
  const patentesVistas=new Set();
  const tractosParadosLista=(data.flotaEquipos||[]).filter(r=>(r.tipoequipo||r.TipoEquipo||"").toUpperCase().includes("TRACTOCAMION")).filter(r=>{const p=normPat(r.patente||r.Patente);if(!p||patentesVistas.has(p))return false;patentesVistas.add(p);return true;}).map(r=>{
    const pat=normPat(r.patente||r.Patente);
    const ult=ultimoViajeTracto[pat]||null;
    const dias=ult?Math.round((hoyMid-new Date(ult.getFullYear(),ult.getMonth(),ult.getDate()))/86400000):null;
    return {_pat:pat,patente:(r.patente||r.Patente||"").toString().trim(),numero:(r.numero||r.Numero||"").toString().trim(),marca:(r.marca||r.Marca||"").toString().trim(),anio:(r.fecha||r.Fecha||"").toString().trim(),ultimoViajeLabel:ult?ult.toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"2-digit"}):null,diasSinViaje:dias};
  }).filter(t=>!tractosEnOperacionSet.has(t._pat)).sort((a,b)=>(b.diasSinViaje==null?1e9:b.diasSinViaje)-(a.diasSinViaje==null?1e9:a.diasSinViaje)).map(({_pat,...rest})=>rest);

  // Flota OPERATIVA: excluye del denominador los tractos detenidos 30+ días (o sin
  // registro de viajes), que en la práctica están fuera de servicio. Permite leer la
  // ocupación sobre lo realmente disponible, no sobre el padrón completo.
  const tractosParados30=tractosParadosLista.filter(t=>t.diasSinViaje==null||t.diasSinViaje>=30).length;
  const flotaOperativa=Math.max(0,totalTractocamiones-tractosParados30);
  const pctOcupacionTractosOperativa=flotaOperativa>0?(tractosEnOperacion/flotaOperativa)*100:0;

  // KM del mes anterior al mismo corte de días, para dar contexto al KPI de KM.
  const kmMesAnteriorCorte=flotaRows.filter(r=>{const pm=curMonth===0?11:curMonth-1;const py=curMonth===0?curYear-1:curYear;return r._date.getMonth()===pm&&r._date.getFullYear()===py&&r._date.getDate()<=dayOfMonth;}).reduce((s,r)=>s+r._km,0);

  // ══════════ RUTAS (origen → destino) ══════════
  // Corredores físicos reconstruidos desde flotaViajes (año en curso). Solo tramos
  // CARGADOS (con cliente y carga distinta de VACIO): los retornos vacíos no son una
  // "ruta comercial" y desde 2026 la planilla los registra (ver km vacíos). Por ruta
  // se acumulan nº de viajes, km total/promedio y el cliente y la carga dominantes.
  const flotaAnio = flotaRows.filter(r=>r._date.getFullYear()===curYear);
  const flotaCargada = flotaAnio.filter(r=>r._cliente && (r._carga||"").toUpperCase()!=="VACIO");
  const topNameOf=(m)=>{const e=Object.entries(m).sort((a,b)=>b[1]-a[1])[0];return e?e[0]:"—";};
  const rutaMap={};
  flotaCargada.forEach(r=>{
    const o=(r._origen||"").trim().toUpperCase(), d=(r._destino||"").trim().toUpperCase();
    if(!o||!d)return;
    const k=`${o} → ${d}`;
    if(!rutaMap[k])rutaMap[k]={ruta:k,origen:o,destino:d,viajes:0,km:0,clientes:{},cargas:{}};
    const e=rutaMap[k];e.viajes++;e.km+=r._km;
    if(r._cliente)e.clientes[r._cliente]=(e.clientes[r._cliente]||0)+1;
    if(r._carga)e.cargas[r._carga]=(e.cargas[r._carga]||0)+1;
  });
  const rutasArr=Object.values(rutaMap).map(r=>({ruta:r.ruta,origen:r.origen,destino:r.destino,viajes:r.viajes,km:r.km,kmProm:r.viajes>0?r.km/r.viajes:0,clientePrincipal:topNameOf(r.clientes),cargaPrincipal:topNameOf(r.cargas)})).sort((a,b)=>b.viajes-a.viajes);
  const rutasDistintas=rutasArr.length;
  const rutasViajesTotal=rutasArr.reduce((s,r)=>s+r.viajes,0);
  const rutasKmTotal=rutasArr.reduce((s,r)=>s+r.km,0);
  const concentracionTop5Rutas=rutasViajesTotal>0?(rutasArr.slice(0,5).reduce((s,r)=>s+r.viajes,0)/rutasViajesTotal)*100:null;
  const topRutas=rutasArr.slice(0,15);

  // ══════════ PRODUCTIVIDAD POR CONDUCTOR ══════════
  // flotaViajes trae el conductor (Nombre + Apellido) por tramo. Se acumulan km y
  // tramos del año en curso, incluyendo tramos vacíos (son km realmente conducidos:
  // reposicionamiento de flota). Se excluye el comodín "TRANSPORTES BELLO". La cola
  // de baja utilización (km < 50% del promedio) destaca conductores subocupados.
  // Clave normalizada (mayúsculas, espacios colapsados): "Juan Pérez" y
  // "JUAN  PEREZ" son el mismo conductor; con la clave cruda se partían los km.
  const condMap={};
  flotaAnio.forEach(r=>{
    const raw=(r._cond||"").trim();
    if(!raw)return;
    const c=normName(raw);
    if(!c||c.includes("TRANSPORTES BELLO"))return;
    if(!condMap[c])condMap[c]={conductor:raw,km:0,tramos:0,last:null};
    const e=condMap[c];e.km+=r._km;e.tramos++;
    if(!e.last||r._date>e.last)e.last=r._date;
  });
  const condArr=Object.values(condMap).filter(c=>c.km>0).map(c=>({
    conductor:c.conductor,km:c.km,tramos:c.tramos,kmTramo:c.tramos>0?c.km/c.tramos:0,
    ultimoLabel:c.last?c.last.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}):"—",
    diasSinViaje:c.last?Math.round((nowMid-new Date(c.last.getFullYear(),c.last.getMonth(),c.last.getDate()))/86400000):null,
  })).sort((a,b)=>b.km-a.km);
  const conductoresConViajes=condArr.length;
  const kmPromedioConductor=conductoresConViajes>0?condArr.reduce((s,c)=>s+c.km,0)/conductoresConViajes:0;
  const conductoresBajaUtilizacion=condArr.filter(c=>c.km<kmPromedioConductor*0.5).length;
  const topConductores=condArr.slice(0,20);

  // ══════════ FINANZAS ══════════
  // Saldo por banco: tomamos el "Saldo Final" de la fila con la FECHA más reciente
  // de cada banco (en empate de fecha, o sin fecha, la última fila del archivo). Así
  // el saldo de caja no depende de que las filas estén escritas en orden cronológico.
  const bancosRows=(data.finBancos||[]).filter(r=>r.Banco||r.banco);
  const saldoBancoSel={};
  bancosRows.forEach((r,idx)=>{
    const banco=r.Banco||r.banco;
    const sfRaw=(r["Saldo Final"]??r.saldo_final??r.SaldoFinal??"").toString().trim();
    // Solo se salta la CELDA VACÍA: un banco puede cerrar legítimamente en $0 o
    // sobregirado, y saltar el <=0 dejaba vigente un saldo positivo viejo.
    if(sfRaw==="")return;
    const sf=parseNum(sfRaw);
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
  const dapProximos=dapRows.map(r=>({banco:r.Banco||r.banco,monto:parseNum(r["Monto Inicial"]||r.MontoInicial||r.monto_inicial),montoFinal:parseNum(r["Monto Final"]||r.MontoFinal||r.monto_final),ganancia:parseNum(r.Ganancia||r.ganancia),vencimiento:parseDate(r.Vencimiento||r.vencimiento),tipo:r.Tipo||r.tipo,tasa:r.Tasa||r.tasa,_tipoNorm:getDapType(r)})).filter(r=>r.vencimiento&&r.vencimiento>=nowMid).sort((a,b)=>a.vencimiento-b.vencimiento).slice(0,10);
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
    // En la semana en curso solo cuentan compromisos/DAP desde HOY: los de
    // lunes-a-ayer ya pasaron por caja (totalCaja los trae descontados) y
    // volver a restarlos los contaba dos veces (falso "descubierto" a mitad
    // de semana).
    const desde=w===0&&nowMid>ws?nowMid:ws;
    const compSemana=calRows.filter(r=>r.fecha>=desde&&r.fecha<=we);
    const compMonto=compSemana.reduce((s,r)=>s+r.monto,0);
    const dapSemana=dapVigentes.filter(r=>r.tipo==="trabajo"&&r.vencimiento>=desde&&r.vencimiento<=we);
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
  // Compromisos reales del calendario a 60 días (antes era comp30×2, una
  // extrapolación sin etiquetar). Si el calendario solo está cargado ~30 días
  // hacia adelante, este número es un piso, no una proyección.
  const next60=new Date(nowMid);next60.setDate(next60.getDate()+60);
  const comp60Total=calRows.filter(r=>r.fecha>=nowMid&&r.fecha<=next60).reduce((s,r)=>s+r.monto,0);
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
  if(totalTractocamiones>0&&pctOcupacionTractos<UMBRAL_OCUPACION_ALERTA){alertas.push({type:"warning",icon:Truck,msg:`Flota en operación (${ventanaUtilDias}d): ${pctOcupacionTractos.toFixed(1)}% — ${tractosEnOperacion} de ${totalTractocamiones}, ${tractosParados} sin viaje`});}
  if(primeraSemanaCritica){alertas.push({type:"danger",icon:AlertTriangle,msg:`Semana ${primeraSemanaCritica.label}: faltan ${fmtM(primeraSemanaCritica.falta)} por cubrir`});}
  if(coberturaRatio30!==null&&coberturaRatio30<UMBRAL_LIQUIDEZ_AMARILLA){alertas.push({type:"warning",icon:AlertTriangle,msg:`Liquidez 30d insuficiente: ${fmtM(liquidez30)} vs compromisos ${fmtM(comp30)}`});}
  // Cierre de mes bajo lo esperado por viajes → posible facturación pendiente.
  // Solo el último mes cerrado: los anteriores quedan como registro en la tabla.
  const ultimoCierre=cumplimientoMensual[cumplimientoMensual.length-1];
  if(ultimoCierre&&ultimoCierre.lectura==="facturacion"){
    alertas.push({type:"warning",icon:AlertTriangle,msg:`${ultimoCierre.mes} cerró con ${fmtM(ultimoCierre.real)} vs ${fmtM(ultimoCierre.espViajes)} esperado por viajes (faltan ${fmtM(ultimoCierre.espViajes-ultimoCierre.real)}) — revisar viajes sin facturar`});
  }
  // Alerta comercial: cliente relevante (≥20 viajes/mes) cuya proyección de cierre
  // cae más de 20% contra el mes anterior.
  topClientesViajesProy.forEach(c=>{
    if(c.mesAnt>=20&&c.proyCierre<0.8*c.mesAnt){
      alertas.push({type:"warning",icon:Users,msg:`${c.name}: proyección ${c.proyCierre} viajes vs ${c.mesAnt} del mes anterior (${pctChange(c.proyCierre,c.mesAnt).toFixed(0)}%)`});
    }
  });

  // ══════════ DIAGNÓSTICO DE ALERTAS POR CLIENTE ══════════
  // Avisar la caída no basta: hay que sugerir SI es demanda del cliente o capacidad
  // nuestra. Cruzamos dos señales de baja (semanal vs la propia norma reciente del
  // cliente, y mensual vs proyección de cierre) con el estado de los tractos que lo
  // atienden habitualmente. La causa es una HIPÓTESIS para orientar la conversación,
  // no un dato confirmado: si el cliente baja y sus tractos están parados → probable
  // problema nuestro; si bajan los viajes pero sus tractos siguen operando en otras
  // rutas → probable menor demanda del cliente.
  const finVentanaVj = new Date(ultimaFechaDatos);
  if (ultimoDiaEnCurso) finVentanaVj.setDate(finVentanaVj.getDate() - 1);
  const ini7Vj = new Date(finVentanaVj); ini7Vj.setDate(ini7Vj.getDate() - 6);
  const win90Cli = new Date(ultimaFechaDatos); win90Cli.setDate(win90Cli.getDate() - 90);
  const viajesMesActualCount = viajesMesActual.length;

  // Pre-agrupar filas por cliente normalizado (recorrer 60k+ y 190k filas una vez,
  // no por cada cliente del top).
  const viajesPorCliente = {}, flotaPorCliente = {};
  viajesRows.forEach(r => { const k = normClienteKey(r._cliente); if (k) (viajesPorCliente[k] || (viajesPorCliente[k] = [])).push(r); });
  flotaRows.forEach(r => { const k = normClienteKey(r._cliente); if (k) (flotaPorCliente[k] || (flotaPorCliente[k] = [])).push(r); });
  // El nombre del cliente difiere entre planillas (Viajes lo abrevia, flotaViajes
  // trae la razón social). Resolvemos por núcleo de tokens: exacto, o el corto como
  // prefijo del largo, o viceversa. Sin match → el diagnóstico de flota se omite.
  const flotaClienteKeys = Object.keys(flotaPorCliente);
  const flotaCoreMap = new Map(flotaClienteKeys.map(fk => [fk, clienteCoreTokens(fk)]));
  const resolveFlotaKeys = (vKey) => {
    const vc = clienteCoreTokens(vKey);
    if (!vc.length) return [];
    let m = flotaClienteKeys.filter(fk => { const fc = flotaCoreMap.get(fk); return fc.length === vc.length && tokensPrefix(vc, fc); }); if (m.length) return m;
    m = flotaClienteKeys.filter(fk => tokensPrefix(vc, flotaCoreMap.get(fk))); if (m.length) return m;
    m = flotaClienteKeys.filter(fk => tokensPrefix(flotaCoreMap.get(fk), vc)); if (m.length) return m;
    return [];
  };

  const alertasClienteDiag = topClientesViajesProy.map(c => {
    const k = normClienteKey(c.name);
    const cliViajes = viajesPorCliente[k] || [];

    // — Señal semanal: últimos 7 días cerrados vs norma por día de semana (6 sem) —
    const porDiaKeyCli = {};
    cliViajes.forEach(r => { const dk = dkey(r._date); porDiaKeyCli[dk] = (porDiaKeyCli[dk] || 0) + 1; });
    const normaCli = Array(7).fill(0);
    {
      const muestras = Array.from({ length: 7 }, () => []);
      for (let i = 1; i <= 42; i++) { const d = new Date(ultimaFechaDatos); d.setDate(d.getDate() - i); muestras[d.getDay()].push(porDiaKeyCli[dkey(d)] || 0); }
      for (let w = 0; w < 7; w++) { let v = muestras[w]; if (v.length >= 4) v = [...v].sort((a, b) => a - b).slice(1); normaCli[w] = v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; }
    }
    let viajes7d = 0, norma7d = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(finVentanaVj); d.setDate(d.getDate() - i); viajes7d += porDiaKeyCli[dkey(d)] || 0; norma7d += normaCli[d.getDay()]; }
    // norma muy baja (<3 viajes/semana) → la señal porcentual es ruido, no la usamos.
    const dropSemanal = norma7d >= 3 ? ((viajes7d - norma7d) / norma7d) * 100 : null;
    const dropMensual = c.mesAnt > 0 ? pctChange(c.proyCierre, c.mesAnt) : null;

    // — Días desde el último viaje del cliente —
    let ultViajeCli = null;
    cliViajes.forEach(r => { if (!ultViajeCli || r._date > ultViajeCli) ultViajeCli = r._date; });
    const diasSinCliente = ultViajeCli ? Math.floor((finVentanaVj - ultViajeCli) / 86400000) : null;

    // — Flota habitual: tractos del padrón con ≥2 viajes de este cliente en 90 días —
    const cliFlota = resolveFlotaKeys(c.name).flatMap(fk => flotaPorCliente[fk] || []);
    const tractoCountCli = {}; const tractoLast7Cli = new Set();
    cliFlota.forEach(r => {
      const t = normPat(r._tracto);
      if (!t || t === comodinNorm || !padronTractoSet.has(t)) return;
      if (r._date >= win90Cli && r._date <= ultimaFechaDatos) tractoCountCli[t] = (tractoCountCli[t] || 0) + 1;
      if (r._date >= ini7Vj && r._date <= finVentanaVj) tractoLast7Cli.add(t);
    });
    const habitual = Object.entries(tractoCountCli).filter(([, n]) => n >= 2).map(([t]) => t);
    const flotaHabitualN = habitual.length;
    const habitualParados = habitual.filter(t => !tractosEnOperacionSet.has(t)).length;
    const habitualActivos = flotaHabitualN - habitualParados;
    const habitualSirviendoCli7d = habitual.filter(t => tractoLast7Cli.has(t)).length;
    const habitualEnOtrasRutas = Math.max(0, habitualActivos - habitualSirviendoCli7d);
    const paradosPct = flotaHabitualN > 0 ? habitualParados / flotaHabitualN : null;

    // — Hipótesis de causa —
    const evidencia = [];
    let hip = null, hipTipo = null, sugerencia = null;
    if (diasSinCliente != null && diasSinCliente >= 10) evidencia.push(`Sin viajes para este cliente hace ${diasSinCliente} días.`);
    if (flotaHabitualN < 2) {
      hip = "Sin diagnóstico de flota"; hipTipo = "neutro";
      evidencia.push("Historial de equipos asignados insuficiente para inferir la causa.");
      sugerencia = "Revisar con operaciones qué pasó con este cliente.";
    } else {
      evidencia.push(`${flotaHabitualN} tractos suelen atenderlo: ${habitualActivos} operativos, ${habitualParados} sin viaje en ${ventanaUtilDias} días.`);
      if (paradosPct >= 0.4) {
        hip = "Probable capacidad nuestra"; hipTipo = "nuestra";
        sugerencia = "Revisar disponibilidad y mantención de los equipos de esta ruta.";
        if (pctOcupacionTractos < UMBRAL_OCUPACION_ALERTA) evidencia.push(`Ocupación general de flota baja (${pctOcupacionTractos.toFixed(0)}%): refuerza que faltan equipos disponibles.`);
      } else if (paradosPct <= 0.2) {
        hip = "Probable demanda del cliente"; hipTipo = "cliente";
        sugerencia = "Contactar al cliente: sus equipos están operativos, parece menor demanda.";
        if (habitualEnOtrasRutas > 0) evidencia.push(`${habitualEnOtrasRutas} de sus tractos habituales están trabajando en otras rutas: había capacidad, bajó la carga.`);
        else if (pctOcupacionTractos >= 80) evidencia.push(`Ocupación general alta (${pctOcupacionTractos.toFixed(0)}%): la flota está colocada en otros clientes.`);
      } else {
        hip = "Mixto — revisar"; hipTipo = "mixto";
        sugerencia = "Señal no concluyente: confirmar con el cliente y con operaciones.";
      }
    }

    // — Severidad: la peor de las dos señales, filtrada por materialidad —
    const peso = viajesMesActualCount > 0 ? c.count / viajesMesActualCount : 0;
    const drops = [dropSemanal, dropMensual].filter(x => x != null);
    const caida = drops.length ? Math.min(...drops) : 0;
    const material = c.mesAnt >= 15 || peso >= 0.08;
    let nivel = null;
    if (material) { if (caida <= -25) nivel = "rojo"; else if (caida <= -15) nivel = "amarillo"; }

    return { name: c.name, peso, count: c.count, mesAnt: c.mesAnt, proyCierre: c.proyCierre, viajes7d, norma7d: Math.round(norma7d), dropSemanal, dropMensual, caida, nivel, hip, hipTipo, sugerencia, evidencia, flotaHabitualN, habitualActivos, habitualParados, habitualEnOtrasRutas, diasSinCliente };
  }).filter(d => d.nivel).sort((a, b) => (a.nivel === b.nivel ? b.peso - a.peso : a.nivel === "rojo" ? -1 : 1));

  // ══════════ LEASING ══════════
  // La planilla trae columnas de cuotas pagadas / por pagar / deuda que son ESTÁTICAS
  // (se editan a mano y quedan desactualizadas, así que la deuda "no bajaba"). Aquí, por
  // cada contrato, recalculamos cuántas cuotas faltan según la fecha de hoy y de ahí la
  // deuda pendiente. La cuota mensual (UF y CLP) sí es fija, así que se suma del detalle.
  const leasingDet=(data.leasingDetalle||[]).filter(r=>(r.Estado||r.estado||"").toUpperCase()==="ACTIVO").map(r=>{
    const cuotaUF=parseNum(r["Cuota UF\nTotal Grupo"]||r["Cuota UF Total Grupo"]);
    const cuotaCLP=parseNum(r["Cuota CLP\ns/IVA"]||r["Cuota CLP s/IVA"]);
    const cuotaIVA=parseNum(r["Cuota CLP\nc/IVA"]||r["Cuota CLP c/IVA"]);
    const diaVcto=parseNum(r["Dia Vcto"]||r.DiaVcto);
    const fechaFin=parseDate(r["Fecha Fin\n(Vencimiento)"]||r["Fecha Fin (Vencimiento)"]||r["Fecha Fin"]||r.FechaFin);
    const totalPlan=parseNum(r["Cuotas\nTotales"]||r["Cuotas Totales"]);
    const pagadasPlan=parseNum(r["Cuotas\nPagadas"]||r["Cuotas Pagadas"]);
    const porPagarPlan=parseNum(r["Cuotas Por\nPagar"]||r["Cuotas Por Pagar"]);
    const total=totalPlan>0?totalPlan:(pagadasPlan+porPagarPlan);
    const ppCalc=cuotasLeasingPorPagar(fechaFin,diaVcto,nowMid);
    const porPagar=ppCalc!=null?(total>0?Math.min(ppCalc,total):ppCalc):porPagarPlan;
    const pagadas=total>0?Math.max(0,total-porPagar):pagadasPlan;
    return {...r,_banco:(r["Banco / Emisor"]||r.Banco||r.banco||"—").trim(),_tractos:parseNum(r["N Tractos"]||r.Tractos||r.tractos),_cuotaUF:cuotaUF,_cuotaCLP:cuotaCLP,_cuotaIVA:cuotaIVA,_diaVcto:diaVcto,_total:total,_pagadas:pagadas,_porPagar:porPagar,_deudaUF:porPagar*cuotaUF,_deudaCLP:porPagar*cuotaCLP,_deudaIVA:porPagar*cuotaIVA};
  });
  // Cada tracto es un contrato individual; las filas de la planilla solo los
  // agrupan por fecha de toma. El conteo de "contratos" es el de tractos (142);
  // las filas se exponen aparte como "operaciones" de financiamiento (13).
  const leasingOperaciones=leasingDet.length;
  const leasingTractosTotal=leasingDet.reduce((s,r)=>s+r._tractos,0);
  const leasingContratosActivos=leasingTractosTotal;
  const leasingTotalUF=leasingDet.reduce((s,r)=>s+r._cuotaUF,0);
  const leasingTotalCuotaSinIVA=leasingDet.reduce((s,r)=>s+r._cuotaCLP,0);
  const leasingTotalCuotaIVA=leasingDet.reduce((s,r)=>s+r._cuotaIVA,0);
  const leasingDeudaTotalUF=leasingDet.reduce((s,r)=>s+r._deudaUF,0);
  const leasingDeudaTotal=leasingDet.reduce((s,r)=>s+r._deudaCLP,0);
  // Deuda en caja real: lo que efectivamente se pagará (cuotas c/IVA). La versión
  // s/IVA queda como referencia contable, pero las vistas comparan contra esta.
  const leasingDeudaTotalIVA=leasingDet.reduce((s,r)=>s+r._deudaIVA,0);
  // Cartera por emisor, reconstruida desde el detalle (con la deuda ya recalculada).
  // contratos = tractos (cada tracto es un contrato); operaciones = filas/grupos.
  const leasingEmisorMap={};
  leasingDet.forEach(r=>{const k=r._banco||"—";if(!leasingEmisorMap[k])leasingEmisorMap[k]={emisor:k,operaciones:0,contratos:0,tractos:0,cuotaUF:0,cuotaCLP:0,cuotaIVA:0,deudaUF:0,deudaCLP:0,deudaIVA:0};const e=leasingEmisorMap[k];e.operaciones+=1;e.contratos+=r._tractos;e.tractos+=r._tractos;e.cuotaUF+=r._cuotaUF;e.cuotaCLP+=r._cuotaCLP;e.cuotaIVA+=r._cuotaIVA;e.deudaUF+=r._deudaUF;e.deudaCLP+=r._deudaCLP;e.deudaIVA+=r._deudaIVA;});
  const leasingEmisores=Object.values(leasingEmisorMap).sort((a,b)=>b.deudaCLP-a.deudaCLP);
  const lrParsed=data.leasingResumen||{emisores:[],totalRow:null,proxCuotas:[],proyeccion:[],refs:{}};
  // La pestaña Resumen calcula sus CLP con una UF propia (B2) que queda
  // desactualizada respecto a la del Detalle (auto-CMF): el 01-07-2026 diferían
  // 1,3% (40.173 vs 40.695). Se reescalan los CLP de las próximas cuotas a la
  // UF implícita del Detalle para que todas las cifras hablen en la misma UF.
  const ufImplicitaDetalle=leasingTotalUF>0?leasingTotalCuotaSinIVA/leasingTotalUF:null;
  const leasingProxCuotas=lrParsed.proxCuotas.map(c=>{
    if(!ufImplicitaDetalle||!(c.cuotaUF>0))return c;
    const clp=c.cuotaUF*ufImplicitaDetalle;
    return {...c,cuotaCLP:clp,cuotaIVA:clp*(1+IVA_RATE)};
  });
  // ── Proyección mensual reconstruida desde el detalle (dinámica): arranca en el
  //    mes en curso y baja sola a medida que vencen las operaciones. Reemplaza la
  //    tabla estática de la planilla, que arrancaba en un mes fijo y no avanzaba. ──
  const leasingProyeccion=(()=>{
    const conFin=leasingDet
      .map(r=>({...r,_fechaFin:parseDate(r["Fecha Fin\n(Vencimiento)"]||r["Fecha Fin (Vencimiento)"]||r["Fecha Fin"]||r.FechaFin)}))
      .filter(r=>r._fechaFin);
    if(conFin.length===0) return [];
    const ym=d=>d.getFullYear()*12+d.getMonth();
    const startYM=curYear*12+curMonth;                       // mes en curso
    const endYM=Math.max(...conFin.map(r=>ym(r._fechaFin)));  // último vencimiento
    const filas=[]; let cuotaUFPrev=null;
    for(let k=startYM;k<=endYM;k++){
      const y=Math.floor(k/12), m=k%12;
      const activos=conFin.filter(r=>ym(r._fechaFin)>=k);    // sigue pagando este mes
      const cuotaUF=activos.reduce((s,r)=>s+r._cuotaUF,0);
      const cuotaCLP=activos.reduce((s,r)=>s+r._cuotaCLP,0);
      const cuotaIVA=activos.reduce((s,r)=>s+r._cuotaIVA,0);
      const tractos=activos.reduce((s,r)=>s+r._tractos,0);
      const vencenEste=conFin.filter(r=>ym(r._fechaFin)===k);
      const porBanco={}; vencenEste.forEach(r=>{porBanco[r._banco]=(porBanco[r._banco]||0)+r._tractos;});
      const vence=Object.entries(porBanco).map(([b,t])=>`${t} tracto${t!==1?"s":""} (${b})`).join(", ");
      const ahorroUF=cuotaUFPrev!=null?Math.max(0,cuotaUFPrev-cuotaUF):0;
      filas.push({mes:MESES[m],anio:y,cuotaUF,cuotaCLP,cuotaIVA,contratos:tractos,operaciones:activos.length,vence,ahorroUF,deltaUF:cuotaUFPrev!=null?cuotaUF-cuotaUFPrev:0,nota:""});
      cuotaUFPrev=cuotaUF;
    }
    return filas;
  })();
  const dia5=leasingDet.filter(r=>r._diaVcto===5);const dia15=leasingDet.filter(r=>r._diaVcto===15);
  const cuotaDia5UF=dia5.reduce((s,r)=>s+r._cuotaUF,0);const cuotaDia15UF=dia15.reduce((s,r)=>s+r._cuotaUF,0);
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
  // Monto original y meses de gracia derivados de la propia tabla de amortización
  // (antes estaban escritos a mano en la vista y quedarían obsoletos al renegociar).
  const creditoMontoOriginal=creditoRows.length>0?creditoRows[0].saldo+creditoRows[0].capital:0;
  const creditoCuotasGracia=creditoRows.filter(r=>r.valorCuota===0).length;
  if(creditoProxima){const fd=parseDate(creditoProxima.fecha);if(fd){const dc=Math.ceil((fd-nowMid)/86400000);if(dc<=7&&dc>=0){alertas.push({type:"info",icon:CreditCard,msg:`Crédito Itaú: cuota #${creditoProxima.cuota} de ${fmtM(creditoProxima.valorCuota)} vence en ${dc} días`});}}}

  const leasingMesEstimado=leasingTotalCuotaIVA;
  const creditoMesEstimado=creditoValorCuota;
  // Base BRUTA (c/IVA) en ambos márgenes: los costos restados son pagos reales de
  // caja (cuota leasing c/IVA, compromisos, crédito), así que la facturación también
  // debe ir en bruto. Antes se restaba contra la venta neta y mezclaba bases.
  // OJO: no incluye combustible ni remuneraciones — es cobertura de costos fijos
  // financieros, no margen del negocio.
  const margenMesEstimado=totalMesActualBruto-(totalCompromisosMes+leasingMesEstimado+creditoMesEstimado);
  const margenMesEstimadoCaja=totalMesAnteriorBruto-(totalCompromisosMes+leasingMesEstimado+creditoMesEstimado);

  // ══════════ SERVICIO DE DEUDA CONSOLIDADO (leasing + crédito) ══════════
  // Curva mensual de cuánto sale por deuda cada mes desde hoy hasta el último
  // vencimiento, combinando leasing (cuota c/IVA, dinámica) y crédito Itaú.
  const servicioDeudaMensual=(()=>{
    const credYM={};creditoRows.forEach(r=>{const fd=parseDate(r.fecha);if(fd&&r.valorCuota>0){const k=fd.getFullYear()*12+fd.getMonth();credYM[k]=(credYM[k]||0)+r.valorCuota;}});
    const leasYM={};leasingProyeccion.forEach(r=>{const mi=MESES.indexOf(r.mes);if(mi>=0)leasYM[r.anio*12+mi]=r.cuotaIVA;});
    const startK=curYear*12+curMonth;
    const keys=[...new Set([...Object.keys(credYM),...Object.keys(leasYM)].map(Number))].filter(k=>k>=startK).sort((a,b)=>a-b);
    return keys.map(k=>({mes:MESES[k%12],anio:Math.floor(k/12),label:`${MESES[k%12]} ${String(Math.floor(k/12)).slice(2)}`,leasing:leasYM[k]||0,credito:credYM[k]||0,total:(leasYM[k]||0)+(credYM[k]||0)}));
  })();

  // ══════════ TARIFA MEDIA ══════════
  // Ingreso por viaje y por km, con el desfase real del negocio: los viajes de un
  // mes se facturan al mes siguiente. tarifa[mF] = ventas[mF] / viajes[mF-1].
  // Solo meses cerrados (el mes en curso tiene facturación parcial y distorsiona).
  // Solo tramos CON cliente (cargados): desde ene-2026 la planilla de flota registra
  // también los retornos vacíos (Carga=VACIO, sin cliente), que en 2025 no existían.
  // Sumar todo hacía incomparable el $/km entre años (2026 salía ~30% más bajo).
  const kmPorMesActualArr=Array(12).fill(0), kmPorMesPrevArr=Array(12).fill(0);
  flotaRows.forEach(r=>{if(!r._cliente)return;const m=r._date.getMonth();if(r._date.getFullYear()===curYear)kmPorMesActualArr[m]+=r._km;else if(r._date.getFullYear()===prevYear)kmPorMesPrevArr[m]+=r._km;});
  // Enero (mF=0) también entra: sus viajes son de DICIEMBRE del año previo
  // (columna "anterior" del comparado); el año -2 no está disponible, así que
  // la serie "anterior" de enero queda en null.
  const tarifaPorMes=[];
  for(let mF=0;mF<12;mF++){
    const cerrado=mF<curMonth;
    const vAct=ventasPorMesComparado[mF]?.actual||0, vPrev=ventasPorMesComparado[mF]?.anterior||0;
    const jAct=mF===0?(viajesPorMesComparado[11]?.anterior||0):(viajesPorMesComparado[mF-1]?.actual||0);
    const jPrev=mF===0?0:(viajesPorMesComparado[mF-1]?.anterior||0);
    const kmAct=mF===0?kmPorMesPrevArr[11]:kmPorMesActualArr[mF-1];
    const kmPrev=mF===0?0:kmPorMesPrevArr[mF-1];
    tarifaPorMes.push({
      mes:MESES[mF],
      actual:cerrado&&vAct>0&&jAct>0?vAct/jAct:null,
      anterior:vPrev>0&&jPrev>0?vPrev/jPrev:null,
      actualKm:cerrado&&vAct>0&&kmAct>0?vAct/kmAct:null,
      anteriorKm:vPrev>0&&kmPrev>0?vPrev/kmPrev:null,
    });
  }

  // ══════════ GENERACIÓN POR CAMIÓN ══════════
  // "Cuánto genera un camión que trabaja", sin bajar a la patente. La facturación NO
  // viene desglosada por tracto, así que el numerador es la venta neta del mes y el
  // divisor son los tractocamiones del padrón con ≥1 viaje ese mes (los que realmente
  // trabajaron): un tracto parado no aparece en su mes, así que no infla el divisor —
  // el criterio "camión que trabaja" queda implícito, sin filtro de 30 días aparte.
  // El promedio del año usa SOLO meses cerrados (el mes en curso tiene venta y flota
  // parciales y subestima). El anual es ese promedio mensual × 12 (ritmo anualizado).
  const tractosOperPorMesSet=Array.from({length:12},()=>new Set());
  Object.entries(flotaTractoDia).forEach(([k,set])=>{const dt=new Date(k+"T12:00:00");if(dt.getFullYear()===curYear){const m=dt.getMonth();set.forEach(t=>tractosOperPorMesSet[m].add(t));}});
  const tractosOperativosPorMes=tractosOperPorMesSet.map(s=>s.size);
  const genPorCamionPorMes=ventasPorMesComparado.map((mm,m)=>{
    const cam=tractosOperativosPorMes[m];
    const cerrado=closedMonths.includes(m+1);
    return {mes:mm.mes,valor:cam>0&&mm.actual>0?Math.round(mm.actual/cam):null,camiones:cam,ventas:mm.actual,cerrado,enCurso:m===curMonth&&monthInProgress};
  });
  const genCerrados=genPorCamionPorMes.filter(g=>g.cerrado&&g.valor!=null);
  const genMesesCerradosN=genCerrados.length;
  const genPorCamionMensual=genMesesCerradosN?Math.round(genCerrados.reduce((s,g)=>s+g.valor,0)/genMesesCerradosN):0;
  const genPorCamionAnual=genPorCamionMensual*12;
  const genPorCamionYTD=genCerrados.reduce((s,g)=>s+g.valor,0); // acumulado por camión, meses cerrados
  const camionesOperativosProm=genMesesCerradosN?Math.round(genCerrados.reduce((s,g)=>s+g.camiones,0)/genMesesCerradosN):0;
  const genPorCamionMesEnCurso=(genPorCamionPorMes[curMonth]&&genPorCamionPorMes[curMonth].valor!=null)?genPorCamionPorMes[curMonth]:null;

  // ══════════ FRESCURA DE DATOS ══════════
  // Hasta qué día llegan los datos de cada fuente. Distinto de "hace cuánto se
  // descargó el CSV": una planilla puede descargarse ahora y venir atrasada días.
  const maxDateOf=(rows)=>rows.reduce((mx,r)=>(r._date&&(!mx||r._date>mx))?r._date:mx,null);
  let maxFechaBancos=null;bancosRows.forEach(r=>{const f=parseDate(r.Fecha||r.fecha);if(f&&(!maxFechaBancos||f>maxFechaBancos))maxFechaBancos=f;});
  const frescuraFuentes=[
    {fuente:"Ventas",fecha:maxDateOf(ventasRows)},
    {fuente:"Viajes",fecha:maxDateOf(viajesRows)},
    {fuente:"Flota",fecha:maxDateOf(flotaRows)},
    {fuente:"Bancos",fecha:maxFechaBancos},
  ].map(f=>({
    fuente:f.fuente,
    dias:f.fecha?Math.round((nowMid-new Date(f.fecha.getFullYear(),f.fecha.getMonth(),f.fecha.getDate()))/86400000):null,
    label:f.fecha?f.fecha.toLocaleDateString("es-CL",{day:"2-digit",month:"short"}):"sin datos",
  }));

  // ══════════ HISTORIZACIÓN ══════════
  const histRows=parseHistorico(data.historico);
  const comparativas=computeComparativas(histRows,now);

  return {histRows,comparativas,totalMesActual,totalMesAnterior,ventasPorMes,topClientes,ventasAnoActual,ventasAnoAnterior,ventasRows,viajesMesActual:viajesMesActual.length,viajesMesAnteriorCount:viajesMesAnterior.length,viajesCorteActual,viajesCorteAnterior,viajesPorMes,viajesPorMesComparado,topClientesViajes,viajesPorEquipo,dayOfMonth,totalCaja,saldosBancos,totalDAP,gananciaDAP,dapProximos,totalFondos,fondosSaldos,totalInversiones,totalDAPTrabajo,totalDAPInversion,totalDAPCredito,gananciaDAPTrabajo,gananciaDAPInversion,gananciaDAPCredito,totalInversionReal,totalCompromisosProx,compromisosProx,totalCompromisosMes,totalGuardadoMes,compromisosMes,alertas,kmMesActual,kmAnioActual,kmPorDia,tractosEnOperacion,tractosParados,tractosParadosLista,ventanaUtilDias,tractosDespachadosDia,pctDespachadosDia,totalContratados,totalEnExpedicion,totalNoActivos,pctOcupacionConductores,tractosActivosAyer,pctTractosAyer,totalTractocamiones,pctOcupacionTractos,lastFullDayLabel,viajesAyer,viajesAyerLabel,despachosMesLabel,totalMesAnteriorCorte,ventasDiaCorte,leasingContratosActivos,leasingOperaciones,leasingTractosTotal,leasingEmisores,leasingTotalCuotaIVA,leasingTotalCuotaSinIVA,leasingDeudaTotal,leasingDeudaTotalUF,leasingTotalUF,leasingProxCuotas,leasingProyeccion,cuotaDia5UF,cuotaDia15UF,leasingDet,creditoRows,creditoSaldoActual,creditoCapitalPendiente,creditoDeudaTotal,creditoValorCuota,creditoTotalCuotas,creditoProxima,creditoCuotasPagadas,creditoCuotasPorPagar,creditoTotalIntereses,creditoTotalCapital,creditoInteresesPendientes,curMonth,curYear,ventasPorMesComparado,ventasPorMesConProyeccion,acumActual,acumAnterior,acumCorteActual,acumCorteAnterior,prevYear,ultimasFacturas,tractosUnicosMes,diasConDatosTractos,projections,mepcoActivo,mepcoHistoricoCerrado,mepcoCorteLabel,impactoMepcoMes,impactoMepcoAcum,pozoCombustibleAcum,pozoCombustibleMes,pozoCombustibleVolM3,pozoCombustibleDocs,pozoCombustibleMeta,coberturaPozoMepco,brechaPozoMepco,margenMesEstimado,margenMesEstimadoCaja,totalMesAnteriorBruto,leasingMesEstimado,creditoMesEstimado,coberturaSemanas,coberturaRatio30,coberturaRatio30ConColchon,liquidez30,liquidez30Total,colchonAdicional30,comp30,dap30,dapTrabajoVence30,dapCreditoVence30,dapInversionVence30,primeraSemanaCritica,proyMesActualPorViajes,proyMesSiguientePorViajes,proyAnualPorViajes,tasaGlobal,tasaPorCliente,desgloseMesActualProy,facturacionProyectadaPorViajes,facturacionProyViajesSinMepco,upliftPorMes,desglosePorMesFactura,comp60Total,proyViajesHibrido,viajesProyectadosFaltantes,proyViajesProrrateoSimple,proyViajesEstacional,proyViajesDiaSemana,proyViajesRunRatePlano,ritmoDiaReciente,diasCompletosMes,topClientesViajesProy,alertasClienteDiag,diasTranscurridosMes,diasTotalesMes,totalMesActualBruto,leasingDeudaTotalIVA,creditoMontoOriginal,creditoCuotasGracia,concentracionTop2,tarifaPorMes,cumplimientoMensual,servicioDeudaMensual,frescuraFuentes,tractosParados30,flotaOperativa,pctOcupacionTractosOperativa,kmMesAnteriorCorte,topRutas,rutasDistintas,rutasViajesTotal,rutasKmTotal,concentracionTop5Rutas,topConductores,conductoresConViajes,kmPromedioConductor,conductoresBajaUtilizacion,genPorCamionPorMes,genPorCamionMensual,genPorCamionAnual,genPorCamionYTD,camionesOperativosProm,tractosOperativosPorMes,genPorCamionMesEnCurso,genMesesCerradosN};
}
