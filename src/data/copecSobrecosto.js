// ═══════════════════════════════════════════════════════════════════════════
// POZO DE SOBRECOSTO COMBUSTIBLE — alza MEPCO post 26-Mar-2026
// ═══════════════════════════════════════════════════════════════════════════
// Mide cuánto más estamos pagando a COPEC por petróleo desde que empezó a
// regir el precio post-normalización MEPCO.
//
// Cálculo (todos los montos NETOS, sin IVA — el IVA pagado a COPEC es
// crédito fiscal recuperable vía F29 y se compensa contra el IVA débito
// del reajuste cobrado a clientes, así que no representa pérdida real):
//   Para cada factura COPEC con vencimiento entre 30/04/2026 y 29/05/2026 y
//   total ≥ $10M:
//     volumen_m3   = NETO_factura / Precio_Base_brief_de_la_semana
//     baseline     = volumen_m3 × $684.276 (precio s/IVA del 19-Mar, último
//                    día con subsidio MEPCO profundo, antes del salto)
//     sobrecosto   = neto_factura − baseline
//
// "Pozo" = sumatoria de sobrecostos NETOS = lo que tenemos que cubrir vía
// reajuste tarifario a clientes (compara directamente con `impactoMepcoAcum`,
// que también es neto).
//
// FUENTE: COPEC DETALLADO 2.xlsx (export SII Transportes Bello e Hijos Ltda).
// Los totales originales c/IVA del SII se convierten a neto dividiendo por
// 1.19 al cargar este archivo. ACTUALIZAR cuando bajes un nuevo Detallado.
// ═══════════════════════════════════════════════════════════════════════════

export const POZO_COPEC_META = {
  fuente: "COPEC DETALLADO 2.xlsx (SII)",
  ultimaActualizacion: "2026-05-07",
  baselineFecha: "2026-03-19",
  baselinePrecioPorM3: 684276, // s/IVA (= 814.288 / 1.19)
  baselineDescripcion:
    "Última semana con subsidio MEPCO profundo, antes de la normalización del 26-Mar",
  ventanaVencimientoIni: "2026-04-30",
  ventanaVencimientoFin: "2026-05-29",
  umbralPetroleoMin: 10_000_000,
};

// Montos en CLP NETO (s/IVA). Originales c/IVA en SII:
//   totalPagado c/IVA   = 2.147.966.373  → neto 1.805.013.759
//   totalBaseline c/IVA = 1.184.419.032  → neto   995.310.111
//   pozoAcumulado c/IVA =   963.547.341  → neto   809.703.648
export const POZO_COPEC_TOTALES = {
  docs: 49,
  volumenTotalM3: 1454.55,
  totalPagado: 1_805_013_759,
  totalBaseline: 995_310_111,
  pozoAcumulado: 809_703_648,
};

// Pozo por mes de vencimiento (las dos facturas con venc. exactos al 30/04
// se trataron como Mayo, según indicación del usuario). Montos NETOS.
export const POZO_COPEC_POR_MES = {
  "2026-05": {
    docs: 49,
    volumenM3: 1454.55,
    pagado: 1_805_013_759,
    baseline: 995_310_111,
    pozo: 809_703_648,
  },
};

// Helpers de lectura
export function pozoCombustibleAcum() {
  return POZO_COPEC_TOTALES.pozoAcumulado;
}

export function pozoCombustibleMes(year, month1Based) {
  const key = `${year}-${String(month1Based).padStart(2, "0")}`;
  return POZO_COPEC_POR_MES[key]?.pozo || 0;
}

// Cobertura del reajuste tarifario sobre el pozo (ambos netos):
//  >= 1 → el reajuste cubre todo el sobrecosto pagado a COPEC
//  <  1 → falta cobertura
export function coberturaReajuste(impactoMepcoAcum) {
  const pozo = POZO_COPEC_TOTALES.pozoAcumulado;
  if (!pozo) return null;
  return impactoMepcoAcum / pozo;
}
