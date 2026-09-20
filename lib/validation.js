const TEST = /[a-z]/;

function sanitizeString(input, maxLength) {
  const limit = typeof maxLength === "number" ? maxLength : 255;
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/\0/g, "")
    .trim()
    .slice(0, limit);
}

function validateEmail(email) {
  if (typeof email !== "string") return false;
  const value = email.trim().toLowerCase();
  if (value.length === 0 || value.length > 254) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value)) return false;
  if (value.includes("..")) return false;
  const [local, domain] = value.split("@");
  if (local.length > 64 || domain.length > 255) return false;
  return true;
}

function validatePhone(phone) {
  if (typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s()-]/g, "");
  if (cleaned.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(cleaned);
  }
  return /^[1-9]\d{7,14}$/.test(cleaned);
}

function validatePassword(password) {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;
  if (password.length > 128) return false;
  if (/\s/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

function validateAmount(amount) {
  if (typeof amount === "string") {
    if (!/^\d+$/.test(amount.trim())) return false;
    amount = Number(amount.trim());
  }
  if (typeof amount !== "number" || !Number.isFinite(amount)) return false;
  return Number.isInteger(amount) && amount > 0;
}

function sanitizeHtml(input) {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ALLOWED_TABLES = [
  "users", "user_sessions", "password_resets", "payments", "messages",
  "courses", "blog_posts", "jobs", "knowledge_base", "live_sessions",
  "student_reviews", "appointments", "examples", "pathways", "notifications"
];

function validateTableName(name) {
  return typeof name === "string" && ALLOWED_TABLES.includes(name);
}

module.exports = {
  sanitizeString,
  validateEmail,
  validatePhone,
  validatePassword,
  validateAmount,
  sanitizeHtml,
  validateTableName,
  ALLOWED_TABLES
};

