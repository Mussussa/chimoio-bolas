import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import winston from "winston";

const logDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../logs");
mkdirSync(logDirectory, { recursive: true });

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: jsonFormat,
  defaultMeta: { service: "chimoio-boladas-api" },
  transports: [
    new winston.transports.File({ filename: resolve(logDirectory, "error.log"), level: "error" }),
    new winston.transports.File({ filename: resolve(logDirectory, "combined.log") })
  ]
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) }));
}

export const auditLogger = {
  record(input: {
    actorId: string;
    action: string;
    ip: string | undefined;
    metadata: {
      negotiationId?: string;
      messageId?: string;
      amountMt?: number | null;
      from?: string;
      to?: string;
      batchId?: string;
      campaignId?: string;
      campaignCostMt?: number;
      planType?: string;
      campaignCount?: number;
      totalRevenueMt?: number;
      escrowStatus?: string;
    };
  }): void {
    logger.info("Business audit", {
      audit: true,
      timestamp: new Date().toISOString(),
      actorId: input.actorId,
      action: input.action,
      ip: input.ip ?? "unknown",
      metadata: input.metadata
    });
  }
};
