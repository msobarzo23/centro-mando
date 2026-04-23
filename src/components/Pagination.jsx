export default function Pagination({ page, totalPages, setPage, T }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  const btn = (content, onClick, active, disabled) => (
    <button
      key={String(content)}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 28, padding: "0 8px",
        border: `1px solid ${active ? T.accent : T.border}`,
        borderRadius: 6, cursor: disabled ? "default" : "pointer",
        background: active ? T.accent : "transparent",
        color: active ? "#fff" : disabled ? T.txD : T.txM,
        fontSize: 12, fontWeight: active ? 700 : 400,
        opacity: disabled ? 0.4 : 1,
      }}
    >{content}</button>
  );

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
      {btn("‹", () => setPage(p => p - 1), false, page === 0)}
      {pages.map((p, i) =>
        p === "…"
          ? <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: T.txD, fontSize: 12, lineHeight: "28px" }}>…</span>
          : btn(p + 1, () => setPage(p), p === page, false)
      )}
      {btn("›", () => setPage(p => p + 1), false, page === totalPages - 1)}
    </div>
  );
}
