// Config screen: master lists for Perusahaan & Sub-Kategori
// User can add/edit/delete without touching code.
function Config({ state, setState }) {
  const D = window.WORKOS_DATA;
  const [newCo, setNewCo] = useState("");
  const [addingSubFor, setAddingSubFor] = useState(null);
  const [newSubName, setNewSubName] = useState("");

  const addCompany = () => {
    const name = newCo.trim();
    if (!name) return;
    if (state.companies.includes(name)) { alert(`"${name}" sudah ada.`); return; }
    setState((s) => ({
      ...s,
      companies: [...s.companies, name],
      subcats: { ...s.subcats, [name]: [] },
    }));
    setNewCo("");
  };

  const renameCompany = (oldName) => {
    const name = prompt(`Ganti nama "${oldName}" jadi:`, oldName);
    if (!name || name === oldName) return;
    if (state.companies.includes(name)) { alert(`"${name}" sudah ada.`); return; }
    setState((s) => {
      const subcats = { ...s.subcats };
      subcats[name] = subcats[oldName];
      delete subcats[oldName];
      return {
        ...s,
        companies: s.companies.map((c) => c === oldName ? name : c),
        subcats,
        triage: s.triage.map((t) => t.company === oldName ? { ...t, company: name } : t),
        execLog: s.execLog.map((e) => e.company === oldName ? { ...e, company: name } : e),
      };
    });
  };

  const deleteCompany = (co) => {
    const usedTr = state.triage.filter((t) => t.company === co).length;
    const usedEx = state.execLog.filter((e) => e.company === co).length;
    const msg = `Hapus perusahaan "${co}"? ${(usedTr + usedEx) > 0 ? `\n\n⚠ Dipakai oleh ${usedTr} tugas Triage & ${usedEx} aktivitas. Data tersebut akan kehilangan label perusahaan.` : ""}`;
    if (!confirm(msg)) return;
    setState((s) => {
      const subcats = { ...s.subcats };
      delete subcats[co];
      return {
        ...s,
        companies: s.companies.filter((c) => c !== co),
        subcats,
        triage: s.triage.map((t) => t.company === co ? { ...t, company: "" } : t),
        execLog: s.execLog.map((e) => e.company === co ? { ...e, company: "" } : e),
      };
    });
  };

  const addSub = (co) => {
    const name = newSubName.trim();
    if (!name) return;
    const existing = state.subcats[co] || [];
    if (existing.includes(name)) { alert(`"${name}" sudah ada di ${co}.`); return; }
    setState((s) => ({
      ...s,
      subcats: { ...s.subcats, [co]: [...(s.subcats[co] || []), name] },
    }));
    setNewSubName("");
    setAddingSubFor(null);
  };

  const renameSub = (co, oldName) => {
    const name = prompt(`Ganti nama sub-kategori "${oldName}" (${co}) jadi:`, oldName);
    if (!name || name === oldName) return;
    if ((state.subcats[co] || []).includes(name)) { alert(`"${name}" sudah ada.`); return; }
    setState((s) => ({
      ...s,
      subcats: { ...s.subcats, [co]: s.subcats[co].map((x) => x === oldName ? name : x) },
      triage: s.triage.map((t) => (t.company === co && t.category === oldName) ? { ...t, category: name } : t),
      execLog: s.execLog.map((e) => (e.company === co && e.category === oldName) ? { ...e, category: name } : e),
    }));
  };

  const deleteSub = (co, sub) => {
    const usedTr = state.triage.filter((t) => t.company === co && t.category === sub).length;
    const usedEx = state.execLog.filter((e) => e.company === co && e.category === sub).length;
    const msg = `Hapus sub-kategori "${sub}" dari ${co}? ${(usedTr + usedEx) > 0 ? `\n\n⚠ Dipakai oleh ${usedTr} tugas Triage & ${usedEx} aktivitas. Label kategorinya akan dikosongkan.` : ""}`;
    if (!confirm(msg)) return;
    setState((s) => ({
      ...s,
      subcats: { ...s.subcats, [co]: (s.subcats[co] || []).filter((x) => x !== sub) },
      triage: s.triage.map((t) => (t.company === co && t.category === sub) ? { ...t, category: "" } : t),
      execLog: s.execLog.map((e) => (e.company === co && e.category === sub) ? { ...e, category: "" } : e),
    }));
  };

  return (
    <div className="wo-screen">
      <header className="wo-page-head">
        <div>
          <p className="wo-eyebrow">⚙ Master Lists</p>
          <h1 className="wo-page-title">Config</h1>
          <p className="wo-page-sub">Tambah, ganti nama, atau hapus Perusahaan & Sub-Kategori. Perubahan langsung dipakai di Triage, Execution Log, dan Report.</p>
        </div>
      </header>

      <Card title="🏢 Perusahaan">
        <div className="wo-cfg-list">
          {state.companies.map((co) => {
            const subCount = (state.subcats[co] || []).length;
            const usedTr = state.triage.filter((t) => t.company === co).length;
            const usedEx = state.execLog.filter((e) => e.company === co).length;
            return (
              <div key={co} className="wo-cfg-row">
                <div className="wo-cfg-row-main">
                  <CompanyBadge company={co} />
                  <span className="wo-cfg-stat">{subCount} sub-kategori · {usedTr} tugas · {usedEx} aktivitas</span>
                </div>
                <div className="wo-cfg-row-actions">
                  <IconBtn onClick={() => renameCompany(co)} title="Ganti nama">{Icon.edit}</IconBtn>
                  <IconBtn onClick={() => deleteCompany(co)} title="Hapus" danger>{Icon.trash}</IconBtn>
                </div>
              </div>
            );
          })}
        </div>
        <div className="wo-cfg-add">
          <Input
            placeholder="Nama perusahaan baru… (contoh: Konsultan Pribadi)"
            value={newCo}
            onChange={(e) => setNewCo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCompany()}
          />
          <Btn variant="primary" onClick={addCompany}>{Icon.plus} Tambah</Btn>
        </div>
      </Card>

      <Card title="📂 Sub-Kategori per Perusahaan">
        <div className="wo-cfg-groups">
          {state.companies.map((co) => (
            <div key={co} className="wo-cfg-group">
              <header className="wo-cfg-group-head">
                <CompanyBadge company={co} />
                <span className="wo-cfg-stat">{(state.subcats[co] || []).length} sub-kategori</span>
              </header>
              <div className="wo-cfg-subs">
                {(state.subcats[co] || []).map((sub) => (
                  <div key={sub} className="wo-cfg-sub">
                    <span>{sub}</span>
                    <div className="wo-cfg-sub-actions">
                      <button className="wo-cfg-sub-btn" onClick={() => renameSub(co, sub)} title="Ganti nama">{Icon.edit}</button>
                      <button className="wo-cfg-sub-btn danger" onClick={() => deleteSub(co, sub)} title="Hapus">{Icon.trash}</button>
                    </div>
                  </div>
                ))}
                {addingSubFor === co ? (
                  <div className="wo-cfg-add-inline">
                    <Input
                      autoFocus
                      placeholder={`Sub-kategori baru untuk ${co}…`}
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addSub(co);
                        if (e.key === "Escape") { setAddingSubFor(null); setNewSubName(""); }
                      }}
                    />
                    <Btn variant="primary" size="sm" onClick={() => addSub(co)}>Simpan</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => { setAddingSubFor(null); setNewSubName(""); }}>Batal</Btn>
                  </div>
                ) : (
                  <button className="wo-cfg-add-pill" onClick={() => { setAddingSubFor(co); setNewSubName(""); }}>
                    {Icon.plus} Tambah sub-kategori
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <BackupSection state={state} setState={setState} />

      <CloudSyncSection />

      <Card title="🔧 Lainnya">
        <div className="wo-cfg-misc">
          <div className="wo-cfg-misc-row">
            <div>
              <strong>Tema tampilan</strong>
              <p className="wo-eyebrow">Aktif: <strong>{state.theme === "dark" ? "Dark mode 🌙" : "Light mode ☀"}</strong></p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}>
              Pakai {state.theme === "dark" ? "Light" : "Dark"} mode
            </Btn>
          </div>
          <div className="wo-cfg-misc-row">
            <div>
              <strong>Reset master list ke default</strong>
              <p className="wo-eyebrow">Kembalikan Perusahaan & Sub-Kategori ke nilai awal dari Excel.</p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => {
              if (!confirm("Reset master list ke default? Data Triage & Execution tetap aman.")) return;
              setState((s) => ({ ...s, companies: D.COMPANIES_DEFAULT, subcats: D.SUBCATS_DEFAULT }));
            }}>Reset master list</Btn>
          </div>
          <div className="wo-cfg-misc-row">
            <div>
              <strong>Reset seluruh data ke seed</strong>
              <p className="wo-eyebrow">Hapus semua tugas & aktivitas, kembalikan data contoh.</p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => {
              if (!confirm("Hapus semua data dan kembalikan ke seed? Tidak bisa di-undo.")) return;
              window.WORKOS_LIB.clearState();
              location.reload();
            }}>Reset semua</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

window.Config = Config;

function CloudSyncSection() {
  return (
    <Card title="☁ Sync otomatis">
      <div className="wo-gdrive">
        <p className="wo-gdrive-intro">
          Sync sekarang memakai login Google di tombol kanan atas. Setelah login, data Work OS disimpan ke cloud dan otomatis tersedia di HP/MacBook dengan akun Google yang sama.
        </p>
        <p className="wo-gdrive-note">
          Export/Import di bawah tetap disimpan sebagai backup manual cadangan.
        </p>
      </div>
    </Card>
  );
}

function BackupSection({ state, setState }) {
  const L = window.WORKOS_LIB;
  const [mode, setMode] = useState(null); // null | 'export' | 'import'
  const [code, setCode] = useState("");
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);

  const dataCounts = {
    triage: state.triage?.length || 0,
    execLog: state.execLog?.length || 0,
    lastModified: state._lastModified,
  };

  const buildPayload = () => {
    const payload = {
      triage: state.triage,
      execLog: state.execLog,
      companies: state.companies,
      subcats: state.subcats,
      theme: state.theme,
      _exportedAt: Date.now(),
      _version: 1,
    };
    return JSON.stringify(payload);
  };

  const openExport = () => {
    const json = buildPayload();
    // Encode to base64 for safer copy-paste (no special chars to mess things up)
    const b64 = btoa(unescape(encodeURIComponent(json)));
    setCode(`WORKOS:${b64}`);
    setMode("export");
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback: select the textarea text
      const ta = document.getElementById("wo-export-textarea");
      if (ta) { ta.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }
  };

  const handleDownload = () => {
    const json = buildPayload();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = L.todayKey();
    a.href = url;
    a.download = `workos-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseImport = (raw) => {
    let text = raw.trim();
    if (text.startsWith("WORKOS:")) {
      text = text.slice(7).trim();
      try { text = decodeURIComponent(escape(atob(text))); }
      catch (e) { throw new Error("Kode tidak valid atau rusak."); }
    }
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error("Data tidak bisa dibaca (bukan format yang benar)."); }
    if (!data.triage || !Array.isArray(data.triage) || !data.execLog || !Array.isArray(data.execLog)) {
      throw new Error("Data tidak lengkap (tidak ada Triage/Execution).");
    }
    return data;
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseImport(String(reader.result));
        confirmImport(data);
      } catch (err) {
        alert("Gagal: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting same file
  };

  const handleImportPaste = () => {
    if (!pasted.trim()) return alert("Paste data dulu.");
    try {
      const data = parseImport(pasted);
      confirmImport(data);
    } catch (err) {
      alert("Gagal: " + err.message);
    }
  };

  const confirmImport = (data) => {
    const fmt = (t) => t ? new Date(t).toLocaleString("id-ID") : "—";
    const ok = confirm(
      `Data yang akan diimport:\n` +
      `• ${data.triage.length} tugas\n` +
      `• ${data.execLog.length} aktivitas\n` +
      `• Export: ${fmt(data._exportedAt)}\n\n` +
      `Data device ini sekarang:\n` +
      `• ${dataCounts.triage} tugas\n` +
      `• ${dataCounts.execLog} aktivitas\n` +
      `• Modif terakhir: ${fmt(dataCounts.lastModified)}\n\n` +
      `[OK] = TIMPA semua data dengan import\n` +
      `[Cancel] = Batal`
    );
    if (!ok) return;
    setState((s) => ({
      ...s,
      triage: data.triage,
      execLog: data.execLog,
      companies: data.companies || s.companies,
      subcats: data.subcats || s.subcats,
      theme: data.theme || s.theme,
      _lastModified: Date.now(),
    }));
    setMode(null);
    setPasted("");
    alert("✓ Data berhasil diimport!");
  };

  return (
    <Card title="🔄 Sync Antar Device — Cara Mudah">
      <div className="wo-backup">
        <p className="wo-backup-intro">
          Pindahkan data dari laptop ke HP (atau sebaliknya) lewat kode atau file. Tinggal <strong>Export</strong> di satu device → <strong>Import</strong> di device lain.
        </p>

        <div className="wo-backup-stats">
          <div className="wo-backup-stat">
            <span className="wo-eyebrow">Data saat ini</span>
            <strong>{dataCounts.triage} tugas · {dataCounts.execLog} aktivitas</strong>
          </div>
        </div>

        <div className="wo-backup-actions">
          <Btn variant="primary" onClick={openExport}>📤 Export</Btn>
          <Btn variant="dark" onClick={() => { setMode("import"); setPasted(""); }}>📥 Import</Btn>
        </div>

        {mode === "export" && (
          <Modal open onClose={() => setMode(null)} title="📤 Export data" wide>
            <div className="wo-backup-modal">
              <p>Pilih salah satu cara untuk pindahin ke device lain:</p>

              <div className="wo-backup-option">
                <div className="wo-backup-option-head">
                  <h4>Cara 1: Copy kode → kirim ke HP via WhatsApp / Email / Notes</h4>
                </div>
                <textarea
                  id="wo-export-textarea"
                  className="wo-input wo-textarea wo-backup-code"
                  value={code}
                  readOnly
                  rows={5}
                  onClick={(e) => e.target.select()}
                />
                <Btn variant="primary" onClick={handleCopy}>
                  {copied ? "✓ Tersalin!" : "📋 Copy ke clipboard"}
                </Btn>
                <p className="wo-backup-hint">Di device tujuan: buka Config → Import → paste di kotak.</p>
              </div>

              <div className="wo-backup-divider">— atau —</div>

              <div className="wo-backup-option">
                <div className="wo-backup-option-head">
                  <h4>Cara 2: Download file backup (.json)</h4>
                </div>
                <Btn variant="dark" onClick={handleDownload}>💾 Download file</Btn>
                <p className="wo-backup-hint">Cocok untuk backup arsip. Transfer file ke device lain (AirDrop/email/cloud drive) → Import.</p>
              </div>
            </div>
          </Modal>
        )}

        {mode === "import" && (
          <Modal open onClose={() => setMode(null)} title="📥 Import data" wide>
            <div className="wo-backup-modal">
              <div className="wo-backup-warning">
                ⚠ Data device ini ({dataCounts.triage} tugas + {dataCounts.execLog} aktivitas) akan <strong>diganti</strong> dengan data import.
              </div>

              <div className="wo-backup-option">
                <div className="wo-backup-option-head">
                  <h4>Cara 1: Paste kode</h4>
                </div>
                <textarea
                  className="wo-input wo-textarea"
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="Paste kode yang dimulai dengan WORKOS:… di sini"
                  rows={5}
                  autoFocus
                />
                <Btn variant="primary" onClick={handleImportPaste} disabled={!pasted.trim()}>📥 Import dari kode</Btn>
              </div>

              <div className="wo-backup-divider">— atau —</div>

              <div className="wo-backup-option">
                <div className="wo-backup-option-head">
                  <h4>Cara 2: Pilih file backup (.json)</h4>
                </div>
                <label className="wo-backup-file">
                  <input type="file" accept=".json,application/json" onChange={handleImportFile} hidden />
                  <span>📁 Pilih file…</span>
                </label>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Card>
  );
}
