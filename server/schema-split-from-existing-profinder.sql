-- =============================================================================
-- Split existing `profinder` into multiple schemas (MySQL Workbench friendly)
-- Target layout (3 databases):
--   profinder_auth   -> admins
--   profinder_core   -> professors, courses, documents
--   profinder_oh     -> office_hours, office_hour_exceptions (+ view, see below)
--
-- Prerequisites:
--   - Connected in Workbench to the SAME server that has schema `profinder`.
--   - Backup first (Server → Data Export, or dump `profinder`).
--
-- How to run:
--   1) Execute sections 1–3 (creates empty clones + copies rows).
--   2) For v_office_hours: run SHOW CREATE VIEW profinder.v_office_hours;
--      in a tab, then edit the SELECT to use qualified names:
--        professors  -> profinder_core.professors
--        courses     -> profinder_core.courses
--        office_hours -> profinder_oh.office_hours
--      (and any other base tables). Create the view in profinder_oh.
--   3) Optionally DROP or rename old tables in `profinder` ONLY after your
--      app points at the new databases (not covered here).
--
-- Notes:
--   CREATE TABLE ... LIKE copies indexes but NOT foreign keys (MySQL).
--   Re-add FKs only if you need them; cross-schema FKs are possible on one server.
--
-- Generated columns (Error 3105):
--   If office_hours has columns like start_minutes (GENERATED), you must NOT use
--   INSERT ... SELECT * — list only non-generated columns. Section 3b generates
--   the correct INSERT for you; run it and execute the text it returns.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Create target databases
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS profinder_auth
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS profinder_core
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS profinder_oh
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- 2) Clone structure (same columns, indexes; FKs not copied)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS profinder_auth.admins;
CREATE TABLE profinder_auth.admins LIKE profinder.admins;

DROP TABLE IF EXISTS profinder_core.professors;
CREATE TABLE profinder_core.professors LIKE profinder.professors;

DROP TABLE IF EXISTS profinder_core.courses;
CREATE TABLE profinder_core.courses LIKE profinder.courses;

DROP TABLE IF EXISTS profinder_core.documents;
CREATE TABLE profinder_core.documents LIKE profinder.documents;

DROP TABLE IF EXISTS profinder_oh.office_hours;
CREATE TABLE profinder_oh.office_hours LIKE profinder.office_hours;

DROP TABLE IF EXISTS profinder_oh.office_hour_exceptions;
CREATE TABLE profinder_oh.office_hour_exceptions LIKE profinder.office_hour_exceptions;

-- -----------------------------------------------------------------------------
-- 3) Copy data (order respects typical FKs: professors → courses → …)
-- -----------------------------------------------------------------------------
INSERT INTO profinder_auth.admins SELECT * FROM profinder.admins;

INSERT INTO profinder_core.professors SELECT * FROM profinder.professors;

INSERT INTO profinder_core.courses SELECT * FROM profinder.courses;

INSERT INTO profinder_core.documents SELECT * FROM profinder.documents;

-- -----------------------------------------------------------------------------
-- 3b) office_hours — skip generated columns (fixes Error 3105)
--     Run this query alone. Copy the value from the result cell "run_this_statement"
--     into a new tab and execute that full INSERT ... SELECT ... statement.
-- -----------------------------------------------------------------------------
SET SESSION group_concat_max_len = 1000000;

SELECT CONCAT(
  'INSERT INTO profinder_oh.office_hours (',
  GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY ORDINAL_POSITION),
  ') SELECT ',
  GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY ORDINAL_POSITION),
  ' FROM profinder.office_hours;'
) AS run_this_statement
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'profinder'
  AND TABLE_NAME = 'office_hours'
  AND COALESCE(EXTRA, '') NOT LIKE '%GENERATED%'
  AND COALESCE(EXTRA, '') NOT LIKE '%VIRTUAL%';

-- -----------------------------------------------------------------------------
-- 3c) office_hour_exceptions — same pattern if you also get 3105 here; otherwise
--     you can use plain INSERT ... SELECT * (commented below).
--     Run this query, copy "run_this_statement", execute in a new tab.
-- -----------------------------------------------------------------------------
SELECT CONCAT(
  'INSERT INTO profinder_oh.office_hour_exceptions (',
  GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY ORDINAL_POSITION),
  ') SELECT ',
  GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY ORDINAL_POSITION),
  ' FROM profinder.office_hour_exceptions;'
) AS run_this_statement
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'profinder'
  AND TABLE_NAME = 'office_hour_exceptions'
  AND COALESCE(EXTRA, '') NOT LIKE '%GENERATED%'
  AND COALESCE(EXTRA, '') NOT LIKE '%VIRTUAL%';

-- Plain copy (use only if table has NO generated columns):
-- INSERT INTO profinder_oh.office_hours SELECT * FROM profinder.office_hours;
-- INSERT INTO profinder_oh.office_hour_exceptions SELECT * FROM profinder.office_hour_exceptions;

-- -----------------------------------------------------------------------------
-- 4) AUTO_INCREMENT (optional): align next id with max existing
-- -----------------------------------------------------------------------------
-- Run after inspecting MAX(id) per table if you rely on auto-increment continuity.

-- -----------------------------------------------------------------------------
-- 5) View v_office_hours — do this manually in Workbench
-- -----------------------------------------------------------------------------
-- Tab 1:
--   SHOW CREATE VIEW profinder.v_office_hours;
-- Copy the view body. Replace unqualified table names with:
--   profinder_core.professors
--   profinder_core.courses
--   profinder_oh.office_hours
-- (Use the exact aliases/joins from your definition.)
-- Tab 2:
--   USE profinder_oh;
--   CREATE VIEW v_office_hours AS ... ;
-- If the view only reads office_hours (denormalized), you may only qualify
-- office_hours as profinder_oh.office_hours.
