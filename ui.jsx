// Shared UI primitives
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function classes(...args) { return args.filter(Boolean).join(" "); }

function Badge({ children, color = "neutral", size = "sm" }) {
  const styleMap = {
    neutral: { bg: "#F4F4F2", fg: "#3F3F46", border: "#E4E4E7" },
    tarda:   { bg: "var(--tarda-bg)", fg: "var(--tarda-fg)", border: "var(--tarda-border)" },
    prva:    { bg: "var(--prva-bg)",  fg: "var(--prva-fg)",  border: "var(--prva-border)" },
    prib:    { bg: "var(--prib-bg)",  fg: "var(--prib-fg)",  border: "var(--prib-border)" },
    red:     { bg: "#FEE2E2", fg: "#991B1B", border: "#FECACA" },
    amber:   { bg: "#FEF3C7", fg: "#92400E", border: "#FDE68A" },
    green:   { bg: "#D1FAE5", fg: "#065F46", border: "#A7F3D0" },
    blue:    { bg: "#DBEAFE", fg: "#1E3A8A", border: "#BFDBFE" },
    dark:    { bg: "#18181B", fg: "#FAFAF7", border: "#18181B" },
  };
  const s = styleMap[color] || styleMap.neutral;
  return (
    <span className={`wo-badge wo-badge-${size}`} style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {children}
    </span>
  );
}

function CompanyBadge({ company }) {
  if (!company) return <Badge color="neutral">—</Badge>;
  const map = { Tarda: "tarda", PRVA: "prva", Pribadi: "prib" };
  return <Badge color={map[company] || "neutral"}>{company}</Badge>;
}

function PriorityBadge({ priority }) {
  const { PRIORITY_COLOR } = window.WORKOS_LIB;
  const p = PRIORITY_COLOR[priority];
  if (!p) return null;
  return (
    <span className="wo-pri">
      <span className="wo-pri-dot" style={{ background: p.dot }}></span>
      <span>{p.label}</span>
    </span>
  );
}

function StatusPill({ status }) {
  let color = "neutral";
  if (status === "Selesai" || status === "✅ Selesai") color = "green";
  else if (status === "Berjalan" || status === "🏃 Dikerjakan") color = "blue";
  else if (status === "Ditunda") color = "amber";
  else if (status === "🗂️ Diarsip") color = "neutral";
  else if (status === "🤔 Dipikirkan") color = "amber";
  else if (status === "Belum") color = "neutral";
  return <Badge color={color}>{status}</Badge>;
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button className={classes("wo-icon-btn", danger && "danger")} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function Btn({ children, onClick, variant = "default", size = "md", style, type, disabled }) {
  return (
    <button
      type={type || "button"}
      disabled={disabled}
      className={classes("wo-btn", `wo-btn-${variant}`, `wo-btn-${size}`)}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="wo-modal-backdrop" onClick={onClose}>
      <div className={classes("wo-modal", wide && "wide")} onClick={(e) => e.stopPropagation()}>
        <div className="wo-modal-head">
          <h3>{title}</h3>
          <button className="wo-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="wo-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="wo-field">
      <span className="wo-field-label">{label}</span>
      {children}
      {hint && <span className="wo-field-hint">{hint}</span>}
    </label>
  );
}

function Input(props) {
  return <input className="wo-input" {...props} />;
}
function Select({ children, ...props }) {
  return <select className="wo-input wo-select" {...props}>{children}</select>;
}
function Textarea(props) {
  return <textarea className="wo-input wo-textarea" {...props} />;
}

function Card({ children, title, action, className, style, noPad }) {
  return (
    <section className={classes("wo-card", className)} style={style}>
      {(title || action) && (
        <header className="wo-card-head">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      <div className={classes("wo-card-body", noPad && "no-pad")}>{children}</div>
    </section>
  );
}

function Empty({ icon, title, hint }) {
  return (
    <div className="wo-empty">
      <div className="wo-empty-icon">{icon || "·"}</div>
      <div className="wo-empty-title">{title}</div>
      {hint && <div className="wo-empty-hint">{hint}</div>}
    </div>
  );
}

// Inline SVG icons
const Icon = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg>,
  inbox: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6"/><path d="M8 13a4 4 0 0 0 8 0"/></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/></svg>,
  report: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h12l4 4v14H4z"/><path d="M16 3v4h4"/><path d="M8 13h8M8 17h5"/></svg>,
  cal: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></svg>,
  gcal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/><path d="M11 14h2M12 13v2"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  chev: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  arrowL: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>,
  arrowR: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  spark: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6 6l-2-2M20 20l-2-2M6 18l-2 2M20 4l-2 2"/><circle cx="12" cy="12" r="4"/></svg>,
  gear: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  play2: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>,
};

Object.assign(window, {
  classes, Badge, CompanyBadge, PriorityBadge, StatusPill, IconBtn, Btn,
  Modal, Field, Input, Select, Textarea, Card, Empty, Icon,
});
