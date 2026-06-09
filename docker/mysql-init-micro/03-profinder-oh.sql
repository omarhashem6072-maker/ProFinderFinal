USE profinder_oh;

CREATE TABLE IF NOT EXISTS office_hours (
  id                     INT NOT NULL AUTO_INCREMENT,
  professor              VARCHAR(255) NOT NULL,
  course_code            VARCHAR(50) NOT NULL,
  course_name            VARCHAR(255) NOT NULL,
  day_name               VARCHAR(3) NOT NULL,
  start_time             TIME NOT NULL,
  end_time               TIME NOT NULL,
  location               VARCHAR(100) NOT NULL,
  email                  VARCHAR(255) NULL,
  notes                  TEXT NULL,
  uploaded_by_admin_id   INT NULL,
  PRIMARY KEY (id),
  INDEX idx_office_hours_professor (professor),
  INDEX idx_office_hours_course_code (course_code),
  INDEX idx_office_hours_day_name (day_name),
  INDEX idx_office_hours_uploaded_by (uploaded_by_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No default rows: add office hours via admin (upload / manual entry).
