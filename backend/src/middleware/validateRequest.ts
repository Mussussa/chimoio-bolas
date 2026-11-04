import type { RequestHandler } from "express";
import type { ObjectSchema } from "joi";
import { sendError } from "../http/responses.js";
import { validationMessages } from "../validation/schemas.js";

type RequestPart = "body" | "params";

export function validateRequest(schema: ObjectSchema, part: RequestPart = "body"): RequestHandler {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[part], {
      abortEarly: false,
      convert: true,
      messages: validationMessages
    });

    if (error) {
      const details = [...new Set(error.details.map((detail) => detail.message))].slice(0, 5);
      return sendError(res, 400, `Verifique os dados enviados: ${details.join(" ")}`, "VALIDATION_ERROR");
    }

    if (part === "body") req.body = value;
    else Object.assign(req.params, value);
    return next();
  };
}
