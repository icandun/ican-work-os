// Dashboard screen
function Dashboard({ state, setState, setRoute, openTaskFromTriage }) {
  const { triage, execLog, onboardingDismissed } = state;
  const L = window.WORKOS_LIB;
  const today = L.todayKey();
  const now = new Date();

  const todayLog = execLog.filter((e) => e.date === today);
  const todayMinutes = todayLog.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const todayCompanyMinutes = (co) => todayLog.filter((e) => e.company === co).reduce((s, e) => s + (Number(e.duration) || 0), 0);

  // 7-hari terakhir
  const last7 = [];
  for (let i = 6; i >= 0; i--) last7.push(L.dateKey(L.addDays(now, -i)));
  const last7Log = execLog.filter((e) => last7.includes(e.date));
  const last7Min = last7Log.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const last7Hours = last7Min / 60;
  const last7Activities = last7Log.length;
  const activeDays = new Set(last7Log.map((e) => e.date)).size;
  const avgPerDay = activeDays ? last7Hours / activeDays : 0;

  const companyHours = window.WORKOS_DATA.COMPANIES.map((c) => ({
    company: c,
    minutes: last7Log.filter((e) => e.company === c).reduce((s, e) => s + (Number(e.duration) || 0), 0),
    count: last7Log.filter((e) => e.company === c).length,
  }));
  const maxCompanyMin = Math.max(1, ...companyHours.map((c) => c.minutes));

  const tardaBreakdown = window.WORKOS_DATA.SUBCATS.Tarda.map((sc) => ({
    cat: sc,
    minutes: last7Log.filter((e) => e.company === "Tarda" && e.category === sc).reduce((s, e) => s + (Number(e.duration) || 0), 0),
    count: last7Log.filter((e) => e.company === "Tarda" && e.category === sc).length,
  })).filter((x) => x.minutes > 0).sort((a, b) => b.minutes - a.minutes);

  const activeTriage = triage.filter((t) => t.status !== "✅ Selesai" && t.status !== "🗂️ Diarsip")
    .sort((a, b) => {
      const pri = { "🔴 Tinggi": 0, "🟡 Sedang": 1, "🟢 Rendah": 2 };
      return (pri[a.priority] ?? 3) - (pri[b.priority] ?? 3);
    });

  const upcomingDeadlines = triage
    .filter((t) => t.deadline && t.status !== "✅ Selesai" && t.status !== "🗂️ Diarsip")
    .filter((t) => {
      const d = L.parseDateKey(t.deadline);
      const diff = (d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const lastFive = [...execLog].sort((a, b) => (b.date + (b.start || "")).localeCompare(a.date + (a.start || ""))).slice(0, 5);

  return (
    <div className="wo-screen">
      <header className="wo-page-head">
        <div>
          <p className="wo-eyebrow">{L.formatDateLong(now)}</p>
          <h1 className="wo-page-title">Selamat datang, Ican <span className="wo-wave">👋</span></h1>
        </div>
        <div className="wo-page-head-actions">
          <Btn variant="ghost" size="sm" onClick={() => setRoute("triage")}>Buka Triage {Icon.chev}</Btn>
          <Btn variant="primary" size="sm" onClick={() => setRoute("execution")}>
            {Icon.plus} <span>Mulai aktivitas</span>
          </Btn>
        </div>
      </header>



      {/* KPI cards */}
      <div className="wo-kpi-grid">
        <KpiCard label="Aktivitas hari ini" value={todayLog.length} unit="aktivitas" tone="dark" />
        <KpiCard label="Jam kerja hari ini" value={L.minutesToHM(todayMinutes)} unit="" />
        <KpiCard label="Tarda hari ini" value={L.minutesToHM(todayCompanyMinutes("Tarda"))} unit="" tone="tarda" />
        <KpiCard label="PRVA hari ini" value={L.minutesToHM(todayCompanyMinutes("PRVA"))} unit="" tone="prva" />
      </div>

      <div className="wo-kpi-grid wo-kpi-grid-secondary">
        <KpiCard label="7 hari · total aktivitas" value={last7Activities} unit="aktivitas" small />
        <KpiCard label="7 hari · total jam" value={L.fmtJam(last7Hours)} unit="" small />
        <KpiCard label="Rata-rata / hari aktif" value={L.fmtJam(avgPerDay)} unit="" small />
        <KpiCard label="Hari aktif (7 hari)" value={`${activeDays}/7`} unit="" small />
      </div>

      <div className="wo-grid-2">
        <Card title="🎯 Triage aktif" action={<Btn variant="ghost" size="sm" onClick={() => setRoute("triage")}>Lihat semua {Icon.chev}</Btn>}>
          {activeTriage.length === 0 ? (
            <Empty icon="✓" title="Triage kosong" hint="Semua tugas sudah dipindah ke Done. Mantap." />
          ) : (
            <ul className="wo-task-list">
              {activeTriage.slice(0, 6).map((t) => (
                <li key={t.id} className="wo-task-row" onClick={() => openTaskFromTriage(t.id)}>
                  <div className="wo-task-row-main">
                    <span className="wo-task-row-title">{t.task}</span>
                    <div className="wo-task-row-meta">
                      <PriorityBadge priority={t.priority} />
                      {t.company && <CompanyBadge company={t.company} />}
                      {t.category && <Badge color="neutral">{t.category}</Badge>}
                    </div>
                  </div>
                  {t.deadline && (
                    <div className="wo-task-row-deadline">
                      <span className="wo-eyebrow">Deadline</span>
                      <span>{L.formatDateShort(t.deadline)}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="⚠ Deadline 7 hari ke depan">
          {upcomingDeadlines.length === 0 ? (
            <Empty icon="∅" title="Tidak ada deadline" hint="Tidak ada tugas berbatas waktu dalam 7 hari." />
          ) : (
            <ul className="wo-task-list">
              {upcomingDeadlines.map((t) => {
                const days = Math.round((L.parseDateKey(t.deadline) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
                return (
                  <li key={t.id} className="wo-task-row">
                    <div className="wo-task-row-main">
                      <span className="wo-task-row-title">{t.task}</span>
                      <div className="wo-task-row-meta">
                        <PriorityBadge priority={t.priority} />
                        {t.company && <CompanyBadge company={t.company} />}
                      </div>
                    </div>
                    <div className="wo-task-row-deadline">
                      <span className="wo-eyebrow">{days === 0 ? "Hari ini" : days === 1 ? "Besok" : `${days} hari`}</span>
                      <span>{L.formatDateShort(t.deadline)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="wo-grid-2">
        <Card title="🏢 Jam kerja per perusahaan (7 hari)">
          <div className="wo-bar-list">
            {companyHours.map((c) => (
              <div key={c.company} className="wo-bar-row">
                <div className="wo-bar-label">
                  <CompanyBadge company={c.company} />
                </div>
                <div className="wo-bar-track">
                  <div className="wo-bar-fill" data-co={c.company} style={{ width: `${(c.minutes / maxCompanyMin) * 100}%` }} />
                </div>
                <div className="wo-bar-value">
                  <strong>{L.minutesToHM(c.minutes)}</strong>
                  <span className="wo-eyebrow">{c.count} aktivitas</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="📂 Breakdown Tarda (7 hari)">
          {tardaBreakdown.length === 0 ? (
            <Empty icon="·" title="Belum ada data Tarda" hint="Catat aktivitas di Execution Log." />
          ) : (
            <div className="wo-bar-list">
              {tardaBreakdown.slice(0, 8).map((c) => (
                <div key={c.cat} className="wo-bar-row">
                  <div className="wo-bar-label">
                    <span className="wo-cat-label">{c.cat}</span>
                  </div>
                  <div className="wo-bar-track">
                    <div className="wo-bar-fill" data-co="Tarda" style={{ width: `${(c.minutes / Math.max(1, tardaBreakdown[0].minutes)) * 100}%` }} />
                  </div>
                  <div className="wo-bar-value">
                    <strong>{L.minutesToHM(c.minutes)}</strong>
                    <span className="wo-eyebrow">{c.count}×</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="🔥 5 aktivitas terakhir" action={<Btn variant="ghost" size="sm" onClick={() => setRoute("execution")}>Buka log {Icon.chev}</Btn>}>
        {lastFive.length === 0 ? (
          <Empty icon="·" title="Belum ada aktivitas" />
        ) : (
          <div className="wo-table-wrap">
            <table className="wo-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Perusahaan</th>
                  <th>Kategori</th>
                  <th>Tugas</th>
                  <th>Durasi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lastFive.map((e) => (
                  <tr key={e.id}>
                    <td className="num">{L.formatDateShort(e.date)}</td>
                    <td><CompanyBadge company={e.company} /></td>
                    <td>{e.category}</td>
                    <td className="wo-task-cell">{e.task || <span className="wo-muted">—</span>}</td>
                    <td className="num">{L.minutesToHM(e.duration)}</td>
                    <td><StatusPill status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ label, value, unit, tone = "default", small }) {
  return (
    <div className={classes("wo-kpi", `wo-kpi-${tone}`, small && "wo-kpi-small")}>
      <div className="wo-kpi-label">{label}</div>
      <div className="wo-kpi-value">
        <span>{value}</span>
        {unit && <span className="wo-kpi-unit">{unit}</span>}
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
