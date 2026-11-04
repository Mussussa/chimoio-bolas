import "dotenv/config";
import { app } from "./app.js";
import { assertDatabaseUrl, sequelize } from "./config/database.js";
import { assertEncryptionKey } from "./config/encryption.js";
import { initializeModels } from "./models/index.js";
import { publishExpiredBatches } from "./routes/admin.js";
import { logger } from "./config/logger.js";

initializeModels(sequelize);

const port = Number(process.env.PORT ?? 3001);

assertEncryptionKey();
assertDatabaseUrl();
await sequelize.authenticate();
logger.info("Database connection established");

const batchTimer = setInterval(() => {
  publishExpiredBatches().catch((error: unknown) => logger.error("Failed to publish expired ad batches", {
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
  }));
}, 60_000);
batchTimer.unref();

app.listen(port, () => logger.info("API listening", { port }));
