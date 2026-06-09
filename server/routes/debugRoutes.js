const { openDb, all, close } = require("../db");
const { toSafeInt } = require("../lib/officeHoursQuery");

/**
 * @param {import("express").Application} app
 * @param {{ openDb: Function, all: Function, close: Function, getSchema: () => object|null }} deps
 */
function registerDebugRoutes(app, deps) {
  const { openDb, all, close, getSchema } = deps;

  app.get("/api/debug/office-hours-raw", async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      const limit = Math.min(toSafeInt(req.query.limit, 10), 50);
      const rows = await all(
        db,
        `
          SELECT *
          FROM office_hours
          ORDER BY ${schemaInfo?.officeHoursMap?.id ? `\`${schemaInfo.officeHoursMap.id}\`` : "1"} DESC
          LIMIT ${limit};
        `
      );
      res.json({ ok: true, rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || String(err) });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerDebugRoutes };
