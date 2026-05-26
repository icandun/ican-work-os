// Google Drive Sync via appDataFolder (private app storage)
// Uses Google Identity Services (GIS) for OAuth, Drive REST API directly via fetch.

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SYNC_FILE = "workos-data.json";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const CLIENT_ID_KEY = "ican-workos-gdrive-client-id";
const LAST_SYNC_KEY = "ican-workos-last-sync";

const sync = {
  clientId: localStorage.getItem(CLIENT_ID_KEY) || "",
  accessToken: null,
  tokenExpiry: 0,
  fileId: null,
  tokenClient: null,
  status: "disconnected", // disconnected | connected | syncing | error
  errorMsg: "",
  lastSyncedAt: Number(localStorage.getItem(LAST_SYNC_KEY)) || 0,
  listeners: new Set(),

  on(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); },
  emit() { const snap = this.snapshot(); this.listeners.forEach((cb) => cb(snap)); },
  snapshot() {
    return {
      status: this.status,
      errorMsg: this.errorMsg,
      clientId: this.clientId,
      lastSyncedAt: this.lastSyncedAt,
    };
  },

  setStatus(s, err = "") {
    this.status = s;
    this.errorMsg = err;
    this.emit();
  },

  async loadGIS() {
    if (window.google?.accounts?.oauth2) return;
    await new Promise((res, rej) => {
      const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", res, { once: true });
        if (window.google?.accounts?.oauth2) res();
        return;
      }
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true; s.defer = true;
      s.onload = res; s.onerror = () => rej(new Error("Gagal memuat Google Identity"));
      document.head.appendChild(s);
    });
  },

  async setup(clientId) {
    this.clientId = (clientId || "").trim();
    localStorage.setItem(CLIENT_ID_KEY, this.clientId);
    if (!this.clientId) {
      this.tokenClient = null;
      this.setStatus("disconnected");
      return;
    }
    try {
      await this.loadGIS();
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: SCOPE,
        callback: () => {}, // overridden per-request
      });
      this.emit();
    } catch (e) {
      this.setStatus("error", "Gagal memuat library Google: " + e.message);
    }
  },

  requestToken(opts = {}) {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) return reject(new Error("Belum di-setup. Simpan Client ID dulu."));
      this.tokenClient.callback = (resp) => {
        if (resp.error) {
          this.setStatus("error", resp.error_description || resp.error || "Login gagal");
          reject(resp);
        } else {
          this.accessToken = resp.access_token;
          this.tokenExpiry = Date.now() + ((resp.expires_in || 3600) - 120) * 1000;
          this.setStatus("connected");
          resolve(resp.access_token);
        }
      };
      try {
        this.tokenClient.requestAccessToken(opts);
      } catch (e) {
        this.setStatus("error", e.message);
        reject(e);
      }
    });
  },

  async connect() { return this.requestToken({ prompt: "consent" }); },
  async silentConnect() {
    try { return await this.requestToken({ prompt: "" }); } catch (e) { return null; }
  },

  async ensureToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;
    if (!this.tokenClient) return null;
    return this.silentConnect();
  },

  async findFile() {
    const t = await this.ensureToken();
    if (!t) return null;
    const q = encodeURIComponent(`name='${SYNC_FILE}'`);
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`,
      { headers: { Authorization: `Bearer ${t}` } }
    );
    if (!r.ok) {
      this.setStatus("error", `Cari file gagal: ${r.status}`);
      return null;
    }
    const data = await r.json();
    this.fileId = data.files?.[0]?.id || null;
    return data.files?.[0] || null;
  },

  async download() {
    const t = await this.ensureToken();
    if (!t) return null;
    if (!this.fileId) await this.findFile();
    if (!this.fileId) return null;
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${t}` } }
    );
    if (!r.ok) {
      this.setStatus("error", `Download gagal: ${r.status}`);
      return null;
    }
    return r.json();
  },

  async upload(stateData) {
    const t = await this.ensureToken();
    if (!t) throw new Error("Belum login");
    const prevStatus = this.status;
    this.setStatus("syncing");

    if (!this.fileId) await this.findFile();

    const payload = { ...stateData, _syncedAt: Date.now() };
    const body = JSON.stringify(payload);

    let r;
    if (this.fileId) {
      r = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${this.fileId}?uploadType=media`,
        { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body }
      );
    } else {
      const boundary = "-------workos_" + Date.now();
      const metadata = { name: SYNC_FILE, parents: ["appDataFolder"] };
      const multi =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) + "\r\n" +
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        body + "\r\n" +
        `--${boundary}--`;
      r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multi,
      });
      const data = await r.json();
      this.fileId = data.id;
    }
    if (!r.ok) {
      this.setStatus("error", `Upload gagal: ${r.status}`);
      throw new Error(`Upload gagal: ${r.status}`);
    }
    this.lastSyncedAt = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, String(this.lastSyncedAt));
    this.setStatus("connected");
    return payload;
  },

  disconnect() {
    if (this.accessToken && window.google?.accounts?.oauth2) {
      try { google.accounts.oauth2.revoke(this.accessToken, () => {}); } catch (e) {}
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.fileId = null;
    this.lastSyncedAt = 0;
    localStorage.removeItem(LAST_SYNC_KEY);
    this.setStatus("disconnected");
  },

  clearClientId() {
    localStorage.removeItem(CLIENT_ID_KEY);
    this.clientId = "";
    this.tokenClient = null;
    this.disconnect();
  },
};

window.WORKOS_SYNC = sync;
