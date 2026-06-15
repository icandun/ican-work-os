// Shared helpers: storage, dates, formatting, Google Calendar URL, exports
const STORAGE_KEY = "ican-workos-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function saveState(state) {
  try {
    const stamped = { ...state, _lastModified: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch (e) {}
}

function clearState() { localStorage.removeItem(STORAGE_KEY); }

// ---------- Dates ----------
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAYS_ID_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_ID_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function parseDateKey(key) {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateLong(d) {
  if (typeof d === "string") d = parseDateKey(d);
  if (!d) return "";
  return `${DAYS_ID_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}
function formatDateShort(d) {
  if (typeof d === "string") d = parseDateKey(d);
  if (!d) return "";
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID_SHORT[d.getMonth()]}`;
}
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayKey() { return dateKey(new Date()); }

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToHM(min) {
  if (!min && min !== 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}j`;
  return `${h}j ${m}m`;
}
function fmtJam(hours) {
  if (hours == null || isNaN(hours)) return "0j";
  const totalMin = Math.round(hours * 60);
  return minutesToHM(totalMin);
}

// ---------- Google Calendar ----------
function gcalUrl({ title, start, end, details, location }) {
  // start/end: Date objects
  const fmt = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Meeting",
    dates: `${fmt(start)}/${fmt(end)}`,
    details: details || "",
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---------- Color tokens for category & company ----------
const COMPANY_COLOR = {
  Tarda: { bg: "var(--tarda-bg)", fg: "var(--tarda-fg)", dot: "var(--tarda-dot)" },
  PRVA:  { bg: "var(--prva-bg)",  fg: "var(--prva-fg)",  dot: "var(--prva-dot)" },
  Pribadi: { bg: "var(--prib-bg)", fg: "var(--prib-fg)", dot: "var(--prib-dot)" },
};

const PRIORITY_COLOR = {
  "🔴 Tinggi": { bg: "#FEE2E2", fg: "#991B1B", dot: "#DC2626", label: "Tinggi" },
  "🟡 Sedang": { bg: "#FEF3C7", fg: "#92400E", dot: "#D97706", label: "Sedang" },
  "🟢 Rendah": { bg: "#D1FAE5", fg: "#065F46", dot: "#059669", label: "Rendah" },
};

// ---------- Export helpers ----------
// CSV/Excel: build a workbook using simple XLSX-style or fallback to CSV.
// We will use SheetJS loaded via CDN.

async function ensureSheetJS() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.XLSX;
}

async function ensureJsPDF() {
  if (window.jspdf) return window.jspdf;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.jspdf;
}

async function exportExcel({ filename, sheets }) {
  // sheets: [{ name, rows: [[..],[..]] }]
  const XLSX = await ensureSheetJS();
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  XLSX.writeFile(wb, filename);
}

async function exportPDF({ filename, title, subtitle, sections }) {
  const { jsPDF } = await ensureJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 40, y); y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subtitle, 40, y); y += 24;
  doc.setTextColor(0);

  for (const sec of sections) {
    if (y > 740) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(sec.heading, 40, y); y += 8;
    if (sec.summary) {
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80);
      const lines = doc.splitTextToSize(sec.summary, W - 80);
      doc.text(lines, 40, y); y += lines.length * 12;
      doc.setTextColor(0);
    }
    if (sec.table) {
      doc.autoTable({
        head: [sec.table.head],
        body: sec.table.body,
        startY: y + 6,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [24, 24, 27], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 246, 240] },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 18;
    } else {
      y += 12;
    }
  }
  doc.save(filename);
}

window.WORKOS_LIB = {
  loadState, saveState, clearState,
  DAYS_ID, DAYS_ID_LONG, MONTHS_ID, MONTHS_ID_SHORT,
  parseDateKey, formatDateLong, formatDateShort, dateKey, todayKey, addDays,
  timeToMinutes, minutesToHM, fmtJam,
  gcalUrl, COMPANY_COLOR, PRIORITY_COLOR,
  exportExcel, exportPDF,
};
