const { openDb, get, run, close, normalizeDay, toTimeHHMM, toMysqlTime, normalizeDayName } = require("../db");
const { toSafeInt } = require("../lib/officeHoursQuery");

/**
 * PATCH /api/office-hours/:id and /by-match
 * @param {import("express").Application} app
 * @param {{
 *   requireAdmin: Function, getSchema: () => object|null,
 *   assertMayMutateOfficeHourRow: Function
 * }} deps
 */
function registerOfficeHoursUpdateRoutes(app, deps) {
  const { requireAdmin, getSchema, assertMayMutateOfficeHourRow } = deps;

  app.patch("/api/office-hours/:id(\\d+)", requireAdmin, async (req, res) => {
    const id = toSafeInt(req.params.id, null);
    if (id == null || id < 1) {
      return res.status(400).json({ error: "Invalid office hour id" });
    }
    const db = await openDb();
    try {
      const body = req.body || {};
      const professor = String((body.professor != null ? body.professor : "")).trim();
      const course_code = String((body.course_code || body.courseCode || "")).trim();
      const course_name = String((body.course_name || body.courseName || "")).trim();
      const day_name = normalizeDay(String((body.day_name || body.day || "")).trim());
      const start_time = String((body.start_time || body.startTime || "")).trim();
      const end_time = String((body.end_time || body.endTime || "")).trim();
      const location = String((body.location != null ? body.location : "")).trim();
      const email = body.email != null ? String(body.email).trim().toLowerCase() : null;
      const notes = body.notes != null ? String(body.notes) : null;

      if (!professor || !course_code || !course_name || !day_name || !start_time || !end_time || !location) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const gatePatch = await assertMayMutateOfficeHourRow(db, req, id);
      if (!gatePatch.ok) {
        return res.status(gatePatch.status).json({ error: gatePatch.error });
      }

      await run(
        db,
        `UPDATE office_hours SET professor = ?, course_code = ?, course_name = ?, day_name = ?, start_time = ?, end_time = ?, location = ?, email = COALESCE(?, email), notes = ? WHERE id = ?`,
        [professor, course_code, course_name, day_name, toMysqlTime(start_time), toMysqlTime(end_time), location, email, notes, id]
      );

      const row = await get(
        db,
        "SELECT id, professor, course_code, course_name, day_name, start_time, end_time, location, email, notes FROM office_hours WHERE id = ?",
        [id]
      );
      if (!row) {
        return res.status(404).json({ error: "Office hour not found" });
      }
      res.json({
        ...row,
        day_name: normalizeDayName(row.day_name),
        start_time: toTimeHHMM(row.start_time),
        end_time: toTimeHHMM(row.end_time)
      });
    } catch (err) {
      console.error("PATCH /api/office-hours/:id failed:", err);
      res.status(500).json({ error: "Failed to update office hour" });
    } finally {
      await close(db);
    }
  });

  app.patch("/api/office-hours/by-match", requireAdmin, async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      const body = req.body || {};
      const original = body.original || {};
      const updates = body.updates || body;

      const oProfessor = String(original.professor || "").trim();
      const oCourseCode = String(original.course_code || "").trim();
      const oDayNameRaw = String(original.day_name || "").trim();
      const oStartTime = String(original.start_time || "").trim();
      const oEndTime = String(original.end_time || "").trim();
      const oLocation = String(original.location || "").trim();

      if (!oProfessor || !oCourseCode || !oDayNameRaw || !oStartTime || !oEndTime || !oLocation) {
        return res.status(400).json({ error: "Missing original match fields" });
      }

      const dayRaw = String((updates.day_name || updates.day || oDayNameRaw)).trim();
      const start_time = String((updates.start_time || updates.startTime || oStartTime)).trim();
      const end_time = String((updates.end_time || updates.endTime || oEndTime)).trim();
      const location = String((updates.location != null ? updates.location : oLocation)).trim();
      const email = updates.email != null ? String(updates.email).trim().toLowerCase() : null;
      const notes = updates.notes != null ? String(updates.notes) : null;

      if (!dayRaw || !start_time || !end_time || !location) {
        return res.status(400).json({ error: "Missing required update fields" });
      }

      const ohCols = schemaInfo?.columns?.office_hours || [];
      const oh = schemaInfo?.officeHoursMap || {};
      const dayColName = oh.day_name || ohCols.find((c) => /day/i.test(c)) || "day_name";
      const expectsIntegerDay = String(dayColName).toLowerCase() === "day_of_week";
      const dayAbbr = normalizeDay(dayRaw);
      const oldDayAbbr = normalizeDay(oDayNameRaw);
      const dayToInt = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
      const newDayValue = expectsIntegerDay ? dayToInt[dayAbbr] : dayAbbr;
      const oldDayValue = expectsIntegerDay ? dayToInt[oldDayAbbr] : oldDayAbbr;

      if (!newDayValue || !oldDayValue) {
        return res.status(400).json({ error: "Invalid day value" });
      }

      if (schemaInfo?.hasProfessors && schemaInfo?.hasCourses && oh.professor_id && oh.course_id) {
        const pIdCol = schemaInfo.professorsMap?.id;
        const pNameCol = schemaInfo.professorsMap?.name;
        const cIdCol = schemaInfo.coursesMap?.id;
        const cCodeCol = schemaInfo.coursesMap?.code;
        if (!pIdCol || !pNameCol || !cIdCol || !cCodeCol) {
          return res.status(500).json({ error: "Schema mapping incomplete for by-match update" });
        }

        const profRow = await get(db, `SELECT \`${pIdCol}\` AS id FROM professors WHERE \`${pNameCol}\` = ? LIMIT 1`, [
          oProfessor
        ]);
        const courseRow = await get(db, `SELECT \`${cIdCol}\` AS id FROM courses WHERE \`${cCodeCol}\` = ? LIMIT 1`, [
          oCourseCode
        ]);
        if (!profRow || !courseRow) {
          return res.status(404).json({ error: "Original row not found" });
        }

        const idCol = oh.id;
        if (!idCol) {
          return res.status(500).json({ error: "office_hours id column not found for by-match update" });
        }

        const existing = await get(
          db,
          `SELECT \`${idCol}\` AS id
           FROM office_hours
           WHERE \`${oh.professor_id}\` = ?
             AND \`${oh.course_id}\` = ?
             AND \`${dayColName}\` = ?
             AND \`${oh.start_time}\` = ?
             AND \`${oh.end_time}\` = ?
             AND \`${oh.location}\` = ?
           ORDER BY \`${idCol}\` DESC
           LIMIT 1`,
          [profRow.id, courseRow.id, oldDayValue, toMysqlTime(oStartTime), toMysqlTime(oEndTime), oLocation]
        );
        if (!existing?.id) {
          return res.status(404).json({ error: "Original row not found" });
        }

        const gateNm = await assertMayMutateOfficeHourRow(db, req, existing.id);
        if (!gateNm.ok) {
          return res.status(gateNm.status).json({ error: gateNm.error });
        }

        const setParts = [
          `\`${dayColName}\` = ?`,
          `\`${oh.start_time}\` = ?`,
          `\`${oh.end_time}\` = ?`,
          `\`${oh.location}\` = ?`
        ];
        const setVals = [newDayValue, toMysqlTime(start_time), toMysqlTime(end_time), location];
        if (oh.email) {
          setParts.push(`\`${oh.email}\` = COALESCE(?, \`${oh.email}\`)`);
          setVals.push(email);
        }
        const notesCol = oh.notes || (ohCols.some((c) => c.toLowerCase() === "notes") ? "notes" : null);
        if (notesCol) {
          setParts.push(`\`${notesCol}\` = ?`);
          setVals.push(notes);
        }

        await run(
          db,
          `UPDATE office_hours
           SET ${setParts.join(", ")}
           WHERE \`${idCol}\` = ?`,
          [...setVals, existing.id]
        );
        return res.json({ ok: true, updated: 1, id: existing.id });
      }

      const hasEmailCol = ohCols.some((c) => c.toLowerCase() === "email");
      const setSql = [`day_name = ?`, `start_time = ?`, `end_time = ?`, `location = ?`];
      const setVals = [newDayValue, toMysqlTime(start_time), toMysqlTime(end_time), location];
      if (hasEmailCol) {
        setSql.push(`email = COALESCE(?, email)`);
        setVals.push(email);
      }
      if (oh.notes || ohCols.some((c) => c.toLowerCase() === "notes")) {
        setSql.push(`notes = ?`);
        setVals.push(notes);
      }

      const matchRow = await get(
        db,
        `SELECT id FROM office_hours WHERE professor = ? AND course_code = ? AND day_name = ? AND start_time = ? AND end_time = ? AND location = ? ORDER BY id DESC LIMIT 1`,
        [oProfessor, oCourseCode, oldDayValue, toMysqlTime(oStartTime), toMysqlTime(oEndTime), oLocation]
      );
      if (!matchRow?.id) {
        return res.status(404).json({ error: "Original row not found" });
      }
      const gateDn = await assertMayMutateOfficeHourRow(db, req, matchRow.id);
      if (!gateDn.ok) {
        return res.status(gateDn.status).json({ error: gateDn.error });
      }

      const result = await run(
        db,
        `UPDATE office_hours
         SET ${setSql.join(", ")}
         WHERE id = ?`,
        [...setVals, matchRow.id]
      );
      if (!result || !result.affectedRows) {
        return res.status(404).json({ error: "No matching row updated" });
      }
      res.json({ ok: true, updated: result.affectedRows });
    } catch (err) {
      console.error("PATCH /api/office-hours/by-match failed:", err);
      res.status(500).json({ error: "Failed to update office hour by match" });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerOfficeHoursUpdateRoutes };
