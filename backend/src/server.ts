import "dotenv/config";
import { app } from "./app.js";
import { assertDatabaseUrl, sequelize } from "./config/database.js";
import { assertEncryptionKey } from "./config/encryption.js";
import { initializeModels } from "./models/index.js";
import { logger } from "./config/logger.js";

initializeModels(sequelize);

const port = Number(process.env.PORT ?? 3001);

assertEncryptionKey();
assertDatabaseUrl();
await sequelize.authenticate();
logger.info("Database connection established");

app.listen(port, () => logger.info("API listening", { port }));
