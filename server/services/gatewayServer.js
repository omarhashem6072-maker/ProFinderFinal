/**
 * API gateway: static UI + session + /api/auth/* + proxy other /api/* to data service.
 */
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { createProxyMiddleware } = require("http-proxy-middleware");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PORT = Number(process.env.PORT || 3000);
const AUTH_URL = (process.env.AUTH_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const API_URL = (process.env.API_URL || "http://127.0.0.1:3002").replace(/\/$/, "");

const projectRoot = path.join(__dirname, "..", "..");

async function main() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  // Do NOT use express.json() globally — it consumes the body stream so proxied
  // PATCH/POST (office hours, uploads) would reach the API with an empty body.
  const jsonParser = express.json();

  const sessionSecret = process.env.SESSION_SECRET || "profinder-session-secret-change-in-production";
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax"
      }
    })
  );

  app.post("/api/auth/login", jsonParser, async (req, res) => {
    try {
      const r = await fetch(`${AUTH_URL}/internal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {})
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(r.status).json(data);
      }
      const aid = data.adminId;
      const num = aid != null && aid !== "" ? Number(aid) : NaN;
      if (!Number.isFinite(num)) {
        console.error("gateway login: auth returned invalid adminId", aid);
        return res.status(502).json({ error: "Auth service misconfigured" });
      }
      req.session.adminId = num;
      req.session.username = data.username;
      req.session.firstName = data.firstName;
      req.session.isSuperAdmin = data.isSuperAdmin === true || data.isSuperAdmin === 1;
      res.json({
        ok: true,
        username: data.username,
        firstName: data.firstName,
        isSuperAdmin: req.session.isSuperAdmin
      });
    } catch (err) {
      console.error("gateway login:", err);
      res.status(502).json({ error: "Auth service unavailable" });
    }
  });

  app.post("/api/auth/ta-signup", jsonParser, async (req, res) => {
    try {
      const r = await fetch(`${AUTH_URL}/internal/ta-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {})
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(r.status).json(data);
      }
      const aid = data.adminId;
      const num = aid != null && aid !== "" ? Number(aid) : NaN;
      if (!Number.isFinite(num)) {
        console.error("gateway ta-signup: auth returned invalid adminId", aid);
        return res.status(502).json({ error: "Auth service misconfigured" });
      }
      req.session.adminId = num;
      req.session.username = data.username;
      req.session.firstName = data.firstName;
      req.session.isSuperAdmin = data.isSuperAdmin === true || data.isSuperAdmin === 1;
      res.json({
        ok: true,
        username: data.username,
        firstName: data.firstName,
        isSuperAdmin: req.session.isSuperAdmin
      });
    } catch (err) {
      console.error("gateway ta-signup:", err);
      res.status(502).json({ error: "Auth service unavailable" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const sid = req.session?.adminId;
    if (sid != null && sid !== "") {
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

  const apiProxy = createProxyMiddleware(
    (pathname) => {
      if (!pathname.startsWith("/api/")) return false;
      if (pathname.startsWith("/api/auth/login")) return false;
      if (pathname.startsWith("/api/auth/ta-signup")) return false;
      if (pathname.startsWith("/api/auth/me")) return false;
      if (pathname.startsWith("/api/auth/logout")) return false;
      return true;
    },
    {
      target: API_URL,
      changeOrigin: true,
      onProxyReq(proxyReq, req) {
        const sid = req.session?.adminId;
        if (sid != null && sid !== "") {
          proxyReq.setHeader("X-Profinder-Admin-Id", String(sid));
        }
        const sup = req.session?.isSuperAdmin === true;
        proxyReq.setHeader("X-Profinder-Is-Super-Admin", sup ? "1" : "0");
      }
    }
  );

  // Static first: HTML/CSS/JS never touch the proxy (fewer edge cases in embedded browsers).
  app.use(express.static(projectRoot));

  app.use(apiProxy);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Profinder gateway on http://0.0.0.0:${PORT}`);
    console.log(`  AUTH_URL=${AUTH_URL} API_URL=${API_URL}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
