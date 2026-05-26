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

      <GoogleDriveSection state={state} setState={setState} />

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

function GoogleDriveSection({ state, setState }) {
  const sync = window.WORKOS_SYNC;
  const [snap, setSnap] = useState(sync.snapshot());
  const [clientIdInput, setClientIdInput] = useState(sync.clientId);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => sync.on(setSnap), []);

  const handleSaveClientId = async () => {
    const id = clientIdInput.trim();
    if (!id) return;
    await sync.setup(id);
  };

  const handleConnect = async () => {
    try {
      await sync.connect();
      const driveData = await sync.download();
      if (driveData) {
        const driveTime = driveData._syncedAt || 0;
        const localTime = state._lastModified || 0;
        const fmt = (t) => t ? new Date(t).toLocaleString("id-ID") : "—";
        const choice = confirm(
          `Data sudah ada di Google Drive Anda:\n` +
          `• ${driveData.triage?.length || 0} tugas, ${driveData.execLog?.length || 0} aktivitas\n` +
          `• Sync terakhir: ${fmt(driveTime)}\n\n` +
          `Data di device ini:\n` +
          `• ${state.triage?.length || 0} tugas, ${state.execLog?.length || 0} aktivitas\n` +
          `• Modif terakhir: ${fmt(localTime)}\n\n` +
          `[OK] = Pakai data DRIVE (timpa data device ini)\n` +
          `[Cancel] = Pakai data DEVICE INI (timpa Drive)`
        );
        if (choice) {
          const { _syncedAt, _lastModified, ...rest } = driveData;
          setState((s) => ({ ...s, ...rest, _lastModified: driveTime }));
        } else {
          await sync.upload({ ...state, _lastModified: Date.now() });
        }
      } else {
        await sync.upload({ ...state, _lastModified: Date.now() });
      }
    } catch (e) {
      alert("Gagal connect: " + (e.error_description || e.error || e.message || JSON.stringify(e)));
    }
  };

  const handleDisconnect = () => {
    if (!confirm("Disconnect dari Google Drive? Data lokal tetap aman.")) return;
    sync.disconnect();
  };

  const handleResetClientId = () => {
    if (!confirm("Hapus Client ID? Anda perlu paste lagi untuk pakai sync.")) return;
    sync.clearClientId();
    setClientIdInput("");
  };

  const handleSyncNow = async () => {
    try {
      await sync.upload({ ...state, _lastModified: Date.now() });
    } catch (e) {
      alert("Sync gagal: " + (e.message || JSON.stringify(e)));
    }
  };

  const isConnected = snap.status === "connected" || snap.status === "syncing";
  const hasClientId = !!snap.clientId;
  const fmtRel = (t) => {
    if (!t) return "belum pernah";
    const diff = (Date.now() - t) / 1000;
    if (diff < 60) return "barusan";
    if (diff < 3600) return `${Math.floor(diff/60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff/3600)} jam lalu`;
    return new Date(t).toLocaleString("id-ID");
  };

  return (
    <Card title="☁ Sync via Google Drive">
      <div className="wo-gdrive">
        <p className="wo-gdrive-intro">
          Sync data antar device (HP ↔ laptop) lewat Google Drive Anda. Data disimpan di area <strong>App Data</strong> private — <strong>tidak kelihatan di Drive normal Anda</strong>, hanya app ini yang bisa akses.
        </p>

        {!hasClientId && (
          <>
            <Field label="Google OAuth Client ID" hint="Tempel Client ID dari Google Cloud Console (lihat panduan di bawah).">
              <Input
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="123456789-abc...apps.googleusercontent.com"
              />
            </Field>
            <div className="wo-gdrive-actions">
              <Btn variant="primary" onClick={handleSaveClientId} disabled={!clientIdInput.trim()}>Simpan Client ID</Btn>
            </div>
          </>
        )}

        {hasClientId && !isConnected && (
          <>
            <p className="wo-gdrive-status">
              <span className="wo-status-dot is-off"></span>
              Client ID sudah disimpan, belum login Google.
            </p>
            <div className="wo-gdrive-actions">
              <Btn variant="primary" onClick={handleConnect}>🔗 Login & Connect Google Drive</Btn>
              <Btn variant="ghost" size="sm" onClick={handleResetClientId}>Ganti Client ID</Btn>
            </div>
            {snap.errorMsg && <p className="wo-gdrive-error">⚠ {snap.errorMsg}</p>}
          </>
        )}

        {isConnected && (
          <>
            <p className="wo-gdrive-status">
              <span className={classes("wo-status-dot", snap.status === "syncing" ? "is-syncing" : "is-on")}></span>
              <strong>{snap.status === "syncing" ? "Sedang sync…" : "Tersambung ke Google Drive"}</strong>
              <span className="wo-eyebrow"> · Sync terakhir: {fmtRel(snap.lastSyncedAt)}</span>
            </p>
            <p className="wo-gdrive-note">Data otomatis sync setiap ada perubahan (±3 detik delay).</p>
            <div className="wo-gdrive-actions">
              <Btn variant="primary" size="sm" onClick={handleSyncNow}>Sync sekarang</Btn>
              <Btn variant="ghost" size="sm" onClick={handleDisconnect}>Disconnect</Btn>
            </div>
          </>
        )}

        <details className="wo-gdrive-help-wrap" open={!hasClientId && showHelp}>
          <summary onClick={(e) => { e.preventDefault(); setShowHelp(!showHelp); }}>
            {showHelp ? "▼" : "▶"} Cara dapat Google OAuth Client ID (gratis, sekali setup ±5 menit)
          </summary>
          {showHelp && <GoogleSetupHelp />}
        </details>
      </div>
    </Card>
  );
}

function GoogleSetupHelp() {
  const url = location.origin;
  return (
    <div className="wo-gdrive-help">
      <p className="wo-gdrive-help-intro">
        Ini sekali aja. Buka di laptop biar gampang copy-paste.
      </p>
      <ol>
        <li>Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com</a>, login pakai akun Google yang Anda mau pakai untuk sync.</li>
        <li>Di atas, klik dropdown project → <strong>NEW PROJECT</strong> → Project name: <code>Ican Work OS</code> → <strong>CREATE</strong>. Tunggu sebentar, lalu pilih project itu.</li>
        <li>Menu kiri (☰) → <strong>APIs &amp; Services</strong> → <strong>Library</strong> → cari "Google Drive API" → klik → <strong>ENABLE</strong>.</li>
        <li>Menu kiri → <strong>APIs &amp; Services</strong> → <strong>OAuth consent screen</strong>:
          <ul>
            <li>User Type: <strong>External</strong> → <strong>CREATE</strong></li>
            <li>App name: <code>Ican Work OS</code> · User support email: email Anda · Developer contact: email Anda → <strong>SAVE AND CONTINUE</strong></li>
            <li>Scopes → <strong>SAVE AND CONTINUE</strong> (skip)</li>
            <li>Test users → <strong>+ ADD USERS</strong> → masukkan email Google Anda → <strong>ADD</strong> → <strong>SAVE AND CONTINUE</strong></li>
          </ul>
        </li>
        <li>Menu kiri → <strong>APIs &amp; Services</strong> → <strong>Credentials</strong> → <strong>+ CREATE CREDENTIALS</strong> → <strong>OAuth client ID</strong>:
          <ul>
            <li>Application type: <strong>Web application</strong></li>
            <li>Name: <code>Work OS Web</code></li>
            <li><strong>Authorized JavaScript origins</strong> → klik <strong>+ ADD URI</strong> → paste URL berikut (URL website Anda saat ini):
              <div className="wo-gdrive-url"><code>{url}</code></div>
              <span className="wo-eyebrow">Penting: jangan ada slash <code>/</code> di akhir!</span>
            </li>
            <li>Klik <strong>CREATE</strong></li>
          </ul>
        </li>
        <li>Popup muncul dengan <strong>Your Client ID</strong> — copy nilai panjang yang diakhiri <code>.apps.googleusercontent.com</code>.</li>
        <li>Paste di kolom Client ID di atas → klik <strong>Simpan Client ID</strong> → klik <strong>Login &amp; Connect</strong>.</li>
        <li>Popup login Google muncul → pilih akun → klik <strong>Continue</strong> (mungkin ada warning "App not verified" karena ini project pribadi Anda — itu wajar, klik Advanced → Go to Ican Work OS (unsafe). Aman, karena ini app Anda sendiri.) → <strong>Allow</strong>.</li>
        <li>Selesai. Buka app ini di HP/laptop lain → Config → paste Client ID yang sama → Connect → data otomatis sync. 🎉</li>
      </ol>
      <p className="wo-gdrive-help-note">
        💡 <strong>Tips:</strong> Kalau Anda punya 2 URL (misal localhost untuk test + pages.dev untuk production), <strong>tambahkan keduanya</strong> di Authorized JavaScript origins. Bisa edit Credentials kapan saja.
      </p>
    </div>
  );
}
