-- MySQL 8.0 schema for Profinder
-- Stores office hours in a single table (matches current frontend shape).

CREATE TABLE IF NOT EXISTS office_hours (
  id                    INT NOT NULL AUTO_INCREMENT,
  professor             VARCHAR(255) NOT NULL,
  course_code           VARCHAR(50) NOT NULL,
  course_name           VARCHAR(255) NOT NULL,
  day_name              VARCHAR(3) NOT NULL,  -- Mon/Tue/Wed/Thu/Fri/Sat/Sun
  start_time            TIME NOT NULL,        -- stored as TIME; API returns HH:MM
  end_time              TIME NOT NULL,        -- stored as TIME; API returns HH:MM
  location              VARCHAR(100) NOT NULL,
  email                 VARCHAR(255) NULL,
  notes                 TEXT NULL,
  uploaded_by_admin_id  INT NULL,
  PRIMARY KEY (id),
  INDEX idx_office_hours_professor (professor),
  INDEX idx_office_hours_course_code (course_code),
  INDEX idx_office_hours_day_name (day_name),
  INDEX idx_office_hours_uploaded_by (uploaded_by_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Admin users for login (username and password stored in plain text).
CREATE TABLE IF NOT EXISTS admins (
  id               INT NOT NULL AUTO_INCREMENT,
  username         VARCHAR(100) NOT NULL,
  password         VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NULL,
  first_name       VARCHAR(100) NULL,
  last_name        VARCHAR(100) NULL,
  is_super_admin   TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (id),
  UNIQUE KEY uk_admins_username (username),
  UNIQUE KEY uk_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
