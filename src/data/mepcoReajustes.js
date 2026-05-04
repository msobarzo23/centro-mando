// ═══════════════════════════════════════════════════════════════════════════
// REAJUSTES TARIFARIOS POST-SHOCK MEPCO (abril 2026)
// ═══════════════════════════════════════════════════════════════════════════
// Fuente: maestro_reajuste.xlsx (negociaciones cliente por cliente).
// Vigencia general: viajes desde el 1° de abril 2026 → factura desde mayo 2026.
//
// Este archivo es la copia de dashboard-ventas/src/data/mepcoReajustes.js,
// adaptado al import de constants.js. Mantener ambos sincronizados cuando
// cambie el mapa.
// ═══════════════════════════════════════════════════════════════════════════

import { MEPCO_ADJUSTMENT_MONTH } from "../constants.js";
export { MEPCO_ADJUSTMENT_MONTH };
export const MEPCO_ADJUSTMENT_YEAR = 2026;
export const MEPCO_TRIP_START_MONTH = 4;

// ─── Caso simple: un único % por cliente ────────────────────────────────────
export const MEPCO_REAJUSTES_SIMPLE = {
  "77.662.843-3": { razon: "ACEROBOL SPA", pct: 0.30 },
  "99.572.990-3": { razon: "ALEXIM CHILE S.A.", pct: 0.268 },
  "99.522.430-5": { razon: "ALZATEC S.A.", pct: 0.268 },
  "96.511.470-K": { razon: "AUSTIN CHILE TRADING LIMITADA", pct: 0.14, observacion: "Aceptado" },
  "76.565.016-K": { razon: "CAL TEC SPA", pct: 0.21 },
  "76.066.370-0": { razon: "CALERAS SAN JUAN CHILE LTDA.", pct: 0.18 },
  "96.718.010-6": { razon: "CBB CALES S.A.", pct: 0.16 },
  "89.468.900-5": { razon: "COMPAÑIA MINERA DOÑA INES DE COLLAHUASI SCM", pct: 0.268 },
  "76.154.249-4": { razon: "COMPAÑIA MINERA ARQUEROS S.A", pct: 0.268, observacion: "A partir del 27 de marzo" },
  "79.538.350-6": { razon: "CONSTRUCTORA GARDILCIC LTDA.", pct: 0.268 },
  "99.505.900-2": { razon: "DIEXA S.A.", pct: 0.268, observacion: "A partir del 27 de marzo" },
  "96.604.460-8": { razon: "ECOLAB SpA", pct: 0.16 },
  "76.063.552-9": { razon: "ECONOMET SPA", pct: 0.16 },
  "89.696.400-3": { razon: "EMPRESA DE RESIDUOS RESITER S.A.", pct: 0.20 },
  "76.041.871-4": { razon: "ENAEX SERVICIOS S.A.", pct: 0.28 },
  "96.845.740-3": { razon: "FAMESA EXPLOSIVOS CHILE S.A.", pct: 0.268, observacion: "A partir del 1° de abril" },
  "91.489.000-4": { razon: "FINNING CHILE SA", pct: 0.05 },
  "78.097.950-K": { razon: "GUANACO COMPANIA MINERA SPA", pct: 0.268 },
  "76.378.164-K": { razon: "HANWHA MINING SERVICES CHILE SPA", pct: 0.268, observacion: "A partir del 1° de abril" },
  "77.663.150-7": { razon: "HOTELERA DIEGO DE ALMAGRO LTDA", pct: 0.306 },
  "77.562.000-5": { razon: "Hotelera Holanda Ltda.", pct: 0.306 },
  "76.268.528-0": { razon: "INVER. E INMOB. MAURICIO DONATI CORNEJO EIRL", pct: 0.268, observacion: "A partir del 1° de abril" },
  "76.014.035-K": { razon: "KRAH AMERICA LATINA S.A.", pct: 0.30 },
  "96.755.880-K": { razon: "MAESTRANZA Y FUNDICION VESPUCIO S A", pct: 0.30 },
  "92.244.000-K": { razon: "MOLY COP CHILE S A", pct: 0.2010, observacion: "Promedio de 5 rutas (18.62%, 16.91%, 19.89%, 22.11%, 23%)" },
  "76.033.287-9": { razon: "NITTRA S.A.", pct: 0.25 },
  "79.626.800-K": { razon: "NOVA ANDINO LITIO SPA", pct: 0.17 },
  "77.859.490-0": { razon: "NOVOPLAST SPA", pct: 0.30 },
  "85.417.200-K": { razon: "Nalco Industrial Services Chile Ltda", pct: 0.16 },
  "96.048.000-7": { razon: "PETRICIO INDUSTRIAL S.A.", pct: 0.20 },
  "78.608.270-6": { razon: "PROQUIMIN LTDA", pct: 0.16 },
  "76.257.082-3": { razon: "QUIMICOS FAS SpA", pct: 0.268 },
  "76.148.338-2": { razon: "SOCIEDAD DE PROCESAMIENTO DE MOLIBDENO SPA", pct: 0.075 },
  "76.133.595-2": { razon: "SOLMAX CHILE SPA", pct: 0.30 },
  "96.593.480-4": { razon: "SUN S.A.", pct: 0.268 },
  "96.641.530-4": { razon: "TECNOTAMBORES S.A.", pct: 0.306 },
  "84.912.700-4": { razon: "TEHMCO S.A.", pct: 0.30 },
  "76.964.227-7": { razon: "TERRAEX SPA", pct: 0.268, observacion: "A partir del 1° de abril" },
  "78.851.880-3": { razon: "VEOLIA WATER TECHNOLOGIES & SOLUTIONS CHILE LTDA.", pct: 0.20 },
  "76.076.066-8": { razon: "WE CONSULTING SPA", pct: 0.268 },
  "76.309.712-9": { razon: "YURA CHILE SPA", pct: 0.18 },
};

