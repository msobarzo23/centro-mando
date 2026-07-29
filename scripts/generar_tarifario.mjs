// Genera src/data/tarifario.js desde la base consolidada de informes de
// facturación del TMS (Downloads/base_fletes_2026.csv, producida al convertir y
// consolidar los .xls de "Downloads/informes de facturacion").
//
// Uso:  node scripts/generar_tarifario.mjs [ruta_base_fletes.csv]
//
// La base trae el cliente con el nombre del ARCHIVO de informe (truncado y sin
// Ñ). El dashboard filtra viajes por el nombre de la PLANILLA de viajes, así que
// acá se re-etiqueta cada viaje vía nº de solicitud contra la planilla publicada
// (mismo criterio que el cruce validado el 29-07-2026: 99,1% de match).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || path.join(os.homedir(), "Downloads", "base_fletes_2026.csv");
const VIAJES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "tarifario.js");

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

// 1) planilla de viajes: solicitud -> cliente (vocabulario del dashboard)
const planillaTxt = await (await fetch(VIAJES_URL)).text();
const pRows = parseCsv(planillaTxt.replace(/^﻿/, ""), ",");
const pHead = pRows[0].map(norm);
const iSol = pHead.indexOf("SOLICITUD"), iCli = pHead.indexOf("CLIENTE");
if (iSol < 0 || iCli < 0) throw new Error("La planilla de viajes no trae solicitud/Cliente");
const cliDeSolicitud = new Map();
for (const r of pRows.slice(1)) { const s = (r[iSol] || "").trim(); if (s) cliDeSolicitud.set(s, norm(r[iCli])); }
console.log(`Planilla: ${cliDeSolicitud.size} solicitudes con cliente`);

// 2) base de fletes consolidada
const bRows = parseCsv(fs.readFileSync(BASE, "utf8").replace(/^﻿/, ""), ";");
const bHead = bRows[0].map(norm);
const bi = {};
["CLIENTE", "SOLICITUD", "FECHA", "COSTO", "TIPOEQUIPO", "ORIGEN", "DESTINO", "MONTO"].forEach(k => bi[k] = bHead.indexOf(k));
let matched = 0, total = 0, fechaMax = "";
const hist = new Map();               // cliente|origen|destino|equipo -> [[fecha,monto],...]
const extras = new Map();             // cliente -> {vv, ex}
for (const r of bRows.slice(1)) {
  if (r.length < 8) continue;
  total++;
  const sol = (r[bi.SOLICITUD] || "").trim();
  const cliente = cliDeSolicitud.get(sol) || norm(r[bi.CLIENTE]);
  if (cliDeSolicitud.has(sol)) matched++;
  const monto = +r[bi.MONTO] || 0;
  const fecha = (r[bi.FECHA] || "").trim();
  const costo = norm(r[bi.COSTO]);
  if (!monto || !fecha) continue;
  if (fecha > fechaMax) fechaMax = fecha;
  if (!extras.has(cliente)) extras.set(cliente, { vv: 0, ex: 0 });
  const g = extras.get(cliente);
  if (costo === "VALOR VIAJE") {
    g.vv += monto;
    const k = [cliente, norm(r[bi.ORIGEN]), norm(r[bi.DESTINO]), norm(r[bi.TIPOEQUIPO])].join("|");
    if (!hist.has(k)) hist.set(k, []);
    hist.get(k).push([fecha, monto]);
  } else {
    g.ex += monto;
  }
}
console.log(`Base: ${total} viajes, ${(100 * matched / total).toFixed(1)}% re-etiquetados vía solicitud, última fecha ${fechaMax}`);

// 3) tarifas: última observada + nº de observaciones por combinación
const tarifas = [];
for (const [k, arr] of hist) {
  arr.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const [cli, ori, des, eq] = k.split("|");
  tarifas.push([cli, ori, des, eq, arr[arr.length - 1][1], arr[arr.length - 1][0], arr.length]);
}
tarifas.sort((a, b) => (a[0] + a[1] + a[2] < b[0] + b[1] + b[2] ? -1 : 1));

// 4) % de extras (estadía/escolta/carga/etc.) sobre valor viaje, por cliente.
//    Tope 15%: un cliente chico con una estadía grande no debe duplicar su estimado.
let vvT = 0, exT = 0;
const extrasPct = {};
for (const [cli, g] of extras) { vvT += g.vv; exT += g.ex; if (g.vv > 0 && g.ex > 0) extrasPct[cli] = Math.min(0.15, +(g.ex / g.vv).toFixed(4)); }
extrasPct._global = +(exT / vvT).toFixed(4);

const hoy = new Date();
const gen = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const js = `// AUTOGENERADO por scripts/generar_tarifario.mjs — no editar a mano.
// Fuente: informes de facturación del TMS consolidados (base_fletes_2026.csv).
// Tarifa = último VALOR VIAJE observado por cliente + origen + destino + equipo.
export const TARIFARIO_META = { generado: "${gen}", ultimaFechaViaje: "${fechaMax}", combinaciones: ${tarifas.length}, viajesBase: ${total} };

// [cliente, origen, destino, tipoequipo, ultimaTarifa, fechaUltima, nObservaciones]
export const TARIFAS = ${JSON.stringify(tarifas)};

// Ítems extra (estadía, escolta, carga/descarga, 2º conductor…) como fracción
// del valor viaje por cliente; _global para clientes sin historial propio.
export const EXTRAS_PCT = ${JSON.stringify(extrasPct)};
`;
fs.writeFileSync(OUT, js, "utf8");
console.log(`Escrito ${OUT}: ${tarifas.length} tarifas, extras global ${(extrasPct._global * 100).toFixed(1)}%`);
