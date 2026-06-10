import Papa from "papaparse";
import { todayMidnight, parseNum, parseDate } from "../utils.js";

export const fetchCSV = (url) => new Promise((resolve) => {
  Papa.parse(url, {
    download: true, header: true, skipEmptyLines: true,
    complete: (r) => resolve(r.data || []),
    error: () => resolve([]),
  });
});

export const fetchFinCSV = (url, knownHeaders) => new Promise((resolve) => {
  Papa.parse(url, {
    download: true, header: false, skipEmptyLines: true,
    complete: (r) => {
      const rows = r.data || [];
      let headerIdx = -1, bestScore = 0;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i].map(c => String(c||"").trim().toLowerCase());
        const score = knownHeaders.reduce((s,h) => s+(row.some(c=>c.includes(h.toLowerCase()))?1:0), 0);
        if (score > bestScore) { bestScore = score; headerIdx = i; }
      }
      if (headerIdx === -1 || bestScore < 2) { resolve([]); return; }
      const headers = rows[headerIdx].map(c => String(c||"").trim());
      const data = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(c => !c || String(c).trim() === "")) continue;
        // Estas pestañas apilan VARIAS tablas en una sola hoja (p. ej. la de fondos
        // trae "SALDOS VIGENTES" y, más abajo, "HISTORIAL DE VALORES"). Solo nos
        // interesa la primera tabla. Una fila-título que abre la siguiente sección
        // tiene texto SOLO en la primera celda (el resto vacío) y no es un número;
        // al detectarla cortamos, para no arrastrar filas de otras tablas que
        // comparten columnas y se sumarían dos veces.
        const filled = row.map((c, ci) => ({ ci, v: String(c == null ? "" : c).trim() })).filter(x => x.v !== "");
        if (filled.length === 1 && filled[0].ci === 0 && parseNum(filled[0].v) === 0) break;
        // Filas de totales ("TOTALES", "TOTALES ACTIVOS", …) NO son datos: si entran,
        // los montos se cuentan dos veces. Hoy las neutralizan filtros aguas abajo
        // (Vigente/fecha/Estado), pero eso es frágil — se excluyen acá en el origen.
        // El patrón es estricto (celda exacta "TOTAL"/"TOTALES" o "TOTALES <algo>")
        // para no comerse conceptos legítimos tipo "Total pago proveedores".
        if (filled.some(x => /^TOTAL(ES)?$/i.test(x.v) || /^TOTALES\s/i.test(x.v))) continue;
        const obj = {};
        headers.forEach((h, ci) => { if (h) obj[h] = row[ci] || ""; });
        data.push(obj);
      }
      resolve(data);
    },
    error: () => resolve([]),
  });
});

export const fetchRawCSV = (url) => new Promise((resolve) => {
  Papa.parse(url, {
    download: true, header: false, skipEmptyLines: false,
    complete: (r) => resolve(r.data || []),
    error: () => resolve([]),
  });
});

