const bcrypt = require("bcryptjs");

/**
 * Monolith-only session auth (gateway uses auth microservice).
 * @param {import("express").Application} app
 * @param {{
 *   openDb: Function, get: Function, run: Function, close: Function,
 *   getSchema: () => object|null, bcrypt: object, demoTaSignupCode: string
 * }} deps
 */
function registerAuthRoutes(app, deps) {
  const { openDb, get, run, close, getSchema, demoTaSignupCode } = deps;

  app.post("/api/auth/login", async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = req.body?.password;
    if (!username || password === undefined) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const db = await openDb();
    try {
      const a = getSchema()?.adminsMap;
      const aId = a?.id || "id";
      const aUser = a?.username || "username";
      const aPass = a?.password || "password";
      const aEmail = a?.email;
      const aFirst = a?.first_name;

      let sql = `SELECT \`${aId}\` AS id, \`${aUser}\` AS username, \`${aPass}\` AS password`;
      if (aEmail) sql += `, \`${aEmail}\` AS email`;
      if (aFirst) sql += `, \`${aFirst}\` AS first_name`;
      const aSuper = a?.is_super_admin;
      if (aSuper) sql += `, \`${aSuper}\` AS is_super_admin`;
      sql += ` FROM admins WHERE \`${aUser}\` = ?`;
      const params = [username];
      if (aEmail) {
        sql += ` OR \`${aEmail}\` = ?`;
        params.push(username);
      }
      sql += ` LIMIT 1;`;

      const row = await get(db, sql, params);
      const stored = row?.password;
      const ok =
        typeof stored === "string" && stored.startsWith("$2")
          ? bcrypt.compareSync(String(password), stored)
          : stored === password;

      if (!row || !ok) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.session.adminId = row.id;
      req.session.username = row.username || username;
      req.session.firstName = row.first_name || null;
      const isSuperAdmin =
        !aSuper || Number(row.is_super_admin) === 1 || row.is_super_admin === true;
      req.session.isSuperAdmin = isSuperAdmin;
      res.json({
        ok: true,
        username: req.session.username,
        firstName: req.session.firstName,
        isSuperAdmin
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    } finally {
      await close(db);
    }
  });

  app.post("/api/auth/ta-signup", async (req, res) => {
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
    if (code !== demoTaSignupCode) {
      return res.status(401).json({ error: "Invalid code" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = await openDb();
    try {
      const a = getSchema()?.adminsMap;
      const aId = a?.id || "id";
      const aUser = a?.username || "username";
      const aPass = a?.password || "password";
      const aEmail = a?.email;
      const aFirst = a?.first_name;
      const aLast = a?.last_name;

      let existsSql = `SELECT \`${aId}\` AS id FROM admins WHERE \`${aUser}\` = ?`;
      const existsParams = [email];
      if (aEmail) {
        existsSql += ` OR \`${aEmail}\` = ?`;
        existsParams.push(email);
      }
      existsSql += ` LIMIT 1;`;
      const existing = await get(db, existsSql, existsParams);
      if (existing?.id) {
        return res.status(409).json({ error: "An admin account already exists for this email" });
      }

      const hash = bcrypt.hashSync(password, 10);

      const cols = [`\`${aUser}\``, `\`${aPass}\``];
      const vals = [email, hash];
      if (aEmail) {
        cols.push(`\`${aEmail}\``);
        vals.push(email);
      }
      if (aFirst) {
        cols.push(`\`${aFirst}\``);
        vals.push(firstName);
      }
      if (aLast) {
        cols.push(`\`${aLast}\``);
        vals.push(lastName);
      }
      const aSuper = a?.is_super_admin;
      if (aSuper) {
        cols.push(`\`${aSuper}\``);
        vals.push(0);
      }

      const placeholders = cols.map(() => "?").join(", ");
      const result = await run(db, `INSERT INTO admins (${cols.join(", ")}) VALUES (${placeholders});`, vals);

      req.session.adminId = result.insertId;
      req.session.username = email;
      req.session.firstName = firstName;
      req.session.isSuperAdmin = false;
      res.json({ ok: true, username: email, firstName, isSuperAdmin: false });
    } catch (err) {
      res.status(500).json({ error: "Signup failed", details: err?.message || String(err) });
    } finally {
      await close(db);
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session && req.session.adminId) {
      return res.json({
        ok: true,
        username: req.session.username,
        firstName: req.session.firstName || null,
        isSuperAdmin: req.session.isSuperAdmin === true
      });
    }
    res.status(401).json({ error: "Not authenticated" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });
}

module.exports = { registerAuthRoutes };
