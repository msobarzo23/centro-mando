import { ExternalLink } from "lucide-react";

export default function DashboardLink({ T, url, label, color, colorBg, icon: Icon = ExternalLink }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        background: T.card,
        border: `1px solid ${color}55`,
        borderRadius: 14,
        padding: "14px 18px",
        textDecoration: "none",
        position: "relative",
        overflow: "hidden",
        transition: "transform 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = `${color}55`;
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent 70%)`, borderRadius: "14px 14px 0 0" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div style={{ background: colorBg, borderRadius: 10, padding: 10, display: "flex", flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.txM, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 }}>
            Detalle completo
          </div>
          <div style={{ fontSize: 14, color: T.tx, fontWeight: 700, letterSpacing: -0.2 }}>
            Don Luis, para más detalle presione aquí
          </div>
          <div style={{ fontSize: 12, color: T.txM, marginTop: 2 }}>{label}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        Abrir
        <ExternalLink size={14} />
      </div>
    </a>
  );
}
