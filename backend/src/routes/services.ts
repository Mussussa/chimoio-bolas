import { Router } from "express";
import { registerProvider, publishService } from "../controllers/servicesController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const servicesRouter = Router();

// Cria gratuitamente o perfil de prestador do utilizador autenticado.
servicesRouter.post("/providers/register", authenticate, validateRequest(requestSchemas.registerProvider), registerProvider);
// Publica um serviço no catálogo pelo prestador autenticado.
servicesRouter.post(
  "/services",
  authenticate,
  requireRole("prestador"),
  validateRequest(requestSchemas.publishService),
  publishService
);
