import { validateAppState } from "./state.js";

const VALID_APPS = new Set(["habit-ican", "ican-work-os"]);
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const MAX_VERSIONS = 20;
const UNIFIED_WORK_URL = "https://habit-ican.pages.dev/work/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return corsResponse(null, request, env);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }
      if (shouldRedirectToUnifiedApp(request, url)) {
        return Response.redirect(UNIFIED_WORK_URL, 308);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.code, message: error.message }, error.status, request, env);
      }
      return json({ error: "internal_error", message: error.message }, 500, request, env);
    }
  },
};

function shouldRedirectToUnifiedApp(request, url) {
  if (!["GET", "HEAD"].includes(request.method)) return false;
  return url.pathname === "/" || request.headers.get("Sec-Fetch-Mode") === "navigate";
}

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/api/health") {
    return json({ ok: true, service: "ican-sync-cloud" }, 200, request, env);
  }

  if (request.method === "GET" && pathname === "/api/config") {
    const configured = Boolean(env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.includes("PASTE_"));
    return json({
      googleClientId: configured ? env.GOOGLE_CLIENT_ID : "",
      googleConfigured: configured,
      devAuth: env.ALLOW_DEV_AUTH === "true",
    }, 200, request, env);
  }

  if (request.method === "POST" && pathname === "/api/auth/google") {
    const body = await readJson(request);
    if (!body.credential) return json({ error: "missing_credential" }, 400, request, env);
    const profile = await verifyGoogleCredential(body.credential, env);
    await upsertUser(env, profile);
    const token = await createSessionToken(profile, env);
    return json({ token, user: publicUser(profile) }, 200, request, env);
  }

  if (request.method === "POST" && pathname === "/api/auth/refresh") {
    const user = await requireUser(request, env);
    const token = await createSessionToken(user, env);
    return json({ token, user: publicUser(user) }, 200, request, env);
  }

  if (request.method === "POST" && pathname === "/api/auth/dev") {
    if (env.ALLOW_DEV_AUTH !== "true") return json({ error: "disabled" }, 403, request, env);
    const body = await readJson(request);
    const email = String(body.email || "ican@example.local").trim().toLowerCase();
    const profile = {
      id: `dev:${email}`,
      email,
      name: body.name || "Ican Dev",
      picture: "",
      provider: "dev",
    };
    await upsertUser(env, profile);
    const token = await createSessionToken(profile, env);
    return json({ token, user: publicUser(profile) }, 200, request, env);
  }

  if (request.method === "GET" && pathname === "/api/me") {
    const user = await requireUser(request, env);
    return json({ user: publicUser(user) }, 200, request, env);
  }

  const stateMatch = pathname.match(/^\/api\/apps\/([^/]+)\/state$/);
  if (stateMatch) {
    const appId = stateMatch[1];
    if (!VALID_APPS.has(appId)) return json({ error: "unknown_app" }, 404, request, env);
    const user = await requireUser(request, env);

    if (request.method === "GET") {
      const document = await getDocument(env, user.id, appId);
      return json(document || { exists: false, appId, data: null, revision: 0, updatedAt: 0 }, 200, request, env);
    }

    if (request.method === "PUT") {
      const body = await readJson(request);
      const data = body.data;
      const encodedSize = new TextEncoder().encode(JSON.stringify(data)).length;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return json({ error: "invalid_data" }, 400, request, env);
      }
      if (encodedSize > MAX_DOCUMENT_BYTES) {
        return json({ error: "document_too_large", maxBytes: MAX_DOCUMENT_BYTES }, 413, request, env);
      }
      const validation = validateAppState(appId, data);
      if (!validation.ok) {
        return json({ error: "invalid_schema", reason: validation.code, path: validation.path }, 400, request, env);
      }
      const saved = await saveDocument(env, user.id, appId, data, body.baseRevision);
      if (saved.conflict) return json(saved, 409, request, env);
      return json(saved, 200, request, env);
    }
  }

  const versionsMatch = pathname.match(/^\/api\/apps\/([^/]+)\/versions$/);
  if (request.method === "GET" && versionsMatch) {
    const appId = versionsMatch[1];
    if (!VALID_APPS.has(appId)) return json({ error: "unknown_app" }, 404, request, env);
    const user = await requireUser(request, env);
    const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || 10)));
    const versions = await listVersions(env, user.id, appId, limit);
    return json({ appId, versions }, 200, request, env);
  }

  const restoreMatch = pathname.match(/^\/api\/apps\/([^/]+)\/versions\/(\d+)\/restore$/);
  if (request.method === "POST" && restoreMatch) {
    const appId = restoreMatch[1];
    if (!VALID_APPS.has(appId)) return json({ error: "unknown_app" }, 404, request, env);
    const user = await requireUser(request, env);
    const body = await readJson(request);
    const restored = await restoreVersion(env, user.id, appId, Number(restoreMatch[2]), body.baseRevision);
    if (!restored) return json({ error: "version_not_found" }, 404, request, env);
    if (restored.conflict) return json(restored, 409, request, env);
    return json(restored, 200, request, env);
  }

  return json({ error: "not_found" }, 404, request, env);
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

