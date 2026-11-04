import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { User } from "../models/index.js";

export const getProfile: RequestHandler = (req, res) => {
  const user = req.appUser;
  if (!user) return sendError(res, 401, "Autenticação necessária.");
  return sendSuccess(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  }, 200, "Perfil carregado.");
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    user.name = req.body.name.trim();
    if (req.body.phone !== undefined) user.phone = req.body.phone?.trim() || null;
    await user.save();
    return sendSuccess(res, { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }, 200, "Perfil actualizado.");
  } catch (error) {
    next(error);
  }
};
