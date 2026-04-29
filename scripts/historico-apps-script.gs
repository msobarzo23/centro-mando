// =====================================================================
// Centro de Mando — Historizador diario de métricas
// =====================================================================
// Pegar TODO este código en el editor de Google Apps Script de la
// planilla "Centro_mando_historico".
//
// Métricas guardadas en cada snapshot:
//   - viajes_total: count acumulado histórico de filas en planilla Viajes
//   - ventas_total_neto: suma acumulada histórica de NETO en planilla Ventas
//   - tractos_activos: tractos únicos que viajaron en el día del snapshot
//                      (ocupación real de flota — excluye comodín AA1111)
//   - conductores_activos: conductores únicos en estado "En proceso"
//                          en planilla Expediciones (excluye comodín)
//
// Si actualizaste el schema, corre `resetearHistorico` una vez antes de
// `inicializar`. Eso borra todas las filas y deja la pestaña limpia.
// =====================================================================

const SOURCES = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  viajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
  expediciones: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=0&single=true&output=csv",
  conductoresActivos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=780336350&single=true&output=csv"
};

const SHEET_NAME = "Historico";
const HEADER = ["fecha", "viajes_total", "ventas_total_neto", "tractos_activos", "conductores_activos"];
const COMODIN_TRACTO = "AA1111";
const COMODIN_CONDUCTOR = "CONDUCTOR, TRANSPORTES BELLO";

function inicializar() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
  } else {
    // Reescribir header siempre (por si cambió el schema).
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  }
  sheet.getRange(1, 1, 1, HEADER.length).setFontWeight("bold");
  sheet.setFrozenRows(1);

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "snapshotDiario") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("snapshotDiario")
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .inTimezone("America/Santiago")
    .create();
  Logger.log("Listo. Trigger creado para correr diariamente entre 23:00 y 23:59 hora Chile.");
}

function resetearHistorico() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(HEADER);
  sheet.getRange(1, 1, 1, HEADER.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  Logger.log("Histórico reseteado. Solo quedó la fila de encabezados.");
}

function snapshotDiario() {
  const ventas = fetchCSV(SOURCES.ventas);
  const viajes = fetchCSV(SOURCES.viajes);
  const flotaViajes = fetchCSV(SOURCES.flotaViajes);
  const expediciones = fetchCSV(SOURCES.expediciones);
  const conductoresPlanilla = fetchCSV(SOURCES.conductoresActivos);

  const fechaYmd = Utilities.formatDate(new Date(), "America/Santiago", "yyyy-MM-dd");

  // === Acumulables ===
  const viajesTotal = viajes.filter(function (r) {
    return (r.fechainicio || r.FechaInicio || r.fecha || "").toString().trim().length > 0;
  }).length;

  const ventasTotal = ventas.reduce(function (s, r) {
    return s + parseNum(r.NETO || r.Neto || r.neto);
  }, 0);

  // === Tractos activos: tractos únicos que viajaron HOY (en flotaViajes) ===
  // Excluye el comodín AA1111.
  const tractosHoy = {};
  flotaViajes.forEach(function (r) {
    const f = toYmdMaybe(r.Fecha || r.fecha || r.fechainicio);
    if (f !== fechaYmd) return;
    const t = (r.Tracto || r.tracto || "").toString().trim();
    if (!t || t === COMODIN_TRACTO) return;
    tractosHoy[t] = true;
  });
  const tractosActivos = Object.keys(tractosHoy).length;

  // === Conductores activos: en estado "En proceso" en expediciones ===
  // Cruzar con planilla conductoresActivos para excluir nombres no contratados.
  const contratadosSet = {};
  conductoresPlanilla.forEach(function (r) {
    const n = normName(r.personal || r.Personal || "");
    if (n) contratadosSet[n] = true;
  });
  const conductoresEnExp = {};
  expediciones.forEach(function (r) {
    const estado = (r.estado || r.Estado || "").toString().trim();
    const conductor = (r.conductor || r.Conductor || "").toString().trim();
    if (estado !== "En proceso") return;
    if (conductor === COMODIN_CONDUCTOR) return;
    const n = normName(conductor);
    if (n && contratadosSet[n]) conductoresEnExp[n] = true;
  });
  const conductoresActivos = Object.keys(conductoresEnExp).length;

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Falta la pestaña '" + SHEET_NAME + "'. Ejecuta inicializar() primero.");

  const lastRow = sheet.getLastRow();
  const fila = [fechaYmd, viajesTotal, ventasTotal, tractosActivos, conductoresActivos];
  if (lastRow > 1) {
    const fechaUltima = sheet.getRange(lastRow, 1).getDisplayValue();
    if (fechaUltima === fechaYmd) {
      sheet.getRange(lastRow, 1, 1, fila.length).setValues([fila]);
      Logger.log("Snapshot del " + fechaYmd + " actualizado: " + JSON.stringify(fila));
      return;
    }
  }
  sheet.appendRow(fila);
  Logger.log("Snapshot del " + fechaYmd + " agregado: " + JSON.stringify(fila));
}

function fetchCSV(url) {
  const text = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }).getContentText();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  const header = parseLine(lines[0]).map(function (h) { return h.trim(); });
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = (cells[j] || "").trim();
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      cells.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function parseNum(v) {
  if (v == null || v === "") return 0;
  let s = v.toString().replace(/\$/g, "").replace(/\s/g, "");
  if (s.indexOf(",") !== -1) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function normName(n) {
  return (n || "").toString().toUpperCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}

function pad2(s) { s = String(s); return s.length < 2 ? "0" + s : s; }

function toYmdMaybe(s) {
  if (!s) return null;
  s = s.toString().trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + pad2(m[2]) + "-" + pad2(m[3]);
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const yyyy = m[3].length === 2 ? "20" + m[3] : m[3];
    return yyyy + "-" + pad2(m[2]) + "-" + pad2(m[1]);
  }
  return null;
}
