// ================================================================
//  KFAHAD Academy — Shared Security Module
//  Used by all Netlify Functions. Files starting with "_" are NOT
//  exposed as HTTP endpoints, so this is safe to import.
// ================================================================
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// ----------------------------------------------------------------
// Supabase client (credentials come from environment ONLY)
// ----------------------------------------------------------------
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://stbpjtzeaxxzuzagzhmz.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

let _supabase = null;
function getSupabase() {
  if (!SUPABASE_KEY) return null;
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}
function supabaseConfigured() {
  return Boolean(SUPABASE_KEY);
}

// ----------------------------------------------------------------
// CORS + security headers
// ----------------------------------------------------------------
function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveOrigin(event) {
  const reqOrigin =
    event.headers?.origin || event.headers?.Origin || "";
  const list = allowedOrigins();

  // Same-origin request (browser hitting its own domain)
  const proto =
    event.headers?.["x-forwarded-proto"] ||
    event.headers?.["X-Forwarded-Proto"] ||
    "https";
  const host = event.headers?.host || event.headers?.Host || "";
  const sameOrigin = host ? `${proto}://${host}` : "";

  if (list.length === 0) {
    // No allow-list configured: only permit same-origin.
    return sameOrigin || "null";
  }
  if (reqOrigin && list.includes(reqOrigin)) return reqOrigin;
  if (sameOrigin && list.includes(sameOrigin)) return sameOrigin;
  return list[0];
}

function buildHeaders(event, extra = {}) {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(event),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    // Security headers
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    ...extra,
  };
}

// ----------------------------------------------------------------
// Standard responses (never leak internal error details)
// ----------------------------------------------------------------
function respond(event, statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: buildHeaders(event, extraHeaders),
    body: JSON.stringify(payload),
  };
}

function preflight(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: buildHeaders(event) };
  }
  return null;
}

// Log the real error server-side, return a generic message to the client.
function fail(event, statusCode, publicMessage, error) {
  if (error) console.error(publicMessage, error);
  return respond(event, statusCode, { error: publicMessage });
}

// ----------------------------------------------------------------
// Input parsing / validation / sanitization
// ----------------------------------------------------------------
function readJson(event) {
  try {
    return { data: JSON.parse(event.body || "{}"), error: null };
  } catch {
    return { data: null, error: "Invalid JSON body" };
  }
}

