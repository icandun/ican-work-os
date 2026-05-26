// Execution Log — time-blocked actual work performed (per Excel sheet "Execution Log")
function Execution({ state, setState }) {
  const { execLog } = state;
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;

  const [viewDate, setViewDate] = useState(L.todayKey());
  const [editing, setEditing] = useState(null);
  const [stopPrompt, setStopPrompt] = useState(null);
  const [qsCompany, setQsCompany] = useState(state.companies[0] || "Tarda");
  const [qsCategory, setQsCategory] = useState((state.subcats[state.companies[0]] || [])[0] || "");
  const [qsTask, setQsTask] = useState("");

  const runningEntry = execLog.find((e) => e.status === "Berjalan");

  const startQuick = () => {
    if (!qsCategory) return alert("Pilih sub-kategori dulu.");
    if (runningEntry) {
      if (!confirm(`Masih ada aktivitas berjalan: "${runningEntry.task || runningEntry.category}". Stop dulu dan mulai yang baru?`)) return;
      // stop existing first
      const d = new Date();
      const stopT = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const dur = runningEntry.start ? Math.max(0, L.timeToMinutes(stopT) - L.timeToMinutes(runningEntry.start)) : 0;
      setState((s) => ({ ...s, execLog: s.execLog.map((e) => e.id === runningEntry.id ? { ...e, end: stopT, duration: dur, status: "Selesai" } : e) }));
    }
    const d = new Date();
    const start = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const newEntry = {
      id: `ex-${Date.now()}`, date: L.todayKey(),
      start, end: "", duration: 0,
      company: qsCompany, category: qsCategory, task: qsTask.trim() || "",
      status: "Berjalan", note: "", isMeeting: false,
    };
    setState((s) => ({ ...s, execLog: [...s.execLog, newEntry] }));
    setQsTask("");
    if (viewDate !== L.todayKey()) setViewDate(L.todayKey());
  };

  const updateQsCompany = (co) => {
    setQsCompany(co);
    setQsCategory((state.subcats[co] || [])[0] || "");
  };

  const dayLog = execLog
    .filter((e) => e.date === viewDate)
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

  const totalMin = dayLog.reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const completedMin = dayLog.filter((e) => e.status === "Selesai").reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const runningCount = dayLog.filter((e) => e.status === "Berjalan").length;

  const goDay = (n) => {
    const d = L.parseDateKey(viewDate);
    setViewDate(L.dateKey(L.addDays(d, n)));
  };

  const newEntry = () => setEditing({
    id: `ex-${Date.now()}`, date: viewDate,
    start: "", end: "", duration: 0,
    company: "Tarda", category: "Balas Chat", task: "",
    status: "Belum", note: "", isMeeting: false,
  });

  const saveEntry = (entry) => {
    let duration = entry.duration;
    if (entry.start && entry.end) {
      duration = Math.max(0, L.timeToMinutes(entry.end) - L.timeToMinutes(entry.start));
    }
    const final = { ...entry, duration };
    setState((s) => {
      const exists = s.execLog.find((x) => x.id === final.id);
      if (exists) return { ...s, execLog: s.execLog.map((x) => x.id === final.id ? final : x) };
      return { ...s, execLog: [...s.execLog, final] };
    });
    setEditing(null);
  };

  const deleteEntry = (id) => {
    if (!confirm("Hapus aktivitas?")) return;
    setState((s) => ({ ...s, execLog: s.execLog.filter((e) => e.id !== id) }));
  };

  const startNow = (id) => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setState((s) => ({
      ...s,
      execLog: s.execLog.map((e) => e.id === id ? { ...e, start: e.start || t, status: "Berjalan" } : e),
    }));
  };

  const stopNow = (id) => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const entry = execLog.find((e) => e.id === id);
    setState((s) => ({
      ...s,
      execLog: s.execLog.map((e) => {
        if (e.id !== id) return e;
        const dur = e.start ? Math.max(0, L.timeToMinutes(t) - L.timeToMinutes(e.start)) : 0;
        return { ...e, end: t, duration: dur, status: "Selesai" };
      }),
    }));
    // If this exec came from a Triage task, show a modal asking what to do with the triage task
    if (entry && entry.triageId) {
      setTimeout(() => setStopPrompt({ execEntry: entry }), 200);
    }
  };

  const handleStopChoice = (choice) => {
    const { execEntry } = stopPrompt;
    setStopPrompt(null);
    if (choice === "done") {
      setState((s) => ({
        ...s,
        triage: s.triage.map((tr) => tr.id === execEntry.triageId
          ? { ...tr, status: "✅ Selesai", completedAt: L.todayKey() }
          : tr),
      }));
    } else if (choice === "pause") {
      setState((s) => ({
        ...s,
        triage: s.triage.map((tr) => tr.id === execEntry.triageId
          ? { ...tr, status: "🤔 Dipikirkan" }
          : tr),
      }));
    }
    // "stay" → do nothing, task remains in Dikerjakan
  };

  const isToday = viewDate === L.todayKey();

  return (
    <div className="wo-screen">
      <header className="wo-page-head">
        <div>
          <p className="wo-eyebrow">⏱ Time Blocking</p>
          <h1 className="wo-page-title">Execution Log</h1>
          <p className="wo-page-sub">Catat apa yang kamu kerjakan beserta durasinya. Pakai Quick Start untuk timer otomatis, atau "Aktivitas baru" untuk isi manual.</p>
        </div>
        <div className="wo-page-head-actions">
          <Btn variant="ghost" size="sm" onClick={newEntry}>{Icon.plus} <span>Manual</span></Btn>
        </div>
      </header>

      <div className={classes("wo-quickstart", runningEntry && "is-running")}>
        <div className="wo-quickstart-head">
          <span className="wo-quickstart-icon">{Icon.play2}</span>
          <div>
            <h3>Mulai aktivitas sekarang</h3>
            <p>Pilih kategori, ketik tugas, klik Mulai. Jam start dicatat otomatis. Klik Stop saat selesai → durasi dihitung sendiri.</p>
          </div>
        </div>
        <div className="wo-quickstart-form">
          <Select value={qsCompany} onChange={(e) => updateQsCompany(e.target.value)}>
            {state.companies.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select value={qsCategory} onChange={(e) => setQsCategory(e.target.value)}>
            <option value="">— Sub-Kategori —</option>
            {(state.subcats[qsCompany] || []).map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Input
            placeholder="Apa yang dikerjakan? (mis. Sapa pelanggan pagi)"
            value={qsTask}
            onChange={(e) => setQsTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startQuick()}
          />
          <Btn variant="primary" onClick={startQuick} disabled={!qsCategory}>
            {Icon.play2} <span>▶ Mulai</span>
          </Btn>
        </div>
      </div>

      <div className="wo-day-nav">
        <IconBtn onClick={() => goDay(-1)} title="Hari sebelumnya">{Icon.arrowL}</IconBtn>
        <div className="wo-day-nav-center">
          <div className="wo-day-nav-date">{L.formatDateLong(viewDate)}</div>
          <input type="date" className="wo-day-nav-input" value={viewDate} onChange={(e) => setViewDate(e.target.value)} />
        </div>
        <IconBtn onClick={() => goDay(1)} title="Hari berikutnya">{Icon.arrowR}</IconBtn>
        {!isToday && <Btn variant="ghost" size="sm" onClick={() => setViewDate(L.todayKey())}>Hari ini</Btn>}
      </div>

      <div className="wo-kpi-grid">
        <KpiCard label="Aktivitas" value={dayLog.length} unit="entri" />
        <KpiCard label="Total durasi" value={L.minutesToHM(totalMin)} unit="" tone="dark" />
        <KpiCard label="Selesai" value={L.minutesToHM(completedMin)} unit="" tone="prib" />
        <KpiCard label="Sedang berjalan" value={runningCount} unit="aktivitas" tone={runningCount > 0 ? "tarda" : "default"} />
      </div>

      <Card title="Timeline aktivitas" noPad>
        {dayLog.length === 0 ? (
          <Empty icon="·" title="Belum ada aktivitas hari ini" hint="Klik 'Aktivitas baru' untuk mulai mencatat." />
        ) : (
          <div className="wo-tl-wrap">
            <div className="wo-tl">
              {dayLog.map((e) => (
                <ExecRow key={e.id} entry={e} onEdit={() => setEditing(e)} onDelete={() => deleteEntry(e.id)} onStart={() => startNow(e.id)} onStop={() => stopNow(e.id)} />
              ))}
            </div>
          </div>
        )}
      </Card>

      {editing && <ExecEditor entry={editing} onSave={saveEntry} onClose={() => setEditing(null)} />}

      {stopPrompt && (
        <Modal open onClose={() => setStopPrompt(null)} title="Aktivitas selesai">
          <div className="wo-stop-prompt">
            <p className="wo-stop-prompt-task">
              <span className="wo-eyebrow">Tugas dari Triage</span>
              <strong>{stopPrompt.execEntry.task}</strong>
            </p>
            <p className="wo-stop-prompt-question">Apa status tugas ini sekarang di Triage?</p>
            <div className="wo-stop-prompt-options">
              <button className="wo-stop-prompt-opt is-done" onClick={() => handleStopChoice("done")}>
                <span className="wo-stop-prompt-opt-icon">✅</span>
                <strong>Selesai</strong>
                <span>Pindahkan ke kolom Done</span>
              </button>
              <button className="wo-stop-prompt-opt is-pause" onClick={() => handleStopChoice("pause")}>
                <span className="wo-stop-prompt-opt-icon">⏸</span>
                <strong>Belum selesai, jeda dulu</strong>
                <span>Balikkan ke Dipikirkan</span>
              </button>
              <button className="wo-stop-prompt-opt is-stay" onClick={() => handleStopChoice("stay")}>
                <span className="wo-stop-prompt-opt-icon">🏃</span>
                <strong>Lanjut nanti</strong>
                <span>Tetap di Dikerjakan</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExecRow({ entry: e, onEdit, onDelete, onStart, onStop }) {
  const L = window.WORKOS_LIB;
  const running = e.status === "Berjalan";
  const notStarted = e.status === "Belum";

  const handleGcal = () => {
    if (!e.start) return alert("Set jam mulai dulu.");
    const date = L.parseDateKey(e.date);
    const [sh, sm] = e.start.split(":").map(Number);
    const endTime = e.end || (() => {
      const t = new Date(); t.setHours(sh + 1, sm);
      return `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
    })();
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), sh, sm);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), eh, em);
    const url = L.gcalUrl({
      title: e.task || `${e.company} · ${e.category}`,
      start, end,
      details: `Perusahaan: ${e.company}\nKategori: ${e.category}\n${e.note || ""}`,
      location: "",
    });
    window.open(url, "_blank");
  };

  return (
    <div className={classes("wo-tl-row", running && "is-running", notStarted && "is-pending")} data-co={e.company}>
      <div className="wo-tl-time">
        <div className="wo-tl-time-start">{e.start || "—"}</div>
        <div className="wo-tl-time-arrow">↓</div>
        <div className="wo-tl-time-end">{e.end || (running ? "…" : "—")}</div>
        <div className="wo-tl-time-dur">{L.minutesToHM(e.duration) || "—"}</div>
      </div>
      <div className="wo-tl-bar" data-co={e.company}>
        <div className="wo-tl-bar-fill" />
      </div>
      <div className="wo-tl-main" onClick={onEdit}>
        <div className="wo-tl-task">{e.task || <span className="wo-muted">Tanpa judul</span>}</div>
        <div className="wo-tl-meta">
          <CompanyBadge company={e.company} />
          <Badge color="neutral">{e.category}</Badge>
          <StatusPill status={e.status} />
          {e.note && <span className="wo-tl-note">📝 {e.note}</span>}
        </div>
      </div>
      <div className="wo-tl-actions">
        {notStarted && <Btn variant="primary" size="sm" onClick={onStart}>▶ Mulai</Btn>}
        {running && <Btn variant="dark" size="sm" onClick={onStop}>■ Stop</Btn>}
        {e.isMeeting && <IconBtn onClick={handleGcal} title="Add to Google Calendar">{Icon.gcal}</IconBtn>}
        <IconBtn onClick={onEdit} title="Edit">{Icon.edit}</IconBtn>
        <IconBtn onClick={onDelete} title="Hapus" danger>{Icon.trash}</IconBtn>
      </div>
    </div>
  );
}

function ExecEditor({ entry, onSave, onClose }) {
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;
  const [form, setForm] = useState({ ...entry });
  const subcats = D.SUBCATS[form.company] || [];

  const update = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === "company") next.category = D.SUBCATS[v]?.[0] || "";
    if ((k === "start" || k === "end") && next.start && next.end) {
      next.duration = Math.max(0, L.timeToMinutes(next.end) - L.timeToMinutes(next.start));
    }
    return next;
  });

  const submit = () => {
    if (!form.start) return alert("Jam mulai wajib diisi.");
    onSave(form);
  };

  return (
    <Modal open onClose={onClose} title={entry.task ? "Edit aktivitas" : "Aktivitas baru"}>
      <div className="wo-form">
        <Field label="Tanggal">
          <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
        </Field>
        <div className="wo-form-row">
          <Field label="Mulai">
            <Input type="time" value={form.start || ""} onChange={(e) => update("start", e.target.value)} />
          </Field>
          <Field label="Selesai">
            <Input type="time" value={form.end || ""} onChange={(e) => update("end", e.target.value)} />
          </Field>
          <Field label="Durasi (mnt)">
            <Input type="number" value={form.duration || 0} onChange={(e) => update("duration", Number(e.target.value))} />
          </Field>
        </div>
        <div className="wo-form-row">
          <Field label="Perusahaan">
            <Select value={form.company} onChange={(e) => update("company", e.target.value)}>
              {D.COMPANIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Sub-Kategori">
            <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
              {subcats.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Tugas">
          <Input value={form.task || ""} onChange={(e) => update("task", e.target.value)} placeholder="Apa yang dikerjakan?" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
            {D.EXEC_STATUS.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Catatan">
          <Textarea value={form.note || ""} onChange={(e) => update("note", e.target.value)} rows={2} />
        </Field>
        <label className="wo-toggle">
          <input type="checkbox" checked={!!form.isMeeting} onChange={(e) => update("isMeeting", e.target.checked)} />
          <span>Ini meeting (tampilkan tombol Google Calendar)</span>
        </label>
        <div className="wo-form-actions">
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={submit}>Simpan</Btn>
        </div>
      </div>
    </Modal>
  );
}

window.Execution = Execution;
