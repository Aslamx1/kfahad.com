const { createClient } = require("@supabase/supabase-js");
const { buildHeaders, respond, fail, preflight } = require("./_security.js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://stbpjtzeaxxzuzagzhmz.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const COURSE_VIDEO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "course-videos";

if (!SUPABASE_KEY) {
  console.error("Missing Supabase service key environment variable");
}
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const headers = buildHeaders(event);

function parseVideoDataUri(dataUri) {
  const match = String(dataUri || "").match(/^data:(video\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64Body = match[2];
  return {
    mimeType,
    buffer: Buffer.from(base64Body, "base64")
  };
}

function fileExtensionFromMime(mimeType) {
  const map = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/mpeg": "mpeg",
    "video/ogg": "ogv"
  };
  return map[mimeType] || "mp4";
}

async function ensureBucketExists(bucketName) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(listError.message || "Could not list storage buckets");
  const exists = (buckets || []).some((bucket) => bucket.name === bucketName);
  if (exists) return;
  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: true
  });
  if (createError) throw new Error(createError.message || "Could not create storage bucket");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return preflight(event);
  if (event.httpMethod !== "POST") {
    return respond(event, 405, { error: "Method not allowed" });
  }

  // Firewall check
  const fw = S.firewallCheck(event);
  if (fw.blocked) {
    return S.respond(event, 403, { error: "Access denied." });
  }

  try {
    if (!supabase) {
      throw new Error("Missing Supabase service key environment variable");
    }

    const body = JSON.parse(event.body || "{}");
    if (body.action === "health") {
      await ensureBucketExists(COURSE_VIDEO_BUCKET);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          provider: "supabase-storage",
          bucket: COURSE_VIDEO_BUCKET
        })
      };
    }
    const file = String(body.file || "");
    const folder = String(body.folder || "uploads");
    const publicId = String(body.publicId || `course_video_${Date.now()}`);

    const parsed = parseVideoDataUri(file);
    if (!parsed) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "A valid video data URI is required" }) };
    }

    const ext = fileExtensionFromMime(parsed.mimeType);
    const cleanPublicId = publicId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${folder}/${cleanPublicId}.${ext}`;
    await ensureBucketExists(COURSE_VIDEO_BUCKET);

    const { error: uploadError } = await supabase.storage
      .from(COURSE_VIDEO_BUCKET)
      .upload(path, parsed.buffer, {
        contentType: parsed.mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Supabase Storage upload failed");
    }

    const { data: publicData } = supabase.storage
      .from(COURSE_VIDEO_BUCKET)
      .getPublicUrl(path);

    let secureUrl = publicData?.publicUrl || "";
    if (!secureUrl) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(COURSE_VIDEO_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signedError || !signedData?.signedUrl) {
        throw new Error(signedError?.message || "Could not generate URL for uploaded video");
      }
      secureUrl = signedData.signedUrl;
    }

    return respond(event, 200, {
      secureUrl,
      path,
      bucket: COURSE_VIDEO_BUCKET
    });
  } catch (error) {
    return respond(event, 500, { error: error.message });
  }
};