export const parseLeasingResumen = (raw) => {
  const result = { emisores:[], totalRow:null, proxCuotas:[], proyeccion:[], refs:{} };
  if (!raw || raw.length === 0) return result;

  let secEmisor=-1, secProxCuotas=-1, secProyeccion=-1, secRefs=-1;
  for (let i = 0; i < raw.length; i++) {
    const first = String(raw[i]?.[0]||"").toUpperCase();
    if (first.includes("RESUMEN POR EMISOR")) secEmisor = i;
    if (first.includes("PROXIMAS CUOTAS")) secProxCuotas = i;
    if (first.includes("PROYECCION MENSUAL")) secProyeccion = i;
    if (first.includes("CELDAS DE REFERENCIA")) secRefs = i;
  }

  if (secEmisor >= 0) {
    const hdrRow = secEmisor + 1;
    for (let i = hdrRow + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[0] || String(r[0]).trim() === "") break;
      const emisor = String(r[0]).trim();
      const row = { emisor, contratos:parseNum(r[1]), tractos:parseNum(r[2]), cuotaUF:parseNum(r[3]), cuotaCLP:parseNum(r[4]), cuotaIVA:parseNum(r[5]), deudaUF:parseNum(r[6]), deudaCLP:parseNum(r[7]) };
      if (emisor.includes("TOTAL")) result.totalRow = row;
      else result.emisores.push(row);
    }
  }

  if (secProxCuotas >= 0) {
    const hdrRow = secProxCuotas + 1;
    const hoy = todayMidnight();
    const todasCuotas = [];
    for (let i = hdrRow + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[0] || String(r[0]).trim() === "") break;
      const fechaStr = String(r[0]).trim();
      const fechaParsed = parseDate(fechaStr);
      const diasCalc = fechaParsed ? Math.ceil((fechaParsed.getTime()-hoy.getTime())/86400000) : parseNum(r[1]);
      todasCuotas.push({ fecha:fechaStr, dias:diasCalc, _fechaParsed:fechaParsed, cuotaUF:parseNum(r[2]), cuotaCLP:parseNum(r[3]), cuotaIVA:parseNum(r[4]), bancos:String(r[5]||"").trim(), estado:String(r[6]||"").trim() });
    }

    const futuras = todasCuotas.filter(c => c._fechaParsed && c._fechaParsed.getTime() >= hoy.getTime());

    if (futuras.length < 2 && todasCuotas.length > 0) {
      const proyectadas = [];
      const seenKeys = new Set(futuras.map(c => `${c.fecha}|${c.bancos}`));
      const ordenadas = [...todasCuotas].filter(c => c._fechaParsed).sort((a,b)=>a._fechaParsed-b._fechaParsed);
      for (const base of ordenadas) {
        let d = new Date(base._fechaParsed.getFullYear(), base._fechaParsed.getMonth(), base._fechaParsed.getDate());
        while (d.getTime() < hoy.getTime()) {
          d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
        const dd = String(d.getDate()).padStart(2,"0");
        const mm = String(d.getMonth()+1).padStart(2,"0");
        const yyyy = d.getFullYear();
        const fechaStr = `${dd}/${mm}/${yyyy}`;
        const key = `${fechaStr}|${base.bancos}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const dias = Math.ceil((d.getTime() - hoy.getTime()) / 86400000);
        proyectadas.push({ fecha:fechaStr, dias, _fechaParsed:d, cuotaUF:base.cuotaUF, cuotaCLP:base.cuotaCLP, cuotaIVA:base.cuotaIVA, bancos:base.bancos, estado:dias<=5?"URGENTE":"PROYECTADA" });
      }
      const merged = [...futuras, ...proyectadas].sort((a,b)=>a._fechaParsed-b._fechaParsed);
      result.proxCuotas = merged.slice(0, 4).map(({_fechaParsed, ...rest}) => ({...rest, estado: rest.dias <= 5 ? "URGENTE" : (rest.estado || "OK")}));
    } else {
      result.proxCuotas = futuras.sort((a,b)=>a._fechaParsed-b._fechaParsed).map(({_fechaParsed, ...rest}) => ({...rest, estado: rest.dias <= 5 ? "URGENTE" : (rest.estado || "OK")}));
    }
  }

  if (secProyeccion >= 0) {
    const hdrRow = secProyeccion + 2;
    for (let i = hdrRow + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const mes = String(r[0]||"").trim();
      const anio = parseNum(r[1]);
      if (!mes || anio < 2020) { if (mes===""&&anio===0) continue; break; }
      result.proyeccion.push({ mes, anio, cuotaUF:parseNum(r[2]), cuotaCLP:parseNum(r[3]), cuotaIVA:parseNum(r[4]), bciDia5:parseNum(r[5]), bciDia15:parseNum(r[6]), vfs:parseNum(r[7]), bchile:parseNum(r[8]), contratos:parseNum(r[9]), vence:String(r[10]||"").trim(), deltaUF:parseNum(r[11]), ahorroUF:parseNum(r[12]), nota:String(r[13]||"").trim() });
    }
  }

  if (secRefs >= 0) {
    for (let i = secRefs + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[0]) break;
      const key = String(r[0]).trim();
      const val = String(r[1]||"").trim();
      if (key) result.refs[key] = val;
    }
  }

  return result;
};
