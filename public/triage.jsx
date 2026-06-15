// Triage / Brain Dump screen
// 3-column kanban: Dipikirkan → Dikerjakan → Selesai (Done)
// User explicitly asked: ketika selesai pindah ke kolom Done supaya tidak menumpuk.
function Triage({ state, setState, focusedId, clearFocused, onStartedWork }) {
  const { triage } = state;
  const L = window.WORKOS_LIB;
  const D = window.WORKOS_DATA;

  const [filterCo, setFilterCo] = useState("Semua");
  const [filterPri, setFilterPri] = useState("Semua");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (focusedId) {
      const t = triage.find((x) => x.id === focusedId);
      if (t) setEditing(t);
      clearFocused && clearFocused();
    }
  }, [focusedId]);

  const filtered = triage.filter((t) => {
    if (filterCo !== "Semua" && t.company !== filterCo) return false;
    if (filterPri !== "Semua" && t.priority !== filterPri) return false;
    if (search && !t.task.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cols = [
    { key: "🤔 Dipikirkan", label: "🤔 Dipikirkan", hint: "Yang perlu diputuskan" },
    { key: "🏃 Dikerjakan", label: "🏃 Dikerjakan", hint: "Sedang in progress" },
    { key: "✅ Selesai", label: "✅ Done", hint: "Tugas selesai (auto-pindah ke sini)" },
    { key: "🗂️ Diarsip", label: "🗂️ Arsip", hint: "Riwayat tugas lama" },
  ];

  const byCol = (key) => filtered.filter((t) => t.status === key);

  // Ensure a triage task in "Dikerjakan" has a matching Execution Log entry today.
  // Called whenever a task moves into Dikerjakan (via Mulai button OR edit modal).
  // Creates entry with status "Belum" — user presses ▶ Play when ready to start.
  const ensureExecutionEntry = (task) => {
    const today = L.todayKey();
    const existing = state.execLog.find((e) => e.triageId === task.id && e.date === today);
    if (existing) return; // already created today

    const newExec = {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      triageId: task.id,
      date: today,
      start: "",
      end: "",
      duration: 0,
      company: task.company || "",
      category: task.category || "",
      task: task.task,
      status: "Belum",
      note: task.note || "",
      isMeeting: !!task.isMeeting,
    };
    setState((s) => ({ ...s, execLog: [...s.execLog, newExec] }));
  };

  const setStatus = (id, status) => {
    const task = state.triage.find((t) => t.id === id);
    if (!task) return;
    const wasDikerjakan = task.status === "🏃 Dikerjakan";

    setState((s) => ({
      ...s,
      triage: s.triage.map((t) => t.id === id
        ? { ...t, status, completedAt: status === "✅ Selesai" ? L.todayKey() : t.completedAt }
        : t),
    }));

    if (status === "🏃 Dikerjakan" && !wasDikerjakan) {
      ensureExecutionEntry(task);
      if (onStartedWork) setTimeout(() => onStartedWork(), 120);
    }
  };

  const toggleDone = (t) => {
    if (t.status === "✅ Selesai") setStatus(t.id, "🤔 Dipikirkan");
    else setStatus(t.id, "✅ Selesai");
  };

  const startWork = (id) => setStatus(id, "🏃 Dikerjakan");

  const deleteTask = (id) => {
    if (!confirm("Hapus tugas ini?")) return;
    setState((s) => ({ ...s, triage: s.triage.filter((t) => t.id !== id) }));
  };

  const archive = (id) => setStatus(id, "🗂️ Diarsip");

  const saveTask = (taskData) => {
    const existing = state.triage.find((t) => t.id === taskData.id);
    const wasNotDikerjakan = !existing || existing.status !== "🏃 Dikerjakan";
    const isNowDikerjakan = taskData.status === "🏃 Dikerjakan";

    setState((s) => {
      if (existing) return { ...s, triage: s.triage.map((t) => t.id === taskData.id ? taskData : t) };
      return { ...s, triage: [taskData, ...s.triage] };
    });

    // If user just moved this task into Dikerjakan via the edit modal, mirror to Execution
    if (isNowDikerjakan && wasNotDikerjakan) {
      ensureExecutionEntry(taskData);
      if (onStartedWork) setTimeout(() => onStartedWork(), 120);
    }
    setEditing(null);
  };

  const newTask = () => setEditing({
    id: `tr-${Date.now()}`, task: "", priority: "🟡 Sedang", status: "🤔 Dipikirkan",
    deadline: null, company: "", category: "", note: "", isMeeting: false,
  });

  const archivedCount = triage.filter((t) => t.status === "🗂️ Diarsip").length;
  const doneCount = triage.filter((t) => t.status === "✅ Selesai").length;

  // Mobile: show one column at a time
  const [activeCol, setActiveCol] = useState("🤔 Dipikirkan");

  return (
    <div className="wo-screen">
      <header className="wo-page-head">
        <div>
          <p className="wo-eyebrow">🧠 Brain Dump</p>
          <h1 className="wo-page-title">Triage</h1>
          <p className="wo-page-sub">Tulis dulu, pikir belakangan. Centang ✓ untuk pindahkan ke Done.</p>
        </div>
        <div className="wo-page-head-actions">
          <Btn variant="primary" size="sm" onClick={newTask}>{Icon.plus} <span>Tugas baru</span></Btn>
        </div>
      </header>

      <div className="wo-filter-bar">
        <Input placeholder="Cari tugas…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filterCo} onChange={(e) => setFilterCo(e.target.value)}>
          <option>Semua</option>
          {D.COMPANIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={filterPri} onChange={(e) => setFilterPri(e.target.value)}>
          <option>Semua</option>
          {D.PRIORITY.map((p) => <option key={p}>{p}</option>)}
        </Select>
      </div>

      {/* Mobile-only column tabs */}
      <div className="wo-kanban-tabs">
        {cols.map((c) => (
          <button
            key={c.key}
            className={classes("wo-kanban-tab", activeCol === c.key && "is-active")}
            onClick={() => setActiveCol(c.key)}
          >
            <span>{c.label}</span>
            <span className="wo-kanban-tab-count">{byCol(c.key).length}</span>
          </button>
        ))}
      </div>

      <div className="wo-kanban">
        {cols.map((col) => (
          <div key={col.key} className={classes("wo-kanban-col", activeCol !== col.key && "is-hidden-mobile")}>
            <header className="wo-kanban-head">
              <div>
                <h3>{col.label}</h3>
                <p>{col.hint}</p>
              </div>
              <span className="wo-kanban-count">{byCol(col.key).length}</span>
            </header>
            <div className="wo-kanban-list">
              {byCol(col.key).length === 0 ? (
                <div className="wo-kanban-empty">
                  {col.key === "✅ Selesai" ? "Belum ada yang selesai." : col.key === "🏃 Dikerjakan" ? "Tarik tugas ke sini saat mulai dikerjakan." : "Kosong."}
                </div>
              ) : (
                byCol(col.key).sort((a, b) => {
                  const pri = { "🔴 Tinggi": 0, "🟡 Sedang": 1, "🟢 Rendah": 2 };
                  return (pri[a.priority] ?? 3) - (pri[b.priority] ?? 3);
                }).map((t) => (
                  <TriageCard
                    key={t.id}
                    task={t}
                    onToggle={() => toggleDone(t)}
                    onStart={() => startWork(t.id)}
                    onEdit={() => setEditing(t)}
                    onDelete={() => deleteTask(t.id)}
                    onArchive={() => archive(t.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="wo-page-foot">
        <strong>{doneCount}</strong> tugas sudah pindah ke Done · <strong>{archivedCount}</strong> tugas diarsipkan.
        Done akan otomatis dibersihkan ke arsip setelah 30 hari.
      </p>

      {editing && (
        <TaskEditor task={editing} onSave={saveTask} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TriageCard({ task, onToggle, onStart, onEdit, onDelete, onArchive }) {
  const L = window.WORKOS_LIB;
  const done = task.status === "✅ Selesai";
  const deadlineSoon = task.deadline && (L.parseDateKey(task.deadline) - new Date()) / 86400000 < 3;

  const handleGcal = (e) => {
    e.stopPropagation();
    const baseDate = task.deadline ? L.parseDateKey(task.deadline) : new Date();
    const [sh, sm] = (task.meetingStart || "09:00").split(":").map(Number);
    const [eh, em] = (task.meetingEnd || "10:00").split(":").map(Number);
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), sh, sm);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), eh, em);
    const url = L.gcalUrl({
      title: task.task,
      start, end,
      details: `${task.note || ""}\n\nPerusahaan: ${task.company || "-"}\nKategori: ${task.category || "-"}`,
      location: "",
    });
    window.open(url, "_blank");
  };

  return (
    <div className={classes("wo-tcard", done && "is-done")}>
      <div className="wo-tcard-row">
        <button className={classes("wo-check", done && "is-done")} onClick={onToggle} aria-label="Tandai selesai" title={done ? "Tandai belum selesai" : "Tandai selesai (pindah ke Done)"}>
          {done && Icon.check}
        </button>
        <div className="wo-tcard-main" onClick={onEdit}>
          <h4 className="wo-tcard-title">{task.task}</h4>
          <div className="wo-tcard-meta">
            <PriorityBadge priority={task.priority} />
            {task.company && <CompanyBadge company={task.company} />}
            {task.category && <Badge color="neutral">{task.category}</Badge>}
            {task.isMeeting && <Badge color="blue">Meeting</Badge>}
            {task.deadline && (
              <span className={classes("wo-tcard-deadline", deadlineSoon && "is-soon")}>
                <span className="wo-tcard-deadline-icon">{Icon.clock}</span>
                <span>{L.formatDateShort(task.deadline)}</span>
              </span>
            )}
          </div>
          {task.note && <p className="wo-tcard-note">{task.note}</p>}
        </div>
      </div>
      <div className="wo-tcard-actions">
        {!done && task.status === "🤔 Dipikirkan" && (
          <button className="wo-tcard-action" onClick={onStart}>Mulai →</button>
        )}
        {task.isMeeting && !done && (
          <button className="wo-tcard-action wo-tcard-action-gcal" onClick={handleGcal}>
            {Icon.gcal} <span>Add to Google Calendar</span>
          </button>
        )}
        <div className="wo-tcard-actions-right">
          <IconBtn onClick={onEdit} title="Edit">{Icon.edit}</IconBtn>
          {!done && <IconBtn onClick={onArchive} title="Arsipkan">🗂️</IconBtn>}
          <IconBtn onClick={onDelete} title="Hapus" danger>{Icon.trash}</IconBtn>
        </div>
      </div>
    </div>
  );
}

function TaskEditor({ task, onSave, onClose }) {
  const D = window.WORKOS_DATA;
  const [form, setForm] = useState({ ...task });

  const subcats = form.company ? (D.SUBCATS[form.company] || []) : [];

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.task.trim()) { alert("Tulis dulu tugasnya."); return; }
    onSave(form);
  };

  return (
    <Modal open onClose={onClose} title={task.task ? "Edit tugas" : "Tugas baru"}>
      <div className="wo-form">
        <Field label="Tugas">
          <Textarea
            placeholder="Tulis dulu, pikir belakangan…"
            value={form.task}
            onChange={(e) => update("task", e.target.value)}
            rows={2}
            autoFocus
          />
        </Field>
        <div className="wo-form-row">
          <Field label="Prioritas">
            <Select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
              {D.PRIORITY.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
              {D.TRIAGE_STATUS.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="wo-form-row">
          <Field label="Perusahaan">
            <Select value={form.company || ""} onChange={(e) => update("company", e.target.value)}>
              <option value="">— Pilih —</option>
              {D.COMPANIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Kategori">
            <Select value={form.category || ""} onChange={(e) => update("category", e.target.value)} disabled={!form.company}>
              <option value="">— Pilih —</option>
              {subcats.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Deadline">
          <Input type="date" value={form.deadline || ""} onChange={(e) => update("deadline", e.target.value || null)} />
        </Field>
        <Field label="Catatan">
          <Textarea value={form.note || ""} onChange={(e) => update("note", e.target.value)} rows={3} placeholder="Catatan tambahan, langkah 1/ 2/ 3/ …" />
        </Field>
        <label className="wo-toggle">
          <input type="checkbox" checked={!!form.isMeeting} onChange={(e) => update("isMeeting", e.target.checked)} />
          <span>Ini meeting / acara — bisa dijadwalkan ke Google Calendar</span>
        </label>
        {form.isMeeting && (
          <div className="wo-form-row">
            <Field label="Jam mulai">
              <Input type="time" value={form.meetingStart || "09:00"} onChange={(e) => update("meetingStart", e.target.value)} />
            </Field>
            <Field label="Jam selesai">
              <Input type="time" value={form.meetingEnd || "10:00"} onChange={(e) => update("meetingEnd", e.target.value)} />
            </Field>
          </div>
        )}
        <div className="wo-form-actions">
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Simpan</Btn>
        </div>
      </div>
    </Modal>
  );
}

window.Triage = Triage;
