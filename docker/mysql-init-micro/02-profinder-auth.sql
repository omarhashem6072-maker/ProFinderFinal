USE profinder_auth;

CREATE TABLE IF NOT EXISTS admins (
  id              INT NOT NULL AUTO_INCREMENT,
  username        VARCHAR(100) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NULL,
  first_name      VARCHAR(100) NULL,
  last_name       VARCHAR(100) NULL,
  is_super_admin  TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (id),
  UNIQUE KEY uk_admins_username (username),
  UNIQUE KEY uk_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Demo login: username admin / password admin (change in production).
-- is_super_admin=1 can clear all office hours; TAs (signup) are 0 and only delete their own uploads.
INSERT INTO admins (username, password, email, first_name, is_super_admin)
VALUES ('admin', 'admin', 'admin@localhost', 'Admin', 1)
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  email = VALUES(email),
  first_name = VALUES(first_name),
  is_super_admin = VALUES(is_super_admin);
