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
