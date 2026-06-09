-- Runs once on empty MySQL data dir (docker-entrypoint-initdb.d)
CREATE DATABASE IF NOT EXISTS profinder_auth
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS profinder_core
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS profinder_oh
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
