import { createClient } from "@supabase/supabase-js";

const DEFAULT_SYSTEM_PROMPT =
  "You are the KFAHAD Academy AI Tutor. Help students with Psychology and Web Development. You are friendly, patient, and encouraging. Provide helpful answers about HTML, CSS, JavaScript, Psychology, Web Development, and other courses offered at KFAHAD Academy.";

const PUBLIC_READ = new Set([
  "courses",
  "blog_posts",
  "jobs",
  "knowledge_base",
  "live_sessions",
  "student_reviews",
  "examples",
  "pathways",
]);
const PRIVATE_READ = new Set(["notifications", "learning_progress", "appointments", "payments"]);
const ADMIN_WRITE = new Set([
  "courses",
  "blog_posts",
  "jobs",
  "knowledge_base",
  "live_sessions",
  "student_reviews",
  "examples",
  "pathways",
]);
const USER_WRITE = new Set(["notifications", "learning_progress", "appointments", "payments"]);
const BLOCKED_USER_AGENTS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zmap/i, /dirbuster/i, /gobuster/i,
  /wfuzz/i, /hydra/i, /medusa/i, /john/i, /hashcat/i, /metasploit/i, /exploit/i,
  /shellcode/i, /webshell/i, /backdoor/i,
];
const SUSPICIOUS_PATHS = [
  /\/\.env/i, /\/\.git/i, /\/\.svn/i, /\/\.htaccess/i, /\/wp-admin/i,
  /\/wp-login/i, /\/xmlrpc/i, /\/phpmyadmin/i, /\/mysql/i, /\/adminer/i,
  /\/shell/i, /\/cmd/i, /\/exec/i, /\/system/i, /\/etc\/passwd/i, /\/proc\//i,
  /\/bin\/ls/i,
];
const ATTACK_PATTERNS = [
  /union.*select/i, /select.*from/i, /insert.*into/i, /delete.*from/i,
  /drop.*table/i, /update.*set/i, /<script/i, /javascript:/i, /onerror=/i,
  /onload=/i, /eval\(/i, /alert\(/i, /prompt\(/i, /confirm\(/i, /\.\.\//i,
  /\.\.\\/i, /%2e%2e/i, /base64_decode/i, /shell_exec/i, /exec\(/i,
  /system\(/i, /passthru\(/i, /popen\(/i,
];

function responseHeaders(request, env, extra = {}) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const sameOrigin = origin && origin === new URL(request.url).origin;
  const allowedOrigin = origin && (sameOrigin || allowed.includes(origin)) ? origin : "";
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-XSS-Protection": "0",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://*.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.xylepayments.com https://*.supabase.co https://*.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://*.cloudinary.com; frame-src 'self' https://www.youtube.com https://meet.google.com https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self'",
  });
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return headers;
}

function json(request, env, status, value, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders(request, env, headers),
  });
}

function sanitize(value, maxLength = 500) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Forwarded-For")?.split(",")[0].trim()
    || "unknown";
}

function firewallBlocked(request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get("User-Agent") || "";
  return !userAgent
    || userAgent === "undefined"
    || userAgent === "null"
    || BLOCKED_USER_AGENTS.some((pattern) => pattern.test(userAgent))
    || SUSPICIOUS_PATHS.some((pattern) => pattern.test(url.pathname))
    || ATTACK_PATTERNS.some((pattern) => pattern.test(url.search));
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  if (origin === new URL(request.url).origin) return true;
  const allowed = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

async function rateLimited(request, env, name, limit, windowMs) {
  if (!env.RATE_LIMITER) throw new Error("RATE_LIMITER Durable Object binding is not configured.");
  const ip = clientIp(request);
  const id = env.RATE_LIMITER.idFromName(`${name}:${ip}`);
  const result = await env.RATE_LIMITER.get(id).fetch("https://rate-limit.internal/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit, windowMs }),
  });
  if (!result.ok) throw new Error("Rate limiter request failed.");
  const { limited, retryAfter } = await result.json();
  return limited
    ? json(request, env, 429, { error: "Too many requests. Please slow down and try again shortly." }, {
      "Retry-After": String(retryAfter),
    })
    : null;
}

function supabaseClient(env) {
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(env.SUPABASE_URL || "https://stbpjtzeaxxzuzagzhmz.supabase.co", key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getSession(request, env, supabase) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const tokenHash = await sha256Hex(authorization.slice(7).trim());
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.expires_at && Number(data.expires_at) < Date.now()) {
    const { error: deleteError } = await supabase.from("user_sessions").delete().eq("token_hash", tokenHash);
    if (deleteError) throw deleteError;
    return null;
  }
  if (data.role) return data;
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user_id)
    .maybeSingle();
  if (userError) throw userError;
  return { ...data, role: user?.role || "" };
}

async function readJson(request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: "Invalid request." };
  }
}

