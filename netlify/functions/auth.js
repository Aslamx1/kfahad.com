const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { securityHeaders, jsonResponse } = require("./security-headers.js");
const { createRateLimiter } = require("./rate-limit.js");
const {
  sanitizeString,
  validateEmail,
  validatePhone,
  validatePassword,
  validateTableName
} = require("../../lib/validation.js");
const { firewallCheck, fail } = require("./_security.js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://stbpjtzeaxxzuzagzhmz.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const TERMS_VERSION = "2026-01-01";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

if (!SUPABASE_KEY) console.error("SUPABASE_SECRET_KEY is not configured");
if (!GOOGLE_CLIENT_ID) console.warn("GOOGLE_CLIENT_ID is not configured (Google login disabled)");

const supabase = SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const AUTH_RATE_LIMITER = createRateLimiter({ windowMs: 60 * 1000, max: 10, keyPrefix: "auth" });

function uid() {
  return crypto.randomBytes(16).toString("hex");
}
function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}
function normalizeRole(role = "") {
  const value = String(role).trim().toLowerCase();
  if (value === "lecturer") return "instructor";
  return value || "student";
}
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash = "") {
  const [salt, expectedHash] = String(storedHash).split(":");
  if (!salt || !expectedHash) return false;
  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
  } catch {
    return false;
  }
}
function preflight(event) {
  return { statusCode: 204, headers: securityHeaders(event) };
}

function buildSafeUser(user = {}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username || "",
    role: normalizeRole(user.role),
    avatarUrl: user.avatar_url || user.avatarUrl || "",
    bio: user.bio || "",
    phoneNumber: user.phone_number || user.phoneNumber || "",
    interestedCourses: Array.isArray(user.interested_courses) ? user.interested_courses : user.interestedCourses || [],
    interestedTracks: Array.isArray(user.interested_tracks) ? user.interested_tracks : user.interestedTracks || [],
    subscriptionExpiresAt: user.subscription_expires_at || user.subscriptionExpiresAt || null,
    createdAt: Number(user.created_at) || Number(user.createdAt) || Date.now(),
    lastLoginAt: Number(user.last_login_at) || Number(user.lastLoginAt) || null,
    signInCount: Number(user.sign_in_count) || Number(user.signInCount) || 0,
    verifiedAt: user.verified_at || user.verifiedAt || null,
    authProvider: user.auth_provider || "email",
    termsAcceptedAt: user.terms_accepted_at || null,
    termsVersion: user.terms_version || null,
    lockedUntil: user.locked_until || null
  };
}

function genericAuthError() {
  return "Invalid email/username or password.";
}

function isLockedOut(user = {}) {
  const until = Number(user.locked_until) || 0;
  return until > Date.now();
}

// Validates the Origin header against the configured allowed origin and
// requires a CSRF token header for state-changing requests.
function passesCsrf(event, auth) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = event.headers?.origin || event.headers?.Origin;
  if (allowedOrigin && origin && origin !== allowedOrigin) return false;
  const csrf = event.headers?.["x-csrf-token"] || event.headers?.["X-CSRF-Token"];
  if (!csrf) return false;
  if (auth?.csrfToken && csrf !== auth.csrfToken) return false;
  return true;
}

async function getUserByIdentifier(identifier) {
  if (!supabase) return null;
  const value = normalizeEmail(identifier);
  try {
    const { data: byEmail } = await supabase
      .from("users")
      .select("*")
      .eq("email", value)
      .maybeSingle();
    if (byEmail) return byEmail;
    const { data: byUsername } = await supabase
      .from("users")
      .select("*")
      .eq("username", identifier)
      .maybeSingle();
    return byUsername || null;
  } catch (err) {
    console.error("getUserByIdentifier error:", err.message);
    return null;
  }
}

