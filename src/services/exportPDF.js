import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pctChange, parseDate, todayMidnight } from "../utils.js";

const BLUE = [37, 99, 235];
const GRAY_TEXT = "#64748b";
const DARK_TEXT = "#0f172a";
const ROW_ALT = [248, 250, 252];
const ROW_HEAD = [241, 245, 249];

function fmtCLP(val) {
  if (val === null || val === undefined || val === "") return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}MM`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString("es-CL")}`;
}

function addPageHeader(doc, section, dateStr) {
  const w = doc.internal.pageSize.width;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, w, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CM  Centro de Mando — Transportes Bello e Hijos Ltda.", 8, 9);
  doc.setFont("helvetica", "normal");
  doc.text(`${section}  ·  ${dateStr}`, w - 8, 9, { align: "right" });
  doc.setTextColor(DARK_TEXT);
}

function sectionTitle(doc, text, y) {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK_TEXT);
  doc.text(text, 10, y);
}

function addPageNumbers(doc, dateStr) {
  const total = doc.internal.getNumberOfPages();
  const w = doc.internal.pageSize.width;
  const h = doc.internal.pageSize.height;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(GRAY_TEXT);
    doc.text(`Generado el ${dateStr}  ·  Pág. ${i} de ${total}`, w / 2, h - 5, { align: "center" });
  }
}

const TABLE_STYLES = {
  styles: { fontSize: 7.5, cellPadding: 2 },
  headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
  alternateRowStyles: { fillColor: ROW_ALT },
  margin: { left: 10, right: 10 },
};

export function exportFullPDF(C) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.width;
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  const fullDate = `${dateStr}  ${now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;

  // ── PÁGINA 1: RESUMEN EJECUTIVO ──────────────────────────────────────
  addPageHeader(doc, "Resumen Ejecutivo", fullDate);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK_TEXT);
  doc.text("Resumen Ejecutivo", 10, 26);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_TEXT);
  doc.text(`Generado el ${fullDate}`, 10, 32);

  // KPI boxes
  const kpis = [
    { label: "VENTAS MES", value: fmtCLP(C.totalMesActual), sub: `Ant: ${fmtCLP(C.totalMesAnterior)}` },
    { label: "CAJA TOTAL", value: fmtCLP(C.totalCaja), sub: "Saldo bancos" },
    { label: "VIAJES MES", value: (C.viajesMesActual || 0).toLocaleString("es-CL"), sub: `Ant: ${C.viajesMesAnteriorCount || 0}` },
    { label: "LIQUIDEZ 30D", value: C.coberturaRatio30 != null ? `${C.coberturaRatio30.toFixed(2)}x` : "—", sub: "Ratio cobertura" },
    { label: "FLOTA EN OPERACIÓN", value: C.pctOcupacionTractos ? `${C.pctOcupacionTractos.toFixed(0)}%` : "—", sub: `${C.tractosEnOperacion || 0}/${C.totalTractocamiones || 0} tractos (${C.ventanaUtilDias || 7}d)` },
  ];
  const boxW = (pageW - 20) / 5;
  kpis.forEach((k, i) => {
    const x = 10 + i * boxW;
    doc.setFillColor(...ROW_ALT);
    doc.roundedRect(x + 1, 36, boxW - 2, 22, 2, 2, "F");
    doc.setDrawColor(220, 230, 240);
    doc.roundedRect(x + 1, 36, boxW - 2, 22, 2, 2, "S");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text(k.label, x + 4, 41);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DARK_TEXT);
    doc.text(k.value, x + 4, 49);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_TEXT);
    doc.text(k.sub, x + 4, 55);
  });

  // Ventas comparativo YoY
  sectionTitle(doc, "Ventas por mes — comparativo YoY", 68);
  const meses = C.ventasPorMesComparado || [];
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: 71,
    head: [["", ...meses.map(m => m.mes)]],
    body: [
      [`${C.curYear}`, ...meses.map(m => m.actual > 0 ? fmtCLP(m.actual) : "—")],
      [`${C.prevYear}`, ...meses.map(m => m.anterior > 0 ? fmtCLP(m.anterior) : "—")],
      ["Var %", ...meses.map(m => m.anterior > 0 && m.actual > 0 ? `${pctChange(m.actual, m.anterior).toFixed(1)}%` : "—")],
    ],
    columnStyles: { 0: { fontStyle: "bold", fillColor: ROW_HEAD } },
  });

  // ── PÁGINA 2: VENTAS DETALLE ────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, "Ventas", fullDate);

  sectionTitle(doc, "Top clientes — mes actual", 24);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: 27,
    head: [["Cliente", "Neto mes"]],
    body: (C.topClientes || []).map(c => [c.name, fmtCLP(c.total)]),
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 120,
  });

  const y2 = doc.lastAutoTable.finalY + 8;
  sectionTitle(doc, "Últimas facturas emitidas", y2);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y2 + 3,
    head: [["Fecha", "Folio", "Tipo", "Cliente", "Neto"]],
    body: (C.ultimasFacturas || []).map(f => [f.fecha, f.folio, f.tipo, f.cliente, fmtCLP(f.neto)]),
    columnStyles: { 4: { halign: "right" } },
  });

  // ── PÁGINA 3: OPERACIONES ───────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, "Operaciones", fullDate);

  sectionTitle(doc, "Viajes por mes", 24);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: 27,
    head: [["Mes", "Viajes"]],
    body: (C.viajesPorMes || []).map(m => [m.mes, m.total > 0 ? m.total.toLocaleString("es-CL") : "—"]),
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 80,
  });

  const y3 = doc.lastAutoTable.finalY + 8;
  sectionTitle(doc, "Top clientes por viajes — mes actual", y3);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y3 + 3,
    head: [["Cliente", "Viajes"]],
    body: (C.topClientesViajes || []).map(c => [c.name, c.count]),
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 120,
  });

  // ── PÁGINA 4: FINANZAS ──────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, "Finanzas", fullDate);

  sectionTitle(doc, "Saldos bancarios", 24);
  const bancosData = Object.entries(C.saldosBancos || {}).map(([b, s]) => [b, fmtCLP(s)]);
  bancosData.push(["TOTAL", fmtCLP(C.totalCaja)]);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: 27,
    head: [["Banco", "Saldo"]],
    body: bancosData,
    columnStyles: { 1: { halign: "right" } },
    tableWidth: 120,
  });

  const y4 = doc.lastAutoTable.finalY + 8;
  sectionTitle(doc, "Compromisos del mes", y4);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y4 + 3,
    head: [["Fecha", "Concepto", "Monto", "Guardado", "Falta", "Estado"]],
    body: (C.compromisosMes || []).map(c => [
      c.fecha ? c.fecha.toLocaleDateString("es-CL") : "—",
      c.concepto,
      fmtCLP(c.monto),
      fmtCLP(c.guardado),
      fmtCLP(c.falta),
      c.estado,
    ]),
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  // ── PÁGINA 5: LEASING Y CRÉDITO ─────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, "Leasing y Crédito", fullDate);

  sectionTitle(doc, "Leasing — cartera por emisor", 24);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: 27,
    head: [["Emisor", "Contratos", "Operaciones", "Cuota s/IVA", "Cuota c/IVA", "Deuda c/IVA"]],
    body: [
      ...(C.leasingEmisores || []).map(e => [e.emisor, e.contratos, e.operaciones, fmtCLP(e.cuotaCLP), fmtCLP(e.cuotaIVA), fmtCLP(e.deudaIVA ?? e.deudaCLP)]),
      ["TOTAL", C.leasingContratosActivos, C.leasingOperaciones, fmtCLP(C.leasingTotalCuotaSinIVA), fmtCLP(C.leasingTotalCuotaIVA), fmtCLP(C.leasingDeudaTotalIVA || C.leasingDeudaTotal)],
    ],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  const y5 = doc.lastAutoTable.finalY + 8;
  sectionTitle(doc, "Crédito Itaú — próximas cuotas", y5);
  const hoyCredito = todayMidnight();
  const proxCredito = (C.creditoRows || [])
    .filter(r => { const fd = parseDate(r.fecha); return fd && fd >= hoyCredito && r.valorCuota > 0; })
    .slice(0, 8);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y5 + 3,
    head: [["#", "Fecha", "Capital", "Interés", "Cuota", "Saldo"]],
    body: proxCredito.map(r => [r.cuota, r.fecha, fmtCLP(r.capital), fmtCLP(r.interes), fmtCLP(r.valorCuota), fmtCLP(r.saldo)]),
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  addPageNumbers(doc, fullDate);

  const fileName = `CentroDeMando_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
