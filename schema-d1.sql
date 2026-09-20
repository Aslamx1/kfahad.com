CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  bio TEXT,
  phone_number TEXT,
  interested_courses TEXT,
  interested_tracks TEXT,
  subscription_expires_at TEXT,
  plan TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  sign_in_count INTEGER DEFAULT 1,
  verified_at TEXT,
  auth_provider TEXT DEFAULT 'email'
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  student_name TEXT,
  student_email TEXT,
  plan TEXT,
  plan_id TEXT,
  amount REAL,
  provider TEXT,
  phone_number TEXT,
  recipient_number TEXT,
  recipient_name TEXT,
  reference TEXT,
  status TEXT,
  date TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
