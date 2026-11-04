import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { sendSuccess } from "./http/responses.js";
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

app.get("/api/health", (_req, res) => sendSuccess(res, { ok: true }, 200, "API operacional."));
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
