import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { RefreshCw, Sun, Moon, Menu, X, FileDown, Maximize2, Minimize2, AlertTriangle } from "lucide-react";
import { CSV, AUTO_REFRESH_MIN, TABS, themes } from "./constants.js";
import { fetchCSV, fetchFinCSV, fetchRawCSV, parseLeasingResumen } from "./services/fetchData.js";
import { auditAll } from "./services/columnCheck.js";
import { computeAll } from "./services/compute.js";
import HomeView from "./views/HomeView.jsx";
import IndicadoresBanner from "./components/IndicadoresBanner.jsx";

const ResumenView = lazy(() => import("./views/ResumenView.jsx"));
const VentasView = lazy(() => import("./views/VentasView.jsx"));
const OperacionesView = lazy(() => import("./views/OperacionesView.jsx"));
const FinanzasView = lazy(() => import("./views/FinanzasView.jsx"));
const LeasingView = lazy(() => import("./views/LeasingView.jsx"));
const SimulacionLeasingView = lazy(() => import("./views/SimulacionLeasingView.jsx"));
const CreditoView = lazy(() => import("./views/CreditoView.jsx"));
const SimulacionCreditoView = lazy(() => import("./views/SimulacionCreditoView.jsx"));
const AlertasView = lazy(() => import("./views/AlertasView.jsx"));

