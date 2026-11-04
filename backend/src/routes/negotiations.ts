import { Router } from "express";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import {
  completeNegotiation,
  createMessage,
  createNegotiation,
  listNegotiations,
  respondToProposal
} from "../controllers/negotiationsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const negotiationsRouter = Router();

negotiationsRouter.get("/", authenticate, listNegotiations);
negotiationsRouter.post(
  "/",
  authenticate,
  requireRole("client"),
  validateRequest(requestSchemas.createNegotiation),
  createNegotiation
);
negotiationsRouter.post(
  "/:id/messages",
  authenticate,
  validateRequest(requestSchemas.negotiationIdParams, "params"),
  validateRequest(requestSchemas.createMessage),
  createMessage
);
negotiationsRouter.post(
  "/:id/proposals/:messageId/respond",
  authenticate,
  validateRequest(requestSchemas.proposalParams, "params"),
  validateRequest(requestSchemas.respondToProposal),
  respondToProposal
);
negotiationsRouter.post(
  "/:id/complete",
  authenticate,
  validateRequest(requestSchemas.negotiationIdParams, "params"),
  completeNegotiation
);
