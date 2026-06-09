import * as XLSX from "xlsx";
import { pctChange } from "../utils.js";

function sheet(headers, rows) {
  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
}

function save(wb, prefix) {
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${prefix}_${date}.xlsx`);
}

export function exportVentasExcel(C) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Mes", String(C.curYear), String(C.prevYear), "Var %"],
    (C.ventasPorMesComparado || []).map(m => [
      m.mes,
      m.actual || 0,
      m.anterior || 0,
      m.anterior > 0 && m.actual > 0 ? parseFloat(pctChange(m.actual, m.anterior).toFixed(1)) : "",
    ])
  ), "Por Mes");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Cliente", "Neto mes"],
    (C.topClientes || []).map(c => [c.name, c.total])
  ), "Top Clientes");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Fecha", "Folio", "Tipo", "Cliente", "Neto"],
    (C.ultimasFacturas || []).map(f => [f.fecha, f.folio, f.tipo, f.cliente, f.neto])
  ), "Facturas Recientes");

  save(wb, "Ventas");
}

export function exportOperacionesExcel(C) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Mes", "Viajes"],
    (C.viajesPorMes || []).map(m => [m.mes, m.total])
  ), "Viajes por Mes");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Cliente", "Viajes mes actual", "Proyección cierre", "Mes anterior"],
    (C.topClientesViajesProy || []).map(c => [c.name, c.count, c.proyCierre, c.mesAnt])
  ), "Top Clientes");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Tipo equipo", "Viajes"],
    (C.viajesPorEquipo || []).map(e => [e.name, e.count])
  ), "Por Tipo Equipo");

  save(wb, "Operaciones");
}

export function exportFinanzasExcel(C) {
  const wb = XLSX.utils.book_new();

  const bancosRows = Object.entries(C.saldosBancos || {}).map(([b, s]) => [b, s]);
  bancosRows.push(["TOTAL", C.totalCaja]);
  XLSX.utils.book_append_sheet(wb, sheet(["Banco", "Saldo"], bancosRows), "Bancos");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Banco", "Monto Inicial", "Monto Final", "Ganancia", "Vencimiento", "Tipo"],
    (C.dapProximos || []).map(r => [
      r.banco,
      r.monto,
      r.montoFinal,
      r.montoFinal - r.monto,
      r.vencimiento ? r.vencimiento.toLocaleDateString("es-CL") : "",
      r._tipoNorm || r.tipo,
    ])
  ), "DAP Vigentes");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Fecha", "Concepto", "Monto", "Guardado", "Falta", "Estado"],
    (C.compromisosMes || []).map(c => [
      c.fecha ? c.fecha.toLocaleDateString("es-CL") : "",
      c.concepto,
      c.monto,
      c.guardado,
      c.falta,
      c.estado,
    ])
  ), "Compromisos Mes");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Semana", "Período", "Compromisos", "DAP vence", "Caja inicio", "Neto", "Ratio"],
    (C.coberturaSemanas || []).map(s => [
      s.semana,
      s.label,
      s.compromisos,
      s.dapVence,
      s.cajaInicio,
      s.neto,
      s.ratio != null ? parseFloat(s.ratio.toFixed(2)) : "",
    ])
  ), "Cobertura Semanal");

  save(wb, "Finanzas");
}

export function exportLeasingExcel(C) {
  const wb = XLSX.utils.book_new();

  const emisoresRows = (C.leasingEmisores || []).map(e => [
    e.emisor, e.contratos, e.operaciones, e.cuotaUF, e.cuotaCLP, e.cuotaIVA, e.deudaUF, e.deudaCLP,
  ]);
  emisoresRows.push([
    "TOTAL", C.leasingContratosActivos, C.leasingOperaciones,
    C.leasingTotalUF, C.leasingTotalCuotaSinIVA, C.leasingTotalCuotaIVA, "", C.leasingDeudaTotal,
  ]);
  XLSX.utils.book_append_sheet(wb, sheet(
    ["Emisor", "Contratos", "Operaciones", "Cuota UF", "Cuota s/IVA", "Cuota c/IVA", "Deuda UF", "Deuda CLP"],
    emisoresRows
  ), "Por Emisor");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Fecha", "Días", "Cuota UF", "Cuota s/IVA", "Cuota c/IVA", "Bancos", "Estado"],
    (C.leasingProxCuotas || []).map(r => [r.fecha, r.dias, r.cuotaUF, r.cuotaCLP, r.cuotaIVA, r.bancos, r.estado])
  ), "Próximas Cuotas");

  XLSX.utils.book_append_sheet(wb, sheet(
    ["Mes", "Año", "Cuota UF", "Cuota s/IVA", "Cuota c/IVA", "Contratos", "Vence", "Δ UF", "Ahorro UF", "Nota"],
    (C.leasingProyeccion || []).map(r => [r.mes, r.anio, r.cuotaUF, r.cuotaCLP, r.cuotaIVA, r.contratos, r.vence, r.deltaUF, r.ahorroUF, r.nota])
  ), "Proyección Mensual");

  save(wb, "Leasing");
}

export function exportCreditoExcel(C) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, sheet(
    ["# Cuota", "Fecha", "Capital", "Interés", "Cuota", "Saldo"],
    (C.creditoRows || []).map(r => [r.cuota, r.fecha, r.capital, r.interes, r.valorCuota, r.saldo])
  ), "Tabla de Cuotas");

  save(wb, "Credito");
}
