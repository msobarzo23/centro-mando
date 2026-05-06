import { useState, useEffect } from "react";

const ENDPOINT = "https://mindicador.cl/api";
const CACHE_KEY = "cm-indicadores-v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.t || !obj.data) return null;
    if (Date.now() - obj.t > CACHE_TTL_MS) return null;
    return obj.data;
  } catch { return null; }
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch {}
}

export function useIndicadores() {
  const [data, setData] = useState(() => readCache());
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    const cached = readCache();
    if (cached) { setData(cached); setLoading(false); return; }

    setLoading(true);
    fetch(ENDPOINT)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(j => {
        if (cancel) return;
        const out = {
          uf: j.uf?.valor ?? null,
          dolar: j.dolar?.valor ?? null,
          euro: j.euro?.valor ?? null,
          utm: j.utm?.valor ?? null,
          fecha: j.fecha ?? null,
        };
        setData(out);
        writeCache(out);
        setLoading(false);
      })
      .catch(e => { if (!cancel) { setError(e); setLoading(false); } });

    return () => { cancel = true; };
  }, []);

  return { data, loading, error };
}
