/**
 * Introspects an existing MySQL schema and provides helpers that let the API
 * work with either:
 * - a denormalized `office_hours` table (professor/course_code/course_name...)
 * - a normalized schema with `professors`, `courses`, `office_hours`, and a view `v_office_hours`
 */

const { MYSQL_CONFIG } = require("./db");
const { useSplit } = require("./lib/splitSql");

const CORE_SCHEMA = process.env.PROFINDER_CORE_SCHEMA || "profinder_core";
const OH_SCHEMA = process.env.PROFINDER_OH_SCHEMA || "profinder_oh";

function pickColumn(columns, candidates) {
  const set = new Set(columns.map((c) => c.toLowerCase()));
  for (const cand of candidates) {
    if (set.has(cand.toLowerCase())) return cand;
  }
  return null;
}

function pickByIncludes(columns, includesAll = [], excludes = []) {
  const lowers = columns.map((c) => c.toLowerCase());
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const low = lowers[i];
    if (includesAll.every((x) => low.includes(x.toLowerCase())) && !excludes.some((x) => low.includes(x.toLowerCase()))) {
      return col;
    }
  }
  return null;
}

async function listColumns(conn, tableOrView) {
  const sql = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION ASC;
  `;
  const [rows] = await conn.execute(sql, [MYSQL_CONFIG.database, tableOrView]);
  return rows.map((r) => r.COLUMN_NAME);
}

async function listColumnsInSchema(conn, schema, tableOrView) {
  const sql = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION ASC;
  `;
  const [rows] = await conn.execute(sql, [schema, tableOrView]);
  return rows.map((r) => r.COLUMN_NAME);
}

async function existsTableOrView(conn, name) {
  const sql = `
    SELECT TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    LIMIT 1;
  `;
  const [rows] = await conn.execute(sql, [MYSQL_CONFIG.database, name]);
  return rows.length > 0 ? rows[0] : null;
}

async function existsInSchema(conn, schema, name) {
  const sql = `
    SELECT TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    LIMIT 1;
  `;
  const [rows] = await conn.execute(sql, [schema, name]);
  return rows.length > 0 ? rows[0] : null;
}

async function getSchemaInfoSplit(conn) {
  const found = {
    v_office_hours: await existsInSchema(conn, OH_SCHEMA, "v_office_hours"),
    office_hours: await existsInSchema(conn, OH_SCHEMA, "office_hours"),
    professors: await existsInSchema(conn, CORE_SCHEMA, "professors"),
    courses: await existsInSchema(conn, CORE_SCHEMA, "courses"),
    admins: null
  };

  const info = {
    hasView: !!found.v_office_hours,
    hasOfficeHours: !!found.office_hours,
    hasProfessors: !!found.professors,
    hasCourses: !!found.courses,
    hasAdmins: false,
    columns: {}
  };

  if (found.v_office_hours) {
    info.columns.v_office_hours = await listColumnsInSchema(conn, OH_SCHEMA, "v_office_hours");
  }
  if (found.office_hours) {
    info.columns.office_hours = await listColumnsInSchema(conn, OH_SCHEMA, "office_hours");
  }
  if (found.professors) {
    info.columns.professors = await listColumnsInSchema(conn, CORE_SCHEMA, "professors");
  }
  if (found.courses) {
    info.columns.courses = await listColumnsInSchema(conn, CORE_SCHEMA, "courses");
  }

  if (info.hasView) {
    const cols = info.columns.v_office_hours;
    info.viewMap = {
      id: pickColumn(cols, ["id", "office_hour_id", "oh_id"]),
      professor: pickColumn(cols, ["professor", "professor_name", "name"]) || pickByIncludes(cols, ["professor"], ["id"]),
      course_code: pickColumn(cols, ["course_code", "course", "code"]) || pickByIncludes(cols, ["course"], ["id", "name"]),
      course_name: pickColumn(cols, ["course_name", "course_title", "title", "name"]) || pickByIncludes(cols, ["course"], ["id", "code"]),
      day_name: pickColumn(cols, ["day_name", "day", "weekday"]) || pickByIncludes(cols, ["day"], ["id"]),
      start_time: pickColumn(cols, ["start_time", "start", "time_start"]) || pickByIncludes(cols, ["start"], ["id"]),
      end_time: pickColumn(cols, ["end_time", "end", "time_end"]) || pickByIncludes(cols, ["end"], ["id"]),
      location: pickColumn(cols, ["location", "room"]) || pickByIncludes(cols, ["loc"], ["id"]),
      email: pickColumn(cols, ["email", "professor_email", "contact_email"]),
      notes: pickColumn(cols, ["notes", "note", "comment", "comments"]),
      uploaded_by_admin_id: pickColumn(cols, ["uploaded_by_admin_id", "created_by_admin_id", "owner_admin_id"])
    };
  } else {
    info.viewMap = null;
  }

  if (info.hasProfessors) {
    const cols = info.columns.professors;
    info.professorsMap = {
      id: pickColumn(cols, ["id", "professor_id"]) || pickByIncludes(cols, ["id"], []),
      name: pickColumn(cols, ["professor", "name", "professor_name"]) || pickByIncludes(cols, ["name"], ["id"])
    };
  }

  if (info.hasCourses) {
    const cols = info.columns.courses;
    info.coursesMap = {
      id: pickColumn(cols, ["id", "course_id"]) || pickByIncludes(cols, ["id"], []),
      code: pickColumn(cols, ["course_code", "code"]) || pickByIncludes(cols, ["code"], ["id"]),
      name: pickColumn(cols, ["course_name", "name", "title"]) || pickByIncludes(cols, ["name"], ["id", "code"])
    };
  }

  if (info.hasOfficeHours) {
    const cols = info.columns.office_hours;
    info.officeHoursMap = {
      id: pickColumn(cols, ["id", "office_hour_id"]) || pickByIncludes(cols, ["id"], []),
      professor_id:
        pickColumn(cols, ["professor_id"]) ||
        pickByIncludes(cols, ["professor", "id"], []) ||
        null,
      course_id:
        pickColumn(cols, ["course_id"]) ||
        pickByIncludes(cols, ["course", "id"], []) ||
        null,
      day_name: pickColumn(cols, ["day_name", "day_of_week", "day"]) || pickByIncludes(cols, ["day"], ["id"]),
      start_time: pickColumn(cols, ["start_time", "start"]) || pickByIncludes(cols, ["start"], ["id"]),
      end_time: pickColumn(cols, ["end_time", "end"]) || pickByIncludes(cols, ["end"], ["id"]),
      location: pickColumn(cols, ["location", "room"]) || pickByIncludes(cols, ["loc"], ["id"]),
      email: pickColumn(cols, ["email", "professor_email", "contact_email"]),
      notes: pickColumn(cols, ["notes", "note", "comment", "comments"]),
      uploaded_by_admin_id: pickColumn(cols, ["uploaded_by_admin_id", "created_by_admin_id", "owner_admin_id"])
    };
  }

  info.adminsMap = null;
  return info;
}

async function getSchemaInfo(conn) {
  if (useSplit()) {
    return getSchemaInfoSplit(conn);
  }

  const names = ["v_office_hours", "office_hours", "professors", "courses", "admins"];
  const found = {};
  for (const n of names) {
    found[n] = await existsTableOrView(conn, n);
  }

  const info = {
    hasView: !!found.v_office_hours,
    hasOfficeHours: !!found.office_hours,
    hasProfessors: !!found.professors,
    hasCourses: !!found.courses,
    hasAdmins: !!found.admins,
    columns: {}
  };

  for (const n of names) {
    if (found[n]) {
      info.columns[n] = await listColumns(conn, n);
    }
  }

  // Build mapping for v_office_hours if present
  if (info.hasView) {
    const cols = info.columns.v_office_hours;
    info.viewMap = {
      id: pickColumn(cols, ["id", "office_hour_id", "oh_id"]),
      professor: pickColumn(cols, ["professor", "professor_name", "name"]) || pickByIncludes(cols, ["professor"], ["id"]),
      course_code: pickColumn(cols, ["course_code", "course", "code"]) || pickByIncludes(cols, ["course"], ["id", "name"]),
      course_name: pickColumn(cols, ["course_name", "course_title", "title", "name"]) || pickByIncludes(cols, ["course"], ["id", "code"]),
      day_name: pickColumn(cols, ["day_name", "day", "weekday"]) || pickByIncludes(cols, ["day"], ["id"]),
      start_time: pickColumn(cols, ["start_time", "start", "time_start"]) || pickByIncludes(cols, ["start"], ["id"]),
      end_time: pickColumn(cols, ["end_time", "end", "time_end"]) || pickByIncludes(cols, ["end"], ["id"]),
      location: pickColumn(cols, ["location", "room"]) || pickByIncludes(cols, ["loc"], ["id"]),
      email: pickColumn(cols, ["email", "professor_email", "contact_email"]),
      notes: pickColumn(cols, ["notes", "note", "comment", "comments"]),
      uploaded_by_admin_id: pickColumn(cols, ["uploaded_by_admin_id", "created_by_admin_id", "owner_admin_id"])
    };
  } else {
    info.viewMap = null;
  }

  // For normalized inserts, determine key columns
  if (info.hasProfessors) {
    const cols = info.columns.professors;
    info.professorsMap = {
      id: pickColumn(cols, ["id", "professor_id"]) || pickByIncludes(cols, ["id"], []),
      name: pickColumn(cols, ["professor", "name", "professor_name"]) || pickByIncludes(cols, ["name"], ["id"])
    };
  }

  if (info.hasCourses) {
    const cols = info.columns.courses;
    info.coursesMap = {
      id: pickColumn(cols, ["id", "course_id"]) || pickByIncludes(cols, ["id"], []),
      code: pickColumn(cols, ["course_code", "code"]) || pickByIncludes(cols, ["code"], ["id"]),
      name: pickColumn(cols, ["course_name", "name", "title"]) || pickByIncludes(cols, ["name"], ["id", "code"])
    };
  }

  if (info.hasOfficeHours) {
    const cols = info.columns.office_hours;
    info.officeHoursMap = {
      id: pickColumn(cols, ["id", "office_hour_id"]) || pickByIncludes(cols, ["id"], []),
      professor_id:
        pickColumn(cols, ["professor_id"]) ||
        pickByIncludes(cols, ["professor", "id"], []) ||
        null,
      course_id:
        pickColumn(cols, ["course_id"]) ||
        pickByIncludes(cols, ["course", "id"], []) ||
        null,
      day_name: pickColumn(cols, ["day_name", "day_of_week", "day"]) || pickByIncludes(cols, ["day"], ["id"]),
      start_time: pickColumn(cols, ["start_time", "start"]) || pickByIncludes(cols, ["start"], ["id"]),
      end_time: pickColumn(cols, ["end_time", "end"]) || pickByIncludes(cols, ["end"], ["id"]),
      location: pickColumn(cols, ["location", "room"]) || pickByIncludes(cols, ["loc"], ["id"]),
      email: pickColumn(cols, ["email", "professor_email", "contact_email"]),
      notes: pickColumn(cols, ["notes", "note", "comment", "comments"]),
      uploaded_by_admin_id: pickColumn(cols, ["uploaded_by_admin_id", "created_by_admin_id", "owner_admin_id"])
    };
  }

  if (info.hasAdmins) {
    const cols = info.columns.admins;
    info.adminsMap = {
      id: pickColumn(cols, ["id", "admin_id"]) || pickByIncludes(cols, ["id"], []),
      username: pickColumn(cols, ["username", "user", "login"]) || pickByIncludes(cols, ["user"], []),
      password: pickColumn(cols, ["password", "password_hash", "hash"]) || pickByIncludes(cols, ["pass"], []),
      email: pickColumn(cols, ["email", "admin_email"]),
      first_name: pickColumn(cols, ["first_name", "firstname", "first"]),
      last_name: pickColumn(cols, ["last_name", "lastname", "last"]),
      is_super_admin: pickColumn(cols, ["is_super_admin", "super_admin", "is_superuser"])
    };
  } else {
    info.adminsMap = null;
  }

  return info;
}

module.exports = {
  getSchemaInfo
};

