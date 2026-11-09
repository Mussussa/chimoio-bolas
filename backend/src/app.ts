import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { sendError, sendSuccess } from "./http/responses.js";
import { sequelize } from "./config/database.js";
import { logger } from "./config/logger.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(requestLogger);
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  allowedHeaders: ["authorization", "content-type"],
  methods: ["GET", "POST", "PATCH", "OPTIONS"]
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await sequelize.authenticate();
    return sendSuccess(res, { api: "online", database: "connected" }, 200, "API e base de dados operacionais.");
  } catch (error) {
    logger.error("Database health check failed", {
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) }
    });
    return sendError(res, 503, "A base de dados está indisponível.", "SERVICE_UNAVAILABLE");
  }
});
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
