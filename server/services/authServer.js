/**
 * Auth microservice — profinder_auth only.
 * Internal HTTP for the gateway (not browser-facing except via gateway).
 */
const path = require("node:path");
const express = require("express");
const bcrypt = require("bcryptjs");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { openAuthDb, get, run, close } = require("../db");

const PORT = Number(process.env.AUTH_PORT || process.env.PORT || 3001);

let adminsMap = null;

function normalizeStoredPassword(value) {
  if (value == null) return "";
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value);
}

async function loadAdminsMap(conn) {
  const schema = process.env.PROFINDER_AUTH_SCHEMA || "profinder_auth";
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admins' ORDER BY ORDINAL_POSITION`,
    [schema]
  );
  const cols = rows.map((r) => r.COLUMN_NAME);
  const set = new Set(cols.map((c) => c.toLowerCase()));
  const pick = (cands) => cands.find((c) => set.has(c.toLowerCase())) || null;
  adminsMap = {
    id: pick(["id", "admin_id"]) || "id",
    username: pick(["username", "user", "login"]) || "username",
    password: pick(["password", "password_hash", "hash"]) || "password",
    email: pick(["email", "admin_email"]),
    first_name: pick(["first_name", "firstname", "first"]),
    last_name: pick(["last_name", "lastname", "last"]),
    is_super_admin: pick(["is_super_admin", "super_admin", "is_superuser"])
  };
}

async function main() {
  const conn = await openAuthDb();
  try {
    await loadAdminsMap(conn);
    const [cnt] = await conn.execute("SELECT COUNT(*) AS n FROM admins");
    const n = Number(cnt[0]?.n ?? 0);
    if (n === 0) {
      console.warn(
        "profinder_auth.admins is empty — login will fail until you insert a user (e.g. re-create the DB volume so docker/mysql-init-micro runs, or run UPDATE/INSERT in MySQL)."
      );
    }
  } finally {
    await close(conn);
  }

  const app = express();
  app.use(express.json());

  const DEMO_TA_SIGNUP_CODE = String(process.env.DEMO_TA_SIGNUP_CODE || "123456").trim();

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "auth" });
  });

  app.post("/internal/login", async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = req.body?.password;
    if (!username || password === undefined) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const db = await openAuthDb();
    try {
      const a = adminsMap;
      const aId = a.id;
      const aUser = a.username;
      const aPass = a.password;
      let sql = `SELECT \`${aId}\` AS id, \`${aUser}\` AS username, \`${aPass}\` AS password`;
      if (a.email) sql += `, \`${a.email}\` AS email`;
      if (a.first_name) sql += `, \`${a.first_name}\` AS first_name`;
      if (a.is_super_admin) sql += `, \`${a.is_super_admin}\` AS is_super_admin`;
      sql += ` FROM admins WHERE \`${aUser}\` = ?`;
      const params = [username];
      if (a.email) {
        sql += ` OR \`${a.email}\` = ?`;
        params.push(username);
      }
      sql += ` LIMIT 1`;

      const row = await get(db, sql, params);
      const storedRaw = row?.password;
      const stored = normalizeStoredPassword(storedRaw).trim();
      const attempt = String(password ?? "").trim();
      const looksBcrypt = /^\$2[aby]\$/.test(stored);
      const ok = looksBcrypt
        ? attempt.length > 0 && bcrypt.compareSync(attempt, stored)
        : stored === attempt;

      if (!row || !ok) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const adminId = row.id != null ? Number(row.id) : row.id;
      const isSuperAdmin =
        !a.is_super_admin ||
        Number(row.is_super_admin) === 1 ||
        row.is_super_admin === true;
      res.json({
        adminId,
        username: row.username || username,
        firstName: row.first_name || null,
        isSuperAdmin
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Login failed" });
    } finally {
      await close(db);
    }
  });

  app.post("/internal/ta-signup", async (req, res) => {
    const firstName = String(req.body?.firstName || req.body?.first_name || "").trim();
    const lastName = String(req.body?.lastName || req.body?.last_name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const code = String(req.body?.code || "").trim();

    if (!firstName || !lastName || !email || !password || !code) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Code must be 6 digits" });
    }
    if (code !== DEMO_TA_SIGNUP_CODE) {
      return res.status(401).json({ error: "Invalid code" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = await openAuthDb();
    try {
      const a = adminsMap;
      let existsSql = `SELECT \`${a.id}\` AS id FROM admins WHERE \`${a.username}\` = ?`;
      const existsParams = [email];
      if (a.email) {
        existsSql += ` OR \`${a.email}\` = ?`;
        existsParams.push(email);
      }
      existsSql += ` LIMIT 1`;
      const existing = await get(db, existsSql, existsParams);
      if (existing?.id) {
        return res.status(409).json({ error: "An admin account already exists for this email" });
      }

      const hash = bcrypt.hashSync(password, 10);
      const cols = [`\`${a.username}\``, `\`${a.password}\``];
      const vals = [email, hash];
      if (a.email) {
        cols.push(`\`${a.email}\``);
        vals.push(email);
      }
      if (a.first_name) {
        cols.push(`\`${a.first_name}\``);
        vals.push(firstName);
      }
      if (a.last_name) {
        cols.push(`\`${a.last_name}\``);
        vals.push(lastName);
      }
      if (a.is_super_admin) {
        cols.push(`\`${a.is_super_admin}\``);
        vals.push(0);
      }
      const placeholders = cols.map(() => "?").join(", ");
      const result = await run(db, `INSERT INTO admins (${cols.join(", ")}) VALUES (${placeholders});`, vals);

      res.json({
        adminId: result.insertId,
        username: email,
        firstName,
        isSuperAdmin: false
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Signup failed", details: err?.message || String(err) });
    } finally {
      await close(db);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Profinder auth service on http://0.0.0.0:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
