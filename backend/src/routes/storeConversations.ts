import { Router } from "express";
import {
  createStoreConversation,
  listStoreConversations,
  listStoreMessages,
  sendStoreMessage
} from "../controllers/storeConversationsController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const storeConversationsRouter = Router();

storeConversationsRouter.use(authenticate);
storeConversationsRouter.get("/", requireRole("client", "lojista", "prestador"), listStoreConversations);
storeConversationsRouter.post(
  "/",
  requireRole("client", "lojista", "prestador"),
  validateRequest(requestSchemas.createStoreConversation),
  createStoreConversation
);
storeConversationsRouter.get(
  "/:id/messages",
  requireRole("client", "lojista", "prestador"),
  validateRequest(requestSchemas.storeConversationParams, "params"),
  listStoreMessages
);
storeConversationsRouter.post(
  "/:id/messages",
  requireRole("client", "lojista", "prestador"),
  validateRequest(requestSchemas.storeConversationParams, "params"),
  validateRequest(requestSchemas.createStoreMessage),
  sendStoreMessage
);