async function createSession(userId, event) {
  if (!supabase) return null;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const { error } = await supabase.from("user_sessions").insert({
    id: uid(),
    user_id: userId,
    token_hash: tokenHash,
    csrf_token: csrfToken,
    ip_address: (event?.headers?.["x-nf-client-connection-ip"] || "").toString().slice(0, 64),
    user_agent: (event?.headers?.["user-agent"] || "").toString().slice(0, 255),
    created_at: Date.now(),
    expires_at: expiresAt
  });
  if (error) {
    console.error("createSession error:", error.message);
    return null;
  }
  return { token, csrfToken };
}

// Verifies a Google ID token via Google's tokeninfo endpoint and returns
// the payload, or null if invalid/expired/wrong audience.
async function verifyGoogleToken(idToken) {
  if (!idToken || !GOOGLE_CLIENT_ID) return null;
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const payload = await resp.json();
    if (payload || payload.aud !== GOOGLE_CLIENT_ID) return null;
    const now = Math.floor(Date.now() / 1000);
    if (Number(payload.exp) < now) return null;
    if (!payload.email) return null;
    return payload;
  } catch (err) {
    console.error("verifyGoogleToken error:", err.message);
    return null;
  }
}

async function verifyGitHubToken(accessToken) {
  if (!accessToken || !GITHUB_CLIENT_ID) return null;
  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const payload = await resp.json();
    if (!payload || !payload.email) {
      const emailsResp = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (!emailsResp.ok) return null;
      const emails = await emailsResp.json();
      const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null;
      if (!primary) return null;
      payload.email = primary.email;
    }
    return payload;
  } catch (err) {
    console.error("verifyGitHubToken error:", err.message);
    return null;
  }
}

async function exchangeGithubCodeForToken(code) {
  if (!code || !GITHUB_CLIENT_ID) return null;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
  if (!clientSecret) return null;
  try {
    const resp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: clientSecret,
        code,
      }),
    });
    const data = await resp.json();
    if (data?.access_token) return data.access_token;
    console.error("GitHub token exchange failed:", data);
    return null;
  } catch (err) {
    console.error("GitHub token exchange error:", err.message);
    return null;
  }
}

