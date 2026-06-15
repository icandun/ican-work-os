(function () {
  const SESSION_KEY = "ican-cloud-session-v1";
  const META_PREFIX = "ican-cloud-meta:";
  const API_ROOT = normalizeApiRoot(
    window.ICAN_CLOUD_API_ROOT || document.currentScript?.dataset?.apiRoot || "/api",
  );
  const managers = new Map();
  let configPromise = null;
  let session = loadSession();
  let user = null;

  function normalizeApiRoot(value) {
    return String(value || "/api").replace(/\/+$/, "") || "/api";
  }

  function getConfig() {
    if (!configPromise) {
      configPromise = fetch(`${API_ROOT}/config`).then((r) => r.json()).catch(() => ({
        googleClientId: "",
        googleConfigured: false,
        devAuth: false,
      }));
    }
    return configPromise;
  }

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  }

  function saveSession(next) {
    session = next;
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
    managers.forEach((manager) => manager.refreshAuth());
  }

  function authHeaders() {
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function hashState(data) {
    try { return JSON.stringify(data); } catch { return String(Date.now()); }
  }

  function metaKey(appId) {
    return `${META_PREFIX}${appId}`;
  }

  function readMeta(appId) {
    try { return JSON.parse(localStorage.getItem(metaKey(appId)) || "{}"); } catch { return {}; }
  }

  function writeMeta(appId, meta) {
    localStorage.setItem(metaKey(appId), JSON.stringify(meta));
  }

  function ensureBar() {
    let bar = document.querySelector(".ican-cloud-sync");
    if (bar) return bar;
    const style = document.createElement("style");
    style.textContent = `
      .ican-cloud-sync {
        position: fixed;
        top: max(8px, env(safe-area-inset-top));
        right: 8px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: min(360px, calc(100vw - 16px));
        padding: 8px 10px;
        border-radius: 14px;
        background: rgba(20, 24, 28, 0.84);
        color: #fff;
        box-shadow: 0 10px 30px rgba(0,0,0,0.24);
        backdrop-filter: blur(12px);
        font: 12px/1.3 -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", system-ui, sans-serif;
      }
      .ican-cloud-sync strong { font-weight: 700; }
      .ican-cloud-sync button {
        border: 0;
        border-radius: 999px;
        padding: 7px 10px;
        color: #111;
        background: #fff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .ican-cloud-sync button.secondary {
        background: rgba(255,255,255,0.12);
        color: #fff;
      }
      .ican-cloud-sync .google-slot { min-width: 120px; min-height: 32px; display: flex; align-items: center; }
      .ican-cloud-sync.is-hidden { display: none; }
      @media (max-width: 520px) {
        .ican-cloud-sync { left: 8px; right: 8px; justify-content: space-between; }
      }
    `;
    document.head.appendChild(style);
    bar = document.createElement("div");
    bar.className = "ican-cloud-sync";
    bar.innerHTML = `
      <span class="status">Sync belum siap</span>
      <span class="google-slot"></span>
      <button class="dev-login secondary" style="display:none">Dev</button>
      <button class="pull secondary" style="display:none">Ambil</button>
      <button class="push secondary" style="display:none">Simpan</button>
      <button class="logout secondary" style="display:none">Keluar</button>
    `;
    document.body.appendChild(bar);
    return bar;
  }

  async function setupAuthUi() {
    const bar = ensureBar();
    const cfg = await getConfig();
    bar.querySelector(".dev-login").style.display = cfg.devAuth ? "" : "none";
    bar.querySelector(".dev-login").onclick = async () => {
      const email = prompt("Email dev untuk test lokal:", "ican@example.local");
      if (!email) return;
      const result = await api("/auth/dev", { method: "POST", body: JSON.stringify({ email }) });
      user = result.user;
      saveSession({ token: result.token, user: result.user });
    };
    bar.querySelector(".logout").onclick = () => {
      user = null;
      saveSession(null);
    };

    if (!cfg.googleConfigured) {
      bar.querySelector(".status").textContent = cfg.devAuth
        ? "Mode test lokal"
        : "Google Client ID belum dipasang";
      return;
    }

    await loadGoogleScript();
    window.google.accounts.id.initialize({
      client_id: cfg.googleClientId,
      callback: async (response) => {
        try {
          const result = await api("/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential: response.credential }),
          });
          user = result.user;
          saveSession({ token: result.token, user: result.user });
        } catch (error) {
          alert(`Login Google gagal: ${error.message}`);
        }
      },
    });
    const slot = bar.querySelector(".google-slot");
    slot.innerHTML = "";
    window.google.accounts.id.renderButton(slot, {
      type: "standard",
      theme: "filled_blue",
      size: "medium",
      text: "signin_with",
      shape: "pill",
    });
  }

  function loadGoogleScript() {
    if (window.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  class CloudSyncManager {
    constructor(options) {
      this.appId = options.appId;
      this.label = options.label || options.appId;
      this.getLocalState = options.getLocalState;
      this.setLocalState = options.setLocalState;
      this.normalizeState = options.normalizeState || ((x) => x);
      this.timer = null;
      this.pollTimer = null;
      this.dirty = false;
      this.saving = false;
      this.meta = readMeta(this.appId);
      this.lastHash = this.meta.lastHash || "";
      managers.set(this.appId, this);
      this.refreshAuth();
      this.pollTimer = setInterval(() => this.pullIfNewer({ quiet: true }), 30000);
    }

    destroy() {
      if (this.timer) clearTimeout(this.timer);
      if (this.pollTimer) clearInterval(this.pollTimer);
      managers.delete(this.appId);
    }

    refreshAuth() {
      const bar = ensureBar();
      const loggedIn = Boolean(session?.token);
      bar.querySelector(".pull").style.display = loggedIn ? "" : "none";
      bar.querySelector(".push").style.display = loggedIn ? "" : "none";
      bar.querySelector(".logout").style.display = loggedIn ? "" : "none";
      bar.querySelector(".google-slot").style.display = loggedIn ? "none" : "";
      bar.querySelector(".pull").onclick = () => this.pull({ forcePrompt: true });
      bar.querySelector(".push").onclick = () => this.push({ force: true });
      if (loggedIn) {
        bar.querySelector(".status").innerHTML = `<strong>${this.label}</strong> tersambung`;
        this.initialSync();
      } else if (!bar.querySelector(".status").textContent.includes("Client ID")) {
        bar.querySelector(".status").innerHTML = `<strong>${this.label}</strong> belum login`;
      }
    }

    scheduleSave(state) {
      if (!session?.token) return;
      const data = this.normalizeState(state);
      const nextHash = hashState(data);
      if (nextHash === this.lastHash) return;
      this.dirty = true;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 1600);
    }

    async initialSync() {
      if (this.didInitialSync || !session?.token) return;
      this.didInitialSync = true;
      try {
        const remote = await api(`/apps/${this.appId}/state`);
        if (!remote.exists) {
          await this.push({ force: true });
          return;
        }

        const localHash = hashState(this.normalizeState(this.getLocalState()));
        if (this.meta.revision === remote.revision && this.meta.lastHash === localHash) {
          this.lastHash = localHash;
          return;
        }

        const shouldUseCloud = confirm(
          `${this.label}: ada data cloud. OK untuk pakai data cloud di perangkat ini. Cancel untuk upload data perangkat ini.`,
        );
        if (shouldUseCloud) this.applyRemote(remote);
        else await this.push({ force: true, ignoreBase: true });
      } catch (error) {
        this.setStatus(`Sync error: ${error.message}`);
      }
    }

    async pullIfNewer({ quiet = false } = {}) {
      if (!session?.token || this.dirty || this.saving) return;
      try {
        const remote = await api(`/apps/${this.appId}/state`);
        if (remote.exists && remote.revision !== this.meta.revision) {
          this.applyRemote(remote);
          if (!quiet) this.setStatus("Data cloud diambil");
        }
      } catch (error) {
        if (!quiet) this.setStatus(`Ambil gagal: ${error.message}`);
      }
    }

    async pull({ forcePrompt = false } = {}) {
      if (!session?.token) return this.setStatus("Login dulu");
      try {
        const remote = await api(`/apps/${this.appId}/state`);
        if (!remote.exists) return this.setStatus("Belum ada data cloud");
        if (forcePrompt && !confirm(`${this.label}: timpa data perangkat ini dengan data cloud?`)) return;
        this.applyRemote(remote);
        this.setStatus("Data cloud diambil");
      } catch (error) {
        this.setStatus(`Ambil gagal: ${error.message}`);
      }
    }

    async push({ force = false, ignoreBase = false } = {}) {
      if (!session?.token) return this.setStatus("Login dulu");
      if (this.saving) return;
      this.saving = true;
      try {
        const data = this.normalizeState(this.getLocalState());
        const body = { data };
        if (!ignoreBase && this.meta.revision) body.baseRevision = this.meta.revision;
        const saved = await api(`/apps/${this.appId}/state`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        this.dirty = false;
        this.meta = {
          revision: saved.revision,
          updatedAt: saved.updatedAt,
          lastHash: hashState(saved.data),
        };
        this.lastHash = this.meta.lastHash;
        writeMeta(this.appId, this.meta);
        this.setStatus(force ? "Tersimpan ke cloud" : "Sync tersimpan");
      } catch (error) {
        if (error.status === 409 && error.data?.remote) {
          const useRemote = confirm(
            `${this.label}: data cloud berubah dari device lain. OK untuk ambil data cloud. Cancel untuk paksa simpan data device ini.`,
          );
          if (useRemote) this.applyRemote(error.data.remote);
          else await this.push({ force: true, ignoreBase: true });
        } else {
          this.setStatus(`Simpan gagal: ${error.message}`);
        }
      } finally {
        this.saving = false;
      }
    }

    applyRemote(remote) {
      const data = this.normalizeState(remote.data);
      this.meta = {
        revision: remote.revision,
        updatedAt: remote.updatedAt,
        lastHash: hashState(data),
      };
      this.lastHash = this.meta.lastHash;
      this.dirty = false;
      writeMeta(this.appId, this.meta);
      this.setLocalState(data);
    }

    setStatus(text) {
      const bar = ensureBar();
      bar.querySelector(".status").innerHTML = `<strong>${this.label}</strong> ${text}`;
    }
  }

  window.ICAN_CLOUD_SYNC = {
    init(options) {
      setupAuthUi();
      return new CloudSyncManager(options);
    },
    signOut() { user = null; saveSession(null); },
    getSession() { return session; },
  };
})();
