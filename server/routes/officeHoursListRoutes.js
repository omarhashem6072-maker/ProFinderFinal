const { toTimeHHMM, normalizeDayName } = require("../db");
const { buildWhereClause, toSafeInt, dedupeOfficeHoursRows, sanitizeNotes } = require("../lib/officeHoursQuery");

/**
 * @param {import("express").Application} app
 * @param {{ openDb: Function, all: Function, close: Function, getSchema: () => object|null }} deps
 */
function registerOfficeHoursListRoutes(app, deps) {
  const { openDb, all, close, getSchema } = deps;

  app.get("/api/office-hours", async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      const { whereSql, params } = buildWhereClause(req.query);

      const limit = Math.min(toSafeInt(req.query.limit, 500), 1000);
      const offset = Math.max(toSafeInt(req.query.offset, 0), 0);

      let sql;
      if (schemaInfo?.hasView && schemaInfo?.viewMap) {
        const m = schemaInfo.viewMap;
        const idSelect = m.id ? `\`${m.id}\` AS id,\n            ` : "";
        const emailSelect = m.email ? `\`${m.email}\`` : "NULL";
        sql = `
          SELECT
            ${idSelect}\`${m.professor}\` AS professor,
            \`${m.course_code}\` AS course_code,
            \`${m.course_name}\` AS course_name,
            \`${m.day_name}\` AS day_name,
            \`${m.start_time}\` AS start_time,
            \`${m.end_time}\` AS end_time,
            \`${m.location}\` AS location,
            ${emailSelect} AS email,
            ${m.notes ? `\`${m.notes}\`` : "NULL"} AS notes
          FROM v_office_hours
          ${whereSql}
          ORDER BY professor ASC, course_code ASC, day_name ASC, start_time ASC
          LIMIT ${limit} OFFSET ${offset};
        `;
      } else {
        const ohEmailCol = schemaInfo?.officeHoursMap?.email;
        const emailSelect = ohEmailCol ? `\`${ohEmailCol}\` AS email,` : "NULL AS email,";
        sql = `
          SELECT id, professor, course_code, course_name, day_name, start_time, end_time, location, ${emailSelect} notes
          FROM office_hours
          ${whereSql}
          ORDER BY professor ASC, course_code ASC, day_name ASC, start_time ASC
          LIMIT ${limit} OFFSET ${offset};
        `;
      }

      const rows = dedupeOfficeHoursRows(await all(db, sql, params));

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
      console.error("GET /api/office-hours failed:", err);
      res.status(500).json({ error: "Failed to load office hours" });
    } finally {
      await close(db);
    }
  });

  app.get("/api/office-hours/upcoming", async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      const limit = Math.min(toSafeInt(req.query.limit, 6), 50);

      const now = new Date();
      const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const today = dayAbbr[now.getDay()];
      const tomorrow = dayAbbr[(now.getDay() + 1) % 7];

      let sql;
      const params = [today, tomorrow];
      if (schemaInfo?.hasView && schemaInfo?.viewMap) {
        const m = schemaInfo.viewMap;
        const idSelect = m.id ? `\`${m.id}\` AS id,\n            ` : "";
        const emailSelect = m.email ? `\`${m.email}\`` : "NULL";
        sql = `
          SELECT
            ${idSelect}\`${m.professor}\` AS professor,
            \`${m.course_code}\` AS course_code,
            \`${m.course_name}\` AS course_name,
            \`${m.day_name}\` AS day_name,
            \`${m.start_time}\` AS start_time,
            \`${m.end_time}\` AS end_time,
            \`${m.location}\` AS location,
            ${emailSelect} AS email,
            ${m.notes ? `\`${m.notes}\`` : "NULL"} AS notes
          FROM v_office_hours
          WHERE \`${m.day_name}\` IN (?, ?)
          ORDER BY day_name ASC, start_time ASC
          LIMIT ${limit};
        `;
      } else {
        const ohEmailCol = schemaInfo?.officeHoursMap?.email;
        const emailSelect = ohEmailCol ? `\`${ohEmailCol}\` AS email,` : "NULL AS email,";
        sql = `
          SELECT id, professor, course_code, course_name, day_name, start_time, end_time, location, ${emailSelect} notes
          FROM office_hours
          WHERE day_name IN (?, ?)
          ORDER BY day_name ASC, start_time ASC
          LIMIT ${limit};
        `;
      }

      const rows = dedupeOfficeHoursRows(await all(db, sql, params));

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
      console.error("GET /api/office-hours/upcoming failed:", err);
      res.status(500).json({ error: "Failed to load upcoming office hours" });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerOfficeHoursListRoutes };
