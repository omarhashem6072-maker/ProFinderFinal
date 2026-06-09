const { normalizeDay } = require("../db");

function buildWhereClause(query) {
  const where = [];
  const params = [];

  if (query.professor) {
    where.push("professor = ?");
    params.push(query.professor);
  }

  if (query.course) {
    where.push("course_code = ?");
    params.push(query.course);
  }

  if (query.days) {
    const rawDays = String(query.days)
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map(normalizeDay);
    if (rawDays.length > 0) {
      where.push(`day_name IN (${rawDays.map(() => "?").join(",")})`);
      params.push(...rawDays);
    }
  }

  if (query.timeFrom) {
    where.push("start_time >= ?");
    params.push(query.timeFrom);
  }

  if (query.timeTo) {
    where.push("end_time <= ?");
    params.push(query.timeTo);
  }

  if (query.search) {
    const term = `%${String(query.search).trim()}%`;
    where.push(
      "(professor LIKE ? OR course_code LIKE ? OR course_name LIKE ? OR IFNULL(notes,'') LIKE ?)"
    );
    params.push(term, term, term, term);
  }

  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

function toSafeInt(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function dedupeOfficeHoursRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    const key = [
      String(r.professor || "").trim(),
      String(r.course_code || "").trim(),
      String(r.day_name || "").trim(),
      String(r.start_time || "").trim(),
      String(r.end_time || "").trim(),
      String(r.location || "").trim(),
      String(r.email || "").trim().toLowerCase()
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Hide only exact parser boilerplate in API responses — do not drop user text that merely starts with similar words. */
function sanitizeNotes(val) {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const normalized = s.replace(/[\u2014\u2013]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
  // Keep "Office hours: TBA" in API responses so the UI can show TBA instead of placeholder times.
  const hideExact = new Set([
    "no office hours detected-please update manually",
    "extracted from course outline:"
  ]);
  if (hideExact.has(normalized)) return null;
  return s;
}

module.exports = {
  buildWhereClause,
  toSafeInt,
  dedupeOfficeHoursRows,
  sanitizeNotes
};
