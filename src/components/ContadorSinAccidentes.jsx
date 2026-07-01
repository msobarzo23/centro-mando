import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, RotateCcw, MapPin, X, Check } from "lucide-react";
import { MESES_FULL } from "../constants.js";

const STORAGE_KEY = "cm-accidente-reset";
const EVT = "cm-accidente-reset-change";

const readStored = () => { try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; } };

const fmtFecha = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MESES_FULL[m - 1].toLowerCase()} de ${y}`;
};

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function ContadorSinAccidentes({ C, T, variant = "hero" }) {
  const [reset, setReset] = useState(readStored);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Mantiene sincronizado el contador entre Inicio y Operaciones (y entre pestañas).
  useEffect(() => {
    const sync = () => setReset(readStored());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);

  // Sin reinicio manual, el contador parte el 1 de enero del año en curso.
  // Con reinicio manual (fecha de un accidente), los km de ESE día no cuentan
  // como "sin accidentes": el conteo parte del día siguiente.
  const efectiva = reset || `${C.curYear}-01-01`;
  const km = (C.kmPorDia || []).filter(r => (reset ? r.fecha > efectiva : r.fecha >= efectiva)).reduce((s, r) => s + r.km, 0);
  const kmTxt = Math.round(km).toLocaleString("es-CL");

  const guardar = useCallback((iso) => {
    try { if (iso) localStorage.setItem(STORAGE_KEY, iso); else localStorage.removeItem(STORAGE_KEY); } catch {}
    setReset(iso);
    window.dispatchEvent(new Event(EVT));
    setEditing(false);
  }, []);

  // ─────────── Variante destacada (Inicio) ───────────
  if (variant === "hero") {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${T.greenBg}, ${T.card})`,
        border: `1px solid ${T.green}44`, borderRadius: 16, padding: "18px 22px",
        display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
      }}>
        <div style={{ background: T.greenBg, borderRadius: 14, padding: 12, display: "flex", flexShrink: 0 }}>
          <ShieldCheck size={30} color={T.green} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, color: T.green, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
            Seguridad operacional
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 38, fontWeight: 800, color: T.tx, letterSpacing: -1, lineHeight: 1 }}>{kmTxt}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.green }}>km</span>
          </div>
          <div style={{ fontSize: 13, color: T.txM, marginTop: 4 }}>
            kilómetros recorridos <strong style={{ color: T.tx }}>sin accidentes</strong>
            <span style={{ color: T.txD }}> · desde el {fmtFecha(efectiva)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── Variante con control (Operaciones) ───────────
  return (
    <div style={{ background: T.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} color={T.green} />
          <span style={{ fontSize: 14, fontWeight: 600, color: T.tx }}>Kilómetros sin accidentes</span>
        </div>
        {!editing && (
          <button onClick={() => { setDraft(reset || hoyISO()); setEditing(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: T.amberBg, border: `1px solid ${T.amber}44`, borderRadius: 8, cursor: "pointer", color: T.amber, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>
            <RotateCcw size={13} /> Reiniciar contador
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ background: T.greenBg, borderRadius: 12, padding: 12, display: "flex", flexShrink: 0 }}>
          <MapPin size={24} color={T.green} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: T.tx, letterSpacing: -0.8, lineHeight: 1 }}>{kmTxt}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.green }}>km</span>
          </div>
          <div style={{ fontSize: 12, color: T.txM, marginTop: 4 }}>Acumulados desde el {fmtFecha(efectiva)}</div>
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 14, padding: "12px 14px", background: T.bg3 + "55", borderRadius: 10, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.txM, marginBottom: 8, lineHeight: 1.4 }}>
            Ingresa la fecha del accidente. El contador volverá a cero y empezará a sumar los kilómetros recorridos desde esa fecha.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input type="date" value={draft} max={hoyISO()} onChange={e => setDraft(e.target.value)}
              style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.tx, padding: "6px 10px", fontSize: 13, colorScheme: "dark" }} />
            <button onClick={() => draft && guardar(draft)} disabled={!draft}
              style={{ display: "flex", alignItems: "center", gap: 5, background: T.greenBg, border: `1px solid ${T.green}44`, borderRadius: 8, cursor: draft ? "pointer" : "not-allowed", opacity: draft ? 1 : 0.5, color: T.green, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>
              <Check size={13} /> Confirmar reinicio
            </button>
            <button onClick={() => setEditing(false)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.txM, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}>
              <X size={13} /> Cancelar
            </button>
            {reset && (
              <button onClick={() => guardar("")} title="Volver a contar desde el 1 de enero"
                style={{ background: "none", border: "none", cursor: "pointer", color: T.txD, padding: "6px 4px", fontSize: 11, fontWeight: 600, textDecoration: "underline" }}>
                Quitar fecha (contar desde inicio de año)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
