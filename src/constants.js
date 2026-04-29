import {
  Activity, DollarSign, Truck, Banknote, CreditCard, AlertTriangle,
} from "lucide-react";

export const CSV = {
  ventas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv",
  viajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfKblo0PEPiyzfOniTQzk0HEf7fBeH1yC0SFBfKO0sMnGhPPEWI0T7fRtPA9rcXx8VPsptR3T835xa/pub?gid=0&single=true&output=csv",
  finResumen: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1738797304&single=true&output=csv",
  finBancos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1699395114&single=true&output=csv",
  finDAP: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1020614134&single=true&output=csv",
  finCalendario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1876759165&single=true&output=csv",
  finFondos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1691837276&single=true&output=csv",
  flotaViajes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv",
  flotaEquipos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv",
  leasingDetalle: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=675670021&single=true&output=csv",
  leasingResumen: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=771027573&single=true&output=csv",
  credito: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGj2ZfrfOA8xOPRV4_Z1H2wnCpBfEav9PgbD67iKw4b-R0Inuk_LgiPQ6wJk66N1M3AXIy0ZXhLLcJ/pub?gid=1158539978&single=true&output=csv",
  expediciones: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=0&single=true&output=csv",
  conductoresActivos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTigiXG1q1lPK37HpOZ1j5WyvbKcLx1JDeNhFTFK_7wBczMG1KIfUFi3Nyiu3SWLsPR_dzYSS8Ji2wG/pub?gid=780336350&single=true&output=csv",
  historico: "https://docs.google.com/spreadsheets/d/e/2PACX-1vREKe17-b_uW_0WHsmAyfuHXnN--S8rzdWGgY9M4rhM6cZ0iSjFOJMNazSjtHLvLk7j15IHFtlB_DU_/pub?gid=2078102522&single=true&output=csv",
};

export const AUTO_REFRESH_MIN = 15;
export const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export const MESES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const COMODIN_TRACTO = "AA1111";
export const COMODIN_CONDUCTOR = "CONDUCTOR, TRANSPORTES BELLO";
export const MEPCO_ADJUSTMENT_MONTH = 5;
export const MEPCO_CLIENTS_VISIBLE = ["Calidra", "CBB", "Novandino Litio", "Enaex", "Maxam", "Orica"];

// Umbrales del semáforo ejecutivo
export const UMBRAL_LIQUIDEZ_VERDE = 1.2;
export const UMBRAL_LIQUIDEZ_AMARILLA = 1.0;
export const UMBRAL_OCUPACION_VERDE = 85;
export const UMBRAL_OCUPACION_AMARILLA = 75;
export const UMBRAL_VENTAS_CAIDA_AMARILLA = -10;

// Umbrales de alertas operacionales
export const UMBRAL_VIAJES_ALERTA = 0.85;
export const UMBRAL_OCUPACION_ALERTA = 75;

export const themes = {
  dark: {
    bg:"#0b1120",bg2:"#111827",bg3:"#1e293b",card:"#151f32",tx:"#e2e8f0",txM:"#94a3b8",txD:"#64748b",
    border:"#1e3a5f",accent:"#3b82f6",accentBg:"rgba(59,130,246,0.12)",green:"#22c55e",greenBg:"rgba(34,197,94,0.12)",
    red:"#ef4444",redBg:"rgba(239,68,68,0.12)",amber:"#f59e0b",amberBg:"rgba(245,158,11,0.12)",
    purple:"#a855f7",purpleBg:"rgba(168,85,247,0.12)",teal:"#14b8a6",tealBg:"rgba(20,184,166,0.12)",
    violet:"#8b5cf6",violetBg:"rgba(139,92,246,0.12)",tooltipBg:"#101a2d",tooltipTx:"#e2e8f0",
    chart:["#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7","#14b8a6","#ec4899","#6366f1"],
  },
  light: {
    bg:"#f0f4f8",bg2:"#ffffff",bg3:"#e2e8f0",card:"#ffffff",tx:"#0f172a",txM:"#475569",txD:"#94a3b8",
    border:"#e2e8f0",accent:"#2563eb",accentBg:"rgba(37,99,235,0.08)",green:"#16a34a",greenBg:"rgba(22,163,74,0.08)",
    red:"#dc2626",redBg:"rgba(220,38,38,0.08)",amber:"#d97706",amberBg:"rgba(217,119,6,0.08)",
    purple:"#9333ea",purpleBg:"rgba(147,51,234,0.08)",teal:"#0d9488",tealBg:"rgba(13,148,136,0.08)",
    violet:"#7c3aed",violetBg:"rgba(124,58,237,0.08)",tooltipBg:"#1e293b",tooltipTx:"#f8fafc",
    chart:["#2563eb","#16a34a","#d97706","#dc2626","#9333ea","#0d9488","#db2777","#4f46e5"],
  },
};

export const TABS = [
  {id:"home",label:"Inicio",icon:Activity},
  {id:"ventas",label:"Ventas",icon:DollarSign},
  {id:"operaciones",label:"Operaciones",icon:Truck},
  {id:"finanzas",label:"Finanzas",icon:Banknote},
  {id:"leasing",label:"Leasing",icon:Truck},
  {id:"credito",label:"Crédito",icon:CreditCard},
  {id:"alertas",label:"Alertas",icon:AlertTriangle},
];
