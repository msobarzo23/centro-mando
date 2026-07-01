import { parseNum } from "../utils.js";

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// El 01-06-2026 se cargaron a la planilla de ventas todas las facturas de 2023
// ($54.139.897.483): el acumulado del snapshot saltó ese monto de un día para
// otro sin que fueran ventas nuevas, y cualquier variación día/semana/mes que
// cruce esa fecha queda distorsionada (junio salía ~10× su valor real). Para
// dejar toda la serie en la MISMA base, a los snapshots anteriores al salto se
// les suma el monto incorporado. Si vuelve a pasar (otro backfill), agregar
// una entrada acá con la fecha del salto y el monto agregado.
const REBASES_VENTAS = [
  { antesDe: "2026-06-01", ajuste: 54139897483 },
];

export function parseHistorico(rawRows) {
  return (rawRows || [])
    .map(r => {
      const fecha = (r.fecha || "").trim();
      const ajuste = REBASES_VENTAS.reduce((s, rb) => s + (fecha && fecha < rb.antesDe ? rb.ajuste : 0), 0);
      return {
        fecha,
        viajes: parseNum(r.viajes_total),
        ventas: parseNum(r.ventas_total_neto) + ajuste,
        tractos: parseNum(r.tractos_activos),
        conductores: parseNum(r.conductores_activos),
      };
    })
    .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const snapAtOrBefore = (rows, fechaYmd) => {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].fecha <= fechaYmd) return rows[i];
  }
  return null;
};

const ACUMULABLES = ["ventas", "viajes"];

function buildMetric(curr, prev, metrica) {
  const acumulable = ACUMULABLES.includes(metrica);
  let actual = null, previo = null;
  if (acumulable) {
    if (curr.end && curr.start) actual = curr.end[metrica] - curr.start[metrica];
    if (prev.end && prev.start) previo = prev.end[metrica] - prev.start[metrica];
  } else {
    if (curr.end) actual = curr.end[metrica];
    if (prev.end) previo = prev.end[metrica];
  }
  if (actual == null) return null;
  if (previo == null) return { actual, previo: null, delta: null, pct: null };
  const delta = actual - previo;
  const pct = previo !== 0 ? (delta / Math.abs(previo)) * 100 : null;
  return { actual, previo, delta, pct };
}

export function computeComparativas(histRows, now) {
  if (!histRows || histRows.length === 0) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(today); dayBefore.setDate(dayBefore.getDate() - 2);
  const week1 = new Date(today); week1.setDate(week1.getDate() - 7);
  const week2 = new Date(today); week2.setDate(week2.getDate() - 14);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const month2End = new Date(now.getFullYear(), now.getMonth() - 1, 0);

  const sToday = snapAtOrBefore(histRows, ymd(today));
  const sYesterday = snapAtOrBefore(histRows, ymd(yesterday));
  const sDayBefore = snapAtOrBefore(histRows, ymd(dayBefore));
  const sWeek1 = snapAtOrBefore(histRows, ymd(week1));
  const sWeek2 = snapAtOrBefore(histRows, ymd(week2));
  const sMonthEnd = snapAtOrBefore(histRows, ymd(monthEnd));
  const sMonth2End = snapAtOrBefore(histRows, ymd(month2End));

  const modos = [
    { id: "day",   curr: { end: sToday, start: sYesterday }, prev: { end: sYesterday, start: sDayBefore } },
    { id: "week",  curr: { end: sToday, start: sWeek1 },     prev: { end: sWeek1,    start: sWeek2 } },
    { id: "month", curr: { end: sToday, start: sMonthEnd },  prev: { end: sMonthEnd, start: sMonth2End } },
  ];

  const out = {};
  modos.forEach(({ id, curr, prev }) => {
    out[id] = {
      ventas: buildMetric(curr, prev, "ventas"),
      viajes: buildMetric(curr, prev, "viajes"),
      tractos: buildMetric(curr, prev, "tractos"),
      conductores: buildMetric(curr, prev, "conductores"),
    };
  });

  out.snapshotsTotales = histRows.length;
  out.fechaUltimo = histRows[histRows.length - 1].fecha;
  return out;
}
