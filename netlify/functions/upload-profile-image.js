const crypto = require("crypto");
const { buildHeaders, preflight, respond, firewallCheck } = require("./_security.js");

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

  // Firewall check
  const fw = firewallCheck(event);
  if (fw.blocked) {
    return respond(event, 403, { error: "Access denied." });
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
    const folder = String(body.folder || "kfahad/profile-photos");
    const publicId = String(body.publicId || `profile_${Date.now()}`);

    if (!file.startsWith("data:image/")) {
      return respond(event, 400, { error: "A valid image data URI is required" });
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

    return {
      statusCode: 200,
      headers: buildHeaders(event),
      body: JSON.stringify({
        secureUrl: data.secure_url,
        publicId: data.public_id,
        assetId: data.asset_id
      })
    };
  } catch (error) {
    return respond(event, 500, { error: error.message });
  }
};
