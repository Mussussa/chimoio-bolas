import "dotenv/config";
import { app } from "./app.js";
import { assertDatabaseUrl, sequelize } from "./config/database.js";
import { assertEncryptionKey } from "./config/encryption.js";
import { initializeModels } from "./models/index.js";
import { logger } from "./config/logger.js";
import { syncDatabaseSchema } from "./config/syncDatabase.js";

initializeModels(sequelize);

const port = Number(process.env.PORT ?? 3001);

assertEncryptionKey();
assertDatabaseUrl();
await sequelize.authenticate();
await syncDatabaseSchema(sequelize);
logger.info("Database connection established");

const server = app.listen(port);
server.once("listening", () => logger.info("API listening", { port }));
server.once("error", (error: NodeJS.ErrnoException) => {
  logger.error("API failed to listen", {
    error: { name: error.name, message: error.message, stack: error.stack, code: error.code },
    port
  });
  process.exitCode = 1;
});
