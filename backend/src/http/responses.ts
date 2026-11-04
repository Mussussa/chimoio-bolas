import type { Response } from "express";

export function sendSuccess<T extends Record<string, unknown>>(
  res: Response,
  data: T,
  status = 200,
  message = "Operação realizada com sucesso."
): Response {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  errorCode = errorCodeForStatus(status)
): Response {
  return res.status(status).json({ success: false, message, error_code: errorCode });
}

export function errorCodeForStatus(status: number): string {
  switch (status) {
    case 400: return "VALIDATION_ERROR";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 413: return "PAYLOAD_TOO_LARGE";
    case 415: return "UNSUPPORTED_MEDIA_TYPE";
    default: return "API_ERROR";
  }
}
