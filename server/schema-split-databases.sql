-- =============================================================================
-- Profinder: split MySQL databases (microservice-style data ownership)
-- Run as a user with CREATE DATABASE privilege (e.g. root).
--
-- Layout:
--   profinder_auth   -> admins only
--   profinder_oh     -> office_hours only
--
-- Your monolith today uses one DB (e.g. profinder) with both tables in schema.sql.
-- After split, point the auth service at profinder_auth and the OH service at profinder_oh.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Create databases
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS profinder_auth
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS profinder_oh
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- 2) Auth database: admins
-- -----------------------------------------------------------------------------
USE profinder_auth;

CREATE TABLE IF NOT EXISTS admins (
  id         INT NOT NULL AUTO_INCREMENT,
  username   VARCHAR(100) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NULL,
  first_name VARCHAR(100) NULL,
  last_name  VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (id),
  UNIQUE KEY uk_admins_username (username),
  UNIQUE KEY uk_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- 3) Office-hours database: office_hours
-- -----------------------------------------------------------------------------
USE profinder_oh;

CREATE TABLE IF NOT EXISTS office_hours (
  id          INT NOT NULL AUTO_INCREMENT,
  professor   VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  day_name    VARCHAR(3) NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  location    VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NULL,
  notes       TEXT NULL,
  PRIMARY KEY (id),
  INDEX idx_office_hours_professor (professor),
  INDEX idx_office_hours_course_code (course_code),
  INDEX idx_office_hours_day_name (day_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- 4) OPTIONAL: migrate data from legacy single database named `profinder`
--     (Skip this block if you are starting fresh or DB name is not `profinder`.)
--     Run once; use INSERT IGNORE or check counts to avoid duplicates.
-- -----------------------------------------------------------------------------

-- Copy admins — preserve ids (run only on empty target admins table):
-- INSERT INTO profinder_auth.admins (id, username, password, email, first_name, last_name, created_at)
-- SELECT id, username, password, email, first_name, last_name, created_at
-- FROM profinder.admins;
-- Then reset AUTO_INCREMENT to MAX(id)+1 (run the number you get from SELECT MAX(id) FROM profinder_auth.admins):
-- ALTER TABLE profinder_auth.admins AUTO_INCREMENT = 100;

-- Copy admins — new ids (simplest; no AUTO_INCREMENT fix needed):
-- INSERT INTO profinder_auth.admins (username, password, email, first_name, last_name, created_at)
-- SELECT username, password, email, first_name, last_name, created_at FROM profinder.admins;

-- Copy office_hours — preserve ids (empty target table only):
-- INSERT INTO profinder_oh.office_hours (id, professor, course_code, course_name, day_name, start_time, end_time, location, email, notes)
-- SELECT id, professor, course_code, course_name, day_name, start_time, end_time, location, email, notes
-- FROM profinder.office_hours;
-- ALTER TABLE profinder_oh.office_hours AUTO_INCREMENT = 100;  -- set to MAX(id)+1

-- Copy office_hours — new ids:
-- INSERT INTO profinder_oh.office_hours (professor, course_code, course_name, day_name, start_time, end_time, location, email, notes)
-- SELECT professor, course_code, course_name, day_name, start_time, end_time, location, email, notes FROM profinder.office_hours;

-- -----------------------------------------------------------------------------
-- 5) OPTIONAL: dedicated users (least privilege per service)
--     Replace 'choose_strong_password_1' / _2 before running.
-- -----------------------------------------------------------------------------

-- CREATE USER IF NOT EXISTS 'profinder_auth_app'@'%' IDENTIFIED BY 'choose_strong_password_1';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON profinder_auth.* TO 'profinder_auth_app'@'%';

-- CREATE USER IF NOT EXISTS 'profinder_oh_app'@'%' IDENTIFIED BY 'choose_strong_password_2';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON profinder_oh.* TO 'profinder_oh_app'@'%';

-- FLUSH PRIVILEGES;
