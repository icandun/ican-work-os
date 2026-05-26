// Root app: state, routing, nav (sidebar desktop / bottom mobile)
function App() {
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;

  const [state, setState] = useState(() => {
    const saved = L.loadState();
    if (saved && saved.triage && saved.execLog) {
      return {
        triage: saved.triage,
        execLog: saved.execLog,
        companies: saved.companies || D.COMPANIES_DEFAULT,
        subcats: saved.subcats || D.SUBCATS_DEFAULT,
        onboardingDismissed: !!saved.onboardingDismissed,
        theme: saved.theme || "light",
      };
    }
    return {
      triage: D.SEED_TRIAGE,
      execLog: D.SEED_EXEC,
      companies: D.COMPANIES_DEFAULT,
      subcats: D.SUBCATS_DEFAULT,
      onboardingDismissed: false,
      theme: "light",
    };
  });

  // Sync master lists to legacy globals so existing screens see latest values during render
  D.COMPANIES = state.companies;
  D.SUBCATS = state.subcats;

  // Apply theme
  useEffect(() => {
    document.body.dataset.theme = state.theme || "light";
  }, [state.theme]);

  const toggleTheme = () => setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));

  useEffect(() => { L.saveState(state); }, [state]);

  const [route, setRoute] = useState(() => location.hash.replace("#", "") || "dashboard");
  useEffect(() => { location.hash = route; }, [route]);

  const [focusedTriageId, setFocusedTriageId] = useState(null);
  const [reportDate, setReportDate] = useState(L.todayKey());

  // Auto-archive: Done items older than 30 days slide to archive
  useEffect(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    let changed = false;
    const next = state.triage.map((t) => {
      if (t.status === "✅ Selesai" && t.completedAt) {
        if (L.parseDateKey(t.completedAt) < cutoff) {
          changed = true;
          return { ...t, status: "🗂️ Diarsip" };
        }
      }
      return t;
    });
    if (changed) setState((s) => ({ ...s, triage: next }));
  }, []);

  const openTaskFromTriage = (id) => { setFocusedTriageId(id); setRoute("triage"); };
  const clearFocused = () => setFocusedTriageId(null);

  // Find currently running activity (status = Berjalan)
  const runningEntry = state.execLog.find((e) => e.status === "Berjalan");
  // Compute elapsed minutes for running entry
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!runningEntry) return;
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, [runningEntry]);

  const runningElapsed = useMemo(() => {
    if (!runningEntry || !runningEntry.start) return 0;
    const d = new Date();
    const [sh, sm] = runningEntry.start.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const nowMins = d.getHours() * 60 + d.getMinutes();
    return Math.max(0, nowMins - startMins);
  }, [runningEntry, now]);

  const stopRunning = () => {
    if (!runningEntry) return;
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const dur = runningEntry.start ? Math.max(0, L.timeToMinutes(t) - L.timeToMinutes(runningEntry.start)) : 0;
    setState((s) => ({
      ...s,
      execLog: s.execLog.map((e) => e.id === runningEntry.id ? { ...e, end: t, duration: dur, status: "Selesai" } : e),
    }));
  };

  const screens = {
    dashboard: <Dashboard state={state} setState={setState} setRoute={setRoute} openTaskFromTriage={openTaskFromTriage} />,
    triage: <Triage state={state} setState={setState} focusedId={focusedTriageId} clearFocused={clearFocused} />,
    execution: <Execution state={state} setState={setState} />,
    report: <Report state={state} initialDate={reportDate} />,
    calendar: <CalendarScreen state={state} setState={setState} setRoute={setRoute} setReportDate={setReportDate} />,
    config: <Config state={state} setState={setState} />,
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: Icon.home },
    { key: "triage", label: "Triage", icon: Icon.inbox },
    { key: "execution", label: "Execution", icon: Icon.play },
    { key: "report", label: "Report", icon: Icon.report },
    { key: "calendar", label: "Kalender", icon: Icon.cal },
    { key: "config", label: "Config", icon: Icon.gear },
  ];

  return (
    <div className="wo-app">
      <aside className="wo-sidebar">
        <div className="wo-brand">
          <div className="wo-brand-mark">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="7" fill="#18181B"/>
              <path d="M9 11l4 10h2.5l3-7 3 7H24l-4-10h-2.5l-3 7-3-7z" fill="#FAFAF7"/>
            </svg>
          </div>
          <div className="wo-brand-text">
            <strong>Ican's Work OS</strong>
            <span>Productivity command center</span>
          </div>
        </div>

        <nav className="wo-nav">
          {navItems.map((item) => (
            <button key={item.key} className={classes("wo-nav-item", route === item.key && "is-active")} onClick={() => setRoute(item.key)}>
              <span className="wo-nav-icon">{item.icon}</span>
              <span className="wo-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {runningEntry && (
          <div className="wo-running-side">
            <div className="wo-running-side-head">
              <span className="wo-running-pulse"></span>
              <span>Sedang berjalan</span>
            </div>
            <div className="wo-running-side-task">{runningEntry.task || `${runningEntry.company} · ${runningEntry.category}`}</div>
            <div className="wo-running-side-meta">
              <span className="wo-running-elapsed">⏱ {L.minutesToHM(runningElapsed)}</span>
              <button className="wo-running-stop" onClick={stopRunning}>■ Stop</button>
            </div>
          </div>
        )}

        <button className="wo-theme-toggle" onClick={toggleTheme} title="Ganti tema">
          {state.theme === "dark" ? "☀ Light mode" : "🌙 Dark mode"}
        </button>
      </aside>

      <main className="wo-main">
        {runningEntry && (
          <div className="wo-running-banner" onClick={() => setRoute("execution")}>
            <span className="wo-running-pulse"></span>
            <div className="wo-running-banner-text">
              <strong>{runningEntry.task || `${runningEntry.company} · ${runningEntry.category}`}</strong>
              <span>Mulai {runningEntry.start} · berjalan {L.minutesToHM(runningElapsed)}</span>
            </div>
            <button className="wo-running-stop" onClick={(e) => { e.stopPropagation(); stopRunning(); }}>■ Stop</button>
          </div>
        )}
        {screens[route] || screens.dashboard}
      </main>

      <nav className="wo-bottom-nav">
        {navItems.map((item) => (
          <button key={item.key} className={classes("wo-bn-item", route === item.key && "is-active")} onClick={() => setRoute(item.key)}>
            <span className="wo-bn-icon">{item.icon}</span>
            <span className="wo-bn-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
