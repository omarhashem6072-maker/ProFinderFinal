const { openDb, get, run, close, normalizeDay, toMysqlTime } = require("../db");
const { parsePDF } = require("../parsers/pdfParser");

/**
 * POST /api/upload-pdf — parse PDFs and insert office hour rows.
 * @param {import("express").Application} app
 * @param {{
 *   requireAdmin: Function, upload: import("multer").Multer,
 *   getSchema: () => object|null,
 *   getTrustedAdminId: Function, officeHoursOwnerColumnName: Function
 * }} deps
 */
function registerUploadPdfRoutes(app, deps) {
  const { requireAdmin, upload, getSchema, getTrustedAdminId, officeHoursOwnerColumnName } = deps;

  app.post("/api/upload-pdf", requireAdmin, upload.array("files", 10), async (req, res) => {
    console.log("PDF upload request received");

    if (!req.files || req.files.length === 0) {
      console.log("No files in request");
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log(
      `Processing ${req.files.length} file(s):`,
      req.files.map((f) => f.originalname)
    );

    const results = [];
    const db = await openDb();
    const schemaInfo = getSchema();

    try {
      for (const file of req.files) {
        const parseResult = await parsePDF(file.buffer, { filename: file.originalname });

        if (!parseResult.success) {
          results.push({
            filename: file.originalname,
            success: false,
            error: parseResult.error,
            extracted: 0
          });
          continue;
        }

        let inserted = 0;
        for (const entry of parseResult.extracted) {
          try {
            const professor = String(entry.professor || "").trim();
            const course_code = String(entry.course_code || "").trim();
            const course_name = String(entry.course_name || "").trim();
            const ohCols = schemaInfo.columns.office_hours || [];
            const dayColName = schemaInfo.officeHoursMap?.day_name || "day_name";
            const isDayOfWeekColumn = dayColName.toLowerCase() === "day_of_week";

            let day_value;
            if (isDayOfWeekColumn) {
              const dayAbbr = normalizeDay(String(entry.day_name || "").trim());
              const dayToInt = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
              day_value = dayToInt[dayAbbr] || null;
            } else {
              day_value = normalizeDay(String(entry.day_name || "").trim());
            }

            if (!day_value) {
              console.log(`Skipping entry: invalid day_name "${entry.day_name}"`);
              continue;
            }
            const start_time = String(entry.start_time || "").trim();
            const end_time = String(entry.end_time || "").trim();
            const location = String(entry.location || "").trim();
            const email = entry.email != null ? String(entry.email).trim().toLowerCase() : null;
            const notes = entry.notes != null ? String(entry.notes) : null;

            if (
              !professor ||
              !course_code ||
              !course_name ||
              !day_value ||
              !start_time ||
              !end_time ||
              !location
            ) {
              console.log(`Skipping entry: missing required fields`, {
                professor,
                course_code,
                course_name,
                day_value,
                start_time,
                end_time,
                location
              });
              continue;
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
              schemaInfo?.officeHoursMap?.course_id
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
                const hasOfficeLocation = profCols.some(
                  (c) => c.toLowerCase().includes("office") && c.toLowerCase().includes("location")
                );

                if (hasDepartment) {
                  const cols = [`\`${pNameCol}\``, "`department`"];
                  const vals = [professor, "TBA"];

                  if (hasEmail) {
                    cols.push("`email`");
                    vals.push(email || null);
                  }
                  if (hasOfficeLocation && entry.location) {
                    cols.push("`office_location`");
                    vals.push(entry.location);
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
              const dayCol = oh.day_name || "day_name";
              const cols = [
                `\`${oh.professor_id}\``,
                `\`${oh.course_id}\``,
                `\`${dayCol}\``,
                `\`${oh.start_time}\``,
                `\`${oh.end_time}\``,
                `\`${oh.location}\``
              ];
              const vals = [
                profRow.id,
                courseRow.id,
                day_value,
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

              const ownUp = officeHoursOwnerColumnName();
              const aidUp = getTrustedAdminId(req);
              if (ownUp && aidUp) {
                cols.push(`\`${ownUp}\``);
                vals.push(aidUp);
              }

              const placeholders = cols.map(() => "?").join(", ");
              await run(db, `INSERT INTO office_hours (${cols.join(", ")}) VALUES (${placeholders});`, vals);
            } else {
              const fallbackCols = schemaInfo.columns.office_hours || [];
              const fallbackDayCol = fallbackCols.find((c) => c.toLowerCase() === "day_of_week")
                ? "day_of_week"
                : "day_name";
              const fallbackDayValue =
                fallbackDayCol === "day_of_week" ? day_value : normalizeDay(String(entry.day_name || "").trim());
              const ownFb = officeHoursOwnerColumnName();
              const aidFb = getTrustedAdminId(req);
              const fbCols = [
                "professor",
                "course_code",
                "course_name",
                `\`${fallbackDayCol}\``,
                "start_time",
                "end_time",
                "location",
                "email",
                "notes"
              ];
              const fbVals = [
                professor,
                course_code,
                course_name,
                fallbackDayValue,
                toMysqlTime(start_time),
                toMysqlTime(end_time),
                location,
                email,
                notes
              ];
              if (ownFb && aidFb) {
                fbCols.push(`\`${ownFb}\``);
                fbVals.push(aidFb);
              }
              await run(
                db,
                `INSERT INTO office_hours (${fbCols.join(", ")}) VALUES (${fbCols.map(() => "?").join(", ")});`,
                fbVals
              );
            }

            inserted++;
          } catch (err) {
            console.error(`Failed to insert entry from ${file.originalname}:`, err.message);
          }
        }

        results.push({
          filename: file.originalname,
          success: true,
          extracted: inserted,
          metadata: parseResult.metadata
        });
      }

      res.json({
        ok: true,
        processed: results.length,
        results
      });
    } catch (err) {
      console.error("PDF upload processing failed:", err);
      res.status(500).json({ error: "Failed to process PDFs", details: err.message });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerUploadPdfRoutes };
