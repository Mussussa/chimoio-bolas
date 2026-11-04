import type { ErrorRequestHandler, RequestHandler } from "express";
import { UniqueConstraintError, ValidationError } from "sequelize";
import { logger } from "../config/logger.js";
import { errorCodeForStatus, sendError } from "../http/responses.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, `Rota não encontrada: ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const declaredStatus = typeof error === "object" && error !== null && "status" in error &&
    typeof error.status === "number" && error.status >= 400 && error.status < 500 ? error.status : null;
  const status = error instanceof UniqueConstraintError ? 409
    : error instanceof ValidationError ? 400
      : declaredStatus ?? 500;
  const message = error instanceof UniqueConstraintError
    ? "O registo já existe."
    : error instanceof ValidationError
      ? "Os dados enviados não são válidos."
      : status < 500
        ? "O pedido não pôde ser processado."
      : "Ocorreu um erro interno. Tente novamente.";
  const code = status < 500 ? errorCodeForStatus(status) : "INTERNAL_SERVER_ERROR";
  const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error };

  logger.error("Request failed", {
    error: errorDetails,
    method: req.method,
    route: req.route?.path ? `${req.baseUrl}${String(req.route.path)}` : req.path,
    ip: req.ip,
    userId: req.appUser?.id ?? null,
    status,
    errorCode: code
  });
  sendError(res, status, message, code);
};
