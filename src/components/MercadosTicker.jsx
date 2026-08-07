import { useState, useEffect } from "react";
import { CandlestickChart } from "lucide-react";

const ENDPOINT = "/api/mercados";
const CACHE_KEY = "cm-mercados-v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.t || !Array.isArray(obj.items) || !obj.items.length) return null;
    if (Date.now() - obj.t > CACHE_TTL_MS) return null;
    return obj.items;
  } catch { return null; }
}

function writeCache(items) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), items })); } catch {}
}

function fmtValor(n, tipo) {
  const dec = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  if (tipo === "clp") return `$${n.toLocaleString("es-CL", dec)}`;
  if (tipo === "usd") return `US$${n.toLocaleString("es-CL", dec)}`;
  return `${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })} pts`;
}

function fmtCambio(c) {
  if (c == null) return null;
  const abs = Math.abs(c).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${c >= 0 ? "▲" : "▼"} ${abs}%`;
}

export default function MercadosTicker({ T }) {
  const [items, setItems] = useState(() => readCache() || []);

  useEffect(() => {
    let cancel = false;
    const load = () => fetch(ENDPOINT)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(j => {
        if (!cancel && Array.isArray(j.items) && j.items.length) { setItems(j.items); writeCache(j.items); }
      })
      .catch(() => {}); // sin cotizaciones (o en `vite dev`, sin /api) la cinta no aparece
    if (!readCache()) load();
    const id = setInterval(load, CACHE_TTL_MS);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  if (!items.length) return null;

  // Con pocos ítems una sola pasada no alcanza a llenar pantallas anchas; se
  // repite la lista para que cada mitad del track supere el ancho del viewport.
  const REP = Math.max(1, Math.ceil(24 / items.length));
  const base = Array.from({ length: REP }, () => items).flat();
  const dur = Math.max(35, base.length * 5);

  return (
    <div className="cm-ticker-mkt" style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"stretch",height:36,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",background:T.greenBg,borderRight:`1px solid ${T.border}`,flexShrink:0,zIndex:1}}>
        <CandlestickChart size={14} color={T.green}/>
        <span className="cm-ticker-mkt-label" style={{fontSize:10.5,fontWeight:800,letterSpacing:1,color:T.green}}>MERCADOS</span>
      </div>
      <div style={{position:"relative",flex:1,overflow:"hidden",display:"flex",alignItems:"center"}}>
        <div className="cm-ticker-mkt-track" style={{display:"inline-flex",alignItems:"center",whiteSpace:"nowrap",animation:`cmTickerMkt ${dur}s linear infinite`,willChange:"transform"}}>
          {/* dos copias idénticas: al desplazar el track un 50% el bucle calza sin salto */}
          {[0, 1].map(copy => base.map((m, i) => {
            const col = m.cambio == null ? T.txM : m.cambio >= 0 ? T.green : T.red;
            return (
              <a key={`${copy}-${i}`} href={m.link} target="_blank" rel="noopener noreferrer"
                 title={`${m.nombre} — variación del día · clic para ver el detalle`}
                 style={{display:"inline-flex",alignItems:"center",gap:8,textDecoration:"none",padding:"0 16px"}}>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:0.8,textTransform:"uppercase",color:T.txM}}>{m.nombre}</span>
                <span style={{fontSize:12.5,fontWeight:800,color:T.tx,letterSpacing:-0.2,fontFamily:"'SF Mono', ui-monospace, Menlo, Consolas, monospace"}}>{fmtValor(m.valor, m.tipo)}</span>
                {m.cambio != null && (
                  <span style={{fontSize:11,fontWeight:800,color:col}}>{fmtCambio(m.cambio)}</span>
                )}
                <span style={{color:T.txD,fontSize:9,paddingLeft:10}}>│</span>
              </a>
            );
          }))}
        </div>
        <div style={{position:"absolute",top:0,bottom:0,left:0,width:24,pointerEvents:"none",background:`linear-gradient(to right, ${T.bg2}, transparent)`}}/>
        <div style={{position:"absolute",top:0,bottom:0,right:0,width:24,pointerEvents:"none",background:`linear-gradient(to left, ${T.bg2}, transparent)`}}/>
      </div>
      <style>{`
        @keyframes cmTickerMkt{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .cm-ticker-mkt:hover .cm-ticker-mkt-track{animation-play-state:paused}
        .cm-ticker-mkt a:hover{opacity:0.7}
        @media (prefers-reduced-motion: reduce){.cm-ticker-mkt-track{animation:none!important}}
        @media (max-width:768px){.cm-ticker-mkt-label{display:none}}
      `}</style>
    </div>
  );
}
