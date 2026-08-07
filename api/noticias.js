// Noticias de economía/negocios (edición Chile) vía Google News RSS.
// Se sirve desde una función porque el navegador no puede leer el RSS
// directo (CORS) y los feeds propios de Emol/DF ya no existen.
const FEED = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=es-419&gl=CL&ceid=CL:es-419";
const MAX_ITEMS = 20;

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
  .trim();

export default async function handler(req, res) {
  try {
    const r = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CentroMando/1.0)" } });
    if (!r.ok) throw new Error(`RSS respondió ${r.status}`);
    const xml = await r.text();
    const items = [];
    const seen = new Set();
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const b = m[1];
      const rawTitle = decode((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
      const link = decode((b.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
      const fuente = decode((b.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || "");
      const fecha = decode((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "");
      // Google News repite el medio al final del título ("… - Diario Financiero");
      // se quita porque la fuente se muestra aparte en la cinta.
      const titulo = fuente && rawTitle.endsWith(` - ${fuente}`)
        ? rawTitle.slice(0, -(fuente.length + 3)).trim()
        : rawTitle;
      if (!titulo || !link || seen.has(titulo)) continue;
      seen.add(titulo);
      items.push({ titulo, link, fuente, fecha });
      if (items.length >= MAX_ITEMS) break;
    }
    if (!items.length) throw new Error("El feed llegó vacío");
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json({ items });
  } catch (e) {
    res.status(502).json({ items: [], error: String((e && e.message) || e) });
  }
}
