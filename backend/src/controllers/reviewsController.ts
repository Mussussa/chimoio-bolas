import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { Review, ServiceProvider, Store, User } from "../models/index.js";

export const createReview: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const { targetType, targetId, rating, comment = "" } = req.body as {
      targetType: "store" | "service_provider"; targetId: string; rating: number; comment?: string;
    };
    const stars = Number(rating);
    if (targetType === "store") {
      const store = await Store.findOne({ where: { id: targetId, verified: true } });
      if (!store) return sendError(res, 404, "Negócio não encontrado.");
      if (store.ownerId === user.id) return sendError(res, 403, "Não pode avaliar o seu próprio negócio.");
    } else {
      const provider = await ServiceProvider.findOne({ where: { id: targetId, platformMember: true } });
      if (!provider) return sendError(res, 404, "Prestador não encontrado.");
      if (provider.userId === user.id) return sendError(res, 403, "Não pode avaliar o seu próprio negócio.");
    }
    const review = await Review.create({
      clientId: user.id,
      targetType,
      targetId,
      rating: stars,
      comment: comment.trim()
    });
    return sendSuccess(res, { review }, 201, "Avaliação registada.");
  } catch (error) {
    next(error);
  }
};
