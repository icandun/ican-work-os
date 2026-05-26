// Report screen — daily report + monthly Excel/PDF export
function Report({ state, initialDate }) {
  const { execLog } = state;
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;

  const [tab, setTab] = useState("harian"); // harian | bulanan
  const [date, setDate] = useState(initialDate || L.todayKey());
  useEffect(() => { if (initialDate) setDate(initialDate); }, [initialDate]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="wo-screen">
      <header className="wo-page-head">
        <div>
          <p className="wo-eyebrow">📊 Rekap</p>
          <h1 className="wo-page-title">Report</h1>
          <p className="wo-page-sub">Rangkuman aktivitas. Download Excel & PDF di sini.</p>
        </div>
      </header>

      <div className="wo-tabs">
        <button className={classes("wo-tab", tab === "harian" && "is-active")} onClick={() => setTab("harian")}>Harian</button>
        <button className={classes("wo-tab", tab === "bulanan" && "is-active")} onClick={() => setTab("bulanan")}>Bulanan</button>
        <button className={classes("wo-tab", tab === "30hari" && "is-active")} onClick={() => setTab("30hari")}>30 Hari Terakhir</button>
      </div>

      {tab === "harian" && <DailyReport date={date} setDate={setDate} execLog={execLog} />}
      {tab === "bulanan" && <MonthlyReport month={month} setMonth={setMonth} execLog={execLog} state={state} />}
      {tab === "30hari" && <RollingReport execLog={execLog} />}
    </div>
  );
}

