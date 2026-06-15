// sync.jsx - legacy compatibility layer.
// Automatic sync now uses /cloud-sync.js with Cloudflare + Google login.

const sync = {
  clientId: "",
  accessToken: null,
  tokenExpiry: 0,
  fileId: null,
  tokenClient: null,
  status: "cloudflare",
  errorMsg: "",
  lastSyncedAt: 0,
  listeners: new Set(),

  on(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  },
  emit() {
    const snap = this.snapshot();
    this.listeners.forEach((cb) => cb(snap));
  },
  snapshot() {
    return {
      status: this.status,
      errorMsg: this.errorMsg,
      clientId: this.clientId,
      lastSyncedAt: this.lastSyncedAt,
    };
  },
  async setup() { this.emit(); },
  async connect() { return null; },
  async silentConnect() { return null; },
  async download() { return null; },
  async upload() { return null; },
  disconnect() { this.emit(); },
  clearClientId() { this.emit(); },
};

window.WORKOS_SYNC = sync;
