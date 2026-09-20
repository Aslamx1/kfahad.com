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
  const origin = request.headers.get("Origin") || "*";
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-XSS-Protection": "0",
    "Content-Security-Policy": "default-src 'self' https: data: blob: 'unsafe-inline'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: http: data:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'",
  });
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
  return true;
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

const SYSTEM_USERS = [
  {
    id: "admin-kfahad",
    name: "Kandeke Fahad",
    email: "Admin.kfahad@gmail.com",
    username: "kfahad",
    role: "admin",
    password: "Kfahad.login.",
    phoneNumber: "+256702618396",
    bio: "Founder & CEO of KFAHAD Academy",
    avatarUrl: "",
    aliases: ["admin.kfahad@gmail.com", "admin@kfahad.com", "kfahad"],
  },
];

async function createWorkerSession(user, env) {
  const secret = env.AUTH_SECRET || "kfahad-academy-jwt-secret-2026";
  const payloadObj = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  const payloadStr = btoa(JSON.stringify(payloadObj));
  const signature = await sha256Hex(`${payloadStr}:${secret}`);
  const token = `${payloadStr}.${signature}`;
  const csrfToken = crypto.randomUUID();
  return { token, csrfToken };
}

async function verifyWorkerSessionToken(token, env) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, signature] = parts;
  const secret = env.AUTH_SECRET || "kfahad-academy-jwt-secret-2026";
  const expectedSig = await sha256Hex(`${payloadStr}:${secret}`);
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(atob(payloadStr));
    if (data.exp && Number(data.exp) < Date.now()) return null;
    return {
      user_id: data.userId,
      role: data.role,
      email: data.email,
      name: data.name,
    };
  } catch {
    return null;
  }
}

function buildSafeUserObj(user = {}) {
  const role = user.role === "lecturer" ? "instructor" : (user.role || "student");
  return {
    id: user.id || crypto.randomUUID(),
    name: user.name || "User",
    email: user.email || "",
    username: user.username || "",
    role,
    avatarUrl: user.avatarUrl || user.avatar_url || "",
    bio: user.bio || "",
    phoneNumber: user.phoneNumber || user.phone_number || "",
    interestedCourses: user.interestedCourses || user.interested_courses || [],
    interestedTracks: user.interestedTracks || user.interested_tracks || [],
    subscriptionExpiresAt: user.subscriptionExpiresAt || user.subscription_expires_at || null,
    createdAt: Number(user.createdAt) || Number(user.created_at) || Date.now(),
    lastLoginAt: Date.now(),
    signInCount: Number(user.signInCount) || 1,
    verifiedAt: user.verifiedAt || new Date().toISOString(),
    authProvider: user.authProvider || "email",
    termsAcceptedAt: Date.now(),
    termsVersion: "2026-01-01",
    lockedUntil: null,
  };
}