async function handleChat(request, env) {
  if (request.method !== "POST") return json(request, env, 405, { error: "Method not allowed." });
  const limited = await rateLimited(request, env, "ai_chat", 15, 60000);
  if (limited) return limited;
  if (!env.GEMINI_API_KEY) {
    return json(request, env, 200, {
      content: [{ type: "text", text: "The AI tutor is not configured yet. Please try again later." }],
    });
  }

  const { data: body, error } = await readJson(request);
  if (error) return json(request, env, 400, { error });
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const systemPrompt = sanitize(body.system || DEFAULT_SYSTEM_PROMPT, 2000);
  const userMsg = sanitize(messages.at(-1)?.content || "", 4000);
  if (!userMsg) {
    return json(request, env, 200, {
      content: [{ type: "text", text: "Hello! I'm your KFAHAD AI Tutor. How can I help you today?" }],
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMsg }] }],
        }),
      },
    );
    if (!response.ok) {
      console.error("Gemini request failed:", response.status);
      return json(request, env, 200, {
        content: [{ type: "text", text: "I'm temporarily unavailable. Please try again in a moment." }],
      });
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("")
      || "I'm having trouble generating a response. Please try again.";
    return json(request, env, 200, { content: [{ type: "text", text }] });
  } catch (error) {
    console.error("AI Chat error:", error);
    return json(request, env, 200, {
      content: [{ type: "text", text: "I'm temporarily unavailable. Please try again in a moment." }],
    });
  }
}

function isHumanMessage(message = {}) {
  return (message.sender_id || message.senderId) !== "ai-bot";
}

function normalizeMessage(message = {}) {
  const readBy = Array.isArray(message.read_by) ? [...new Set(message.read_by.filter(Boolean))] : [];
  const deliveredTo = Array.isArray(message.delivered_to) ? [...new Set(message.delivered_to.filter(Boolean))] : [];
  const senderId = message.sender_id || message.senderId;
  const receiverId = message.receiver_id || message.receiverId;
  if (senderId && !readBy.includes(senderId)) readBy.push(senderId);
  if (receiverId && !deliveredTo.includes(receiverId)) deliveredTo.push(receiverId);
  return {
    id: message.id,
    senderId,
    text: typeof message.text === "string" ? message.text : "",
    createdAt: Number(message.created_at) || Number(message.createdAt) || Date.now(),
    channel: message.channel || (receiverId ? "dm" : "group"),
    receiverId: receiverId || null,
    read: Boolean(message.read),
    readBy,
    deliveredTo,
  };
}

async function loadMessages(supabase) {
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).filter(isHumanMessage);
}

