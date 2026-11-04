import { Router } from "express";
import { registerProvider, publishService } from "../controllers/servicesController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const servicesRouter = Router();

servicesRouter.post("/providers/register", authenticate, validateRequest(requestSchemas.registerProvider), registerProvider);
servicesRouter.post(
  "/services",
  authenticate,
  requireRole("prestador"),
  validateRequest(requestSchemas.publishService),
  publishService
);