async function upsertUser(user) {
  if (!supabase) throw new Error("Database is not configured");
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username || "",
        password_hash: user.passwordHash || null,
        role: normalizeRole(user.role),
        avatar_url: user.avatar_url || "",
        bio: user.bio || "",
        phone_number: user.phone_number || "",
        interested_courses: user.interested_courses || [],
        interested_tracks: user.interested_tracks || [],
        subscription_expires_at: user.subscription_expires_at || null,
        created_at: user.created_at || Date.now(),
        last_login_at: user.last_login_at || null,
        sign_in_count: user.sign_in_count || 0,
        verified_at: user.verified_at || null,
        auth_provider: user.auth_provider || "email",
        terms_accepted_at: user.terms_accepted_at || null,
        terms_version: user.terms_version || null,
        failed_login_count: user.failed_login_count || 0,
        locked_until: user.locked_until || null
      },
      { onConflict: "email" }
    )
    .select();
  if (error) throw error;
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return preflight(event);
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, {}, event);
  }

  // Firewall check - block suspicious requests
  const fw = firewallCheck(event);
  if (fw.blocked) {
    return jsonResponse(403, { error: "Access denied." }, {}, event);
  }

  // Global rate limiting for the auth endpoint.
  const rl = await AUTH_RATE_LIMITER(event);
  if (rl && rl.limited) {
    return jsonResponse(429, { error: "Too many attempts. Please try again later." }, { "Retry-After": String(rl.retryAfter) }, event);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid request body." });
  }

  const action = body.action;

  try {
    if (action === "public_stats") {
      const { data, error } = await supabase.from("users").select("id");
      if (error) throw error;
      return jsonResponse(200, { registeredUsers: (data || []).length });
    }

    if (action === "oauth_clients") {
      return jsonResponse(200, {
        googleClientId: GOOGLE_CLIENT_ID,
        githubClientId: GITHUB_CLIENT_ID
      });
    }

    // ---- REGISTER ----
    if (action === "register_direct") {
      if (!passesCsrf(event)) return jsonResponse(403, { error: "Request blocked by security policy." });
      const rawName = sanitizeString(body.name, 80);
      const rawEmail = normalizeEmail(body.email);
      const rawPhone = sanitizeString(body.phoneNumber, 40);
      const password = String(body.password || "");
      const termsVersion = sanitizeString(body.termsVersion, 40);
      const accountType = body.accountType === "guest" ? "guest" : "student";

      if (!rawName || !rawEmail || !password) {
        return jsonResponse(400, { error: "Name, email and password are required." });
      }
      if (!validateEmail(rawEmail)) return jsonResponse(400, { error: "Please provide a valid email address." });
      if (!validatePassword(password)) {
        return jsonResponse(400, {
          error: "Password must be at least 8 characters and include uppercase, lowercase, number and a special character."
        });
      }
      if (rawPhone && !validatePhone(rawPhone)) {
        return jsonResponse(400, { error: "Please provide a valid phone number." });
      }
      if (termsVersion !== TERMS_VERSION) {
        return jsonResponse(400, { error: "You must accept the current Terms & Conditions to register." });
      }

      const existing = await getUserByIdentifier(rawEmail);
      if (existing) return jsonResponse(409, { error: "An account with that email already exists." });

      const username = sanitizeString(
        body.username || rawName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, ""),
        40
      );
      const user = {
        id: uid(),
        name: rawName,
        email: rawEmail,
        username,
        passwordHash: hashPassword(password),
        role: accountType,
        avatar_url: sanitizeString(body.avatarUrl || "", 512),
        bio: "",
        phone_number: rawPhone,
        interested_courses: accountType === "guest" ? [] : Array.isArray(body.interestedCourses) ? body.interestedCourses.slice(0, 50) : [],
        interested_tracks: accountType === "guest" ? [] : Array.isArray(body.interestedTracks) ? body.interestedTracks.slice(0, 50) : [],
        subscription_expires_at: null,
        created_at: Date.now(),
        last_login_at: Date.now(),
        sign_in_count: 1,
        verified_at: new Date().toISOString(),
        auth_provider: "email",
        terms_accepted_at: Date.now(),
        terms_version: TERMS_VERSION,
        failed_login_count: 0,
        locked_until: null
      };
      await upsertUser(user);
      const session = await createSession(user.id, event);
      if (!session) return jsonResponse(500, { error: "Could not start your session. Please try again." });
      return jsonResponse(200, { user: buildSafeUser(user), token: session.token, csrfToken: session.csrfToken });
    }

    // ---- LOGIN ----
    if (action === "login_direct") {
      if (!passesCsrf(event)) return jsonResponse(403, { error: "Request blocked by security policy." });
      const password = String(body.password || "");
      const inputValue = sanitizeString(body.email, 254);
      const loginType = normalizeRole(body.loginType || "student");

      if (!inputValue || !password) {
        return jsonResponse(400, { error: "Email/username and password are required." });
      }
      const user = await getUserByIdentifier(inputValue);
      if (!user || isLockedOut(user)) {
        return jsonResponse(401, { error: genericAuthError() });
      }
      if (!verifyPassword(password, user.password_hash)) {
        await recordFailedLogin(user.id);
        return jsonResponse(401, { error: genericAuthError() });
      }

      const userRole = normalizeRole(user.role);
      if (loginType === "admin" && userRole !== "admin") {
        return jsonResponse(401, { error: "You do not have access to that area." });
      }
      if (loginType === "instructor" && userRole !== "instructor") {
        return jsonResponse(401, { error: "You do not have access to that area." });
      }

      // Reset failed login counter on success
      await supabase.from("users").update({ failed_login_count: 0, locked_until: null }).eq("id", user.id);

      const updatedUser = { ...user, role: userRole, last_login_at: Date.now(), sign_in_count: (user.sign_in_count || 0) + 1 };
      await upsertUser(updatedUser);
      const session = await createSession(user.id, event);
      if (!session) return jsonResponse(500, { error: "Could not start your session. Please try again." });
      return jsonResponse(200, { user: buildSafeUser(updatedUser), token: session.token, csrfToken: session.csrfToken });
    }

    // ---- GOOGLE LOGIN ----
    if (action === "login_google") {
      if (!passesCsrf(event)) return jsonResponse(403, { error: "Request blocked by security policy." });
      if (!GOOGLE_CLIENT_ID) return jsonResponse(503, { error: "Google sign-in is not enabled." });
      const payload = await verifyGoogleToken(body.idToken);
      if (!payload) return jsonResponse(401, { error: "Google sign-in failed. Please try again." });

      const email = normalizeEmail(payload.email);
      if (!validateEmail(email)) return jsonResponse(400, { error: "Invalid Google account email." });

      let user = await getUserByIdentifier(email);
      const now = Date.now();
      if (!user) {
        user = {
          id: uid(),
          name: sanitizeString(payload.name || email.split("@")[0], 80),
          email,
          username: sanitizeString((payload.email || "").split("@")[0].replace(/[^a-z0-9]/g, ""), 40),
          passwordHash: null,
          role: "student",
          avatar_url: sanitizeString(payload.picture || "", 512),
          bio: "",
          phone_number: "",
          interested_courses: [],
          interested_tracks: [],
          subscription_expires_at: null,
          created_at: now,
          last_login_at: now,
          sign_in_count: 1,
          verified_at: new Date().toISOString(),
          auth_provider: "google",
          terms_accepted_at: now,
          terms_version: TERMS_VERSION,
          failed_login_count: 0,
          locked_until: null
        };
        await upsertUser(user);
      } else {
        const updated = {
          ...user,
          last_login_at: now,
          sign_in_count: (user.sign_in_count || 0) + 1,
          auth_provider: "google",
          avatar_url: user.avatar_url || sanitizeString(payload.picture || "", 512)
        };
        await upsertUser(updated);
        user = updated;
      }
      const session = await createSession(user.id, event);
      if (!session) return jsonResponse(500, { error: "Could not start your session. Please try again." });
      return jsonResponse(200, { user: buildSafeUser(user), token: session.token, csrfToken: session.csrfToken });
    }

    // ---- GITHUB LOGIN ----
    if (action === "login_github") {
      if (!passesCsrf(event)) return jsonResponse(403, { error: "Request blocked by security policy." });
      if (!GITHUB_CLIENT_ID) return jsonResponse(503, { error: "GitHub sign-in is not enabled." });
      
      let accessToken = body.accessToken;
      if (!accessToken && body.code) {
        accessToken = await exchangeGithubCodeForToken(body.code);
      }
      if (!accessToken) return jsonResponse(401, { error: "GitHub sign-in failed. Please try again." });
      
      const payload = await verifyGitHubToken(accessToken);
      if (!payload) return jsonResponse(401, { error: "GitHub sign-in failed. Please try again." });

      const email = normalizeEmail(payload.email);
      if (!validateEmail(email)) return jsonResponse(400, { error: "Invalid GitHub account email." });

      let user = await getUserByIdentifier(email);
      const now = Date.now();
      if (!user) {
        user = {
          id: uid(),
          name: sanitizeString(payload.name || email.split("@")[0], 80),
          email,
          username: sanitizeString((payload.login || "").replace(/[^a-z0-9]/g, ""), 40),
          passwordHash: null,
          role: "student",
          avatar_url: sanitizeString(payload.avatar_url || "", 512),
          bio: "",
          phone_number: "",
          interested_courses: [],
          interested_tracks: [],
          subscription_expires_at: null,
          created_at: now,
          last_login_at: now,
          sign_in_count: 1,
          verified_at: new Date().toISOString(),
          auth_provider: "github",
          terms_accepted_at: now,
          terms_version: TERMS_VERSION,
          failed_login_count: 0,
          locked_until: null
        };
        await upsertUser(user);
      } else {
        const updated = {
          ...user,
          last_login_at: now,
          sign_in_count: (user.sign_in_count || 0) + 1,
          auth_provider: "github",
          avatar_url: user.avatar_url || sanitizeString(payload.avatar_url || "", 512)
        };
        await upsertUser(updated);
        user = updated;
      }
      const session = await createSession(user.id, event);
      if (!session) return jsonResponse(500, { error: "Could not start your session. Please try again." });
      return jsonResponse(200, { user: buildSafeUser(user), token: session.token, csrfToken: session.csrfToken });
    }

    // ---- UPDATE PROFILE ----
    if (action === "update_profile") {
      const auth = await authorize(event);
      if (!auth) return jsonResponse(401, { error: "Unauthorized." });
      if (!passesCsrf(event, auth)) return jsonResponse(403, { error: "Request blocked by security policy." });
      const updates = body.updates || {};
      const user = await getUserByIdentifier(auth.email);
      if (!user) return jsonResponse(404, { error: "User not found." });
      const next = {
        ...user,
        name: sanitizeString(updates.name || user.name, 80),
        phone_number: updates.phoneNumber ? sanitizeString(updates.phoneNumber, 40) : user.phone_number,
        bio: sanitizeString(updates.bio || "", 500),
        avatar_url: updates.avatarUrl ? sanitizeString(updates.avatarUrl, 512) : user.avatar_url,
        interested_courses: Array.isArray(updates.interestedCourses) ? updates.interestedCourses.slice(0, 50) : user.interested_courses,
        interested_tracks: Array.isArray(updates.interestedTracks) ? updates.interestedTracks.slice(0, 50) : user.interested_tracks
      };
      await upsertUser(next);
      return jsonResponse(200, { user: buildSafeUser(next) });
    }

    // ---- GET SESSION USER ----
    if (action === "get_session_user") {
      const auth = await authorize(event);
      if (!auth) return jsonResponse(401, { error: "Unauthorized." });
      if (!passesCsrf(event, auth)) return jsonResponse(403, { error: "Request blocked by security policy." });
      const user = await getUserByIdentifier(auth.email);
      if (!user) return jsonResponse(401, { error: "Unauthorized." });
      return jsonResponse(200, { user: buildSafeUser(user) });
    }

    // ---- LIST USERS (admin only) ----
    if (action === "list_users") {
      const auth = await authorize(event);
      if (!auth) return jsonResponse(401, { error: "Unauthorized." });
      if (!passesCsrf(event, auth)) return jsonResponse(403, { error: "Request blocked by security policy." });
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      return jsonResponse(200, { users: (data || []).map(buildSafeUser) });
    }

    // ---- ACCEPT TERMS ----
    if (action === "accept_terms") {
      const auth = await authorize(event);
      if (!auth) return jsonResponse(401, { error: "Unauthorized." });
      if (!passesCsrf(event, auth)) return jsonResponse(403, { error: "Request blocked by security policy." });
      const version = sanitizeString(body.version, 40) || TERMS_VERSION;
      const { data: updated } = await supabase.from("users").update({
        terms_accepted_at: Date.now(),
        terms_version: version
      }).eq("id", auth.userId).select().maybeSingle();
      return jsonResponse(200, { user: buildSafeUser(updated || {}), ok: true });
    }

    return jsonResponse(400, { error: "Unknown action." });
  } catch (error) {
    console.error("Auth error:", error.message);
    return jsonResponse(500, { error: "Something went wrong. Please try again." });
  }
};

async function recordFailedLogin(userId) {
  if (!supabase) return;
  const { data: current } = await supabase.from("users").select("failed_login_count").eq("id", userId).maybeSingle();
  const count = (current?.failed_login_count || 0) + 1;
  const lockedUntil = count >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null;
  const { error } = await supabase
    .from("users")
    .update({ failed_login_count: count, locked_until: lockedUntil })
    .eq("id", userId);
  if (error) console.error("recordFailedLogin error:", error.message);
}

// Validates a Bearer token against the user_sessions table and returns session info.
async function authorize(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !supabase) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabase
    .from("user_sessions")
    .select("user_id, email, role, csrf_token, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  if (Number(data.expires_at) < Date.now()) return null;
  return { userId: data.user_id, email: data.email, role: data.role, csrfToken: data.csrf_token };
}

module.exports = { handler: exports.handler };
