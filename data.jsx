// Seed data extracted from Ican's Work OS.xlsx
// Excel serial date conversion: new Date(Date.UTC(1899,11,30) + serial * 86400000)
// 46167 = Mon 25 May 2026 (today per spreadsheet)

const COMPANIES = ["Tarda", "PRVA", "Pribadi"];

const SUBCATS = {
  Tarda: ["Input Order", "Balas Chat", "Follow Up", "Komplain", "Request", "Invoice/Tagih", "Leads/Rekap", "Foto/Konten", "Meeting Tarda", "Advertiser", "Lainnya (Tarda)"],
  PRVA: ["All Rounder", "Advertiser", "Kreatif Konten", "FAT", "HR/Legal/GA", "Sales", "Report Komisaris", "RnD Produk", "Strategi & Plan", "Warehouse", "PPIC", "Operasional", "Meeting PRVA", "Lainnya (PRVA)"],
  Pribadi: ["AI & Automation", "Produk Digital", "Data & Dashboard", "Konten & Aset", "Skill Baru", "Riset & Eksperimen", "Market Research", "Networking & Kolaborasi", "Investasi & Aset Pasif", "Pipeline & Prospek", "Dokumentasi & SOP", "Ide & Konsep"],
};

const PRIORITY = ["🔴 Tinggi", "🟡 Sedang", "🟢 Rendah"];
const EXEC_STATUS = ["Belum", "Berjalan", "Selesai", "Ditunda"];
const TRIAGE_STATUS = ["🤔 Dipikirkan", "🏃 Dikerjakan", "✅ Selesai", "🗂️ Diarsip"];

