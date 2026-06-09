const { openDb, get, run, close, normalizeDay, toTimeHHMM, toMysqlTime } = require("../db");

/**
 * POST /api/office-hours — manual create (normalized or denormalized schema).
 * @param {import("express").Application} app
 * @param {{
 *   requireAdmin: Function, getSchema: () => object|null,
 *   getTrustedAdminId: Function, officeHoursOwnerColumnName: Function
 * }} deps
 */
function registerOfficeHoursCreateRoutes(app, deps) {
  const { requireAdmin, getSchema, getTrustedAdminId, officeHoursOwnerColumnName } = deps;

  app.post("/api/office-hours", requireAdmin, async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      const body = req.body || {};

      const professor = String(body.professor || "").trim();
      const course_code = String(body.course_code || body.courseCode || "").trim();
      const course_name = String(body.course_name || body.courseName || "").trim();
      const ohCols = schemaInfo?.columns?.office_hours || [];
      const expectsIntegerDay = ohCols.some((c) => c.toLowerCase() === "day_of_week");

      let day_name;
      if (expectsIntegerDay) {
        const dayAbbr = normalizeDay(String(body.day_name || body.day || "").trim());
        const dayToInt = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
        day_name = dayToInt[dayAbbr] || null;
      } else {
        day_name = normalizeDay(String(body.day_name || body.day || "").trim());
      }
      const start_time = String(body.start_time || body.startTime || "").trim();
      const end_time = String(body.end_time || body.endTime || "").trim();
      const location = String(body.location || "").trim();
      const email = body.email != null ? String(body.email).trim().toLowerCase() : null;
      const notes = body.notes != null ? String(body.notes) : null;

      if (
        !professor ||
        !course_code ||
        !course_name ||
        !day_name ||
        !start_time ||
        !end_time ||
        !location
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (
        schemaInfo?.hasProfessors &&
        schemaInfo?.hasCourses &&
        schemaInfo?.hasOfficeHours &&
        schemaInfo?.professorsMap?.id &&
        schemaInfo?.professorsMap?.name &&
        schemaInfo?.coursesMap?.id &&
        schemaInfo?.coursesMap?.code &&
        schemaInfo?.coursesMap?.name &&
        schemaInfo?.officeHoursMap?.professor_id &&
        schemaInfo?.officeHoursMap?.course_id &&
        schemaInfo?.officeHoursMap?.day_name &&
        schemaInfo?.officeHoursMap?.start_time &&
        schemaInfo?.officeHoursMap?.end_time &&
        schemaInfo?.officeHoursMap?.location
      ) {
        const pIdCol = schemaInfo.professorsMap.id;
        const pNameCol = schemaInfo.professorsMap.name;
        const cIdCol = schemaInfo.coursesMap.id;
        const cCodeCol = schemaInfo.coursesMap.code;
        const cNameCol = schemaInfo.coursesMap.name;
        const profCols = schemaInfo.columns.professors || [];
        const hasEmail = profCols.some((c) => c.toLowerCase() === "email");

        let profRow = await get(
          db,
          `SELECT \`${pIdCol}\` AS id FROM professors WHERE \`${pNameCol}\` = ? LIMIT 1;`,
          [professor]
        );
        if (!profRow) {
          const hasDepartment = profCols.some((c) => c.toLowerCase() === "department");

          if (hasDepartment) {
            const cols = [`\`${pNameCol}\``, "`department`"];
            const vals = [professor, "TBA"];

            if (hasEmail) {
              cols.push("`email`");
              vals.push(email || null);
            }

            const placeholders = cols.map(() => "?").join(", ");
            const r = await run(db, `INSERT INTO professors (${cols.join(", ")}) VALUES (${placeholders});`, vals);
            profRow = { id: r.insertId };
          } else {
            const r = await run(db, `INSERT INTO professors (\`${pNameCol}\`) VALUES (?);`, [professor]);
            profRow = { id: r.insertId };
          }
        }
        if (profRow && hasEmail && email) {
          await run(db, `UPDATE professors SET email = COALESCE(NULLIF(email, ''), ?) WHERE \`${pIdCol}\` = ?`, [
            email,
            profRow.id
          ]);
        }

        let courseRow = await get(
          db,
          `SELECT \`${cIdCol}\` AS id FROM courses WHERE \`${cCodeCol}\` = ? LIMIT 1;`,
          [course_code]
        );
        if (!courseRow) {
          const courseCols = schemaInfo.columns.courses || [];
          const hasProfessorId = courseCols.some((c) => c.toLowerCase() === "professor_id");

          if (hasProfessorId) {
            const cols = [`\`${cCodeCol}\``, `\`${cNameCol}\``, "`professor_id`"];
            const vals = [course_code, course_name, profRow.id];
            const placeholders = cols.map(() => "?").join(", ");
            const r = await run(
              db,
              `INSERT INTO courses (${cols.join(", ")}) VALUES (${placeholders});`,
              vals
            );
            courseRow = { id: r.insertId };
          } else {
            const r = await run(
              db,
              `INSERT INTO courses (\`${cCodeCol}\`, \`${cNameCol}\`) VALUES (?, ?);`,
              [course_code, course_name]
            );
            courseRow = { id: r.insertId };
          }
        }

        const oh = schemaInfo.officeHoursMap;
        const cols = [
          `\`${oh.professor_id}\``,
          `\`${oh.course_id}\``,
          `\`${oh.day_name}\``,
          `\`${oh.start_time}\``,
          `\`${oh.end_time}\``,
          `\`${oh.location}\``
        ];
        const vals = [
          profRow.id,
          courseRow.id,
          day_name,
          toMysqlTime(start_time),
          toMysqlTime(end_time),
          location
        ];

        if (oh.email) {
          cols.push(`\`${oh.email}\``);
          vals.push(email || null);
        }

        if (oh.notes) {
          cols.push(`\`${oh.notes}\``);
          vals.push(notes);
        }

        const ownCol = officeHoursOwnerColumnName();
        const aidPost = getTrustedAdminId(req);
        if (ownCol && aidPost) {
          cols.push(`\`${ownCol}\``);
          vals.push(aidPost);
        }

        const placeholders = cols.map(() => "?").join(", ");
        const insertSql = `INSERT INTO office_hours (${cols.join(", ")}) VALUES (${placeholders});`;
        const ins = await run(db, insertSql, vals);

        if (schemaInfo.hasView && schemaInfo.viewMap) {
          const m = schemaInfo.viewMap;
          const emailSelect = m.email ? `\`${m.email}\`` : "NULL";
          const row = await get(
            db,
            `
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
              ORDER BY \`${m.start_time}\` DESC
              LIMIT 1;
            `
          );
          return res.status(201).json({
            ...row,
            start_time: toTimeHHMM(row?.start_time),
            end_time: toTimeHHMM(row?.end_time)
          });
        }

        return res.status(201).json({
          id: ins.insertId,
          professor,
          course_code,
          course_name,
          day_name,
          start_time: toTimeHHMM(start_time),
          end_time: toTimeHHMM(end_time),
          location,
          email,
          notes
        });
      }

      const ownColDn = officeHoursOwnerColumnName();
      const aidDn = getTrustedAdminId(req);
      const insColsDn = [
        "professor",
        "course_code",
        "course_name",
        "day_name",
        "start_time",
        "end_time",
        "location",
        "email",
        "notes"
      ];
      const insValsDn = [
        professor,
        course_code,
        course_name,
        day_name,
        toMysqlTime(start_time),
        toMysqlTime(end_time),
        location,
        email,
        notes
      ];
      if (ownColDn && aidDn) {
        insColsDn.push(`\`${ownColDn}\``);
        insValsDn.push(aidDn);
      }
      const result = await run(
        db,
        `INSERT INTO office_hours (${insColsDn.join(", ")}) VALUES (${insColsDn.map(() => "?").join(", ")});`,
        insValsDn
      );

      const row = await get(
        db,
        "SELECT id, professor, course_code, course_name, day_name, start_time, end_time, location, email, notes FROM office_hours WHERE id = ?;",
        [result.insertId]
      );

      res.status(201).json({
        ...row,
        start_time: toTimeHHMM(row?.start_time),
        end_time: toTimeHHMM(row?.end_time)
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to create office hour" });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerOfficeHoursCreateRoutes };
