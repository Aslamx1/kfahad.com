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

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  type TEXT,
  date TEXT,
  time TEXT,
  topic TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Pending',
  admin_reply TEXT,
  requested_at INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS student_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  student_name TEXT,
  student_email TEXT,
  avatar_url TEXT,
  course_titles TEXT,
  rating INTEGER DEFAULT 5,
  text TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  completed_lessons TEXT,
  last_watched INTEGER,
  percent_complete INTEGER DEFAULT 0,
  updated_at INTEGER,
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
