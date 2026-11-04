import { Router } from "express";
import { User } from "../models/index.js";
import { authenticate } from "../middleware/authenticate.js";
import { sendError, sendSuccess } from "../http/responses.js";

export const profileRouter = Router();

profileRouter.get("/me", authenticate, (req, res) => {
  const user = req.appUser;
  if (!user) return sendError(res, 401, "Autenticação necessária.");
  return sendSuccess(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  }, 200, "Perfil carregado.");
});

profileRouter.patch("/me", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    if (typeof req.body.name !== "string" || !req.body.name.trim() || req.body.name.length > 120) {
      return sendError(res, 400, "O nome é obrigatório e deve ter até 120 caracteres.");
    }
    if (req.body.phone !== undefined && req.body.phone !== null && (typeof req.body.phone !== "string" || req.body.phone.length > 40)) {
      return sendError(res, 400, "Telefone inválido.");
    }
    user.name = req.body.name.trim();
    if (req.body.phone !== undefined) user.phone = req.body.phone?.trim() || null;
    await user.save();
    return sendSuccess(res, { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }, 200, "Perfil actualizado.");
  } catch (error) {
    next(error);
  }
});
