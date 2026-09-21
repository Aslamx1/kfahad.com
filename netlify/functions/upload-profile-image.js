const crypto = require("crypto");
const { buildHeaders, preflight, respond, firewallCheck, enforceRateLimit, getSession } = require("./_security.js");

function buildSignature(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return preflight(event);
  if (event.httpMethod !== "POST") return respond(event, 405, { error: "Method not allowed" });

  // 1. Firewall check (WAF)
  const fw = firewallCheck(event);
  if (fw.blocked) {
    return respond(event, 403, { error: "Access denied." });
  }

  // 2. Rate limiting (5 uploads / minute)
  const limited = enforceRateLimit(event, "profile_upload", 5, 60000);
  if (limited) return limited;

  // 3. Authentication check
  const session = await getSession(event);
  if (!session) {
    return respond(event, 401, { error: "Please sign in to upload photos." });
  }

  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary environment variables");
    }

    const body = JSON.parse(event.body || "{}");
    const file = String(body.file || "");
    const folder = String(body.folder || "kfahad/profile-photos").replace(/[^a-zA-Z0-9_\/-]/g, "");
    const publicId = String(body.publicId || `profile_${session.user_id || session.userId || Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_");

    if (!file.startsWith("data:image/")) {
      return respond(event, 400, { error: "A valid image data URI is required." });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder, public_id: publicId, timestamp };
    const signature = buildSignature(params, apiSecret);

    const form = new URLSearchParams();
    form.set("file", file);
    form.set("folder", folder);
    form.set("public_id", publicId);
    form.set("timestamp", String(timestamp));
    form.set("api_key", apiKey);
    form.set("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: form
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "Cloudinary upload failed");
    }

    return respond(event, 200, {
      secureUrl: data.secure_url,
      publicId: data.public_id,
      assetId: data.asset_id
    });
  } catch (error) {
    console.error("Profile image upload error:", error.message);
    return respond(event, 500, { error: "Failed to upload image. Please try again." });
  }
};
