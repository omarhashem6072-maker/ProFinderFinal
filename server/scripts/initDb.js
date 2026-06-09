const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mysql = require("mysql2/promise");
const { MYSQL_CONFIG } = require("../db");

function readSql(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

async function main() {
  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const seedPath = path.join(__dirname, "..", "seed.sql");

  const schemaSql = readSql(schemaPath);
  const seedSql = readSql(seedPath);


  const { database, ...withoutDb } = MYSQL_CONFIG;
  const adminConn = await mysql.createConnection(withoutDb);
  try {
    await adminConn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
    );
  } finally {
    await adminConn.end();
  }

  const conn = await mysql.createConnection({
    ...MYSQL_CONFIG,
    connectTimeout: 15000,
    multipleStatements: true
  });
  try {
    await conn.query(schemaSql);

    const [rows] = await conn.execute("SELECT COUNT(*) AS cnt FROM office_hours;");
    const rowCount = rows?.[0]?.cnt ?? 0;

    if (rowCount === 0) {
      await conn.query(seedSql);
      console.log(`Database initialized and seeded: ${MYSQL_CONFIG.database}`);
    } else {
      console.log(`Database already has data; skipped seeding: ${MYSQL_CONFIG.database}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed to init DB:", err);
  process.exitCode = 1;
});