async function handleMessages(request, env, supabase) {
  if (request.method !== "GET" && request.method !== "POST") {
    return json(request, env, 405, { error: "Method not allowed." });
  }
  if (!supabase) return json(request, env, 503, { error: "Chat is temporarily unavailable." });
  const session = await getSession(request, env, supabase);
  if (!session) return json(request, env, 401, { error: "Please sign in to use chat." });

  if (request.method === "GET") {
    const limited = await rateLimited(request, env, "msg_read", 60, 30000);
    if (limited) return limited;
    const messages = await loadMessages(supabase);
    return json(request, env, 200, { messages: messages.map(normalizeMessage) });
  }

  const { data: body, error } = await readJson(request);
  if (error) return json(request, env, 400, { error });
  const action = sanitize(body.action, 20);
  if (action === "send") {
    const limited = await rateLimited(request, env, "msg_send", 30, 30000);
    if (limited) return limited;
    const incoming = body.message || {};
    const message = normalizeMessage({
      ...incoming,
      senderId: session.user_id,
      text: sanitize(incoming.text, 4000),
    });
    if (message.id && message.text.trim() && isHumanMessage(message)) {
      const { error: saveError } = await supabase.from("messages").upsert({
        id: message.id,
        sender_id: message.senderId,
        text: message.text,
        created_at: message.createdAt || Date.now(),
        channel: message.channel || (message.receiverId ? "dm" : "group"),
        receiver_id: message.receiverId || null,
        read: message.read || false,
        read_by: message.readBy || [],
        delivered_to: message.deliveredTo || [],
      }, { onConflict: "id" });
      if (saveError) throw saveError;
    }
    const messages = await loadMessages(supabase);
    return json(request, env, 200, { messages: messages.map(normalizeMessage) });
  }
  if (action === "read") {
    const limited = await rateLimited(request, env, "msg_read_state", 60, 30000);
    if (limited) return limited;
    const viewerId = session.user_id;
    const channel = sanitize(body.channel, 20);
    const userId = body.userId ? sanitize(body.userId, 100) : null;
    if (!channel) return json(request, env, 400, { error: "Channel is required." });
    const messages = await loadMessages(supabase);
    for (const message of messages) {
      const normalized = normalizeMessage(message);
      const matchesGroup = channel === "group" && normalized.channel === "group" && normalized.senderId !== viewerId;
      const matchesDm = channel === "dm" && normalized.channel === "dm"
        && normalized.senderId === userId && normalized.receiverId === viewerId;
      if (!matchesGroup && !matchesDm) continue;
      const readBy = [...new Set([...(message.read_by || []), viewerId])];
      const { error: updateError } = await supabase.from("messages")
        .update({ read_by: readBy, read: true }).eq("id", normalized.id);
      if (updateError) throw updateError;
    }
    const updated = await loadMessages(supabase);
    return json(request, env, 200, { messages: updated.map(normalizeMessage) });
  }
  if (action === "health") {
    return json(request, env, 200, { ok: true, provider: "supabase", timestamp: Date.now() });
  }
  return json(request, env, 400, { error: "Unknown action." });
}

async function handleData(request, env, supabase) {
  if (!supabase) return json(request, env, 503, { error: "Service temporarily unavailable." });
  let table;
  let action;
  let id;
  let data;
  if (request.method === "GET") {
    table = sanitize(new URL(request.url).searchParams.get("table"), 60);
  } else {
    if (request.method !== "POST") return json(request, env, 405, { error: "Method not allowed." });
    const parsed = await readJson(request);
    if (parsed.error) return json(request, env, 400, { error: "Invalid request." });
    table = sanitize(parsed.data.table, 60);
    action = sanitize(parsed.data.action, 20);
    id = parsed.data.id ? sanitize(parsed.data.id, 100) : null;
    data = parsed.data.data && typeof parsed.data.data === "object" ? parsed.data.data : {};
  }
  if (!table) return json(request, env, 400, { error: "Table name required." });

  if (request.method === "GET") {
    const limited = await rateLimited(request, env, "data_read", 120, 60000);
    if (limited) return limited;
    if (PRIVATE_READ.has(table)) {
      if (!await getSession(request, env, supabase)) return json(request, env, 401, { error: "Please sign in." });
    } else if (!PUBLIC_READ.has(table)) {
      return json(request, env, 403, { error: "Access to this resource is not allowed." });
    }
    const { data: records, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return json(request, env, 200, { records: records || [] });
  }

  const limited = await rateLimited(request, env, "data_write", 60, 60000);
  if (limited) return limited;
  const session = await getSession(request, env, supabase);
  if (!session) return json(request, env, 401, { error: "Please sign in." });
  const role = String(session.role || "").toLowerCase();
  const canWrite = (ADMIN_WRITE.has(table) && (role === "admin" || role === "instructor")) || USER_WRITE.has(table);
  if (!canWrite) return json(request, env, 403, { error: "You don't have permission to modify this resource." });

  if (action === "create") {
    const record = { ...data, id: sanitize(data.id, 100) || crypto.randomUUID(), created_at: data.created_at || Date.now() };
    const { data: created, error } = await supabase.from(table).upsert(record, { onConflict: "id" }).select().single();
    if (error) throw error;
    return json(request, env, 200, { record: created });
  }
  if (action === "update" && id) {
    const { data: updated, error } = await supabase.from(table).update({ ...data, updated_at: Date.now() })
      .eq("id", id).select().single();
    if (error) throw error;
    return json(request, env, 200, { record: updated });
  }
  if (action === "delete" && id) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    return json(request, env, 200, { success: true });
  }

  if (action.startsWith("xyle_")) {
    const secretKey = env.XYLEPAYMENTS_SECRET_KEY;
    if (!secretKey) return json(request, env, 500, { error: "Payment service is not configured." });
    const baseUrl = env.XYLEPAYMENTS_BASE_URL || "https://api.xylepayments.com/api/v1/client";
    let endpoint;
    let options = { headers: { "x-api-key": secretKey } };
    if (action === "xyle_deposit" || action === "xyle_withdrawal") {
      const provider = sanitize(data.provider, 40);
      const account = sanitize(data.account, 40);
      const amount = Number(data.amount);
      if (!provider || !account || !Number.isFinite(amount) || amount <= 0) {
        return json(request, env, 400, { error: "Invalid payment details." });
      }
      endpoint = action === "xyle_deposit" ? "deposit" : "withdrawal";
      options = {
        method: "POST",
        headers: { "x-api-key": secretKey, "Content-Type": "application/json" },
        body: JSON.stringify({ account, amount, provider }),
      };
    } else if (action === "xyle_transactions") {
      const page = Math.max(1, Number(data.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(data.limit) || 10));
      endpoint = `transactions?page=${page}&limit=${limit}`;
    } else if (action === "xyle_check_status") {
      const ref = sanitize(data.ref, 120);
      if (!ref) return json(request, env, 400, { error: "Transaction reference is required." });
      endpoint = `checkTransactionStatus/${encodeURIComponent(ref)}`;
    } else {
      return json(request, env, 400, { error: "Invalid action." });
    }
    const response = await fetch(`${baseUrl}/${endpoint}`, options);
    const result = await response.json().catch(() => ({}));
    return json(request, env, response.status, result);
  }
  return json(request, env, 400, { error: "Invalid action." });
}

