/**
 * Qualifies bare table names for split MySQL schemas (core vs office-hours).
 * Only runs when PROFINDER_USE_SPLIT_DB=1.
 */

function useSplit() {
  return String(process.env.PROFINDER_USE_SPLIT_DB || "").trim() === "1";
}

function qualifySql(sql) {
  if (!useSplit() || !sql) return sql;

  const C = process.env.PROFINDER_CORE_SCHEMA || "profinder_core";
  const O = process.env.PROFINDER_OH_SCHEMA || "profinder_oh";
  const qc = (t) => `\`${C}\`.\`${t}\``;
  const qo = (t) => `\`${O}\`.\`${t}\``;

  let s = String(sql);

  const subs = [
    // OH — longer / view names first (avoid double-qualifying)
    [/\bFROM\s+v_office_hours\b/gi, `FROM ${qo("v_office_hours")}`],
    [/\bJOIN\s+v_office_hours\b/gi, `JOIN ${qo("v_office_hours")}`],
    [/\bFROM\s+`v_office_hours`\b/gi, `FROM ${qo("v_office_hours")}`],
    [/\bJOIN\s+`v_office_hours`\b/gi, `JOIN ${qo("v_office_hours")}`],

    [/\bFROM\s+office_hour_exceptions\b/gi, `FROM ${qo("office_hour_exceptions")}`],
    [/\bDELETE\s+FROM\s+office_hour_exceptions\b/gi, `DELETE FROM ${qo("office_hour_exceptions")}`],

    [/\bFROM\s+office_hours\b/gi, `FROM ${qo("office_hours")}`],
    [/\bJOIN\s+office_hours\b/gi, `JOIN ${qo("office_hours")}`],
    [/\bINTO\s+office_hours\b/gi, `INTO ${qo("office_hours")}`],
    [/\bUPDATE\s+office_hours\b/gi, `UPDATE ${qo("office_hours")}`],
    [/\bDELETE\s+FROM\s+office_hours\b/gi, `DELETE FROM ${qo("office_hours")}`],
    [/\bFROM\s+`office_hours`\b/gi, `FROM ${qo("office_hours")}`],
    [/\bJOIN\s+`office_hours`\b/gi, `JOIN ${qo("office_hours")}`],
    [/\bINTO\s+`office_hours`\b/gi, `INTO ${qo("office_hours")}`],
    [/\bUPDATE\s+`office_hours`\b/gi, `UPDATE ${qo("office_hours")}`],
    [/\bDELETE\s+FROM\s+`office_hours`\b/gi, `DELETE FROM ${qo("office_hours")}`],

    // Core
    [/\bUPDATE\s+`professors`\b/gi, `UPDATE ${qc("professors")}`],
    [/\bFROM\s+professors\b/gi, `FROM ${qc("professors")}`],
    [/\bJOIN\s+professors\b/gi, `JOIN ${qc("professors")}`],
    [/\bINTO\s+professors\b/gi, `INTO ${qc("professors")}`],
    [/\bUPDATE\s+professors\b/gi, `UPDATE ${qc("professors")}`],
    [/\bDELETE\s+FROM\s+professors\b/gi, `DELETE FROM ${qc("professors")}`],

    [/\bFROM\s+courses\b/gi, `FROM ${qc("courses")}`],
    [/\bJOIN\s+courses\b/gi, `JOIN ${qc("courses")}`],
    [/\bINTO\s+courses\b/gi, `INTO ${qc("courses")}`],
    [/\bUPDATE\s+courses\b/gi, `UPDATE ${qc("courses")}`],
    [/\bDELETE\s+FROM\s+courses\b/gi, `DELETE FROM ${qc("courses")}`],

    [/\bFROM\s+documents\b/gi, `FROM ${qc("documents")}`],
    [/\bJOIN\s+documents\b/gi, `JOIN ${qc("documents")}`],
    [/\bINTO\s+documents\b/gi, `INTO ${qc("documents")}`],
    [/\bUPDATE\s+documents\b/gi, `UPDATE ${qc("documents")}`],
    [/\bDELETE\s+FROM\s+documents\b/gi, `DELETE FROM ${qc("documents")}`],

    // INSERT with backticked table names (dynamic SQL in server.js)
    [/\bINTO\s+`office_hours`\b/gi, `INTO ${qo("office_hours")}`],
    [/\bINTO\s+`professors`\b/gi, `INTO ${qc("professors")}`],
    [/\bINTO\s+`courses`\b/gi, `INTO ${qc("courses")}`]
  ];

  for (const [re, rep] of subs) {
    s = s.replace(re, rep);
  }

  return s;
}

module.exports = { useSplit, qualifySql };
