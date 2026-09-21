const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { securityHeaders, jsonResponse, readJson, sanitizeString, normalizeEmail, isValidEmail, firewallCheck, enforceRateLimit } = require("./_security.js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://stbpjtzeaxxzuzagzhmz.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "no-reply@kfahad.academy";
const APP_URL = process.env.APP_URL || process.env.URL || "https://kfahad.com";

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: securityHeaders(event) };
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, {}, event);

  // 1. Firewall check (WAF)
  const fw = firewallCheck(event);
  if (fw.blocked) {
    return jsonResponse(403, { error: "Access denied." }, {}, event);
  }

  // 2. Rate limiting (5 requests / 15 minutes)
  const limited = enforceRateLimit(event, "forgot_password", 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { data: body, error: parseError } = readJson(event);
  if (parseError) return jsonResponse(400, { error: parseError }, {}, event);

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return jsonResponse(400, { error: "Please provide a valid email address." }, {}, event);

  try {
    let user = null;
    if (supabase) {
      const { data } = await supabase.from("users").select("id, email").eq("email", email).maybeSingle();
      user = data || null;
    }

    // Generic response regardless of whether account exists (prevents email enumeration attacks)
    if (!user) {
      return jsonResponse(200, { message: "If an account exists, a reset link has been sent to your email." }, {}, event);
    }

    const token = generateResetToken();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    if (supabase) {
      await supabase.from("password_resets").insert({
        user_id: user.id,
        email: user.email,
        token,
        expires_at: expiresAt,
        used: false,
      });
    }

    const resetLink = `${APP_URL}/#reset-password?token=${token}`;

    if (RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: user.email,
            subject: "Reset your KFAHAD Academy password",
            html: `<p>Hello,</p><p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
          }),
        });
      } catch (mailErr) {
        console.error("Resend email failed:", mailErr.message);
      }
    }

    return jsonResponse(200, { message: "If an account exists, a reset link has been sent to your email." }, {}, event);
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return jsonResponse(500, { error: "Something went wrong. Please try again." }, {}, event);
  }
};
