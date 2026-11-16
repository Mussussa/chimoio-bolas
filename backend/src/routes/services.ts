import { Router } from "express";
import { publishProviderService as publishService } from "../controllers/providerController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const servicesRouter = Router();

// Compatibilidade com clientes que ainda publicam pela rota genérica.
servicesRouter.post(
  "/services",
  authenticate,
  requireRole("prestador"),
  validateRequest(requestSchemas.publishService),
  publishService
);
