// ================================================================
//  KFAHAD Academy — Data Function (hardened)
//  Generic table access, but strictly whitelisted + authenticated.
// ================================================================
const crypto = require("crypto");
const S = require("./_security");

function uid() {
  return crypto.randomBytes(16).toString("hex");
}

// Tables anyone may READ (public site content).
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

// Tables that require a valid session to READ (private / per-user).
const PRIVATE_READ = new Set([
  "notifications",
  "learning_progress",
  "appointments",
  "payments",
]);

// Tables only admins/instructors may WRITE (site content).
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

// Tables any signed-in user may WRITE (their own activity).
const USER_WRITE = new Set([
  "notifications",
  "learning_progress",
  "appointments",
  "payments",
]);

exports.handler = async (event) => {
  const pre = S.preflight(event);
  if (pre) return pre;

  // Firewall check
  const fw = S.firewallCheck(event);
  if (fw.blocked) {
    return S.respond(event, 403, { error: "Access denied." });
  }

  if (!S.supabaseConfigured()) {
    return S.fail(event, 503, "Service temporarily unavailable.");
  }

  const sb = S.getSupabase();

  try {
    let table, action, id, data;

    if (event.httpMethod === "GET") {
      const url = new URL(
        event.rawUrl ||
          `http://localhost${event.path || "/.netlify/functions/data"}${
            event.rawQuery ? `?${event.rawQuery}` : ""
          }`
      );
      table = S.sanitizeString(url.searchParams.get("table"), 60);
    } else {
      const { data: body, error } = S.readJson(event);
      if (error) return S.fail(event, 400, "Invalid request.");
      table = S.sanitizeString(body.table, 60);
      action = S.sanitizeString(body.action, 20);
      id = body.id ? S.sanitizeString(body.id, 100) : null;
      data = body.data && typeof body.data === "object" ? body.data : {};
    }

    if (!table) return S.fail(event, 400, "Table name required.");

    // ---- READ --------------------------------------------------
    if (event.httpMethod === "GET") {
      const limited = S.enforceRateLimit(event, "data_read", 120, 60000);
      if (limited) return limited;

      if (PRIVATE_READ.has(table)) {
        const session = await S.getSession(event);
        if (!session) return S.fail(event, 401, "Please sign in.");
      } else if (!PUBLIC_READ.has(table)) {
        return S.fail(event, 403, "Access to this resource is not allowed.");
      }

      const { data: records, error } = await sb
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return S.respond(event, 200, { records: records || [] });
    }

    if (event.httpMethod !== "POST") {
      return S.fail(event, 405, "Method not allowed.");
    }

    // ---- WRITE (create / update / delete) ----------------------
    const limited = S.enforceRateLimit(event, "data_write", 60, 60000);
    if (limited) return limited;

    const session = await S.getSession(event);
    if (!session) return S.fail(event, 401, "Please sign in.");

    const role = String(session.role || "").toLowerCase();
    const isAdminLevel = role === "admin" || role === "instructor";

    const canWrite =
      (ADMIN_WRITE.has(table) && isAdminLevel) || USER_WRITE.has(table);
    if (!canWrite) {
      return S.fail(event, 403, "You don't have permission to modify this resource.");
    }

    if (action === "create") {
      const record = {
        ...data,
        id: S.sanitizeString(data.id, 100) || uid(),
        created_at: data.created_at || Date.now(),
      };
      const { data: created, error } = await sb
        .from(table)
        .upsert(record, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return S.respond(event, 200, { record: created });
    }

    if (action === "update" && id) {
      const { data: updated, error } = await sb
        .from(table)
        .update({ ...data, updated_at: Date.now() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return S.respond(event, 200, { record: updated });
    }

    if (action === "delete" && id) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
      return S.respond(event, 200, { success: true });
    }

    if (action === "xyle_deposit") {
      const provider = S.sanitizeString(data.provider, 40);
      const account = S.sanitizeString(data.account, 40);
      const amount = Number(data.amount);
      if (!provider || !account || !Number.isFinite(amount) || amount <= 0) {
        return S.fail(event, 400, "Invalid payment details.");
      }
      const secretKey = process.env.XYLEPAYMENTS_SECRET_KEY;
      if (!secretKey) return S.fail(event, 500, "Payment service is not configured.");
      const baseUrl = process.env.XYLEPAYMENTS_BASE_URL || "https://api.xylepayments.com/api/v1/client";
      const resp = await fetch(`${baseUrl}/deposit`, {
        method: "POST",
        headers: { "x-api-key": secretKey, "Content-Type": "application/json" },
        body: JSON.stringify({ account, amount, provider }),
      });
      const result = await resp.json().catch(() => ({}));
      return S.respond(event, resp.status, result);
    }

    if (action === "xyle_withdrawal") {
      const provider = S.sanitizeString(data.provider, 40);
      const account = S.sanitizeString(data.account, 40);
      const amount = Number(data.amount);
      if (!provider || !account || !Number.isFinite(amount) || amount <= 0) {
        return S.fail(event, 400, "Invalid withdrawal details.");
      }
      const secretKey = process.env.XYLEPAYMENTS_SECRET_KEY;
      if (!secretKey) return S.fail(event, 500, "Payment service is not configured.");
      const baseUrl = process.env.XYLEPAYMENTS_BASE_URL || "https://api.xylepayments.com/api/v1/client";
      const resp = await fetch(`${baseUrl}/withdrawal`, {
        method: "POST",
        headers: { "x-api-key": secretKey, "Content-Type": "application/json" },
        body: JSON.stringify({ account, amount, provider }),
      });
      const result = await resp.json().catch(() => ({}));
      return S.respond(event, resp.status, result);
    }

    if (action === "xyle_transactions") {
      const secretKey = process.env.XYLEPAYMENTS_SECRET_KEY;
      if (!secretKey) return S.fail(event, 500, "Payment service is not configured.");
      const baseUrl = process.env.XYLEPAYMENTS_BASE_URL || "https://api.xylepayments.com/api/v1/client";
      const page = Number(data.page) || 1;
      const limit = Number(data.limit) || 10;
      const resp = await fetch(`${baseUrl}/transactions?page=${page}&limit=${limit}`, {
        headers: { "x-api-key": secretKey },
      });
      const result = await resp.json().catch(() => ({}));
      return S.respond(event, resp.status, result);
    }

    if (action === "xyle_check_status") {
      const ref = S.sanitizeString(data.ref, 120);
      if (!ref) return S.fail(event, 400, "Transaction reference is required.");
      const secretKey = process.env.XYLEPAYMENTS_SECRET_KEY;
      if (!secretKey) return S.fail(event, 500, "Payment service is not configured.");
      const baseUrl = process.env.XYLEPAYMENTS_BASE_URL || "https://api.xylepayments.com/api/v1/client";
      const resp = await fetch(`${baseUrl}/checkTransactionStatus/${encodeURIComponent(ref)}`, {
        headers: { "x-api-key": secretKey },
      });
      const result = await resp.json().catch(() => ({}));
      return S.respond(event, resp.status, result);
    }

    return S.fail(event, 400, "Invalid action.");
  } catch (error) {
    return S.fail(event, 500, "Something went wrong. Please try again.", error);
  }
};
