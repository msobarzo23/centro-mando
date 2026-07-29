// Genera src/data/noFacturado.js desde la descarga del TMS de viajes SIN
// facturar (Consulta(77).xls convertida a CSV). Reglas acordadas el 29-07-2026:
//  - Solo filas con costo "VALOR VIAJE" (estadías, escoltas, viajes falsos,
//    adicionales, etc. quedan fuera).
//  - Sin nº de guía se ignora (no hay documento que cobrar).
//  - Valorización: el valor que trae el propio TMS para ese viaje si es creíble
//    (> $10.000; el TMS usa "1" o "0" de relleno); si no, la última tarifa del
//    tarifario para cliente+origen+destino; último recurso, la última tarifa de
//    la ruta origen+destino sin importar el cliente.
//
// Uso:  node scripts/generar_no_facturado.mjs [ruta_consulta77.csv]
//       (normalmente vía scripts/actualizar_no_facturado.ps1, que convierte el
//        .xls de Downloads y deja el CSV listo)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TARIFAS } from "../src/data/tarifario.js";

const CSV = process.argv[2] || path.join(os.tmpdir(), "consulta77.csv");
const VIAJES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "noFacturado.js");
const MIN_VALOR_TMS = 10000;

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toUpperCase();

function parseCsv(txt, sep) {
  const rows = []; let cur = "", inQ = false, row = [];
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (ch === '"') { if (inQ && txt[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === sep && !inQ) { row.push(cur); cur = ""; }
    else if ((ch === "\n" || ch === "\r") && !inQ) { if (cur !== "" || row.length) { row.push(cur); rows.push(row); row = []; cur = ""; } }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// 1) planilla de viajes: solicitud -> cliente (mismo vocabulario del dashboard)
const planillaTxt = await (await fetch(VIAJES_URL)).text();
const pRows = parseCsv(planillaTxt.replace(/^﻿/, ""), ",");
const pHead = pRows[0].map(norm);
const iSol = pHead.indexOf("SOLICITUD"), iCli = pHead.indexOf("CLIENTE");
if (iSol < 0 || iCli < 0) throw new Error("La planilla de viajes no trae solicitud/Cliente");
const cliDeSolicitud = new Map();
for (const r of pRows.slice(1)) { const s = (r[iSol] || "").trim(); if (s) cliDeSolicitud.set(s, norm(r[iCli])); }
console.log(`Planilla: ${cliDeSolicitud.size} solicitudes con cliente`);

// 2) índices de tarifas: por cliente+ruta (la más reciente entre equipos) y por
//    ruta a secas (Consulta(77) no trae tipo de equipo)
const tCliRuta = new Map(), tRuta = new Map();
for (const [cli, ori, des, _eq, t, f] of TARIFAS) {
  const k1 = `${cli}|${ori}|${des}`;
  if (!tCliRuta.has(k1) || f > tCliRuta.get(k1).f) tCliRuta.set(k1, { t, f });
  const k2 = `${ori}|${des}`;
  if (!tRuta.has(k2) || f > tRuta.get(k2).f) tRuta.set(k2, { t, f });
}

// 3) leer la consulta del TMS
const raw = fs.readFileSync(CSV, "utf8").replace(/^﻿/, "");
const sep = raw.slice(0, raw.indexOf("\n")).split(";").length > raw.slice(0, raw.indexOf("\n")).split(",").length ? ";" : ",";
const rows = parseCsv(raw, sep);
const head = rows[0].map(norm);
const ci = {};
["SOLICITUD", "FECHA", "CLIENTE", "COSTO", "ORIGEN", "DESTINO", "VALOR", "GUIA"].forEach(k => {
  ci[k] = head.indexOf(k);
  if (ci[k] < 0) throw new Error(`El CSV no trae la columna ${k} (encabezado: ${head.join(", ")})`);
});

let totalFilas = 0, noViaje = 0, sinGuia = 0;
const viajes = [];
for (const r of rows.slice(1)) {
  if (r.length < head.length - 1) continue;
  totalFilas++;
  if (norm(r[ci.COSTO]) !== "VALOR VIAJE") { noViaje++; continue; }
  if (!String(r[ci.GUIA] || "").trim()) { sinGuia++; continue; }
  const fecha = (r[ci.FECHA] || "").trim();               // dd/MM/yyyy HH:mm
  const m = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) continue;
  const yyyymm = `${m[3]}-${m[2].padStart(2, "0")}`;
  const sol = (r[ci.SOLICITUD] || "").trim();
  const cliTMS = norm(r[ci.CLIENTE]);
  const cliente = cliDeSolicitud.get(sol) || cliTMS;
  const ori = norm(r[ci.ORIGEN]), des = norm(r[ci.DESTINO]);
  const propio = +String(r[ci.VALOR] || "").replace(/[^\d-]/g, "") || 0;
  let monto = 0, fuente = null;
  if (propio > MIN_VALOR_TMS) { monto = propio; fuente = "tms"; }
  else {
    const fx = tCliRuta.get(`${cliente}|${ori}|${des}`) || tCliRuta.get(`${cliTMS}|${ori}|${des}`);
    if (fx) { monto = fx.t; fuente = "cliente"; }
    else { const fr = tRuta.get(`${ori}|${des}`); if (fr) { monto = fr.t; fuente = "ruta"; } }
  }
  viajes.push({ cliente, yyyymm, monto, fuente });
}

// 4) agregados por cliente (con desglose mensual) y por mes
const porCliente = new Map(), porMes = new Map();
let total = 0, valorizados = 0, porFuente = { tms: 0, cliente: 0, ruta: 0 };
for (const v of viajes) {
  if (!porCliente.has(v.cliente)) porCliente.set(v.cliente, { cliente: v.cliente, viajes: 0, valorizados: 0, monto: 0 });
  const c = porCliente.get(v.cliente);
  c.viajes++;
  if (!porMes.has(v.yyyymm)) porMes.set(v.yyyymm, { mes: v.yyyymm, viajes: 0, monto: 0 });
  const pm = porMes.get(v.yyyymm);
  pm.viajes++;
  if (v.fuente) { c.valorizados++; c.monto += v.monto; pm.monto += v.monto; total += v.monto; valorizados++; porFuente[v.fuente]++; }
}
// Consolidar nombres que son el mismo cliente escrito distinto ("MERIDIAN" /
// "MERIDIA" / "MINERA MERIDIAN LTDA", "SODIMAC" / "SODIMAC S.A."): mismo núcleo
// de tokens que usa el dashboard (sin palabras legales), aceptando token-prefijo
// de ≥6 letras para typos de la planilla (con 5 fusionaba MOLYB con MOLY COP,
// y Molyb es Soc. de Procesamiento de Molibdeno). El nombre que queda es el que
// tiene más viajes (normalmente el vocabulario de la planilla del dashboard).
const LEGAL = new Set(["SA","S","A","SPA","LTDA","LTD","LIMITADA","SCM","EIRL","SAC","CHILE","CIA","COMPANIA","COMPAÑIA","SOCIEDAD","CONTRACTUAL","DE","DEL","LA","EL","Y","E"]);
const core = (n) => String(n||"").toUpperCase().replace(/[^A-ZÑ0-9 ]/g," ").split(/\s+/).filter(t => t && !LEGAL.has(t));
const tokEq = (a, b) => a === b || (a.length >= 6 && (b.startsWith(a) || a.startsWith(b)));
const contenido = (chico, grande) => chico.length > 0 && chico.every(t => grande.some(g => tokEq(t, g)));
let clientes = [...porCliente.values()].sort((a, b) => b.viajes - a.viajes);
for (let i = clientes.length - 1; i > 0; i--) {
  const c = clientes[i], cc = core(c.cliente);
  const dest = clientes.slice(0, i).find(d => { const dc = core(d.cliente); return contenido(cc, dc) || contenido(dc, cc); });
  if (dest) { dest.viajes += c.viajes; dest.valorizados += c.valorizados; dest.monto += c.monto; clientes.splice(i, 1); }
}
clientes.sort((a, b) => b.monto - a.monto);
const meses = [...porMes.values()].sort((a, b) => (a.mes < b.mes ? -1 : 1));

const hoy = new Date();
const gen = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const js = `// AUTOGENERADO por scripts/generar_no_facturado.mjs — no editar a mano.
// Fuente: descarga TMS de viajes sin facturar (Consulta(77)), valorizada con el
// valor propio del TMS o, en su defecto, el tarifario de src/data/tarifario.js.
export const NO_FACTURADO_META = ${JSON.stringify({
  generado: gen, desde: meses[0]?.mes || null, hasta: meses[meses.length - 1]?.mes || null,
  viajes: viajes.length, valorizados, sinGuia, excluidosNoViaje: noViaje,
  fuenteTms: porFuente.tms, fuenteTarifaCliente: porFuente.cliente, fuenteTarifaRuta: porFuente.ruta,
})};

export const NO_FACTURADO_TOTAL = ${Math.round(total)};

// [{cliente, viajes, valorizados, monto}]  ordenado por monto desc
export const NO_FACTURADO_CLIENTES = ${JSON.stringify(clientes.map(c => ({ ...c, monto: Math.round(c.monto) })))};

// [{mes:"YYYY-MM", viajes, monto}]
export const NO_FACTURADO_MESES = ${JSON.stringify(meses.map(m => ({ ...m, monto: Math.round(m.monto) })))};
`;
fs.writeFileSync(OUT, js, "utf8");
console.log(`Filas TMS: ${totalFilas} · no-viaje: ${noViaje} · viajes sin guía (ignorados): ${sinGuia}`);
console.log(`Viajes a cobrar: ${viajes.length} · valorizados: ${valorizados} (tms ${porFuente.tms} / tarifa cliente ${porFuente.cliente} / tarifa ruta ${porFuente.ruta})`);
console.log(`TOTAL NO FACTURADO: $${Math.round(total).toLocaleString("es-CL")}`);
console.log(`Escrito ${OUT}`);
