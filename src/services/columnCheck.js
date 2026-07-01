// Verifica que cada planilla CSV traiga las columnas críticas.
// Acepta alternativas por columna (ej. "FECHA" o "fecha"); basta que aparezca una.
// Si una planilla está vacía no la reporta — eso lo cubre el aviso por-planilla
// de App.jsx (planillas que llegan vacías se listan y se conservan los datos previos).

const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// Devuelve true si la fila contiene alguna de las variantes.
const rowHasAny = (rowKeysNorm, variants) => variants.some(v => rowKeysNorm.has(normalize(v)));

export function checkColumns(rows, expected) {
  if (!rows || rows.length === 0) return { missing: [], ok: true };
  const sample = rows[0] || {};
  const keys = new Set(Object.keys(sample).map(normalize));
  const missing = [];
  for (const [label, variants] of Object.entries(expected)) {
    const opts = Array.isArray(variants) ? variants : [variants];
    if (!rowHasAny(keys, opts)) missing.push(label);
  }
  return { missing, ok: missing.length === 0 };
}

// Configuración de columnas críticas por planilla. Cada entrada es:
// { label_legible: [variantes que acepta el código actual] }
export const EXPECTED = {
  ventas: {
    FECHA: ["FECHA", "Fecha", "fecha"],
    NETO: ["NETO", "Neto", "neto"],
    RUT: ["RUT", "Rut", "rut"],
    "RAZON SOCIAL": ["RAZON SOCIAL", "Razon Social", "razon_social"],
  },
  viajes: {
    "Fecha inicio": ["fechainicio", "FechaInicio", "fecha"],
    Cliente: ["Cliente", "cliente"],
  },
  flotaViajes: {
    Fecha: ["Fecha", "fecha", "fechainicio"],
    Tracto: ["Tracto", "tracto"],
  },
  flotaEquipos: {
    "Tipo equipo": ["tipoequipo", "TipoEquipo"],
  },
  expediciones: {
    Estado: ["estado", "Estado"],
    Conductor: ["conductor", "Conductor"],
  },
  conductoresActivos: {
    Personal: ["personal", "Personal"],
  },
  finBancos: {
    Banco: ["Banco", "banco"],
    "Saldo Final": ["Saldo Final", "saldo_final", "SaldoFinal"],
  },
  finDAP: {
    Vigente: ["Vigente", "vigente"],
    Vencimiento: ["Vencimiento", "vencimiento"],
    "Monto Inicial": ["Monto Inicial", "MontoInicial", "monto_inicial"],
    Tipo: ["Tipo", "tipo"],
  },
  finCalendario: {
    Fecha: ["Fecha", "fecha"],
    Monto: ["Monto", "monto"],
    Concepto: ["Concepto", "concepto"],
  },
  finFondos: {
    Fondo: ["Fondo", "fondo"],
    "Valor Actual": ["Valor Actual", "ValorActual", "valor_actual"],
  },
  leasingDetalle: {
    Estado: ["Estado", "estado"],
    "Dia Vcto": ["Dia Vcto", "DiaVcto"],
  },
  credito: {
    "Nº Cuota": ["N° Cuota", "Cuota", "cuota"],
    "Fecha Vencimiento": ["Fecha Vencimiento", "Fecha", "fecha"],
    "Valor Cuota": ["Valor Cuota", "ValorCuota", "valor_cuota"],
  },
  historico: {
    fecha: ["fecha"],
    viajes_total: ["viajes_total"],
    ventas_total_neto: ["ventas_total_neto"],
  },
};

export const LABELS = {
  ventas: "Ventas",
  viajes: "Viajes",
  flotaViajes: "Flota — viajes",
  flotaEquipos: "Flota — equipos",
  expediciones: "Expediciones",
  conductoresActivos: "Conductores activos",
  finBancos: "Bancos",
  finDAP: "DAP",
  finCalendario: "Calendario",
  finFondos: "Fondos mutuos",
  leasingDetalle: "Leasing detalle",
  credito: "Crédito Itaú",
  historico: "Histórico",
};

export function auditAll(dataByKey) {
  const warnings = [];
  for (const key of Object.keys(EXPECTED)) {
    const rows = dataByKey[key];
    if (!rows || rows.length === 0) continue;
    const { missing } = checkColumns(rows, EXPECTED[key]);
    if (missing.length > 0) warnings.push({ planilla: LABELS[key] || key, key, missing });
  }
  return warnings;
}
