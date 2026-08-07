import { useState, useEffect } from "react";
import { Newspaper } from "lucide-react";

const ENDPOINT = "/api/noticias";
const CACHE_KEY = "cm-noticias-v1";
const CACHE_TTL_MS = 15 * 60 * 1000;

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

function fechaRelativa(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export default function NoticiasTicker({ T }) {
  const [items, setItems] = useState(() => readCache() || []);

  useEffect(() => {
    let cancel = false;
    const load = () => fetch(ENDPOINT)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(j => {
        if (!cancel && Array.isArray(j.items) && j.items.length) { setItems(j.items); writeCache(j.items); }
      })
      .catch(() => {}); // sin noticias (o en `vite dev`, sin /api) la cinta simplemente no aparece
    if (!readCache()) load();
    const id = setInterval(load, CACHE_TTL_MS);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  if (!items.length) return null;

  const dur = Math.max(45, items.length * 12);

  return (
    <div className="cm-ticker" style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"stretch",height:38,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",background:T.accentBg,borderRight:`1px solid ${T.border}`,flexShrink:0,zIndex:1}}>
        <Newspaper size={14} color={T.accent}/>
        <span className="cm-ticker-label" style={{fontSize:10.5,fontWeight:800,letterSpacing:1,color:T.accent}}>NOTICIAS</span>
      </div>
      <div style={{position:"relative",flex:1,overflow:"hidden",display:"flex",alignItems:"center"}}>
        <div className="cm-ticker-track" style={{display:"inline-flex",alignItems:"center",whiteSpace:"nowrap",animation:`cmTicker ${dur}s linear infinite`,willChange:"transform"}}>
          {/* dos copias idénticas: al desplazar el track un 50% el bucle calza sin salto */}
          {[0, 1].map(copy => items.map((n, i) => {
            const rel = fechaRelativa(n.fecha);
            return (
              <a key={`${copy}-${i}`} href={n.link} target="_blank" rel="noopener noreferrer"
                 title={`${n.fuente || "Prensa"}${rel ? ` · ${rel}` : ""} — clic para abrir la noticia`}
                 style={{display:"inline-flex",alignItems:"center",gap:8,textDecoration:"none",padding:"0 16px"}}>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:0.8,textTransform:"uppercase",color:T.accent,flexShrink:0}}>{n.fuente || "Prensa"}</span>
                <span style={{fontSize:12.5,fontWeight:600,color:T.tx}}>{n.titulo}</span>
                <span style={{color:T.txD,fontSize:9,paddingLeft:10}}>◆</span>
              </a>
            );
          }))}
        </div>
        <div style={{position:"absolute",top:0,bottom:0,left:0,width:24,pointerEvents:"none",background:`linear-gradient(to right, ${T.bg2}, transparent)`}}/>
        <div style={{position:"absolute",top:0,bottom:0,right:0,width:24,pointerEvents:"none",background:`linear-gradient(to left, ${T.bg2}, transparent)`}}/>
      </div>
      <style>{`
        @keyframes cmTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .cm-ticker:hover .cm-ticker-track{animation-play-state:paused}
        .cm-ticker a:hover{opacity:0.7}
        @media (prefers-reduced-motion: reduce){.cm-ticker-track{animation:none!important}}
        @media (max-width:768px){.cm-ticker-label{display:none}}
      `}</style>
    </div>
  );
}
