// Cotizaciones de mercado vía Yahoo Finance (endpoint público de charts).
// Se sirve desde una función por el mismo motivo que /api/noticias: CORS.
const SYMBOLS = [
  { s: "CLP=X",  nombre: "Dólar",        tipo: "clp" },
  { s: "CL=F",   nombre: "Petróleo WTI", tipo: "usd" },
  { s: "BZ=F",   nombre: "Brent",        tipo: "usd" },
  { s: "HG=F",   nombre: "Cobre lb",     tipo: "usd" },
  { s: "^IPSA",  nombre: "IPSA",         tipo: "pts" },
  { s: "^GSPC",  nombre: "S&P 500",      tipo: "pts" },
];

async function cotizacion({ s, nombre, tipo }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=5d`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CentroMando/1.0)" } });
  if (!r.ok) throw new Error(`${s}: ${r.status}`);
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  const valor = meta?.regularMarketPrice;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose;
  if (typeof valor !== "number") throw new Error(`${s}: sin precio`);
  const cambio = typeof prev === "number" && prev !== 0 ? ((valor - prev) / prev) * 100 : null;
  return { nombre, tipo, valor, cambio, link: `https://es.finance.yahoo.com/quote/${encodeURIComponent(s)}` };
}

export default async function handler(req, res) {
  // Un símbolo caído no bota la cinta completa: se omite y siguen los demás.
  const results = await Promise.allSettled(SYMBOLS.map(cotizacion));
  const items = results.filter(r => r.status === "fulfilled").map(r => r.value);
  if (!items.length) {
    res.status(502).json({ items: [], error: "Ninguna cotización disponible" });
    return;
  }
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  res.status(200).json({ items });
}