export default function App() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("cm-theme") !== "light"; } catch { return true; } });
  const [tab, setTabRaw] = useState(() => { try { return localStorage.getItem("cm-tab") || "home"; } catch { return "home"; } });
  const setTab = useCallback((t) => { setTabRaw(t); try { localStorage.setItem("cm-tab", t); } catch {} }, []);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [columnWarnings, setColumnWarnings] = useState([]);
  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [timeAgo, setTimeAgo] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const bottomNavRef = useRef(null);
  const [projectionMode, setProjectionMode] = useState("seasonal");
  const [presentation, setPresentation] = useState(false);
  const [compareMode, setCompareModeRaw] = useState(() => { try { return localStorage.getItem("cm-compare") || "day"; } catch { return "day"; } });
  const setCompareMode = useCallback((m) => { setCompareModeRaw(m); try { localStorage.setItem("cm-compare", m); } catch {} }, []);
  const T = dark ? themes.dark : themes.light;

  useEffect(() => {
    if (!presentation) return;
    const onKey = (e) => { if (e.key === "Escape") setPresentation(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentation]);

  const toggleTheme = () => {
    setDark(d => { const n = !d; try { localStorage.setItem("cm-theme", n ? "dark" : "light"); } catch {} return n; });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [ventas,viajes,flotaViajes,flotaEquipos,expediciones,conductoresActivos,historico] = await Promise.all([
        fetchCSV(CSV.ventas), fetchCSV(CSV.viajes), fetchCSV(CSV.flotaViajes),
        fetchCSV(CSV.flotaEquipos), fetchCSV(CSV.expediciones), fetchCSV(CSV.conductoresActivos),
        CSV.historico ? fetchCSV(CSV.historico) : Promise.resolve([]),
      ]);
      const [finResumen,finBancos,finDAP,finCalendario,finFondos,leasingDetalle,leasingResumenRaw,credito] = await Promise.all([
        fetchFinCSV(CSV.finResumen, ["Concepto","Monto","Ganancia","Mes","Comprometido","Guardado"]),
        fetchFinCSV(CSV.finBancos, ["Fecha","Banco","Saldo Inicial","Saldo Final","Monto"]),
        fetchFinCSV(CSV.finDAP, ["Fecha Inicio","Vencimiento","Tasa","Monto Inicial","Monto Final","Ganancia","Vigente"]),
        fetchFinCSV(CSV.finCalendario, ["Fecha","Monto","Guardado","Falta","Concepto","Estado"]),
        fetchFinCSV(CSV.finFondos, ["Empresa","Fondo","Administradora","Monto Invertido","Valor Actual","Rentabilidad"]),
        fetchFinCSV(CSV.leasingDetalle, ["ID","Banco","Emisor","Tractos","Cuota UF","Dia Vcto","Fecha Inicio","Fecha Fin","Estado"]),
        fetchRawCSV(CSV.leasingResumen),
        fetchCSV(CSV.credito),
      ]);
      const leasingResumen = parseLeasingResumen(leasingResumenRaw);
      const allEmpty = [ventas,viajes,flotaViajes,flotaEquipos,finBancos].every(d => d.length === 0);
      if (allEmpty) setFetchError("No se pudieron cargar los datos. Verifica tu conexión o los permisos de las hojas.");
      const nextData = { ventas, viajes, finResumen, finBancos, finDAP, finCalendario, finFondos, flotaViajes, flotaEquipos, leasingDetalle, leasingResumen, credito, expediciones, conductoresActivos, historico };
      setData(nextData);
      const warnings = auditAll(nextData);
      setColumnWarnings(warnings);
      setWarningsDismissed(false);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
      setFetchError("Error al conectar con las fuentes de datos. Los datos mostrados pueden estar desactualizados.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (AUTO_REFRESH_MIN <= 0) return;
    let id = null;
    const start = () => { if (id == null) id = setInterval(loadData, AUTO_REFRESH_MIN * 60000); };
    const stop = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (lastUpdate && (Date.now() - lastUpdate.getTime()) >= AUTO_REFRESH_MIN * 60000) loadData();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [loadData, lastUpdate]);

  useEffect(() => {
    const compute = () => {
      if (!lastUpdate) { setTimeAgo(""); return; }
      const diff = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
      if (diff === 0) setTimeAgo("actualizado ahora");
      else if (diff === 1) setTimeAgo("hace 1 min");
      else setTimeAgo(`hace ${diff} min`);
    };
    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  useEffect(() => {
    const el = bottomNavRef.current?.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);

  const computed = useMemo(() => computeAll(data), [data]);

  if (loading && !computed) {
    return (
      <div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:T.tx,fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <RefreshCw size={32} color={T.accent} style={{animation:"spin 1s linear infinite"}}/>
          <p style={{marginTop:16,color:T.txM}}>Cargando datos...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const C = computed || {};
  const activeAlerts = (C.alertas||[]).length;

  return (
    <div className={presentation?"cm-presentation":""} style={{background:T.bg,minHeight:"100vh",fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",color:T.tx}}>
      {loading && computed && (
        <div style={{position:"fixed",top:0,left:0,right:0,height:3,zIndex:200,background:T.accentBg,overflow:"hidden"}}>
          <div style={{height:"100%",background:T.accent,animation:"progressBar 1.5s ease-in-out infinite",transformOrigin:"left"}}/>
        </div>
      )}
      {fetchError && (
        <div style={{background:T.amberBg,borderBottom:`1px solid ${T.amber}44`,padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <span style={{fontSize:12,color:T.amber}}>{fetchError}</span>
          <button onClick={()=>setFetchError(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.amber,fontSize:16,lineHeight:1,padding:"0 4px"}} title="Cerrar">×</button>
        </div>
      )}
      {!warningsDismissed && columnWarnings.length > 0 && (
        <div style={{background:T.amberBg,borderBottom:`1px solid ${T.amber}44`,padding:"8px 20px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div style={{fontSize:12,color:T.amber,lineHeight:1.5}}>
            <strong>Planillas con columnas faltantes:</strong>{" "}
            {columnWarnings.map((w,i) => (
              <span key={w.key}>
                {i>0 && " · "}
                <strong>{w.planilla}</strong> (falta: {w.missing.join(", ")})
              </span>
            ))}
            <div style={{fontSize:11,opacity:0.85,marginTop:2}}>Los cálculos asociados pueden mostrar 0 o "—". Verifica los encabezados en Google Sheets.</div>
          </div>
          <button onClick={()=>setWarningsDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",color:T.amber,fontSize:16,lineHeight:1,padding:"0 4px",flexShrink:0}} title="Cerrar">×</button>
        </div>
      )}
      <header style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setMobileMenu(!mobileMenu)} style={{background:"none",border:"none",cursor:"pointer",display:"none",color:T.tx,padding:4}} className="mobile-menu-btn">{mobileMenu?<X size={20}/>:<Menu size={20}/>}</button>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo-bello.svg" alt="Transportes Bello" style={{height:96,width:"auto",display:"block",filter:dark?"brightness(0) invert(1)":"none"}}/>
            <div style={{height:64,width:1,background:T.border}}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:T.tx,letterSpacing:-0.3}}>Centro de Mando — Don Luis Bello</div>
              <div style={{fontSize:10,color:T.txD}}>Transportes Bello e Hijos Ltda.</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {timeAgo && (() => {
            const mins = lastUpdate ? Math.floor((Date.now()-lastUpdate.getTime())/60000) : 999;
            const col = mins<5?T.green:mins<30?T.amber:T.red;
            return <span style={{fontSize:10,color:col,fontWeight:500}}>{timeAgo}</span>;
          })()}
          {computed && (
            <button onClick={async()=>{const{exportFullPDF}=await import("./services/exportPDF.js");exportFullPDF(computed);}} title="Exportar reporte ejecutivo PDF" style={{display:"flex",alignItems:"center",gap:5,background:T.accentBg,border:`1px solid ${T.accent}44`,borderRadius:7,cursor:"pointer",color:T.accent,padding:"4px 10px",fontSize:11,fontWeight:600}}>
              <FileDown size={14}/><span className="pdf-btn-label">PDF</span>
            </button>
          )}
          <button onClick={loadData} style={{background:"none",border:"none",cursor:"pointer",color:T.txM,padding:4}} title="Actualizar"><RefreshCw size={16} className={loading?"spinning":""}/></button>
          <button onClick={()=>setPresentation(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",color:presentation?T.accent:T.txM,padding:4}} title={presentation?"Salir del modo presentación (Esc)":"Modo presentación / TV"}>
            {presentation ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
          </button>
          <button onClick={toggleTheme} style={{background:"none",border:"none",cursor:"pointer",color:T.txM,padding:4}}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button>
        </div>
      </header>

      <IndicadoresBanner T={T}/>

      <div style={{display:"flex",minHeight:"calc(100vh - 52px)"}}>
        <nav className="sidebar" style={{width:200,background:T.bg2,borderRight:`1px solid ${T.border}`,padding:"16px 8px",flexShrink:0,display:"flex",flexDirection:"column",gap:2}}>
          {TABS.map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>{setTab(t.id);setMobileMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:active?T.accentBg:"transparent",color:active?T.accent:T.txM,fontWeight:active?600:400,fontSize:13,transition:"all 0.15s"}}>
                <t.icon size={16}/>{t.label}
                {t.id==="alertas"&&activeAlerts>0&&(<span style={{marginLeft:"auto",background:T.red,color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 7px"}}>{activeAlerts}</span>)}
              </button>
            );
          })}
        </nav>

        {mobileMenu&&(
          <div className="mobile-nav-overlay" style={{position:"fixed",top:52,left:0,right:0,bottom:0,zIndex:99,background:"rgba(0,0,0,0.5)"}} onClick={()=>setMobileMenu(false)}>
            <div style={{width:220,background:T.bg2,height:"100%",padding:"16px 8px",display:"flex",flexDirection:"column",gap:2}} onClick={e=>e.stopPropagation()}>
              {TABS.map(t=>{const active=tab===t.id;return(<button key={t.id} onClick={()=>{setTab(t.id);setMobileMenu(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:active?T.accentBg:"transparent",color:active?T.accent:T.txM,fontWeight:active?600:400,fontSize:14}}><t.icon size={18}/> {t.label}{t.id==="alertas"&&activeAlerts>0&&(<span style={{marginLeft:"auto",background:T.red,color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 8px"}}>{activeAlerts}</span>)}</button>);})}
            </div>
          </div>
        )}

        <main style={{flex:1,padding:presentation?"32px 40px":"20px 24px",maxWidth:presentation?1600:1200,margin:presentation?"0 auto":undefined,overflowX:"hidden"}}>
          <Suspense fallback={
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 0",color:T.txM,fontSize:13,gap:10}}>
              <RefreshCw size={16} color={T.accent} style={{animation:"spin 1s linear infinite"}}/> Cargando vista…
            </div>
          }>
            {tab==="resumen"&&<ResumenView C={C} T={T} setTab={setTab}/>}
            {tab==="home"&&<HomeView C={C} T={T} setTab={setTab} compareMode={compareMode} setCompareMode={setCompareMode}/>}
            {tab==="ventas"&&<VentasView C={C} T={T} projectionMode={projectionMode} setProjectionMode={setProjectionMode}/>}
            {tab==="operaciones"&&<OperacionesView C={C} T={T}/>}
            {tab==="finanzas"&&<FinanzasView C={C} T={T}/>}
            {tab==="leasing"&&<LeasingView C={C} T={T}/>}
            {tab==="simleasing"&&<SimulacionLeasingView T={T}/>}
            {tab==="credito"&&<CreditoView C={C} T={T}/>}
            {tab==="simcredito"&&<SimulacionCreditoView C={C} T={T}/>}
            {tab==="alertas"&&<AlertasView C={C} T={T}/>}
          </Suspense>
        </main>
      </div>

      <nav className="bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:T.bg2,borderTop:`1px solid ${T.border}`,display:"none",zIndex:100}}>
        <div ref={bottomNavRef} className="bottom-nav-scroll" style={{display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",padding:"6px 8px env(safe-area-inset-bottom,8px)"}}>
          {TABS.map(t=>{const active=tab===t.id;return(<button key={t.id} data-active={active?"true":undefined} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",minWidth:62,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:active?T.accentBg:"none",borderRadius:10,border:"none",cursor:"pointer",padding:"6px 10px",color:active?T.accent:T.txD,fontSize:10,fontWeight:active?600:400,whiteSpace:"nowrap",position:"relative"}}><t.icon size={18}/>{t.label}{t.id==="alertas"&&activeAlerts>0&&(<span style={{position:"absolute",top:0,right:2,background:T.red,color:"#fff",fontSize:8,fontWeight:700,borderRadius:6,padding:"0 4px",lineHeight:"14px"}}>{activeAlerts}</span>)}</button>);})}
        </div>
        <div className="bottom-nav-fade" style={{position:"absolute",top:0,right:0,bottom:0,width:28,pointerEvents:"none",background:`linear-gradient(to right, transparent, ${T.bg2})`}}/>
      </nav>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinning{animation:spin 1s linear infinite}@keyframes progressBar{0%{transform:scaleX(0);opacity:1}70%{transform:scaleX(0.8);opacity:1}100%{transform:scaleX(1);opacity:0}}.bottom-nav-scroll::-webkit-scrollbar{display:none}@media(max-width:768px){.sidebar{display:none!important}.bottom-nav{display:block!important}.mobile-menu-btn{display:block!important}main{padding:14px 12px 80px!important}.pdf-btn-label{display:none}}.cm-presentation .sidebar,.cm-presentation .bottom-nav,.cm-presentation .mobile-menu-btn,.cm-presentation .mobile-nav-overlay{display:none!important}.cm-presentation main{font-size:1.1rem}.cm-presentation h1{font-size:34px!important}.cm-presentation h2{font-size:20px!important}`}</style>
    </div>
  );
}
