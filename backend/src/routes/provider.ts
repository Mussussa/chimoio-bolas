import { Router } from "express";
import {
  deleteMyService,
  getMyProviderDashboard,
  publishProviderService,
  registerProvider,
  updateMyProvider,
  updateMyService
} from "../controllers/providerController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const providerRouter = Router();

providerRouter.post("/register", authenticate, validateRequest(requestSchemas.registerProvider), registerProvider);
providerRouter.get("/me", authenticate, requireRole("prestador"), getMyProviderDashboard);
providerRouter.put("/me", authenticate, requireRole("prestador"), validateRequest(requestSchemas.updateProvider), updateMyProvider);
providerRouter.post(
  "/me/services",
  authenticate,
  requireRole("prestador"),
  validateRequest(requestSchemas.publishService),
  publishProviderService
);
providerRouter.put(
  "/me/services/:id",
  authenticate,
  requireRole("prestador"),
  validateRequest(requestSchemas.serviceIdParams, "params"),
  validateRequest(requestSchemas.updateService),
  updateMyService
);
providerRouter.delete(
  "/me/services/:id",
  authenticate,
  requireRole("prestador"),
  validateRequest(requestSchemas.serviceIdParams, "params"),
  deleteMyService
);
