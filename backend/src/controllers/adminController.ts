import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { Store } from "../models/index.js";

export const verifyStore: RequestHandler = async (req, res, next) => {
  try {
    const storeId = req.params.id as string;
    const store = await Store.findByPk(storeId);
    if (!store) return sendError(res, 404, "Loja não encontrada.");
    store.verified = true;
    await store.save();
    return sendSuccess(res, { store }, 200, "Loja verificada.");
  } catch (error) {
    next(error);
  }
};
