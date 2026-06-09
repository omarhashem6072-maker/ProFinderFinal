const { openDb, all, close, normalizeDayName, toTimeHHMM } = require("../db");
const { sanitizeNotes } = require("../lib/officeHoursQuery");

/**
 * @param {import("express").Application} app
 * @param {{ openDb: Function, all: Function, close: Function, getSchema: () => object|null }} deps
 */
function registerExportRoutes(app, deps) {
  const { openDb, all, close, getSchema } = deps;

  app.get("/api/export", async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      let sql;
      if (schemaInfo?.hasView && schemaInfo?.viewMap) {
        const m = schemaInfo.viewMap;
        const emailSelect = m.email ? `\`${m.email}\`` : "NULL";
        sql = `
          SELECT
            \`${m.professor}\` AS professor,
            \`${m.course_code}\` AS course_code,
            \`${m.course_name}\` AS course_name,
            \`${m.day_name}\` AS day_name,
            \`${m.start_time}\` AS start_time,
            \`${m.end_time}\` AS end_time,
            \`${m.location}\` AS location,
            ${emailSelect} AS email,
            ${m.notes ? `\`${m.notes}\`` : "NULL"} AS notes
          FROM v_office_hours
          ORDER BY professor ASC, course_code ASC, day_name ASC, start_time ASC;
        `;
      } else {
        const ohEmailCol = schemaInfo?.officeHoursMap?.email;
        const emailSelect = ohEmailCol ? `\`${ohEmailCol}\` AS email,` : "NULL AS email,";
        sql = `SELECT id, professor, course_code, course_name, day_name, start_time, end_time, location, ${emailSelect} notes FROM office_hours ORDER BY id ASC;`;
      }

      const rows = await all(db, sql);
      res.json(
        rows.map((r) => ({
          ...r,
          day_name: normalizeDayName(r.day_name),
          start_time: toTimeHHMM(r.start_time),
          end_time: toTimeHHMM(r.end_time),
          notes: sanitizeNotes(r.notes)
        }))
      );
    } catch (err) {
      res.status(500).json({ error: "Failed to export data" });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerExportRoutes };
