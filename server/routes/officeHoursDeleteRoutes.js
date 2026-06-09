const { openDb, all, run, close } = require("../db");

/**
 * DELETE /api/office-hours — super clears all; TA clears own uploads only.
 * @param {import("express").Application} app
 * @param {{
 *   requireAdmin: Function,
 *   requestIsSuperAdmin: Function, getTrustedAdminId: Function,
 *   officeHoursOwnerColumnName: Function, officeHoursIdColumnName: Function
 * }} deps
 */
function registerOfficeHoursDeleteRoutes(app, deps) {
  const {
    requireAdmin,
    requestIsSuperAdmin,
    getTrustedAdminId,
    officeHoursOwnerColumnName,
    officeHoursIdColumnName
  } = deps;

  app.delete("/api/office-hours", requireAdmin, async (req, res) => {
    const db = await openDb();
    try {
      const superUser = requestIsSuperAdmin(req);
      const ownerCol = officeHoursOwnerColumnName();
      const adminId = getTrustedAdminId(req);

      if (!ownerCol) {
        if (!superUser) {
          return res.status(403).json({
            error:
              "This database does not track who uploaded each row. Only a super admin can clear all data."
          });
        }
      } else if (!superUser) {
        if (!adminId) {
          return res.status(401).json({ error: "Authentication required" });
        }
        const idCol = officeHoursIdColumnName();
        const owned = await all(
          db,
          `SELECT \`${idCol}\` AS id FROM office_hours WHERE \`${ownerCol}\` = ?`,
          [adminId]
        );
        let exceptions = 0;
        for (const r of owned) {
          try {
            const ex = await run(db, "DELETE FROM office_hour_exceptions WHERE office_hour_id = ?;", [r.id]);
            exceptions += ex.affectedRows ?? 0;
          } catch (err) {
            console.log("office_hour_exceptions delete:", err?.message);
          }
        }
        const officeHoursResult = await run(db, `DELETE FROM office_hours WHERE \`${ownerCol}\` = ?`, [adminId]);
        const deleted = {
          exceptions,
          officeHours: officeHoursResult.affectedRows ?? 0,
          professors: 0,
          courses: 0,
          scope: "own_uploads"
        };
        console.log("Removed TA-uploaded office hours:", deleted);
        return res.json({ ok: true, deleted });
      }

      const deleted = { exceptions: 0, officeHours: 0, professors: 0, courses: 0, scope: "all" };

      try {
        const exceptionsResult = await run(db, "DELETE FROM office_hour_exceptions;");
        deleted.exceptions = exceptionsResult.affectedRows ?? 0;
      } catch (err) {
        console.log("office_hour_exceptions table not found or empty:", err?.message);
      }

      const officeHoursResult = await run(db, "DELETE FROM office_hours;");
      deleted.officeHours = officeHoursResult.affectedRows ?? 0;

      try {
        const coursesResult = await run(db, "DELETE FROM courses;");
        deleted.courses = coursesResult.affectedRows ?? 0;
      } catch (err) {
        console.log("courses table not found or error:", err?.message);
      }

      try {
        const professorsResult = await run(db, "DELETE FROM professors;");
        deleted.professors = professorsResult.affectedRows ?? 0;
      } catch (err) {
        console.log("professors table not found or error:", err?.message);
      }

      console.log("Cleared all data:", deleted);
      res.json({ ok: true, deleted });
    } catch (err) {
      console.error("DELETE /api/office-hours failed:", err);
      res.status(500).json({ error: "Failed to clear office hours", details: err?.message });
    } finally {
      await close(db);
    }
  });
}

module.exports = { registerOfficeHoursDeleteRoutes };