async function upsertUser(env, profile) {
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, picture, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      picture = excluded.picture,
      updated_at = excluded.updated_at
  `).bind(profile.id, profile.email, profile.name || "", profile.picture || "", now, now).run();
}

async function getDocument(env, userId, appId) {
  const row = await env.DB.prepare(`
    SELECT app_id, data, revision, updated_at
    FROM app_documents
    WHERE user_id = ? AND app_id = ?
  `).bind(userId, appId).first();
  if (!row) return null;
  return {
    exists: true,
    appId: row.app_id,
    data: JSON.parse(row.data),
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

async function saveDocument(env, userId, appId, data, baseRevision) {
  const current = await getDocument(env, userId, appId);
  if (current && (baseRevision == null || Number(baseRevision) !== Number(current.revision))) {
    return { conflict: true, remote: current };
  }

  const now = Date.now();
  const serialized = JSON.stringify(data);
  let saved;

  if (!current) {
    if (baseRevision != null && Number(baseRevision) !== 0) {
      return { conflict: true, remote: null };
    }
    saved = await env.DB.prepare(`
      INSERT INTO app_documents (user_id, app_id, data, revision, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(user_id, app_id) DO NOTHING
      RETURNING revision, updated_at
    `).bind(userId, appId, serialized, now, now).first();
  } else {
    saved = await env.DB.prepare(`
      UPDATE app_documents
      SET data = ?, revision = revision + 1, updated_at = ?
      WHERE user_id = ? AND app_id = ? AND revision = ?
      RETURNING revision, updated_at
    `).bind(serialized, now, userId, appId, Number(baseRevision)).first();
  }

  if (!saved) {
    return { conflict: true, remote: await getDocument(env, userId, appId) };
  }

  await recordVersion(env, userId, appId, saved.revision, serialized, now);
  return { exists: true, appId, data, revision: saved.revision, updatedAt: saved.updated_at };
}

async function recordVersion(env, userId, appId, revision, serialized, createdAt) {
  await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO app_document_versions (user_id, app_id, revision, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, appId, revision, serialized, createdAt),
    env.DB.prepare(`
      DELETE FROM app_document_versions
      WHERE user_id = ? AND app_id = ? AND revision NOT IN (
        SELECT revision FROM app_document_versions
        WHERE user_id = ? AND app_id = ?
        ORDER BY revision DESC LIMIT ?
      )
    `).bind(userId, appId, userId, appId, MAX_VERSIONS),
  ]);
}

async function listVersions(env, userId, appId, limit) {
  const result = await env.DB.prepare(`
    SELECT revision, created_at, LENGTH(data) AS bytes
    FROM app_document_versions
    WHERE user_id = ? AND app_id = ?
    ORDER BY revision DESC
    LIMIT ?
  `).bind(userId, appId, limit).all();
  return result.results || [];
}

async function restoreVersion(env, userId, appId, revision, baseRevision) {
  const row = await env.DB.prepare(`
    SELECT data FROM app_document_versions
    WHERE user_id = ? AND app_id = ? AND revision = ?
  `).bind(userId, appId, revision).first();
  if (!row) return null;
  return saveDocument(env, userId, appId, JSON.parse(row.data), baseRevision);
}

async function verifyGoogleCredential(credential, env) {
  const clientIds = String(env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (clientIds.length === 0 || clientIds.some((id) => id.includes("PASTE_"))) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Invalid Google credential");

  const header = JSON.parse(textFromBase64Url(parts[0]));
  const payload = JSON.parse(textFromBase64Url(parts[1]));
  const signature = bytesFromBase64Url(parts[2]);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  const jwks = await fetch("https://www.googleapis.com/oauth2/v3/certs").then((r) => r.json());
  const jwk = jwks.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Google signing key not found");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed);
  if (!valid) throw new Error("Invalid Google signature");

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!clientIds.includes(payload.aud)) throw new Error("Invalid Google audience");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) throw new Error("Invalid Google issuer");
  if (Number(payload.exp || 0) <= nowSeconds) throw new Error("Google credential expired");
  if (payload.email_verified === false) throw new Error("Google email is not verified");

  return {
    id: `google:${payload.sub}`,
    email: payload.email || "",
    name: payload.name || payload.email || "Google User",
    picture: payload.picture || "",
    provider: "google",
  };
}

async function requireUser(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "missing_session");
  const payload = await verifySessionToken(token, env);
  const row = await env.DB.prepare(`
    SELECT id, email, name, picture
    FROM users
    WHERE id = ?
  `).bind(payload.sub).first();
  if (!row) throw new HttpError(401, "unknown_session_user");
  return { id: row.id, email: row.email, name: row.name, picture: row.picture };
}

async function createSessionToken(profile, env) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: profile.id,
    email: profile.email,
    name: profile.name,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }, sessionSecret(env));
}

async function verifySessionToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "invalid_session");
  const expected = await hmac(`${parts[0]}.${parts[1]}`, sessionSecret(env));
  if (!timingSafeEqual(parts[2], expected)) throw new HttpError(401, "invalid_session");
  const payload = JSON.parse(textFromBase64Url(parts[1]));
  if (Number(payload.exp || 0) <= Math.floor(Date.now() / 1000)) throw new HttpError(401, "expired_session");
  return payload;
}

async function signJwt(payload, secret) {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  const sig = await hmac(`${header}.${body}`, secret);
  return `${header}.${body}.${sig}`;
}

async function hmac(input, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return base64UrlBytes(new Uint8Array(signature));
}

function sessionSecret(env) {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.ALLOW_DEV_AUTH === "true") return "local-dev-change-me-before-deploy";
  throw new HttpError(500, "missing_session_secret");
}

function base64UrlJson(value) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
  const padded = base64 + padding;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function textFromBase64Url(value) {
  return new TextDecoder().decode(bytesFromBase64Url(value));
}

function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function publicUser(user) {
  return { email: user.email, name: user.name, picture: user.picture };
}

function json(body, status, request, env) {
  return corsResponse(JSON.stringify(body), request, env, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function corsResponse(body, request, env, init = {}) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set(String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean));
  const headers = new Headers(init.headers || {});
  if (allowed.has(origin) || origin === new URL(request.url).origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return new Response(body, { ...init, headers });
}

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
