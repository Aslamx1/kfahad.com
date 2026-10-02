const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { securityHeaders, jsonResponse } = require("./security-headers.js");
const { readJson, sanitizeString, firewallCheck, enforceRateLimit, passwordProblem } = require("./_security.js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://stbpjtzeaxxzuzagzhmz.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: securityHeaders(event) };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, {}, event);

  // 1. Firewall check (WAF)
  const fw = firewallCheck(event);
  if (fw.blocked) {
    return jsonResponse(403, { error: "Access denied." }, {}, event);
  }

  // 2. Rate limiting (5 attempts / 15 minutes)
  const limited = enforceRateLimit(event, "reset_password", 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { data: body, error: parseError } = readJson(event);
  if (parseError) return jsonResponse(400, { error: parseError }, {}, event);

  const token = sanitizeString(body.token, 256);
  const password = String(body.password || "");

  if (!token) return jsonResponse(400, { error: "Reset token is missing." }, {}, event);

  const pwError = passwordProblem(password);
  if (pwError) return jsonResponse(400, { error: pwError }, {}, event);

  if (body.password !== body.confirm) return jsonResponse(400, { error: "Passwords do not match." }, {}, event);

  try {
    if (!supabase) return jsonResponse(500, { error: "Database is temporarily unavailable." }, {}, event);

    const { data: reset, error: resetError } = await supabase
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();

    if (resetError || !reset || Number(reset.expires_at) < Date.now()) {
      return jsonResponse(400, { error: "This password reset link is invalid or has expired." }, {}, event);
    }

    const passwordHash = hashPassword(password);
    await supabase.from("users").update({ password_hash: passwordHash, failed_login_count: 0, locked_until: null }).eq("id", reset.user_id);
    await supabase.from("password_resets").update({ used: true }).eq("token", token);

    // Invalidate existing sessions for this user to force re-login with the new password
    await supabase.from("user_sessions").delete().eq("user_id", reset.user_id);

    return jsonResponse(200, { message: "Password updated successfully. You can now sign in." }, {}, event);
  } catch (err) {
    console.error("Reset password error:", err.message);
    return jsonResponse(500, { error: "Failed to reset password. Please try again." }, {}, event);
  }
};