// Helpers
const serialToDate = (s) => new Date(Date.UTC(1899, 11, 30) + s * 86400000);
const fracToTime = (f) => {
  if (f == null || isNaN(f)) return "";
  const total = Math.round(f * 24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const dateKey = (d) => {
  const dt = d instanceof Date ? d : serialToDate(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};
const todayKey = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

// Triage / Brain dump items
const SEED_TRIAGE = [
  { id: "tr-1", task: "Buat pitching deck untuk kompensasi advertiser Tarda", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: null, company: "Tarda", category: "Advertiser", note: "" },
  { id: "tr-2", task: "Upload kuitansi Apurva dari awal", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: null, company: "PRVA", category: "FAT", note: "" },
  { id: "tr-3", task: "Pindahin Mandiri Token Kopra ke Riha", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: null, company: "PRVA", category: "FAT", note: "" },
  { id: "tr-4", task: "Planning strategi launching CRM Tarda Boutique", priority: "🔴 Tinggi", status: "🤔 Dipikirkan", deadline: "2026-05-27", company: "Tarda", category: "Lainnya (Tarda)", note: "" },
  { id: "tr-5", task: "Jalanin Ads Tarda dengan Manus", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: "2026-05-26", company: "Tarda", category: "Advertiser", note: "" },
  { id: "tr-6", task: "Buat kontrak untuk Miqdad", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: null, company: "Tarda", category: "Lainnya (Tarda)", note: "" },
  { id: "tr-7", task: "Presentasi ke Miqdad terkait jobdesk", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: null, company: "Tarda", category: "Lainnya (Tarda)", note: "" },
  { id: "tr-8", task: "Meeting dengan Tarda Boutique", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: "2026-05-28", company: "Tarda", category: "Meeting Tarda", note: "Jadwal: 14:00 - 16:00, kantor Tarda Boutique", isMeeting: true, meetingStart: "14:00", meetingEnd: "16:00" },
  { id: "tr-9", task: "Buat landing page Arabian Memories", priority: "🟢 Rendah", status: "🤔 Dipikirkan", deadline: null, company: "Tarda", category: "Lainnya (Tarda)", note: "" },
  { id: "tr-10", task: "Pelunasan Tarda di chat semua", priority: "🟡 Sedang", status: "🤔 Dipikirkan", deadline: null, company: "Tarda", category: "Invoice/Tagih", note: "" },
  // Already archived items become "Selesai" in the new model
  { id: "tr-a1", task: "Upload kuitansi Parfex pembelian Aisha 50 ml", priority: "🔴 Tinggi", status: "✅ Selesai", deadline: "2026-05-26", company: "PRVA", category: "FAT", note: "", completedAt: "2026-05-23" },
  { id: "tr-a2", task: "Zoom meeting terkait Qontak", priority: "🟡 Sedang", status: "✅ Selesai", deadline: "2026-05-26", company: "Tarda", category: "Meeting Tarda", note: "1/ rekap dulu 2/ claude, isi yang harus diisi 3/jadwalin google meet", completedAt: "2026-05-22" },
  { id: "tr-a3", task: "Infokan ke tim legal ada revisi dari Tri Hartono", priority: "🔴 Tinggi", status: "✅ Selesai", deadline: null, company: "PRVA", category: "HR/Legal/GA", note: "1/ done 2/revisi disampaikan", completedAt: "2026-05-22" },
  { id: "tr-a4", task: "Input order", priority: "🔴 Tinggi", status: "✅ Selesai", deadline: "2026-05-26", company: "Tarda", category: "Leads/Rekap", note: "", completedAt: "2026-05-22" },
  { id: "tr-a5", task: "Pra-Zoom meeting terkait Qontak", priority: "🟡 Sedang", status: "✅ Selesai", deadline: "2026-05-26", company: "Tarda", category: "Meeting Tarda", note: "", completedAt: "2026-05-22" },
  { id: "tr-a6", task: "Instruksi Pengiriman Tarda", priority: "🔴 Tinggi", status: "✅ Selesai", deadline: "2026-05-26", company: "Tarda", category: "Request", note: "", completedAt: "2026-05-22" },
  { id: "tr-a7", task: "Bayar Biaya Maklon ke PT Satala Derma Essentials", priority: "🟡 Sedang", status: "✅ Selesai", deadline: "2026-05-28", company: "PRVA", category: "FAT", note: "", completedAt: "2026-05-24" },
  { id: "tr-a8", task: "Meeting dengan produksi Tarda", priority: "🟡 Sedang", status: "✅ Selesai", deadline: "2026-05-27", company: "Tarda", category: "Meeting Tarda", note: "", completedAt: "2026-05-23" },
];

// Execution log — actual time-blocked work performed
// dates: 46149=Mon 11-Apr-2026? Let's verify: 46167 = 25-May-2026, so 46149 = 7-May-2026
// 46149 Thu 07-May, 46150 Fri 08-May, 46151 Sat 09-May
// 46161 Tue 19-May, 46162 Wed 20-May, 46163 Thu 21-May, 46164 Fri 22-May, 46165 Sat 23-May
const SEED_EXEC = [
  { id: "ex-1",  date: "2026-05-07", start: "08:15", end: "08:38", duration: 23, company: "Tarda", category: "Balas Chat", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-2",  date: "2026-05-07", start: "09:30", end: "10:34", duration: 64, company: "Tarda", category: "Meeting Tarda", task: "Mekari Qontak di Google Meet", status: "Selesai", note: "" },
  { id: "ex-3",  date: "2026-05-07", start: "14:45", end: "16:10", duration: 85, company: "Tarda", category: "Meeting Tarda", task: "Produksi", status: "Selesai", note: "" },
  { id: "ex-4",  date: "2026-05-07", start: "16:30", end: "19:00", duration: 150, company: "Tarda", category: "Meeting Tarda", task: "Marketing", status: "Selesai", note: "" },
  { id: "ex-5",  date: "2026-05-07", start: "20:51", end: "20:57", duration: 6, company: "Tarda", category: "Invoice/Tagih", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-6",  date: "2026-05-07", start: "20:58", end: "21:12", duration: 14, company: "Tarda", category: "Input Order", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-7",  date: "2026-05-07", start: "21:12", end: "21:21", duration: 9, company: "Tarda", category: "Leads/Rekap", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-8",  date: "2026-05-08", start: "08:04", end: "09:28", duration: 84, company: "Tarda", category: "Balas Chat", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-9",  date: "2026-05-08", start: "09:59", end: "11:49", duration: 110, company: "PRVA", category: "Kreatif Konten", task: "Request ubah detail packaging semua SKU Purvu", status: "Selesai", note: "" },
  { id: "ex-10", date: "2026-05-08", start: "13:00", end: "16:39", duration: 219, company: "Tarda", category: "Balas Chat", task: "Seq 2", status: "Selesai", note: "" },
  { id: "ex-11", date: "2026-05-08", start: "17:10", end: "17:56", duration: 46, company: "Tarda", category: "Request", task: "Pengiriman JNE", status: "Selesai", note: "" },
  { id: "ex-12", date: "2026-05-08", start: "18:33", end: "19:15", duration: 42, company: "Tarda", category: "Input Order", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-13", date: "2026-05-08", start: "19:23", end: "20:00", duration: 37, company: "Tarda", category: "Leads/Rekap", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-14", date: "2026-05-09", start: "08:06", end: "11:37", duration: 211, company: "Tarda", category: "Balas Chat", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-15", date: "2026-05-09", start: "11:37", end: "11:52", duration: 15, company: "Tarda", category: "Request", task: "Pengiriman JNE", status: "Selesai", note: "" },
  { id: "ex-16", date: "2026-05-09", start: "11:58", end: "12:10", duration: 12, company: "Tarda", category: "Leads/Rekap", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-17", date: "2026-05-19", start: "06:19", end: "07:01", duration: 42, company: "Tarda", category: "Balas Chat", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-18", date: "2026-05-19", start: "07:21", end: "07:52", duration: 31, company: "Tarda", category: "Balas Chat", task: "Seq 2", status: "Selesai", note: "" },
  { id: "ex-19", date: "2026-05-19", start: "07:31", end: "07:32", duration: 1, company: "PRVA", category: "HR/Legal/GA", task: "Memberikan Draft PKS ke Tri Hartono", status: "Selesai", note: "" },
  { id: "ex-20", date: "2026-05-19", start: "10:34", end: "11:06", duration: 32, company: "Tarda", category: "Balas Chat", task: "Seq 3", status: "Selesai", note: "" },
  { id: "ex-21", date: "2026-05-19", start: "11:06", end: "17:30", duration: 384, company: "Tarda", category: "Meeting Tarda", task: "Brief ke Miqdad", status: "Selesai", note: "" },
  { id: "ex-22", date: "2026-05-19", start: "18:36", end: "18:50", duration: 14, company: "Tarda", category: "Komplain", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-23", date: "2026-05-19", start: "18:50", end: "19:28", duration: 38, company: "Tarda", category: "Input Order", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-24", date: "2026-05-19", start: "19:29", end: "19:35", duration: 6, company: "Tarda", category: "Leads/Rekap", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-25", date: "2026-05-20", start: "04:35", end: "05:30", duration: 55, company: "Pribadi", category: "Dokumentasi & SOP", task: "Buat excel habit x claude", status: "Selesai", note: "" },
  { id: "ex-26", date: "2026-05-20", start: "08:09", end: "08:42", duration: 33, company: "Tarda", category: "Balas Chat", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-27", date: "2026-05-20", start: "08:47", end: "11:31", duration: 164, company: "PRVA", category: "FAT", task: "Upload kuitansi", status: "Selesai", note: "" },
  { id: "ex-28", date: "2026-05-20", start: "12:45", end: "14:11", duration: 86, company: "PRVA", category: "HR/Legal/GA", task: "Revisi PKS Tri Hartono", status: "Selesai", note: "" },
  { id: "ex-29", date: "2026-05-20", start: "14:44", end: "15:49", duration: 65, company: "Tarda", category: "Advertiser", task: "Rekap iklan sesuai guideline META, seq 1", status: "Selesai", note: "" },
  { id: "ex-30", date: "2026-05-20", start: "15:50", end: "16:45", duration: 55, company: "PRVA", category: "HR/Legal/GA", task: "PKS Tri Hartono, seq 2", status: "Selesai", note: "" },
  { id: "ex-31", date: "2026-05-20", start: "16:56", end: "17:21", duration: 25, company: "Tarda", category: "Meeting Tarda", task: "Qontak", status: "Selesai", note: "" },
  { id: "ex-32", date: "2026-05-20", start: "17:44", end: "18:05", duration: 21, company: "Tarda", category: "Request", task: "Pengiriman Seq 1", status: "Selesai", note: "" },
  { id: "ex-33", date: "2026-05-20", start: "18:05", end: "18:14", duration: 9, company: "Tarda", category: "Leads/Rekap", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-34", date: "2026-05-20", start: "18:15", end: "18:47", duration: 32, company: "Tarda", category: "Komplain", task: "Seq 2", status: "Selesai", note: "" },
  { id: "ex-35", date: "2026-05-20", start: "18:47", end: "19:40", duration: 53, company: "Tarda", category: "Input Order", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-36", date: "2026-05-21", start: "05:43", end: "09:41", duration: 238, company: "Tarda", category: "Advertiser", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-37", date: "2026-05-21", start: "10:28", end: "10:45", duration: 17, company: "PRVA", category: "FAT", task: "Pengajuan invoice", status: "Selesai", note: "" },
  { id: "ex-38", date: "2026-05-21", start: "15:39", end: "20:35", duration: 296, company: "Tarda", category: "Meeting Tarda", task: "Meeting Produksi", status: "Selesai", note: "" },
  { id: "ex-39", date: "2026-05-22", start: "09:00", end: "11:50", duration: 170, company: "Tarda", category: "Meeting Tarda", task: "Meeting Tarda Boutique", status: "Selesai", note: "" },
  { id: "ex-40", date: "2026-05-22", start: "15:12", end: "15:20", duration: 8, company: "PRVA", category: "FAT", task: "Pembayaran invoice Satala Aisha 3 ml 2000 pcs", status: "Selesai", note: "belum di upload" },
  { id: "ex-41", date: "2026-05-22", start: "15:23", end: "15:34", duration: 11, company: "PRVA", category: "FAT", task: "Bayar reimburse", status: "Selesai", note: "belum di upload" },
  { id: "ex-42", date: "2026-05-23", start: "12:56", end: "15:46", duration: 170, company: "Tarda", category: "Komplain", task: "Seq 1", status: "Selesai", note: "" },
  { id: "ex-43", date: "2026-05-23", start: "17:11", end: "17:36", duration: 25, company: "Tarda", category: "Invoice/Tagih", task: "Rekap tagihan yang belum lunas", status: "Selesai", note: "" },
  { id: "ex-44", date: "2026-05-23", start: "17:36", end: "17:55", duration: 19, company: "Tarda", category: "Input Order", task: "Pelunasan chat seq 1", status: "Selesai", note: "" },
  // Today seeds — a few "Berjalan" and "Belum"
  { id: "ex-45", date: "2026-05-25", start: "07:30", end: "08:15", duration: 45, company: "Tarda", category: "Balas Chat", task: "Sapa pelanggan pagi", status: "Selesai", note: "" },
  { id: "ex-46", date: "2026-05-25", start: "09:00", end: "10:00", duration: 60, company: "Tarda", category: "Meeting Tarda", task: "Standup harian tim", status: "Selesai", note: "" },
  { id: "ex-47", date: "2026-05-25", start: "10:15", end: "", duration: 0, company: "PRVA", category: "FAT", task: "Upload kuitansi Apurva", status: "Berjalan", note: "" },
  { id: "ex-48", date: "2026-05-25", start: "13:00", end: "", duration: 0, company: "Tarda", category: "Advertiser", task: "Jalanin Ads Tarda dengan Manus", status: "Belum", note: "" },
  { id: "ex-49", date: "2026-05-25", start: "15:00", end: "", duration: 0, company: "Tarda", category: "Meeting Tarda", task: "Meeting dengan Tarda Boutique", status: "Belum", note: "Jadwal di kantor", isMeeting: true },
];

// Deep copies for reset
const COMPANIES_DEFAULT = [...COMPANIES];
const SUBCATS_DEFAULT = Object.fromEntries(Object.entries(SUBCATS).map(([k, v]) => [k, [...v]]));

window.WORKOS_DATA = {
  COMPANIES, SUBCATS, PRIORITY, EXEC_STATUS, TRIAGE_STATUS,
  COMPANIES_DEFAULT, SUBCATS_DEFAULT,
  SEED_TRIAGE, SEED_EXEC,
  serialToDate, fracToTime, dateKey, todayKey,
};
