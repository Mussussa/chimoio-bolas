import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { User, Store } from "../models/index.js";

export const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser;
    if (!user) return sendError(res, 401, "Autenticação necessária.");

    // Procura a loja associada ao utilizador
    const store = await Store.findOne({ where: { ownerId: user.id } });

    return sendSuccess(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      store: store ? {
        id: store.id,
        name: store.name,
        slug: store.slug,
        category: store.category, // Categorias da loja
        description: store.description,
        address: store.address,
        latitude: store.latitude,   // Latitude da loja
        longitude: store.longitude, // Longitude da loja
        verified: store.verified
      } : null
    }, 200, "Perfil carregado.");
  } catch (error) {
    next(error);
  }
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
