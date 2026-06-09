const mysql = require("mysql2/promise");
const { qualifySql, useSplit } = require("./lib/splitSql");

function requireEnv(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val == null || String(val).trim() === "") return fallback;
  return typeof val === "string" ? val.trim() : val;
}

const MYSQL_CONFIG = {
  host: requireEnv("PROFINDER_DB_HOST", "127.0.0.1"),
  port: Number(requireEnv("PROFINDER_DB_PORT", "3306")),
  user: requireEnv("PROFINDER_DB_USER", "root"),
  password: requireEnv("PROFINDER_DB_PASSWORD", ""),
  database: useSplit() ? undefined : requireEnv("PROFINDER_DB_NAME", "profinder"),
  charset: "utf8mb4"
};

async function openDb() {
  const cfg = {
    host: MYSQL_CONFIG.host,
    port: MYSQL_CONFIG.port,
    user: MYSQL_CONFIG.user,
    password: MYSQL_CONFIG.password,
    charset: MYSQL_CONFIG.charset,
    connectTimeout: 15000
  };
  if (MYSQL_CONFIG.database) {
    cfg.database = MYSQL_CONFIG.database;
  }
  return mysql.createConnection(cfg);
}

/** Auth microservice: single schema profinder_auth */
async function openAuthDb() {
  return mysql.createConnection({
    host: MYSQL_CONFIG.host,
    port: MYSQL_CONFIG.port,
    user: MYSQL_CONFIG.user,
    password: MYSQL_CONFIG.password,
    database: requireEnv("PROFINDER_AUTH_SCHEMA", "profinder_auth"),
    charset: "utf8mb4",
    connectTimeout: 15000
  });
}

async function all(conn, sql, params = []) {
  const [rows] = await conn.execute(qualifySql(sql), params);
  return rows;
}

async function get(conn, sql, params = []) {
  const rows = await all(conn, sql, params);
  return rows[0] ?? null;
}

async function run(conn, sql, params = []) {
  const [result] = await conn.execute(qualifySql(sql), params);
  return result;
}

async function close(conn) {
  await conn.end();
}

const DAY_ABBR = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun"
};

function normalizeDay(day) {
  if (!day) return "";
  if (DAY_ABBR[day]) return DAY_ABBR[day];
  const abbr = String(day).trim();
  return abbr;
}

function toTimeHHMM(value) {
  if (value == null) return "";
  const s = String(value);
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

function toMysqlTime(value) {
  const s = String(value || "").trim();
  if (!s) return "";
 if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

function normalizeDayName(dayName) {
  if (!dayName) return dayName;
  const fullToAbbr = {
    'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu',
    'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun'
  };
  return fullToAbbr[dayName] || dayName;
}

module.exports = {
  openDb,
  openAuthDb,
  all,
  get,
  run,
  close,
  normalizeDay,
  MYSQL_CONFIG,
  toTimeHHMM,
  toMysqlTime,
  normalizeDayName,
  useSplit
};