// ─── Casos especiales: % distinto por mes (transición → polinomio) ──────────
export const MEPCO_REAJUSTES_ESPECIALES = {
  "76.040.923-5": {
    razon: "DYNO NOBEL EXPLOSIVOS CHILE LIMITADA",
    porMes: { 4: 0.13, 5: "diesel-n1", 6: "diesel-n1", 7: "diesel-n1" },
    polinomioDesde: 8,
    observacion: "13% en abril; mayo-julio diésel n-1; agosto entra polinomio.",
  },
  "77.870.140-5": {
    razon: "MAXAM CHILE S.A. (Nacional)",
    porMes: { 4: 0.048, 5: "diesel-n1", 6: "diesel-n1" },
    polinomioDesde: 7,
    observacion: "Nacional: 4.8% abril; mayo-junio diésel n-1; julio polinomio. Internacional 14% no distinguible por factura.",
  },
  "95.467.000-7": {
    razon: "ORICA CHILE S.A",
    porMes: { 4: 0.15, 5: null },
    polinomioDesde: 6,
    observacion: "15% en abril; mayo por revisar; junio entra polinomio.",
  },
};

// ─── Reembolso diésel ───────────────────────────────────────────────────────
export const MEPCO_REEMBOLSO_DIESEL = new Set([
  "93.007.000-9",
  "96.592.190-7",
  "79.947.100-0",
]);

// ═══════════════════════════════════════════════════════════════════════════
// API pública
// ═══════════════════════════════════════════════════════════════════════════

// El CSV mezcla RUTs con y sin puntos según la fila ("76.041.871-4" vs
// "76041871-4"); normalizamos quitando puntos para que el lookup matchee
// independiente del formato de origen.
function normalizaRut(rut) {
  if (!rut) return "";
  return String(rut).trim().toUpperCase().replace(/\./g, "");
}

const _SIMPLE_BY_NORM = Object.fromEntries(
  Object.entries(MEPCO_REAJUSTES_SIMPLE).map(([k, v]) => [normalizaRut(k), v])
);
const _ESPECIALES_BY_NORM = Object.fromEntries(
  Object.entries(MEPCO_REAJUSTES_ESPECIALES).map(([k, v]) => [normalizaRut(k), v])
);
const _REEMBOLSO_NORM = new Set([...MEPCO_REEMBOLSO_DIESEL].map(normalizaRut));

export function getReajuste(rut, mes, year) {
  const r = normalizaRut(rut);
  if (!r) return { pct: 0, tipo: "ninguno" };

  const vigente =
    year > MEPCO_ADJUSTMENT_YEAR ||
    (year === MEPCO_ADJUSTMENT_YEAR && mes >= MEPCO_TRIP_START_MONTH);
  if (!vigente) return { pct: 0, tipo: "ninguno" };

  if (_REEMBOLSO_NORM.has(r)) {
    return { pct: 0, tipo: "reembolso", observacion: "Reembolso de diferencia diésel (línea aparte)" };
  }

  const especial = _ESPECIALES_BY_NORM[r];
  if (especial) {
    const v = especial.porMes[mes];
    if (v == null) {
      const last = Object.entries(especial.porMes)
        .filter(([m, val]) => Number(m) < mes && typeof val === "number")
        .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
      const fallback = last ? last[1] : 0;
      return { pct: fallback, tipo: "especial", observacion: especial.observacion, pendiente: true };
    }
    if (v === "diesel-n1") {
      const last = Object.entries(especial.porMes)
        .filter(([m, val]) => Number(m) < mes && typeof val === "number")
        .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
      const fallback = last ? last[1] : 0;
      return { pct: fallback, tipo: "especial", observacion: especial.observacion };
    }
    return { pct: v, tipo: "especial", observacion: especial.observacion };
  }

  const simple = _SIMPLE_BY_NORM[r];
  if (simple) {
    return { pct: simple.pct, tipo: "simple", observacion: simple.observacion };
  }

  return { pct: 0, tipo: "ninguno" };
}

export function getUpliftPonderado(clientTotalsPrev, mes = MEPCO_ADJUSTMENT_MONTH) {
  if (!clientTotalsPrev || clientTotalsPrev.length === 0) return 0;
  const totalPrev = clientTotalsPrev.reduce((s, c) => s + (c.prev || 0), 0);
  if (totalPrev <= 0) return 0;

  let upliftSum = 0;
  for (const c of clientTotalsPrev) {
    const peso = (c.prev || 0) / totalPrev;
    const { pct } = getReajuste(c.rut, mes, MEPCO_ADJUSTMENT_YEAR);
    upliftSum += peso * pct;
  }
  return upliftSum;
}

export function getReajusteParaCliente(rut, year = MEPCO_ADJUSTMENT_YEAR) {
  const info = getReajuste(rut, MEPCO_ADJUSTMENT_MONTH, year);
  if (info.tipo === "ninguno") return null;
  if (info.tipo === "reembolso") return { label: "Reembolso", pct: null, tooltip: info.observacion };
  return {
    label: `${(info.pct * 100).toFixed(info.pct % 0.01 === 0 ? 0 : 1)}%`,
    pct: info.pct,
    tooltip: info.observacion || (info.pendiente ? "Pendiente de definir; aplica último pct conocido como aproximación" : null),
    pendiente: info.pendiente,
  };
}
