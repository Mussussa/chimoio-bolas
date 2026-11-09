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

// Lista as negociações em que o utilizador autenticado participa.
negotiationsRouter.get("/", authenticate, listNegotiations);
// Inicia uma negociação com um serviço publicado.
negotiationsRouter.post(
  "/",
  authenticate,
  requireRole("client"),
  validateRequest(requestSchemas.createNegotiation),
  createNegotiation
);
// Envia uma mensagem ou proposta de preço para uma negociação.
negotiationsRouter.post(
  "/:id/messages",
  authenticate,
  validateRequest(requestSchemas.negotiationIdParams, "params"),
  validateRequest(requestSchemas.createMessage),
  createMessage
);
// Aceita ou rejeita uma proposta recebida na negociação.
negotiationsRouter.post(
  "/:id/proposals/:messageId/respond",
  authenticate,
  validateRequest(requestSchemas.proposalParams, "params"),
  validateRequest(requestSchemas.respondToProposal),
  respondToProposal
);
// Confirma a conclusão de uma negociação aceite.
negotiationsRouter.post(
  "/:id/complete",
  authenticate,
  validateRequest(requestSchemas.negotiationIdParams, "params"),
  completeNegotiation
);
