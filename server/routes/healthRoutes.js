const { MYSQL_CONFIG, useSplit } = require("../db");

/**
 * @param {import("express").Application} app
 * @param {{
 *   openDb: Function, all: Function, close: Function,
 *   getSchema: () => object|null, getSchemaInitError: () => object|null,
 *   initSchema: () => Promise<void>, requireAdmin: Function
 * }} deps
 */
function registerHealthRoutes(app, deps) {
  const { openDb, all, close, getSchema, getSchemaInitError, initSchema, requireAdmin } = deps;

  app.get("/api/health", (req, res) => {
    (async () => {
      let dbOk = false;
      let dbError = null;
      let mysqlVersion = null;
      let currentDatabase = null;

      try {
        const conn = await openDb();
        try {
          const rows = await all(conn, "SELECT VERSION() AS version, DATABASE() AS db;");
          mysqlVersion = rows?.[0]?.version ?? null;
          currentDatabase = rows?.[0]?.db ?? null;
          dbOk = true;
        } finally {
          await close(conn);
        }
      } catch (err) {
        dbOk = false;
        dbError = {
          message: err?.message || String(err),
          code: err?.code,
          errno: err?.errno
        };
      }

      const schemaInfo = getSchema();
      const schemaInitError = getSchemaInitError();

      res.json({
        ok: true,
        db: {
          ok: dbOk,
          host: MYSQL_CONFIG.host,
          port: MYSQL_CONFIG.port,
          database: useSplit()
            ? `${process.env.PROFINDER_CORE_SCHEMA || "profinder_core"}+${process.env.PROFINDER_OH_SCHEMA || "profinder_oh"}`
            : MYSQL_CONFIG.database,
          currentDatabase,
          mysqlVersion,
          error: dbError
        },
        schema: schemaInfo || { ok: false, error: schemaInitError }
      });
    })();
  });

  app.post("/api/schema/refresh", requireAdmin, async (req, res) => {
    await initSchema();
    const schemaInfo = getSchema();
    const schemaInitError = getSchemaInitError();
    res.json({
      ok: true,
      schema: schemaInfo || { ok: false, error: schemaInitError }
    });
  });
}

module.exports = { registerHealthRoutes };