async function cloudinarySignature(params, secret) {
  const message = `${Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&")}${secret}`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleProfileUpload(request, env) {
  if (request.method !== "POST") return json(request, env, 405, { error: "Method not allowed" });
  const { data: body, error } = await readJson(request);
  if (error) return json(request, env, 400, { error });
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary bindings are not configured.");
    return json(request, env, 500, { error: "Image upload service is not configured." });
  }
  const file = String(body.file || "");
  const folder = sanitize(body.folder || "kfahad/profile-photos", 200);
  const publicId = sanitize(body.publicId || `profile_${Date.now()}`, 200);
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(file)) {
    return json(request, env, 400, { error: "A valid image data URI is required" });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, public_id: publicId, timestamp };
  const signature = await cloudinarySignature(params, apiSecret);
  const form = new URLSearchParams({
    file,
    folder,
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json(request, env, response.status, {
    error: result.error?.message || "Cloudinary upload failed",
  });
  return json(request, env, 200, {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    assetId: result.asset_id,
  });
}

function parseVideoDataUri(dataUri) {
  const match = String(dataUri || "").match(/^data:(video\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return { mimeType: match[1], bytes };
}

async function ensureVideoBucket(supabase, bucketName) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if ((buckets || []).some((bucket) => bucket.name === bucketName)) return;
  const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true });
  if (createError) throw createError;
}