function sanitizeString(value, maxLen = 500) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Remove control chars (except newline/tab) that can poison logs/DB
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = s.trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function normalizeEmail(email = "") {
  return sanitizeString(email, 254).toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function isValidEmail(email = "") {
  const e = normalizeEmail(email);
  return e.length <= 254 && EMAIL_RE.test(e);
}

// Password policy: 8-128 chars, at least one letter and one number.
function passwordProblem(password = "") {
  const p = String(password);
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (p.length > 128) return "Password is too long.";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

// ----------------------------------------------------------------
// Password hashing (scrypt, timing-safe verify)
// ----------------------------------------------------------------
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash = "") {
  const [salt, expectedHash] = String(storedHash).split(":");
  if (!salt || !expectedHash) return false;
  try {
    const actualHash = crypto.scryptSync(String(password), salt, 64).toString("hex");
    const a = Buffer.from(actualHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------
// Client IP
// ----------------------------------------------------------------
function clientIp(event) {
  return (
    event.headers?.["x-nf-client-connection-ip"] ||
    (event.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown"
  );
}

// ----------------------------------------------------------------
// Rate limiting (in-memory, per warm instance — first line of defense)
// ----------------------------------------------------------------
const _buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const bucket = _buckets.get(key);
  if (!bucket || now > bucket.reset) {
    _buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }
  if (bucket.count >= max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, retryAfter: 0 };
}

// Convenience: enforce a limit and return a 429 response if exceeded.
function enforceRateLimit(event, name, max, windowMs) {
  const key = `${name}:${clientIp(event)}`;
  const result = rateLimit(key, max, windowMs);
  if (!result.ok) {
    return respond(
      event,
      429,
      { error: "Too many requests. Please slow down and try again shortly." },
      { "Retry-After": String(result.retryAfter) }
    );
  }
  return null;
}

// ----------------------------------------------------------------
// Account lockout (persistent, via Supabase account_lockouts table)
// ----------------------------------------------------------------
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

async function isAccountLocked(email) {
  const sb = getSupabase();
  if (!sb) return { locked: false };
  try {
    const { data } = await sb
      .from("account_lockouts")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (data && data.locked_until && Number(data.locked_until) > Date.now()) {
      const mins = Math.ceil((Number(data.locked_until) - Date.now()) / 60000);
      return { locked: true, minutes: mins };
    }
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

async function recordFailedLogin(email) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb
      .from("account_lockouts")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    const fails = (data?.fail_count || 0) + 1;
    const locked_until = fails >= MAX_FAILED ? Date.now() + LOCK_MINUTES * 60000 : null;
    await sb
      .from("account_lockouts")
      .upsert(
        { email, fail_count: fails, locked_until, updated_at: Date.now() },
        { onConflict: "email" }
      );
  } catch (e) {
    console.error("recordFailedLogin error", e);
  }
}

async function clearFailedLogins(email) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb
      .from("account_lockouts")
      .upsert(
        { email, fail_count: 0, locked_until: null, updated_at: Date.now() },
        { onConflict: "email" }
      );
  } catch (e) {
    console.error("clearFailedLogins error", e);
  }
}

// ----------------------------------------------------------------
// Session tokens (stored hashed in Supabase user_sessions table)
// ----------------------------------------------------------------
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function newRawToken() {
  return crypto.randomBytes(32).toString("hex");
}
function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function createSession(user) {
  const sb = getSupabase();
  const token = newRawToken();
  if (sb) {
    try {
      await sb.from("user_sessions").insert({
        token_hash: tokenHash(token),
        user_id: user.id,
        email: user.email,
        role: user.role,
        created_at: Date.now(),
        expires_at: Date.now() + SESSION_TTL_MS,
      });
    } catch (e) {
      console.error("createSession error", e);
    }
  }
  return token;
}

function bearerToken(event) {
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

// Returns the session row { user_id, email, role } or null.
async function getSession(event) {
  const token = bearerToken(event);
  if (!token) return null;
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("user_sessions")
      .select("*")
      .eq("token_hash", tokenHash(token))
      .maybeSingle();
    if (!data) return null;
    if (data.expires_at && Number(data.expires_at) < Date.now()) {
      await sb.from("user_sessions").delete().eq("token_hash", tokenHash(token));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function destroySession(event) {
  const token = bearerToken(event);
  if (!token) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("user_sessions").delete().eq("token_hash", tokenHash(token));
  } catch {
    /* ignore */
  }
}

// ================================================================
// FIREWALL / WAF - Application-Level Protections
// ================================================================

// Known bad bot/crawler patterns
const BOT_PATTERNS = [
  /bot/i, /spider/i, /crawler/i, /scraper/i, /scanner/i,
  /curl/i, /wget/i, /python/i, /java/i, /php/i, /perl/i,
  /ruby/i, /go-http/i, /okhttp/i, /axios/i, /requests/i,
  /postman/i, /insomnia/i, /http-client/i, /libwww/i,
  /mediapartners/i, /adsbot/i, /googlebot/i, /bingbot/i,
  /slurp/i, /duckduckbot/i, /baiduspider/i, /yandexbot/i,
  /facebookexternalhit/i, /twitterbot/i, /rogerbot/i,
  /linkedinbot/i, /embedly/i, /quora link preview/i,
  /showyoubot/i, /outbrain/i, /pinterestbot/i,
  /developers.google.com\/+\/web\/\S+\/details\/crawl/i,
  /extract\d*/i, /webscraper/i, /headless/i,
  /phantom/i, /puppeteer/i, /playwright/i, /selenium/i
];

// Known bad IP patterns / ranges (example - customize as needed)
const BLOCKED_IPS = new Set([
  // Add known malicious IPs here
  // "1.2.3.4",
]);

// Known bad user agents
const BLOCKED_USER_AGENTS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zmap/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i,
  /medusa/i, /john/i, /hashcat/i, /metasploit/i,
  /exploit/i, /shellcode/i, /webshell/i, /backdoor/i
];

// Track suspicious IPs (in-memory per warm instance)
const _ipReputation = new Map();
const _suspiciousRequests = new Map();

function isBotUserAgent(userAgent = "") {
  if (!userAgent || userAgent === "undefined" || userAgent === "null") return true;
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

function isBlockedUserAgent(userAgent = "") {
  if (!userAgent || userAgent === "undefined" || userAgent === "null") return true;
  return BLOCKED_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

function isSuspiciousRequest(event) {
  const ip = clientIp(event);
  const userAgent = String(event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "");
  const path = String(event.path || event.url || "");
  const method = String(event.httpMethod || "").toUpperCase();
  
  // Block known bad IPs
  if (BLOCKED_IPS.has(ip)) {
    logSecurityEvent("blocked_ip", { ip, path, method }, event);
    return true;
  }
  
  // Block known bad user agents
  if (isBlockedUserAgent(userAgent)) {
    logSecurityEvent("blocked_user_agent", { ip, userAgent, path, method }, event);
    return true;
  }
  
  // Block empty user agent (often bots)
  if (!userAgent || userAgent === "undefined" || userAgent === "null") {
    logSecurityEvent("empty_user_agent", { ip, path, method }, event);
    return true;
  }
  
  // Block suspicious paths
  const suspiciousPaths = [
    /\/\.env/i, /\/\.git/i, /\/\.svn/i, /\/\.htaccess/i,
    /\/wp-admin/i, /\/wp-login/i, /\/xmlrpc/i,
    /\/phpmyadmin/i, /\/mysql/i, /\/adminer/i,
    /\/shell/i, /\/cmd/i, /\/exec/i, /\/system/i,
    /\/etc\/passwd/i, /\/proc\//i, /\/bin\/ls/i
  ];
  
  if (suspiciousPaths.some(pattern => pattern.test(path))) {
    logSecurityEvent("suspicious_path", { ip, path, method, userAgent }, event);
    return true;
  }
  
  // Block common attack patterns in query strings
  const query = String(event.rawQuery || event.queryStringParameters || "");
  if (query) {
    const attackPatterns = [
      /union.*select/i, /select.*from/i, /insert.*into/i,
      /delete.*from/i, /drop.*table/i, /update.*set/i,
      /<script/i, /javascript:/i, /onerror=/i, /onload=/i,
      /eval\(/i, /alert\(/i, /prompt\(/i, /confirm\(/i,
      /\.\.\//i, /\.\.\\\\/i, /%2e%2e/i,
      /base64_decode/i, /shell_exec/i, /exec\(/i,
      /system\(/i, /passthru\(/i, /popen\(/i
    ];
    
    if (attackPatterns.some(pattern => pattern.test(query))) {
      logSecurityEvent("attack_pattern", { ip, path, query, method, userAgent }, event);
      return true;
    }
  }
  
  return false;
}

function logSecurityEvent(type, data, event) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    ...data
  };
  
  // Log to console (Netlify will capture this)
  console.warn(`[SECURITY] ${type}:`, JSON.stringify(logEntry));
  
  // Track suspicious activity per IP
  const ip = data.ip || (event ? clientIp(event) : "unknown");
  if (!_suspiciousRequests.has(ip)) {
    _suspiciousRequests.set(ip, []);
  }
  _suspiciousRequests.get(ip).push({
    type,
    timestamp: Date.now()
  });
  
  // If IP has too many suspicious events, block it
  const recent = _suspiciousRequests.get(ip) || [];
  const last5Minutes = recent.filter(e => Date.now() - e.timestamp < 5 * 60 * 1000);
  if (last5Minutes.length >= 5) {
    _ipReputation.set(ip, { blocked: true, reason: "Multiple suspicious requests" });
    logSecurityEvent("ip_blocked", { ip, reason: "Multiple suspicious requests", count: last5Minutes.length }, event);
  }
}

// Check if IP is blocked due to reputation
function isIpBlocked(ip, event) {
  const reputation = _ipReputation.get(ip);
  if (reputation?.blocked) {
    logSecurityEvent("blocked_reputation", { ip }, event);
    return true;
  }
  return false;
}

// Main firewall check - call this at the start of each function
function firewallCheck(event) {
  const ip = clientIp(event);
  
  // Check IP reputation
  if (isIpBlocked(ip, event)) {
    return { blocked: true, reason: "IP blocked due to suspicious activity" };
  }
  
  // Check for suspicious requests
  if (isSuspiciousRequest(event)) {
    return { blocked: true, reason: "Suspicious request detected" };
  }
  
  // Check for bot user agents (allow known good bots if needed)
  const userAgent = String(event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "");
  if (isBotUserAgent(userAgent)) {
    // Allow some legitimate bots but log them
    logSecurityEvent("bot_detected", { ip, userAgent }, event);
    // For now, just log but don't block - uncomment below to block all bots
    // return { blocked: true, reason: "Bot access denied" };
  }
  
  return { blocked: false };
}

// Export firewall functions
module.exports = {
  getSupabase,
  supabaseConfigured,
  SUPABASE_URL,
  buildHeaders,
  respond,
  preflight,
  fail,
  readJson,
  sanitizeString,
  normalizeEmail,
  isValidEmail,
  passwordProblem,
  hashPassword,
  verifyPassword,
  clientIp,
  rateLimit,
  enforceRateLimit,
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
  createSession,
  getSession,
  destroySession,
  bearerToken,
  firewallCheck,
  logSecurityEvent,
  isBotUserAgent,
  isBlockedUserAgent,
  isSuspiciousRequest,
  isIpBlocked,
  BOT_PATTERNS,
  BLOCKED_USER_AGENTS,
  BLOCKED_IPS,
  _ipReputation,
  _suspiciousRequests
};
