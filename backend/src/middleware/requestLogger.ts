import morgan from "morgan";
import type { Request } from "express";
import { logger } from "../config/logger.js";

morgan.token("route", (incomingMessage) => {
  const req = incomingMessage as Request;
  const route = req.route?.path;
  return route ? `${req.baseUrl}${String(route)}` : req.url.split("?")[0];
});

export const requestLogger = morgan(":method :route :status :response-time ms ip=:remote-addr", {
  stream: {
    write: (line) => logger.info(line.trim(), { type: "http" })
  }
});
