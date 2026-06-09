/**
 * TA vs super-admin checks for office_hours rows (uploaded_by_admin_id).
 * @param {{ get: Function, getSchema: () => object|null, isApiService: boolean }} deps
 */
function createOfficeHourAuthz(deps) {
  const { get, getSchema, isApiService } = deps;

  function getTrustedAdminId(req) {
    const trust = String(req.headers["x-profinder-admin-id"] || "").trim();
    if (trust !== "") {
      const n = Number(trust);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (!isApiService && req.session && req.session.adminId != null && req.session.adminId !== "") {
      const n = Number(req.session.adminId);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  }

  function requestIsSuperAdmin(req) {
    const raw = String(req.headers["x-profinder-is-super-admin"] || "").trim().toLowerCase();
    if (raw === "1" || raw === "true" || raw === "yes") return true;
    if (raw === "0" || raw === "false" || raw === "no") return false;
    if (!isApiService && req.session && req.session.isSuperAdmin === true) return true;
    return false;
  }

  function officeHoursOwnerColumnName() {
    return getSchema()?.officeHoursMap?.uploaded_by_admin_id || null;
  }

  function officeHoursIdColumnName() {
    return getSchema()?.officeHoursMap?.id || "id";
  }

  async function assertMayMutateOfficeHourRow(db, req, officeHourId) {
    const ownerCol = officeHoursOwnerColumnName();
    if (!ownerCol) return { ok: true };
    const adminId = getTrustedAdminId(req);
    if (!adminId) return { ok: false, status: 401, error: "Authentication required" };
    if (requestIsSuperAdmin(req)) return { ok: true };
    const idCol = officeHoursIdColumnName();
    const row = await get(
      db,
      `SELECT \`${ownerCol}\` AS owner FROM office_hours WHERE \`${idCol}\` = ? LIMIT 1`,
      [officeHourId]
    );
    if (!row) return { ok: false, status: 404, error: "Office hour not found" };
    const owner = row.owner;
    if (owner == null) {
      return {
        ok: false,
        status: 403,
        error: "Only a super admin may change seeded or legacy office hours"
      };
    }
    if (Number(owner) !== adminId) {
      return { ok: false, status: 403, error: "You may only edit or remove office hours you uploaded" };
    }
    return { ok: true };
  }

  return {
    getTrustedAdminId,
    requestIsSuperAdmin,
    officeHoursOwnerColumnName,
    officeHoursIdColumnName,
    assertMayMutateOfficeHourRow
  };
}

module.exports = { createOfficeHourAuthz };
