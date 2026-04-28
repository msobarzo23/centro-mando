export default function Sparkline({ data, color, T, height = 26 }) {
  const valid = (data || []).filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valid.length < 2) return null;
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  const range = max - min || 1;
  const w = 100, h = height, pad = 3;
  const pts = data.map((v, i) => {
    if (v === null || v === undefined || isNaN(v)) return null;
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - pad * 2) - pad;
    return [x, y];
  });
  const segments = [];
  let cur = [];
  pts.forEach(p => { if (p) cur.push(p); else if (cur.length) { segments.push(cur); cur = []; } });
  if (cur.length) segments.push(cur);
  const last = pts.filter(Boolean).slice(-1)[0];
  const fillColor = color || T.accent;
  const areaPath = segments.map(seg => {
    if (seg.length < 2) return "";
    const d = seg.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
    return `${d} L${seg[seg.length-1][0]},${h} L${seg[0][0]},${h} Z`;
  }).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block",marginTop:6,opacity:0.95}}>
      <path d={areaPath} fill={fillColor} fillOpacity="0.12"/>
      {segments.map((seg, idx) => (
        <polyline key={idx} points={seg.map(p => p.join(",")).join(" ")} fill="none" stroke={fillColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      ))}
      {last && <circle cx={last[0]} cy={last[1]} r="2.2" fill={fillColor}/>}
    </svg>
  );
}
