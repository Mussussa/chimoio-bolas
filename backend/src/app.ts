import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { sendSuccess } from "./http/responses.js";
import { adminRouter } from "./routes/admin.js";
import { negotiationsRouter } from "./routes/negotiations.js";
import { profileRouter } from "./routes/profile.js";
import { reviewsRouter } from "./routes/reviews.js";
import { servicesRouter } from "./routes/services.js";
import { storesRouter } from "./routes/stores.js";

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
app.use("/api/profile", profileRouter);
app.use("/api", servicesRouter);
app.use("/api", storesRouter);
app.use("/api/negotiations", negotiationsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
