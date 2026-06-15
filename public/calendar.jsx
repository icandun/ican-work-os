// Calendar — productivity heatmap + upcoming meetings with Google Calendar sync
function CalendarScreen({ state, setState, setRoute, setReportDate }) {
  const { execLog, triage } = state;
  const L = window.WORKOS_LIB;

  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const goMonth = (n) => setView((v) => {
    const d = new Date(v.year, v.month + n, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Build month grid (Mon-start week)
  const firstOfMonth = new Date(view.year, view.month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      const k = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const day = execLog.filter((e) => e.date === k);
      const meetings = triage.filter((t) => t.deadline === k && t.isMeeting && t.status !== "✅ Selesai" && t.status !== "🗂️ Diarsip");
      cells.push({
        key: k, day: dayNum,
        minutes: day.reduce((s, e) => s + (Number(e.duration) || 0), 0),
        count: day.length,
        meetings,
      });
    }
  }

  const monthCells = cells.filter(Boolean);
  const maxMin = Math.max(1, ...monthCells.map((c) => c.minutes));
  const totalMinutes = monthCells.reduce((s, c) => s + c.minutes, 0);
  const activeDays = monthCells.filter((c) => c.minutes > 0).length;

  const upcomingMeetings = triage
    .filter((t) => t.isMeeting && t.deadline && t.status !== "✅ Selesai" && t.status !== "🗂️ Diarsip")
    .filter((t) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return L.parseDateKey(t.deadline) >= today;
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const handleGcal = (t) => {
    const d = L.parseDateKey(t.deadline);
    const [sh, sm] = (t.meetingStart || "09:00").split(":").map(Number);
    const [eh, em] = (t.meetingEnd || "10:00").split(":").map(Number);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em);
    const url = L.gcalUrl({
      title: t.task, start, end,
      details: `${t.note || ""}\n\nPerusahaan: ${t.company || "-"}\nKategori: ${t.category || "-"}`,
    });
    window.open(url, "_blank");
  };

  const openDay = (k) => {
    setReportDate(k);
    setRoute("report");
  };

  const heatLevel = (min) => {
    if (!min) return 0;
    const r = min / maxMin;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  return (
    <div className="wo-screen">
      <header className="wo-page-head">
        <div>
          <p className="wo-eyebrow">📅 Produktivitas + Jadwal</p>
          <h1 className="wo-page-title">Kalender</h1>
          <p className="wo-page-sub">Heatmap produktivitas bulan ini. Klik tanggal untuk lihat report harian.</p>
        </div>
      </header>

      <div className="wo-day-nav">
        <IconBtn onClick={() => goMonth(-1)}>{Icon.arrowL}</IconBtn>
        <div className="wo-day-nav-center">
          <div className="wo-day-nav-date">{L.MONTHS_ID[view.month]} {view.year}</div>
        </div>
        <IconBtn onClick={() => goMonth(1)}>{Icon.arrowR}</IconBtn>
        <Btn variant="ghost" size="sm" onClick={() => {
          const d = new Date();
          setView({ year: d.getFullYear(), month: d.getMonth() });
        }}>Bulan ini</Btn>
      </div>

      <div className="wo-kpi-grid">
        <KpiCard label="Hari aktif" value={`${activeDays} / ${daysInMonth}`} unit="" />
        <KpiCard label="Total jam" value={L.fmtJam(totalMinutes/60)} unit="" tone="dark" />
        <KpiCard label="Rata-rata / hari aktif" value={activeDays ? L.fmtJam(totalMinutes/60/activeDays) : "—"} unit="" />
        <KpiCard label="Meeting dijadwalkan" value={upcomingMeetings.length} unit="acara" tone="tarda" />
      </div>

      <Card>
        <div className="wo-cal-wrap">
          <div className="wo-cal-head">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="wo-cal-grid">
            {cells.map((c, i) => {
              if (!c) return <div key={i} className="wo-cal-cell is-empty" />;
              const isToday = c.key === L.todayKey();
              return (
                <div key={i} className={classes("wo-cal-cell", `heat-${heatLevel(c.minutes)}`, isToday && "is-today")} onClick={() => c.minutes > 0 && openDay(c.key)}>
                  <div className="wo-cal-cell-head">
                    <span className="wo-cal-day">{c.day}</span>
                    {c.meetings.length > 0 && <span className="wo-cal-mdot" title={`${c.meetings.length} meeting`}>●</span>}
                  </div>
                  {c.minutes > 0 && (
                    <div className="wo-cal-cell-stats">
                      <strong>{L.fmtJam(c.minutes/60)}</strong>
                      <span>{c.count}×</span>
                    </div>
                  )}
                  {c.meetings.slice(0, 2).map((m) => (
                    <div key={m.id} className="wo-cal-meeting" title={m.task}>
                      {m.meetingStart && <span>{m.meetingStart}</span>} {m.task}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="wo-cal-legend">
            <span>Kurang</span>
            <span className="wo-cal-legend-cell heat-0" />
            <span className="wo-cal-legend-cell heat-1" />
            <span className="wo-cal-legend-cell heat-2" />
            <span className="wo-cal-legend-cell heat-3" />
            <span className="wo-cal-legend-cell heat-4" />
            <span>Produktif</span>
          </div>
        </div>
      </Card>

      <Card title="📌 Meeting & acara akan datang" action={<Btn variant="ghost" size="sm" onClick={() => setRoute("triage")}>Tambah {Icon.chev}</Btn>}>
        {upcomingMeetings.length === 0 ? (
          <Empty icon="📭" title="Tidak ada meeting" hint="Tambahkan tugas di Triage dan tandai sebagai meeting." />
        ) : (
          <ul className="wo-mtg-list">
            {upcomingMeetings.map((m) => {
              const d = L.parseDateKey(m.deadline);
              const today = new Date(); today.setHours(0,0,0,0);
              const days = Math.round((d - today) / 86400000);
              const dayLabel = days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari lagi`;
              return (
                <li key={m.id} className="wo-mtg">
                  <div className="wo-mtg-date">
                    <div className="wo-mtg-date-day">{d.getDate()}</div>
                    <div className="wo-mtg-date-mo">{L.MONTHS_ID_SHORT[d.getMonth()]}</div>
                    <div className="wo-mtg-date-dn">{L.DAYS_ID[d.getDay()]}</div>
                  </div>
                  <div className="wo-mtg-main">
                    <h4>{m.task}</h4>
                    <div className="wo-mtg-meta">
                      {m.meetingStart && <span>🕐 {m.meetingStart}{m.meetingEnd ? `–${m.meetingEnd}` : ""}</span>}
                      {m.company && <CompanyBadge company={m.company} />}
                      <span className="wo-mtg-when">{dayLabel}</span>
                    </div>
                    {m.note && <p className="wo-mtg-note">{m.note}</p>}
                  </div>
                  <div className="wo-mtg-actions">
                    <Btn variant="primary" size="sm" onClick={() => handleGcal(m)}>
                      {Icon.gcal} <span>Add to Google Calendar</span>
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

window.CalendarScreen = CalendarScreen;