function DailyReport({ date, setDate, execLog }) {
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;

  const dayLog = execLog.filter((e) => e.date === date).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  const total = dayLog.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const first = dayLog[0]?.start;
  const last = [...dayLog].reverse()[0]?.end || [...dayLog].reverse()[0]?.start;

  const byCompany = D.COMPANIES.map((co) => {
    const items = dayLog.filter((e) => e.company === co);
    return { co, count: items.length, minutes: items.reduce((s, e) => s + (Number(e.duration) || 0), 0) };
  });

  const tardaSub = D.SUBCATS.Tarda.map((sc) => {
    const items = dayLog.filter((e) => e.company === "Tarda" && e.category === sc);
    return { sc, count: items.length, minutes: items.reduce((s, e) => s + (Number(e.duration) || 0), 0) };
  }).filter((x) => x.minutes > 0);

  const prvaSub = D.SUBCATS.PRVA.map((sc) => {
    const items = dayLog.filter((e) => e.company === "PRVA" && e.category === sc);
    return { sc, count: items.length, minutes: items.reduce((s, e) => s + (Number(e.duration) || 0), 0) };
  }).filter((x) => x.minutes > 0);

  const downloadExcel = async () => {
    const rows = [
      ["Report Harian", L.formatDateLong(date)],
      [],
      ["RINGKASAN"],
      ["Jumlah aktivitas", dayLog.length],
      ["Total durasi (menit)", total],
      ["Total durasi (jam)", (total / 60).toFixed(2)],
      ["Mulai pertama", first || "-"],
      ["Selesai terakhir", last || "-"],
      [],
      ["BREAKDOWN PER PERUSAHAAN"],
      ["Perusahaan", "Aktivitas", "Menit", "Jam", "% Waktu"],
      ...byCompany.map((c) => [c.co, c.count, c.minutes, (c.minutes / 60).toFixed(2), total ? ((c.minutes / total) * 100).toFixed(1) + "%" : "0%"]),
      [],
      ["TIMELINE AKTIVITAS"],
      ["Mulai", "Selesai", "Menit", "Perusahaan", "Sub-Kategori", "Tugas", "Status", "Catatan"],
      ...dayLog.map((e) => [e.start || "", e.end || "", e.duration || 0, e.company, e.category, e.task, e.status, e.note || ""]),
    ];
    await L.exportExcel({ filename: `Report-Harian-${date}.xlsx`, sheets: [{ name: "Report", rows }] });
  };

  const downloadPDF = async () => {
    await L.exportPDF({
      filename: `Report-Harian-${date}.pdf`,
      title: "Report Harian — Ican's Work OS",
      subtitle: L.formatDateLong(date),
      sections: [
        {
          heading: "Ringkasan",
          summary: `Hari ini kamu mengerjakan ${dayLog.length} aktivitas dengan total durasi ${L.minutesToHM(total)} (${(total/60).toFixed(2)} jam).${first ? ` Mulai jam ${first}` : ""}${last ? `, selesai jam ${last}` : ""}.`,
        },
        {
          heading: "Breakdown per Perusahaan",
          table: {
            head: ["Perusahaan", "Aktivitas", "Menit", "Jam", "% Waktu"],
            body: byCompany.map((c) => [c.co, c.count, c.minutes, (c.minutes/60).toFixed(2), total ? ((c.minutes/total)*100).toFixed(1) + "%" : "0%"]),
          },
        },
        ...(tardaSub.length ? [{
          heading: "Breakdown Tarda",
          table: {
            head: ["Sub-Kategori", "Aktivitas", "Menit", "% Hari"],
            body: tardaSub.map((c) => [c.sc, c.count, c.minutes, total ? ((c.minutes/total)*100).toFixed(1) + "%" : "0%"]),
          },
        }] : []),
        ...(prvaSub.length ? [{
          heading: "Breakdown PRVA",
          table: {
            head: ["Sub-Kategori", "Aktivitas", "Menit", "% Hari"],
            body: prvaSub.map((c) => [c.sc, c.count, c.minutes, total ? ((c.minutes/total)*100).toFixed(1) + "%" : "0%"]),
          },
        }] : []),
        {
          heading: "Timeline Aktivitas",
          table: {
            head: ["Mulai", "Selesai", "Menit", "Perusahaan", "Kategori", "Tugas", "Status"],
            body: dayLog.map((e) => [e.start || "—", e.end || "—", e.duration || 0, e.company, e.category, e.task || "—", e.status]),
          },
        },
      ],
    });
  };

  return (
    <>
      <div className="wo-day-nav">
        <IconBtn onClick={() => setDate(L.dateKey(L.addDays(L.parseDateKey(date), -1)))}>{Icon.arrowL}</IconBtn>
        <div className="wo-day-nav-center">
          <div className="wo-day-nav-date">{L.formatDateLong(date)}</div>
          <input type="date" className="wo-day-nav-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <IconBtn onClick={() => setDate(L.dateKey(L.addDays(L.parseDateKey(date), 1)))}>{Icon.arrowR}</IconBtn>
        <div className="wo-day-nav-actions">
          <Btn variant="ghost" size="sm" onClick={downloadExcel}>{Icon.download} Excel</Btn>
          <Btn variant="dark" size="sm" onClick={downloadPDF}>{Icon.download} PDF</Btn>
        </div>
      </div>

      {dayLog.length === 0 ? (
        <Card>
          <Empty icon="∅" title="Tidak ada aktivitas pada tanggal ini" hint="Buka Execution Log untuk mencatat." />
        </Card>
      ) : (
        <>
          <div className="wo-kpi-grid">
            <KpiCard label="Aktivitas" value={dayLog.length} unit="entri" />
            <KpiCard label="Total durasi" value={L.minutesToHM(total)} unit="" tone="dark" />
            <KpiCard label="Mulai pertama" value={first || "—"} unit="" />
            <KpiCard label="Selesai terakhir" value={last || "—"} unit="" />
          </div>

          <Card title="Breakdown per Perusahaan">
            <div className="wo-bar-list">
              {byCompany.map((c) => (
                <div key={c.co} className="wo-bar-row">
                  <div className="wo-bar-label"><CompanyBadge company={c.co} /></div>
                  <div className="wo-bar-track">
                    <div className="wo-bar-fill" data-co={c.co} style={{ width: total ? `${(c.minutes/total)*100}%` : "0%" }} />
                  </div>
                  <div className="wo-bar-value">
                    <strong>{L.minutesToHM(c.minutes)}</strong>
                    <span className="wo-eyebrow">{c.count} aktivitas · {total ? ((c.minutes/total)*100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Timeline aktivitas hari ini" noPad>
            <div className="wo-table-wrap">
              <table className="wo-table">
                <thead>
                  <tr>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Menit</th>
                    <th>Perusahaan</th>
                    <th>Kategori</th>
                    <th>Tugas</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dayLog.map((e) => (
                    <tr key={e.id}>
                      <td className="num">{e.start}</td>
                      <td className="num">{e.end || "—"}</td>
                      <td className="num">{e.duration || 0}</td>
                      <td><CompanyBadge company={e.company} /></td>
                      <td>{e.category}</td>
                      <td className="wo-task-cell">{e.task || <span className="wo-muted">—</span>}</td>
                      <td><StatusPill status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function MonthlyReport({ month, setMonth, execLog, state }) {
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;
  const [y, m] = month.split("-").map(Number);
  const monthLog = execLog.filter((e) => e.date.startsWith(month));
  const totalMin = monthLog.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const activeDays = new Set(monthLog.map((e) => e.date)).size;

  const daysInMonth = new Date(y, m, 0).getDate();
  const dailyTotals = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const k = `${y}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const day = execLog.filter((e) => e.date === k);
    dailyTotals.push({ key: k, day: i, minutes: day.reduce((s, e) => s + (Number(e.duration) || 0), 0), count: day.length });
  }

  const byCompany = D.COMPANIES.map((co) => {
    const items = monthLog.filter((e) => e.company === co);
    return { co, count: items.length, minutes: items.reduce((s, e) => s + (Number(e.duration) || 0), 0) };
  });

  const allSubcats = {};
  monthLog.forEach((e) => {
    const k = `${e.company} · ${e.category}`;
    if (!allSubcats[k]) allSubcats[k] = { count: 0, minutes: 0, company: e.company, category: e.category };
    allSubcats[k].count++;
    allSubcats[k].minutes += Number(e.duration) || 0;
  });
  const subcatRanking = Object.values(allSubcats).sort((a, b) => b.minutes - a.minutes);

  const mostProductiveDay = dailyTotals.slice().sort((a, b) => b.minutes - a.minutes)[0];

  const downloadExcel = async () => {
    const summarySheet = [
      ["Report Bulanan", `${L.MONTHS_ID[m-1]} ${y}`],
      [],
      ["RINGKASAN BULAN"],
      ["Hari aktif", activeDays],
      ["Total aktivitas", monthLog.length],
      ["Total jam", (totalMin / 60).toFixed(2)],
      ["Rata-rata / hari aktif (jam)", activeDays ? (totalMin / 60 / activeDays).toFixed(2) : 0],
      ["Hari paling produktif", mostProductiveDay ? `${L.formatDateShort(mostProductiveDay.key)} — ${L.minutesToHM(mostProductiveDay.minutes)}` : "—"],
      [],
      ["BREAKDOWN PER PERUSAHAAN"],
      ["Perusahaan", "Aktivitas", "Menit", "Jam", "% Waktu"],
      ...byCompany.map((c) => [c.co, c.count, c.minutes, (c.minutes/60).toFixed(2), totalMin ? ((c.minutes/totalMin)*100).toFixed(1) + "%" : "0%"]),
      [],
      ["BREAKDOWN PER SUB-KATEGORI"],
      ["Perusahaan", "Sub-Kategori", "Aktivitas", "Menit", "Jam"],
      ...subcatRanking.map((s) => [s.company, s.category, s.count, s.minutes, (s.minutes/60).toFixed(2)]),
    ];
    const dailySheet = [
      ["Tanggal", "Hari", "Aktivitas", "Menit", "Jam"],
      ...dailyTotals.map((d) => {
        const dt = L.parseDateKey(d.key);
        return [d.key, L.DAYS_ID_LONG[dt.getDay()], d.count, d.minutes, (d.minutes/60).toFixed(2)];
      }),
    ];
    const detailSheet = [
      ["Tanggal", "Mulai", "Selesai", "Menit", "Perusahaan", "Sub-Kategori", "Tugas", "Status", "Catatan"],
      ...monthLog
        .sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")))
        .map((e) => [e.date, e.start || "", e.end || "", e.duration || 0, e.company, e.category, e.task, e.status, e.note || ""]),
    ];
    await L.exportExcel({
      filename: `Report-${y}-${String(m).padStart(2,"0")}.xlsx`,
      sheets: [
        { name: "Ringkasan", rows: summarySheet },
        { name: "Harian", rows: dailySheet },
        { name: "Detail", rows: detailSheet },
      ],
    });
  };

  const downloadPDF = async () => {
    await L.exportPDF({
      filename: `Report-${y}-${String(m).padStart(2,"0")}.pdf`,
      title: `Report Bulanan — ${L.MONTHS_ID[m-1]} ${y}`,
      subtitle: `Ican's Work OS · ${activeDays} hari aktif · ${L.minutesToHM(totalMin)} total`,
      sections: [
        {
          heading: "Ringkasan",
          summary: `Selama bulan ${L.MONTHS_ID[m-1]} ${y}, total ${monthLog.length} aktivitas dikerjakan di ${activeDays} hari aktif, dengan total ${L.minutesToHM(totalMin)} (${(totalMin/60).toFixed(1)} jam). Rata-rata ${activeDays ? (totalMin/60/activeDays).toFixed(1) : 0} jam per hari aktif.${mostProductiveDay ? ` Hari paling produktif: ${L.formatDateLong(mostProductiveDay.key)} dengan ${L.minutesToHM(mostProductiveDay.minutes)}.` : ""}`,
        },
        {
          heading: "Breakdown per Perusahaan",
          table: {
            head: ["Perusahaan", "Aktivitas", "Menit", "Jam", "% Waktu"],
            body: byCompany.map((c) => [c.co, c.count, c.minutes, (c.minutes/60).toFixed(2), totalMin ? ((c.minutes/totalMin)*100).toFixed(1) + "%" : "0%"]),
          },
        },
        {
          heading: "Top 10 Sub-Kategori",
          table: {
            head: ["Perusahaan", "Sub-Kategori", "Aktivitas", "Menit", "Jam"],
            body: subcatRanking.slice(0, 10).map((s) => [s.company, s.category, s.count, s.minutes, (s.minutes/60).toFixed(2)]),
          },
        },
        {
          heading: "Detail Aktivitas",
          table: {
            head: ["Tgl", "Mulai", "Mnt", "Perusahaan", "Kategori", "Tugas"],
            body: monthLog
              .sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")))
              .map((e) => [e.date.slice(5), e.start || "", e.duration || 0, e.company, e.category, e.task || "—"]),
          },
        },
      ],
    });
  };

  const maxDay = Math.max(1, ...dailyTotals.map((d) => d.minutes));

  return (
    <>
      <div className="wo-day-nav">
        <IconBtn onClick={() => {
          const dt = new Date(y, m - 2, 1);
          setMonth(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);
        }}>{Icon.arrowL}</IconBtn>
        <div className="wo-day-nav-center">
          <div className="wo-day-nav-date">{L.MONTHS_ID[m-1]} {y}</div>
          <input type="month" className="wo-day-nav-input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <IconBtn onClick={() => {
          const dt = new Date(y, m, 1);
          setMonth(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`);
        }}>{Icon.arrowR}</IconBtn>
        <div className="wo-day-nav-actions">
          <Btn variant="ghost" size="sm" onClick={downloadExcel}>{Icon.download} Excel</Btn>
          <Btn variant="dark" size="sm" onClick={downloadPDF}>{Icon.download} PDF</Btn>
        </div>
      </div>

      <div className="wo-kpi-grid">
        <KpiCard label="Hari aktif" value={`${activeDays} / ${daysInMonth}`} unit="" />
        <KpiCard label="Total aktivitas" value={monthLog.length} unit="entri" />
        <KpiCard label="Total jam" value={L.fmtJam(totalMin/60)} unit="" tone="dark" />
        <KpiCard label="Rata-rata / hari" value={activeDays ? L.fmtJam(totalMin/60/activeDays) : "—"} unit="" />
      </div>

      <Card title="Tren harian bulan ini">
        <div className="wo-bars-h">
          {dailyTotals.map((d) => (
            <div key={d.key} className="wo-bar-h" title={`${L.formatDateShort(d.key)}: ${L.minutesToHM(d.minutes)}`}>
              <div className="wo-bar-h-track">
                <div className="wo-bar-h-fill" style={{ height: `${(d.minutes / maxDay) * 100}%` }} />
              </div>
              <span className="wo-bar-h-label">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="wo-grid-2">
        <Card title="Breakdown per Perusahaan">
          <div className="wo-bar-list">
            {byCompany.map((c) => (
              <div key={c.co} className="wo-bar-row">
                <div className="wo-bar-label"><CompanyBadge company={c.co} /></div>
                <div className="wo-bar-track">
                  <div className="wo-bar-fill" data-co={c.co} style={{ width: totalMin ? `${(c.minutes/totalMin)*100}%` : "0%" }} />
                </div>
                <div className="wo-bar-value">
                  <strong>{L.fmtJam(c.minutes/60)}</strong>
                  <span className="wo-eyebrow">{c.count}× · {totalMin ? ((c.minutes/totalMin)*100).toFixed(0) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top sub-kategori bulan ini">
          <ol className="wo-rank-list">
            {subcatRanking.slice(0, 8).map((s, i) => (
              <li key={s.company + s.category}>
                <span className="wo-rank-num">{String(i+1).padStart(2,"0")}</span>
                <span className="wo-rank-main">
                  <strong>{s.category}</strong>
                  <span className="wo-eyebrow"><CompanyBadge company={s.company} /></span>
                </span>
                <span className="wo-rank-val">{L.minutesToHM(s.minutes)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

function RollingReport({ execLog }) {
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;

  const end = new Date();
  const start = L.addDays(end, -29); // inclusive 30 days
  const startKey = L.dateKey(start);
  const endKey = L.dateKey(end);

  const log = execLog.filter((e) => e.date >= startKey && e.date <= endKey);
  const totalMin = log.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const activeDays = new Set(log.map((e) => e.date)).size;

  // Daily totals (30 buckets)
  const dailyTotals = [];
  for (let i = 0; i < 30; i++) {
    const d = L.addDays(start, i);
    const k = L.dateKey(d);
    const items = execLog.filter((e) => e.date === k);
    dailyTotals.push({
      key: k, day: d.getDate(), month: d.getMonth() + 1,
      minutes: items.reduce((s, e) => s + (Number(e.duration) || 0), 0),
      count: items.length,
    });
  }

  const byCompany = D.COMPANIES.map((co) => {
    const items = log.filter((e) => e.company === co);
    return { co, count: items.length, minutes: items.reduce((s, e) => s + (Number(e.duration) || 0), 0) };
  });

  const allSubcats = {};
  log.forEach((e) => {
    const k = `${e.company} · ${e.category}`;
    if (!allSubcats[k]) allSubcats[k] = { count: 0, minutes: 0, company: e.company, category: e.category };
    allSubcats[k].count++;
    allSubcats[k].minutes += Number(e.duration) || 0;
  });
  const subcatRanking = Object.values(allSubcats).sort((a, b) => b.minutes - a.minutes);
  const mostProductiveDay = dailyTotals.slice().sort((a, b) => b.minutes - a.minutes)[0];

  const fileLabel = `${startKey}_to_${endKey}`;

  const downloadExcel = async () => {
    const summarySheet = [
      ["Report 30 Hari Terakhir"],
      ["Periode", `${L.formatDateLong(startKey)} — ${L.formatDateLong(endKey)}`],
      [],
      ["RINGKASAN"],
      ["Hari aktif", activeDays],
      ["Total aktivitas", log.length],
      ["Total jam", (totalMin / 60).toFixed(2)],
      ["Rata-rata / hari aktif (jam)", activeDays ? (totalMin / 60 / activeDays).toFixed(2) : 0],
      ["Hari paling produktif", mostProductiveDay && mostProductiveDay.minutes ? `${L.formatDateShort(mostProductiveDay.key)} — ${L.minutesToHM(mostProductiveDay.minutes)}` : "—"],
      [],
      ["BREAKDOWN PER PERUSAHAAN"],
      ["Perusahaan", "Aktivitas", "Menit", "Jam", "% Waktu"],
      ...byCompany.map((c) => [c.co, c.count, c.minutes, (c.minutes/60).toFixed(2), totalMin ? ((c.minutes/totalMin)*100).toFixed(1) + "%" : "0%"]),
      [],
      ["BREAKDOWN PER SUB-KATEGORI"],
      ["Perusahaan", "Sub-Kategori", "Aktivitas", "Menit", "Jam"],
      ...subcatRanking.map((s) => [s.company, s.category, s.count, s.minutes, (s.minutes/60).toFixed(2)]),
    ];
    const dailySheet = [
      ["Tanggal", "Hari", "Aktivitas", "Menit", "Jam"],
      ...dailyTotals.map((d) => {
        const dt = L.parseDateKey(d.key);
        return [d.key, L.DAYS_ID_LONG[dt.getDay()], d.count, d.minutes, (d.minutes/60).toFixed(2)];
      }),
    ];
    const detailSheet = [
      ["Tanggal", "Mulai", "Selesai", "Menit", "Perusahaan", "Sub-Kategori", "Tugas", "Status", "Catatan"],
      ...log
        .sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")))
        .map((e) => [e.date, e.start || "", e.end || "", e.duration || 0, e.company, e.category, e.task, e.status, e.note || ""]),
    ];
    await L.exportExcel({
      filename: `Report-30Hari-${fileLabel}.xlsx`,
      sheets: [
        { name: "Ringkasan", rows: summarySheet },
        { name: "Harian", rows: dailySheet },
        { name: "Detail", rows: detailSheet },
      ],
    });
  };

  const downloadPDF = async () => {
    await L.exportPDF({
      filename: `Report-30Hari-${fileLabel}.pdf`,
      title: "Report 30 Hari Terakhir — Ican's Work OS",
      subtitle: `${L.formatDateLong(startKey)} — ${L.formatDateLong(endKey)} · ${activeDays} hari aktif · ${L.minutesToHM(totalMin)} total`,
      sections: [
        {
          heading: "Ringkasan",
          summary: `Dalam 30 hari terakhir, ${log.length} aktivitas dikerjakan di ${activeDays} hari aktif dengan total ${L.minutesToHM(totalMin)} (${(totalMin/60).toFixed(1)} jam). Rata-rata ${activeDays ? (totalMin/60/activeDays).toFixed(1) : 0} jam per hari aktif.${mostProductiveDay && mostProductiveDay.minutes ? ` Hari paling produktif: ${L.formatDateLong(mostProductiveDay.key)} dengan ${L.minutesToHM(mostProductiveDay.minutes)}.` : ""}`,
        },
        {
          heading: "Breakdown per Perusahaan",
          table: {
            head: ["Perusahaan", "Aktivitas", "Menit", "Jam", "% Waktu"],
            body: byCompany.map((c) => [c.co, c.count, c.minutes, (c.minutes/60).toFixed(2), totalMin ? ((c.minutes/totalMin)*100).toFixed(1) + "%" : "0%"]),
          },
        },
        {
          heading: "Top Sub-Kategori",
          table: {
            head: ["Perusahaan", "Sub-Kategori", "Aktivitas", "Menit", "Jam"],
            body: subcatRanking.slice(0, 15).map((s) => [s.company, s.category, s.count, s.minutes, (s.minutes/60).toFixed(2)]),
          },
        },
        {
          heading: "Detail Aktivitas",
          table: {
            head: ["Tgl", "Mulai", "Mnt", "Perusahaan", "Kategori", "Tugas"],
            body: log
              .sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")))
              .map((e) => [e.date.slice(5), e.start || "", e.duration || 0, e.company, e.category, e.task || "—"]),
          },
        },
      ],
    });
  };

  const maxDay = Math.max(1, ...dailyTotals.map((d) => d.minutes));

  return (
    <>
      <div className="wo-day-nav">
        <div className="wo-day-nav-center">
          <div className="wo-day-nav-date">30 Hari Terakhir</div>
          <span className="wo-eyebrow">{L.formatDateShort(startKey)} — {L.formatDateShort(endKey)}</span>
        </div>
        <div className="wo-day-nav-actions">
          <Btn variant="ghost" size="sm" onClick={downloadExcel}>{Icon.download} Excel</Btn>
          <Btn variant="dark" size="sm" onClick={downloadPDF}>{Icon.download} PDF</Btn>
        </div>
      </div>

      <div className="wo-kpi-grid">
        <KpiCard label="Hari aktif" value={`${activeDays} / 30`} unit="" />
        <KpiCard label="Total aktivitas" value={log.length} unit="entri" />
        <KpiCard label="Total jam" value={L.fmtJam(totalMin/60)} unit="" tone="dark" />
        <KpiCard label="Rata-rata / hari" value={activeDays ? L.fmtJam(totalMin/60/activeDays) : "—"} unit="" />
      </div>

      <Card title="Tren harian 30 hari">
        <div className="wo-bars-h">
          {dailyTotals.map((d) => (
            <div key={d.key} className="wo-bar-h" title={`${L.formatDateShort(d.key)}: ${L.minutesToHM(d.minutes)}`}>
              <div className="wo-bar-h-track">
                <div className="wo-bar-h-fill" style={{ height: `${(d.minutes / maxDay) * 100}%` }} />
              </div>
              <span className="wo-bar-h-label">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="wo-grid-2">
        <Card title="Breakdown per Perusahaan">
          <div className="wo-bar-list">
            {byCompany.map((c) => (
              <div key={c.co} className="wo-bar-row">
                <div className="wo-bar-label"><CompanyBadge company={c.co} /></div>
                <div className="wo-bar-track">
                  <div className="wo-bar-fill" data-co={c.co} style={{ width: totalMin ? `${(c.minutes/totalMin)*100}%` : "0%" }} />
                </div>
                <div className="wo-bar-value">
                  <strong>{L.fmtJam(c.minutes/60)}</strong>
                  <span className="wo-eyebrow">{c.count}× · {totalMin ? ((c.minutes/totalMin)*100).toFixed(0) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top sub-kategori">
          <ol className="wo-rank-list">
            {subcatRanking.slice(0, 10).map((s, i) => (
              <li key={s.company + s.category}>
                <span className="wo-rank-num">{String(i+1).padStart(2,"0")}</span>
                <span className="wo-rank-main">
                  <strong>{s.category}</strong>
                  <span className="wo-eyebrow"><CompanyBadge company={s.company} /></span>
                </span>
                <span className="wo-rank-val">{L.minutesToHM(s.minutes)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

window.Report = Report;
