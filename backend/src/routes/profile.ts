import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const profileRouter = Router();

// Devolve os dados do perfil do utilizador autenticado.
profileRouter.get("/me", authenticate, getProfile);
// Actualiza o nome e o telefone do utilizador autenticado.
profileRouter.patch("/me", authenticate, validateRequest(requestSchemas.updateProfile), updateProfile);
