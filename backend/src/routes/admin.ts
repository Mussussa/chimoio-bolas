import { Router } from "express";
import { verifyStore } from "../controllers/adminController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const adminRouter = Router();

adminRouter.post(
  "/stores/:id/verify",
  authenticate,
  requireRole("admin"),
  validateRequest(requestSchemas.storeIdParams, "params"),
  verifyStore
);
