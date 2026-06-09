/**
 * Distinct professor / course lists for filters.
 * @param {import("express").Application} app
 * @param {{ openDb: Function, all: Function, close: Function, getSchema: () => object|null }} deps
 */
function registerCatalogRoutes(app, deps) {
  const { openDb, all, close, getSchema } = deps;

  app.get("/api/professors", async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      if (schemaInfo?.hasProfessors && schemaInfo?.professorsMap?.name) {
        const nameCol = schemaInfo.professorsMap.name;
        const rows = await all(db, `SELECT DISTINCT \`${nameCol}\` AS name FROM professors ORDER BY \`${nameCol}\` ASC;`);
        res.json(rows.map((r) => r.name));
      } else if (schemaInfo?.hasView && schemaInfo?.viewMap?.professor) {
        const p = schemaInfo.viewMap.professor;
        const rows = await all(db, `SELECT DISTINCT \`${p}\` AS professor FROM v_office_hours ORDER BY \`${p}\` ASC;`);
        res.json(rows.map((r) => r.professor));
      } else {
        const rows = await all(db, "SELECT DISTINCT professor FROM office_hours ORDER BY professor ASC;");
        res.json(rows.map((r) => r.professor));
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to load professors" });
    } finally {
      await close(db);
    }
  });

  app.get("/api/courses", async (req, res) => {
    const db = await openDb();
    const schemaInfo = getSchema();
    try {
      if (schemaInfo?.hasCourses && schemaInfo?.coursesMap?.code) {
        const codeCol = schemaInfo.coursesMap.code;
        const rows = await all(db, `SELECT DISTINCT \`${codeCol}\` AS code FROM courses ORDER BY \`${codeCol}\` ASC;`);
        res.json(rows.map((r) => r.code));
      } else if (schemaInfo?.hasView && schemaInfo?.viewMap?.course_code) {
        const c = schemaInfo.viewMap.course_code;
        const rows = await all(db, `SELECT DISTINCT \`${c}\` AS course_code FROM v_office_hours ORDER BY \`${c}\` ASC;`);
        res.json(rows.map((r) => r.course_code));
      } else {
        const rows = await all(db, "SELECT DISTINCT course_code FROM office_hours ORDER BY course_code ASC;");
        res.json(rows.map((r) => r.course_code));
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to load courses" });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerCatalogRoutes };
