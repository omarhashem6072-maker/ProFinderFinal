const path = require("node:path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const { openDb, all, get, run, close, MYSQL_CONFIG, useSplit } = require("./db");
const { getSchemaInfo } = require("./schemaIntrospect");
const { requireAdmin } = require("./middleware/requireAdmin");
const { upload } = require("./config/multerPdf");
const { createOfficeHourAuthz } = require("./lib/officeHourAuthz");

const { registerAuthRoutes } = require("./routes/authRoutes");
const { registerHealthRoutes } = require("./routes/healthRoutes");
const { registerCatalogRoutes } = require("./routes/catalogRoutes");
const { registerOfficeHoursListRoutes } = require("./routes/officeHoursListRoutes");
const { registerOfficeHoursCreateRoutes } = require("./routes/officeHoursCreateRoutes");
const { registerOfficeHoursUpdateRoutes } = require("./routes/officeHoursUpdateRoutes");
const { registerOfficeHoursDeleteRoutes } = require("./routes/officeHoursDeleteRoutes");
const { registerExportRoutes } = require("./routes/exportRoutes");
const { registerDebugRoutes } = require("./routes/debugRoutes");
const { registerUploadPdfRoutes } = require("./routes/uploadPdfRoutes");

const IS_API_SERVICE = process.env.PROFINDER_SERVICE === "api";
const PORT = Number(process.env.PORT || (IS_API_SERVICE ? 3002 : 3000));
const DEMO_TA_SIGNUP_CODE = String(process.env.DEMO_TA_SIGNUP_CODE || "123456").trim();

async function main() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  const sessionSecret = process.env.SESSION_SECRET || "profinder-session-secret-change-in-production";
  if (!IS_API_SERVICE) {
    app.use(
      session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: "lax"
        }
      })
    );
  }

  const projectRoot = path.join(__dirname, "..");
  if (!IS_API_SERVICE) {
    app.use(express.static(projectRoot));
  }

  let schemaInfo = null;
  let schemaInitError = null;

  async function initSchema() {
    schemaInitError = null;
    const maxAttempts = 25;
    const delayMs = 2000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const conn = await openDb();
        try {
          schemaInfo = await getSchemaInfo(conn);
          schemaInitError = null;
          return;
        } finally {
          await close(conn);
        }
      } catch (err) {
        schemaInfo = null;
        schemaInitError = {
          message: err?.message || String(err),
          code: err?.code,
          errno: err?.errno
        };
        console.warn(`[initSchema] DB not ready (${attempt}/${maxAttempts}):`, schemaInitError.message);
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
  }

  if (!IS_API_SERVICE) {
    registerAuthRoutes(app, {
      openDb,
      get,
      run,
      close,
      getSchema: () => schemaInfo,
      demoTaSignupCode: DEMO_TA_SIGNUP_CODE
    });
  }

  await initSchema();

  const authz = createOfficeHourAuthz({
    get,
    getSchema: () => schemaInfo,
    isApiService: IS_API_SERVICE
  });

  const dbDeps = { openDb, all, close, getSchema: () => schemaInfo };

  registerHealthRoutes(app, {
    ...dbDeps,
    getSchemaInitError: () => schemaInitError,
    initSchema,
    requireAdmin
  });

  registerCatalogRoutes(app, dbDeps);
  registerOfficeHoursListRoutes(app, dbDeps);

  registerOfficeHoursCreateRoutes(app, {
    requireAdmin,
    getSchema: () => schemaInfo,
    getTrustedAdminId: authz.getTrustedAdminId,
    officeHoursOwnerColumnName: authz.officeHoursOwnerColumnName
  });

  registerOfficeHoursUpdateRoutes(app, {
    requireAdmin,
    getSchema: () => schemaInfo,
    assertMayMutateOfficeHourRow: authz.assertMayMutateOfficeHourRow
  });

  registerOfficeHoursDeleteRoutes(app, {
    requireAdmin,
    requestIsSuperAdmin: authz.requestIsSuperAdmin,
    getTrustedAdminId: authz.getTrustedAdminId,
    officeHoursOwnerColumnName: authz.officeHoursOwnerColumnName,
    officeHoursIdColumnName: authz.officeHoursIdColumnName
  });

  registerExportRoutes(app, dbDeps);
  registerDebugRoutes(app, dbDeps);

  registerUploadPdfRoutes(app, {
    requireAdmin,
    upload,
    getSchema: () => schemaInfo,
    getTrustedAdminId: authz.getTrustedAdminId,
    officeHoursOwnerColumnName: authz.officeHoursOwnerColumnName
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Profinder server running on http://localhost:${PORT}`);
    console.log(
      useSplit()
        ? `MySQL (split): ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port} core=${
            process.env.PROFINDER_CORE_SCHEMA || "profinder_core"
          } oh=${process.env.PROFINDER_OH_SCHEMA || "profinder_oh"} service=${IS_API_SERVICE ? "api" : "app"}`
        : `MySQL: ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`
    );
    console.log("Init DB: npm run db:init (inside server/)");
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
