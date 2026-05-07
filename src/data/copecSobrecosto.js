// ═══════════════════════════════════════════════════════════════════════════
// POZO DE SOBRECOSTO COMBUSTIBLE — alza MEPCO post 26-Mar-2026
// ═══════════════════════════════════════════════════════════════════════════
// Mide cuánto más estamos pagando a COPEC por petróleo desde que empezó a
// regir el precio post-normalización MEPCO.
//
// Cálculo:
//   Para cada factura COPEC con vencimiento ≥ 30/04/2026 y total ≥ $10M:
//     volumen_m3   = NETO_factura / Precio_Base_brief_de_la_semana
//     baseline     = volumen_m3 × $814.288 (precio c/IVA del 19-Mar, último
//                    día con subsidio MEPCO profundo, antes del salto)
//     sobrecosto   = total_factura − baseline
//
// "Pozo" = sumatoria de sobrecostos = lo que tenemos que cubrir vía reajuste
// tarifario a clientes (compara con `impactoMepcoAcum`).
//
// FUENTE: COPEC DETALLADO 2.xlsx (export SII Transportes Bello e Hijos Ltda).
// ACTUALIZAR cuando bajes un nuevo Detallado SII de COPEC con datos extendidos.
// ═══════════════════════════════════════════════════════════════════════════

export const POZO_COPEC_META = {
  fuente: "COPEC DETALLADO 2.xlsx (SII)",
  ultimaActualizacion: "2026-05-07",
  baselineFecha: "2026-03-19",
  baselinePrecioPorM3CIVA: 814288,
  baselineDescripcion:
    "Última semana con subsidio MEPCO profundo, antes de la normalización del 26-Mar",
  cutoffFechaVencimiento: "2026-04-30",
  umbralPetroleoMin: 10_000_000,
};

export const POZO_COPEC_TOTALES = {
  docs: 57,
  volumenTotalM3: 1693.65,
  totalPagado: 2_506_259_337,
  totalBaseline: 1_379_121_973,
  pozoAcumulado: 1_127_137_364,
};

// Pozo por mes de vencimiento (las dos facturas con venc. exactos al 30/04
// se trataron como Mayo, según indicación del usuario).
export const POZO_COPEC_POR_MES = {
  "2026-05": {
    docs: 49,
    volumenM3: 1454.55,
    pagado: 2_147_966_373,
    baseline: 1_184_419_032,
    pozo: 963_547_341,
  },
  "2026-06": {
    docs: 8,
    volumenM3: 239.11,
    pagado: 358_292_964,
    baseline: 194_702_941,
    pozo: 163_590_023,
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

// Cobertura del reajuste tarifario sobre el pozo:
//  >= 1 → el reajuste cubre todo el sobrecosto pagado a COPEC
//  <  1 → falta cobertura
export function coberturaReajuste(impactoMepcoAcum) {
  const pozo = POZO_COPEC_TOTALES.pozoAcumulado;
  if (!pozo) return null;
  return impactoMepcoAcum / pozo;
}
