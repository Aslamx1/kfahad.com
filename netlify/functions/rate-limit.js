const { getStore } = require("@netlify/blobs");

// ================================================================
// RATE LIMITING (persistent across function instances via Blobs)
// ================================================================

function getClientIp(event = {}) {
  const headers = event.headers || {};
  const normalize = (k) => headers[k.toLowerCase()] ?? headers[k];
  const xff = normalize("x-nf-client-connection-ip") || normalize("x-forwarded-for") || "";
  if (typeof xff === "string" && xff.length) {
    return xff.split(",")[0].trim();
  }
  return normalize("x-forwarded-for") || "unknown";
}

// Returns a Store, or null when Blobs is unavailable (fails open).
function getStoreSafe() {
  try {
    return getStore({ name: "kfa_rate_limit", consistency: "strong" });
  } catch (err) {
    console.warn("Rate-limit store unavailable, failing open:", err.message);
    return null;
  }
}

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 10;
  const keyPrefix = options.keyPrefix || "rl";
  const skipSuccessfulRequests = Boolean(options.skipSuccessfulRequests);

  async function check(event = {}, context) {
    const store = getStoreSafe();
    if (!store) return { limited: false, remaining: max, count: 0, key: null };

    const ip = getClientIp(event);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = null;
    try {
      record = await store.get(key, { type: "json" });
    } catch (err) {
      console.warn("Rate-limit read failed, failing open:", err.message);
      return { limited: false, remaining: max, count: 0, key: null };
    }

    let count = 1;
    let windowStart = now;
    if (record && typeof record.windowStart === "number" && now - record.windowStart < windowMs) {
      count = (record.count || 0) + 1;
      windowStart = record.windowStart;
    }

    const remaining = Math.max(0, max - count);
    const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));

    if (count > max) {
      return { limited: true, count, remaining: 0, retryAfter, key };
    }

    try {
      await store.set(key, { count, windowStart }, { metadata: { key } });
    } catch (err) {
      console.warn("Rate-limit write failed:", err.message);
    }

    return { limited: false, count, remaining, retryAfter, key };
  }

  // When skipSuccessfulRequests is enabled, call this after a successful
  // (non-error) response to roll back one increment for the key.
  async function decrement(key) {
    if (!key || !skipSuccessfulRequests) return;
    const store = getStoreSafe();
    if (!store) return;
    try {
      const record = await store.get(key, { type: "json" });
      if (record && record.count > 0) {
        await store.set(key, { ...record, count: record.count - 1 }, { metadata: { key } });
      }
    } catch (err) {
      console.warn("Rate-limit decrement failed:", err.message);
    }
  }

  check.decrement = decrement;
  check.skipSuccessfulRequests = skipSuccessfulRequests;
  return check;
}

function rateLimitResponse(headers = {}, retryAfter = 60) {
  return {
    statusCode: 429,
    headers: {
      ...headers,
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": "exceeded"
    },
    body: JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." })
  };
}

module.exports = { createRateLimiter, rateLimitResponse, getClientIp };