async function handleCourseVideoUpload(request, env, supabase) {
  if (request.method !== "POST") return json(request, env, 405, { error: "Method not allowed" });
  if (!supabase) return json(request, env, 503, { error: "Video upload service is not configured." });
  const { data: body, error } = await readJson(request);
  if (error) return json(request, env, 400, { error });
  const bucket = env.SUPABASE_STORAGE_BUCKET || "course-videos";
  if (body.action === "health") {
    await ensureVideoBucket(supabase, bucket);
    return json(request, env, 200, { ok: true, provider: "supabase-storage", bucket });
  }
  const parsed = parseVideoDataUri(body.file);
  if (!parsed) return json(request, env, 400, { error: "A valid video data URI is required" });
  const extension = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/mpeg": "mpeg",
    "video/ogg": "ogv",
  }[parsed.mimeType] || "mp4";
  const folder = sanitize(body.folder || "uploads", 200).replace(/^\/+|\/+$/g, "");
  const publicId = sanitize(body.publicId || `course_video_${Date.now()}`, 200).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${folder}/${publicId}.${extension}`;
  await ensureVideoBucket(supabase, bucket);
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, parsed.bytes, {
    contentType: parsed.mimeType,
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error("Could not generate URL for uploaded video.");
  return json(request, env, 200, { secureUrl: publicData.publicUrl, path, bucket });
}

async function proxyNetlify(request, env) {
  const origin = env.AUTH_BACKEND_URL;
  if (!origin) return json(request, env, 503, { error: "Authentication service is not configured." });
  const upstreamUrl = new URL(request.url);
  const base = new URL(origin);
  upstreamUrl.protocol = base.protocol;
  upstreamUrl.host = base.host;
  const headers = new Headers(request.headers);
  const configuredOrigin = env.AUTH_ALLOWED_ORIGIN || env.ALLOWED_ORIGIN?.split(",")[0]?.trim();
  if (configuredOrigin) headers.set("Origin", configuredOrigin);
  headers.delete("CF-Connecting-IP");
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });
  const upstream = await fetch(upstreamRequest);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("Access-Control-Allow-Origin");
  responseHeaders.delete("Access-Control-Allow-Credentials");
  const ownHeaders = responseHeadersForProxy(request, env, responseHeaders);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: ownHeaders,
  });
}

function responseHeadersForProxy(request, env, existing) {
  const headers = responseHeaders(request, env);
  for (const [key, value] of existing.entries()) {
    if (!["access-control-allow-origin", "access-control-allow-credentials", "vary"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  return headers;
}

function withSecurityHeaders(request, env, response) {
  const headers = new Headers(response.headers);
  const security = responseHeaders(request, env);
  for (const name of [
    "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options",
    "Referrer-Policy", "Permissions-Policy", "X-XSS-Protection", "Content-Security-Policy",
  ]) headers.set(name, security.get(name));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!originAllowed(request, env)) return json(request, env, 403, { error: "Request origin is not allowed." });
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(request, env) });
    }
    if (firewallBlocked(request)) return json(request, env, 403, { error: "Access denied." });

    const authRoutes = new Set(["/api/auth", "/api/forgot-password", "/api/reset-password"]);
    if (authRoutes.has(url.pathname)) {
      try {
        return await proxyNetlify(request, env);
      } catch (error) {
        console.error("Authentication backend proxy failed:", error);
        return json(request, env, 502, { error: "Unable to reach the authentication service." });
      }
    }

    try {
      let response;
      if (url.pathname === "/api/chat") {
        response = await handleChat(request, env);
      } else if (url.pathname === "/api/messages") {
        response = await handleMessages(request, env, supabaseClient(env));
      } else if (url.pathname === "/api/data") {
        response = await handleData(request, env, supabaseClient(env));
      } else if (url.pathname === "/api/upload-profile-image") {
        response = await handleProfileUpload(request, env);
      } else if (url.pathname === "/api/upload-course-video") {
        response = await handleCourseVideoUpload(request, env, supabaseClient(env));
      } else if (url.pathname.startsWith("/api/")) {
        response = json(request, env, 404, { error: "API route not found." });
      } else {
        response = await env.ASSETS.fetch(request);
      }
      return withSecurityHeaders(request, env, response);
    } catch (error) {
      console.error("Worker request failed:", error);
      return json(request, env, 500, { error: "Service temporarily unavailable." });
    }
  },
};

export class RateLimiter {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    let input;
    try {
      input = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const { limit, windowMs } = input;
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
      return Response.json({ error: "Invalid rate limit" }, { status: 400 });
    }
    return this.ctx.storage.transaction(async (txn) => {
      const now = Date.now();
      const bucket = await txn.get("bucket");
      const next = !bucket || now >= bucket.resetAt
        ? { count: 1, resetAt: now + windowMs }
        : { count: bucket.count + 1, resetAt: bucket.resetAt };
      await txn.put("bucket", next, { expirationTtl: Math.max(60, Math.ceil(windowMs / 1000) * 2) });
      return Response.json({
        limited: next.count > limit,
        retryAfter: Math.max(1, Math.ceil((next.resetAt - now) / 1000)),
      });
    });
  }
}
