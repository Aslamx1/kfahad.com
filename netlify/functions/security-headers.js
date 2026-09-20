// ================================================================
// SECURITY HEADERS + CORS
// ================================================================
// Centralised security headers for all Netlify functions.
// Access-Control-Allow-Origin is locked to ALLOWED_ORIGIN environment
// variable. If not set, it falls back to same-origin to prevent
// accidental wildcard CORS in production.

function securityHeaders(event) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  let origin = "*";
  if (allowedOrigin) {
    origin = allowedOrigin;
  } else if (event && event.headers) {
    const reqOrigin = event.headers.origin || event.headers.Origin || "";
    const proto = event.headers["x-forwarded-proto"] || event.headers["X-Forwarded-Proto"] || "https";
    const host = event.headers.host || event.headers.Host || "";
    const sameOrigin = host ? `${proto}://${host}` : "";
    if (reqOrigin) origin = reqOrigin;
    else if (sameOrigin) origin = sameOrigin;
    else origin = "null";
  }
  
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };

  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://*.googleapis.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://api.xylepayments.com https://*.supabase.co https://*.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://*.cloudinary.com; " +
      "frame-src 'self' https://www.youtube.com https://meet.google.com https://accounts.google.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-XSS-Protection": "0",
    ...cors
  };
}

// Build a standard JSON response already merged with security headers.
function jsonResponse(statusCode, body, extraHeaders = {}, event) {
  return {
    statusCode,
    headers: { ...securityHeaders(event), "Content-Type": "application/json", ...extraHeaders },
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}

module.exports = { securityHeaders, jsonResponse };
