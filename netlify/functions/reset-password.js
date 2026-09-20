const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { securityHeaders, jsonResponse, readJson, sanitizeString, isValidEmail, firewallCheck } = require("./_security.js");

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

  // Firewall check
  const fw = firewallCheck(event);
  if (fw.blocked) {
    return jsonResponse(403, { error: "Access denied." }, {}, event);
  }

  const { data: body, error: parseError } = readJson(event);
  if (parseError) return jsonResponse(400, { error: parseError });

  const token = sanitizeString(body.token, 256);
  const password = String(body.password || "");

  if (!token) return jsonResponse(400, { error: "Reset token is missing." });
  if (password.length < 8) return jsonResponse(400, { error: "Password must be at least 8 characters." });
  if (body.password !== body.confirm) return jsonResponse(400, { error: "Passwords do not match." });

  try {
    if (!supabase) return jsonResponse(500, { error: "Database is not configured." });

    const { data: reset, error: resetError } = await supabase
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();

    if (resetError || !reset) return jsonResponse(400, { error: "Invalid or expired reset link." });
    if (Number(reset.expires_at) < Date.now()) return jsonResponse(400, { error: "Invalid or expired reset link." });

    const passwordHash = hashPassword(password);
    await supabase.from("users").update({ password_hash: passwordHash }).eq("id", reset.user_id);
    await supabase.from("password_resets").update({ used: true }).eq("token", token);

    return jsonResponse(200, { message: "Password reset successfully. You may now log in." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    return jsonResponse(500, { error: "Something went wrong. Please try again." });
  }
};