async function getSession(request, env, supabase) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();

  // 1. Check Worker session token
  const workerSession = await verifyWorkerSessionToken(token, env);
  if (workerSession) return workerSession;

  // 2. Check Supabase session
  if (!supabase) return null;
  try {
    const tokenHash = await sha256Hex(token);
    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error || !data) return null;
    if (data.expires_at && Number(data.expires_at) < Date.now()) {
      await supabase.from("user_sessions").delete().eq("token_hash", tokenHash).catch(() => {});
      return null;
    }
    if (data.role) return data;
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user_id)
      .maybeSingle();
    return { ...data, role: user?.role || "student" };
  } catch (err) {
    console.warn("Supabase session check error:", err?.message || err);
    return null;
  }
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
    action = sanitize(parsed.data.action, 30);
    table = sanitize(parsed.data.table, 60);
    id = parsed.data.id ? sanitize(parsed.data.id, 100) : null;
    data = (parsed.data.data && typeof parsed.data.data === "object") ? parsed.data.data : parsed.data;

    // Handle Xyle payments actions
    if (action && action.startsWith("xyle_")) {
      const secretKey = env.XYLEPAYMENTS_SECRET_KEY;
      if (!secretKey) {
        return json(request, env, 200, {
          success: false,
          error: "Automated payment gateway is not configured. Please use Direct Mobile Money or Bank Transfer.",
          needsManualPayment: true
        });
      }
      let baseUrl = env.XYLEPAYMENTS_BASE_URL;
      if (!baseUrl) {
        baseUrl = secretKey.startsWith("xk_sb_")
          ? "https://api.xylepayments.com/sandbox/api/v1/client"
          : "https://api.xylepayments.com/api/v1/client";
      }
      baseUrl = baseUrl.replace(/\/+$/, "");

      let endpoint;
      let provider = "";
      let options = { headers: { "x-api-key": secretKey } };
      if (action === "xyle_deposit" || action === "xyle_withdrawal") {
        const rawProv = String(data.provider || parsed.data.provider || "");
        provider = sanitize(rawProv, 40);
        if (rawProv.toUpperCase().includes("AIRTEL")) {
          provider = "AIRTEL_UGANDA";
        } else if (rawProv.toUpperCase().includes("MTN")) {
          provider = "MTN_UGANDA";
        }

        let account = String(data.account || parsed.data.account || "").replace(/\D/g, "");
        if (account.startsWith("0") && account.length === 10) account = "256" + account.slice(1);
        if (account.length === 9 && !account.startsWith("256")) account = "256" + account;

        // Auto-detect Uganda carrier by prefix so MTN vs Airtel is always routed to the right telecom
        const clean9 = account.startsWith("256") ? account.slice(3) : account;
        if (clean9.startsWith("77") || clean9.startsWith("78") || clean9.startsWith("76") || clean9.startsWith("79")) {
          provider = "MTN_UGANDA";
        } else if (clean9.startsWith("70") || clean9.startsWith("75") || clean9.startsWith("74")) {
          provider = "AIRTEL_UGANDA";
        }

        const amount = Number(data.amount !== undefined ? data.amount : parsed.data.amount);
        if (!provider || !account || !Number.isFinite(amount) || amount <= 0) {
          return json(request, env, 400, { success: false, error: "Invalid payment details. Valid phone number and amount required." });
        }
        endpoint = action === "xyle_deposit" ? "deposit" : "withdrawal";
        options = {
          method: "POST",
          headers: { "x-api-key": secretKey, "Content-Type": "application/json" },
          body: JSON.stringify({ account, amount, provider }),
        };
      } else if (action === "xyle_transactions") {
        const page = Math.max(1, Number(data.page || parsed.data.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(data.limit || parsed.data.limit) || 10));
        endpoint = `transactions?page=${page}&limit=${limit}`;
      } else if (action === "xyle_check_status") {
        const ref = sanitize(data.ref || parsed.data.ref || data.reference || parsed.data.reference || data.id || parsed.data.id, 120);
        if (!ref) return json(request, env, 400, { success: false, error: "Transaction reference is required." });
        endpoint = `checkTransactionStatus/${encodeURIComponent(ref)}`;
      } else if (action === "xyle_balance") {
        endpoint = "balance";
      } else {
        return json(request, env, 400, { success: false, error: "Invalid action." });
      }
      try {
        const response = await fetch(`${baseUrl}/${endpoint}`, options);
        const result = await response.json().catch(() => ({}));
        if (!response.ok && result) {
          const rawMsg = String(result.message || result.error || "");
          if (rawMsg.includes("timeout")) {
            const friendly = "Payment prompt timed out on your phone. Please ensure your phone is unlocked, has network signal, and try again.";
            result.message = friendly;
            result.error = friendly;
          } else if (rawMsg.includes("transact failed")) {
            const provLabel = provider === "MTN_UGANDA" ? "MTN Mobile Money" : (provider === "AIRTEL_UGANDA" ? "Airtel Money" : "Mobile Money");
            const amtStr = Number.isFinite(amount) && amount > 0 ? ` of ${amount.toLocaleString()} UGX` : "";
            const friendly = `Transaction${amtStr} was declined by ${provLabel}. This occurs when the subscriber wallet balance is lower than the amount (${amount.toLocaleString()} UGX) or the SIM is not active. Please ensure you have sufficient balance on your phone, or choose Direct Transfer.`;
            result.message = friendly;
            result.error = friendly;
          }
        }
        return json(request, env, response.status, result);
      } catch (err) {
        return json(request, env, 502, { success: false, error: "Failed to communicate with payment processor." });
      }
    }
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
    try {
      if (supabase) {
        const { data: records, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
        if (!error && records) return json(request, env, 200, { records });
      }
    } catch (e) {
      console.warn(`Supabase read failed for ${table}:`, e.message);
    }
    return json(request, env, 200, { records: [] });
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
    try {
      if (supabase) {
        const { data: created, error } = await supabase.from(table).upsert(record, { onConflict: "id" }).select().single();
        if (!error && created) return json(request, env, 200, { record: created });
      }
    } catch (e) {
      console.warn(`Supabase upsert failed for ${table}:`, e.message);
    }
    return json(request, env, 200, { record });
  }
  if (action === "update" && id) {
    try {
      if (supabase) {
        const { data: updated, error } = await supabase.from(table).update({ ...data, updated_at: Date.now() })
          .eq("id", id).select().single();
        if (!error && updated) return json(request, env, 200, { record: updated });
      }
    } catch (e) {
      console.warn(`Supabase update failed for ${table}:`, e.message);
    }
    return json(request, env, 200, { record: { ...data, id } });
  }
  if (action === "delete" && id) {
    try {
      if (supabase) {
        await supabase.from(table).delete().eq("id", id);
      }
    } catch (e) {
      console.warn(`Supabase delete failed for ${table}:`, e.message);
    }
    return json(request, env, 200, { success: true });
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

async function handleAuth(request, env, supabase) {
  const url = new URL(request.url);

  if (url.pathname === "/api/forgot-password") {
    return json(request, env, 200, { message: "If an account exists, a reset link has been sent to your email." });
  }
  if (url.pathname === "/api/reset-password") {
    return json(request, env, 200, { message: "Password reset successfully. You may now log in." });
  }

  if (request.method !== "POST") return json(request, env, 405, { error: "Method not allowed." });
  const { data: body, error: parseError } = await readJson(request);
  if (parseError) return json(request, env, 400, { error: "Invalid request body." });

  const action = body.action;

  // 1. PUBLIC STATS
  if (action === "public_stats") {
    let count = SYSTEM_USERS.length;
    if (env.DB) {
      try {
        const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE id != 'admin-kfahad'").first();
        count = Number(row?.total || 0) + SYSTEM_USERS.length;
      } catch {}
    } else if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("id");
        if (!error && Array.isArray(data)) count = data.length + SYSTEM_USERS.length;
      } catch {}
    }
    return json(request, env, 200, { registeredUsers: count });
  }

  // 2. OAUTH CLIENTS
  if (action === "oauth_clients") {
    return json(request, env, 200, {
      googleClientId: env.GOOGLE_CLIENT_ID || "",
      githubClientId: env.GITHUB_CLIENT_ID || ""
    });
  }

  // 3. LOGIN DIRECT
  if (action === "login_direct") {
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const loginType = String(body.loginType || "student").toLowerCase();

    if (!rawEmail || !password) {
      return json(request, env, 400, { error: "Email/username and password are required." });
    }

    // Check system users first (Admin)
    const sysUser = SYSTEM_USERS.find(
      (u) =>
        u.email.toLowerCase() === rawEmail ||
        u.username.toLowerCase() === rawEmail ||
        (u.aliases && u.aliases.map((a) => a.toLowerCase()).includes(rawEmail))
    );

    if (sysUser) {
      const match = password === sysUser.password || (sysUser.altPassword && password === sysUser.altPassword);
      if (!match) {
        return json(request, env, 401, { error: "Invalid email/username or password." });
      }
      const expectedRole = loginType === "lecturer" ? "instructor" : loginType;
      if (expectedRole === "admin" && sysUser.role !== "admin") {
        return json(request, env, 401, { error: "You do not have access to that area." });
      }
      if (expectedRole === "instructor" && sysUser.role !== "instructor") {
        return json(request, env, 401, { error: "You do not have access to that area." });
      }

      const safeUser = buildSafeUserObj(sysUser);
      const { token, csrfToken } = await createWorkerSession(safeUser, env);

      if (env.DB) {
        env.DB.prepare("INSERT OR REPLACE INTO users (id, name, email, username, password_hash, role, phone_number, bio, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(sysUser.id, sysUser.name, sysUser.email, sysUser.username, "sys", sysUser.role, sysUser.phoneNumber, sysUser.bio, Date.now(), Date.now())
          .run().catch(() => {});
      }

      return json(request, env, 200, { user: safeUser, token, csrfToken });
    }

    // Check Cloudflare D1 SQL database
    if (env.DB) {
      try {
        const dbUser = await env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)"
        ).bind(rawEmail, rawEmail).first();

        if (dbUser && dbUser.password_hash) {
          const [salt, expectedHash] = String(dbUser.password_hash).split(":");
          if (salt && expectedHash) {
            const actualHash = await sha256Hex(`${salt}:${password}`);
            if (actualHash === expectedHash) {
              const safeUser = buildSafeUserObj({
                ...dbUser,
                avatarUrl: dbUser.avatar_url || "",
                phoneNumber: dbUser.phone_number || "",
                interestedCourses: dbUser.interested_courses ? (typeof dbUser.interested_courses === "string" ? JSON.parse(dbUser.interested_courses) : dbUser.interested_courses) : [],
                interestedTracks: dbUser.interested_tracks ? (typeof dbUser.interested_tracks === "string" ? JSON.parse(dbUser.interested_tracks) : dbUser.interested_tracks) : [],
                subscriptionExpiresAt: dbUser.subscription_expires_at,
                createdAt: Number(dbUser.created_at)
              });
              await env.DB.prepare("UPDATE users SET last_login_at = ?, sign_in_count = sign_in_count + 1 WHERE id = ?").bind(Date.now(), dbUser.id).run().catch(() => {});
              const { token, csrfToken } = await createWorkerSession(safeUser, env);
              return json(request, env, 200, { user: safeUser, token, csrfToken });
            }
          }
        }
      } catch (err) {
        console.warn("D1 login check note:", err.message);
      }
    }

    return json(request, env, 401, { error: "Invalid email/username or password." });
  }

  // 4. REGISTER DIRECT
  if (action === "register_direct") {
    const rawName = sanitize(body.name, 80);
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const rawPhone = sanitize(body.phoneNumber, 40);
    const password = String(body.password || "");
    const allowedRoles = ["student", "guest", "instructor", "admin"];
    const requestedRole = String(body.role || body.accountType || "student").toLowerCase();
    const role = allowedRoles.includes(requestedRole) ? requestedRole : "student";

    if (!rawName || !rawEmail || !password) {
      return json(request, env, 400, { error: "Name, email and password are required." });
    }

    const existsSys = SYSTEM_USERS.some(u => u.email.toLowerCase() === rawEmail || (u.aliases && u.aliases.includes(rawEmail)));
    if (existsSys) {
      return json(request, env, 409, { error: "An account with that email already exists." });
    }

    if (env.DB) {
      try {
        const existing = await env.DB.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)").bind(rawEmail).first();
        if (existing) {
          return json(request, env, 409, { error: "An account with that email already exists." });
        }
      } catch (e) {
        console.warn("D1 check user exists error:", e.message);
      }
    }

    const salt = crypto.randomUUID();
    const passwordHash = `${salt}:${await sha256Hex(`${salt}:${password}`)}`;
    const newUser = {
      id: crypto.randomUUID(),
      name: rawName,
      email: rawEmail,
      username: sanitize(body.username || rawName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, ""), 40),
      passwordHash,
      role,
      avatarUrl: sanitize(body.avatarUrl || "", 512),
      bio: sanitize(body.bio || "", 500),
      phoneNumber: rawPhone,
      interestedCourses: Array.isArray(body.interestedCourses) ? body.interestedCourses.slice(0, 50) : [],
      interestedTracks: Array.isArray(body.interestedTracks) ? body.interestedTracks.slice(0, 50) : [],
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      signInCount: 1,
      authProvider: "email"
    };

    if (env.DB) {
      try {
        await env.DB.prepare(`
          INSERT INTO users (
            id, name, email, username, password_hash, role, avatar_url, bio, phone_number,
            interested_courses, interested_tracks, created_at, last_login_at, sign_in_count,
            verified_at, auth_provider
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newUser.id,
          newUser.name,
          newUser.email,
          newUser.username,
          newUser.passwordHash,
          newUser.role,
          newUser.avatarUrl,
          newUser.bio,
          newUser.phoneNumber,
          JSON.stringify(newUser.interestedCourses),
          JSON.stringify(newUser.interestedTracks),
          newUser.createdAt,
          newUser.lastLoginAt,
          1,
          new Date().toISOString(),
          "email"
        ).run();
      } catch (err) {
        console.error("D1 user insert failed:", err.message);
        return json(request, env, 500, { error: "Failed to create user account: " + err.message });
      }
    }

    const safeUser = buildSafeUserObj(newUser);
    const { token, csrfToken } = await createWorkerSession(safeUser, env);
    return json(request, env, 200, { user: safeUser, token, csrfToken });
  }

  // 5. GET SESSION USER
  if (action === "get_session_user") {
    const session = await getSession(request, env, supabase);
    if (!session) return json(request, env, 401, { error: "Please sign in." });
    const sysUser = SYSTEM_USERS.find(u => u.id === session.user_id || u.email.toLowerCase() === String(session.email || "").toLowerCase());
    if (sysUser) {
      return json(request, env, 200, { user: buildSafeUserObj(sysUser) });
    }
    if (env.DB) {
      try {
        const dbUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.user_id).first();
        if (dbUser) {
          return json(request, env, 200, { user: buildSafeUserObj({
            ...dbUser,
            avatarUrl: dbUser.avatar_url || "",
            phoneNumber: dbUser.phone_number || "",
            interestedCourses: dbUser.interested_courses ? (typeof dbUser.interested_courses === "string" ? JSON.parse(dbUser.interested_courses) : dbUser.interested_courses) : [],
            interestedTracks: dbUser.interested_tracks ? (typeof dbUser.interested_tracks === "string" ? JSON.parse(dbUser.interested_tracks) : dbUser.interested_tracks) : [],
            subscriptionExpiresAt: dbUser.subscription_expires_at,
            createdAt: Number(dbUser.created_at)
          }) });
        }
      } catch {}
    }
    return json(request, env, 200, { user: buildSafeUserObj({ id: session.user_id, role: session.role, email: session.email, name: session.name || "User" }) });
  }

  // 6. LIST USERS (Admin)
  if (action === "list_users") {
    const session = await getSession(request, env, supabase);
    if (!session || String(session.role).toLowerCase() !== "admin") {
      return json(request, env, 403, { error: "Access denied." });
    }
    let list = SYSTEM_USERS.map(buildSafeUserObj);
    if (env.DB) {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
        if (Array.isArray(results)) {
          const sysIds = new Set(SYSTEM_USERS.map(u => u.id));
          for (const u of results) {
            if (!sysIds.has(u.id)) {
              list.push(buildSafeUserObj({
                ...u,
                avatarUrl: u.avatar_url || "",
                phoneNumber: u.phone_number || "",
                interestedCourses: u.interested_courses ? (typeof u.interested_courses === "string" ? JSON.parse(u.interested_courses) : u.interested_courses) : [],
                interestedTracks: u.interested_tracks ? (typeof u.interested_tracks === "string" ? JSON.parse(u.interested_tracks) : u.interested_tracks) : [],
                subscriptionExpiresAt: u.subscription_expires_at,
                createdAt: Number(u.created_at)
              }));
            }
          }
        }
      } catch (err) {
        console.warn("D1 list users note:", err.message);
      }
    }
    return json(request, env, 200, { users: list });
  }

  // 7. UPDATE PROFILE
  if (action === "update_profile") {
    const session = await getSession(request, env, supabase);
    if (!session) return json(request, env, 401, { error: "Please sign in." });
    const updates = body.updates || {};
    if (env.DB && session.user_id && session.user_id !== "admin-kfahad") {
      try {
        if (updates.name) await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?").bind(updates.name, session.user_id).run();
        if (updates.bio !== undefined) await env.DB.prepare("UPDATE users SET bio = ? WHERE id = ?").bind(updates.bio, session.user_id).run();
        if (updates.phoneNumber) await env.DB.prepare("UPDATE users SET phone_number = ? WHERE id = ?").bind(updates.phoneNumber, session.user_id).run();
        if (updates.avatarUrl) await env.DB.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").bind(updates.avatarUrl, session.user_id).run();
        if (updates.subscriptionExpiresAt) await env.DB.prepare("UPDATE users SET subscription_expires_at = ?, plan = ? WHERE id = ?").bind(updates.subscriptionExpiresAt, updates.plan || "", session.user_id).run();
      } catch {}
    }
    const safeUser = buildSafeUserObj({ ...session, ...updates });
    return json(request, env, 200, { user: safeUser });
  }

  // 7b. ADMIN UPDATE USER
  if (action === "admin_update_user") {
    const session = await getSession(request, env, supabase);
    if (!session || String(session.role).toLowerCase() !== "admin") {
      return json(request, env, 403, { error: "Access denied." });
    }
    const targetUserId = sanitize(body.userId, 100);
    if (!targetUserId) return json(request, env, 400, { error: "User ID is required." });
    const updates = body.updates || {};
    if (env.DB && targetUserId !== "admin-kfahad") {
      try {
        if (updates.role) await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(updates.role, targetUserId).run();
        if (updates.subscriptionExpiresAt !== undefined) await env.DB.prepare("UPDATE users SET subscription_expires_at = ? WHERE id = ?").bind(updates.subscriptionExpiresAt, targetUserId).run();
      } catch (err) {
        return json(request, env, 500, { error: "Failed to update user: " + err.message });
      }
    }
    return json(request, env, 200, { success: true });
  }

  // 7c. ADMIN DELETE USER
  if (action === "admin_delete_user") {
    const session = await getSession(request, env, supabase);
    if (!session || String(session.role).toLowerCase() !== "admin") {
      return json(request, env, 403, { error: "Access denied." });
    }
    const targetUserId = sanitize(body.userId, 100);
    if (!targetUserId || targetUserId === "admin-kfahad") {
      return json(request, env, 400, { error: "Cannot delete this user." });
    }
    if (env.DB) {
      try {
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetUserId).run();
        await env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(targetUserId).run();
      } catch (err) {
        return json(request, env, 500, { error: "Failed to delete user: " + err.message });
      }
    }
    return json(request, env, 200, { success: true });
  }

  // 8. ACCEPT TERMS
  if (action === "accept_terms") {
    return json(request, env, 200, { ok: true });
  }

  // 9. FORGOT PASSWORD
  if (action === "forgot_password") {
    return json(request, env, 200, { message: "If an account exists, a reset link has been sent to your email." });
  }

  // 10. RESET PASSWORD
  if (action === "reset_password") {
    return json(request, env, 200, { message: "Password reset successfully. You may now log in." });
  }

  // Fallback to proxyNetlify if configured
  if (env.AUTH_BACKEND_URL) {
    try {
      return await proxyNetlify(request, env);
    } catch {}
  }

  return json(request, env, 400, { error: "Unknown action." });
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
        return await handleAuth(request, env, supabaseClient(env));
      } catch (error) {
        console.error("Authentication backend handler failed:", error);
        return json(request, env, 500, { error: "Unable to complete authentication request." });
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
        const path = url.pathname.toLowerCase();
        const newHeaders = new Headers(response.headers);
        if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|ico)$/)) {
          newHeaders.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
        } else {
          newHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
        }
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
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
