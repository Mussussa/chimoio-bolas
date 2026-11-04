import { Router } from "express";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { isUuid } from "../domain/rules.js";
import { Review, ServiceProvider, Store, User } from "../models/index.js";
import { sendError, sendSuccess } from "../http/responses.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", authenticate, requireRole("client"), async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const { targetType, targetId, rating, comment = "" } = req.body as {
      targetType?: unknown; targetId?: unknown; rating?: unknown; comment?: unknown;
    };
    const stars = Number(rating);
    if ((targetType !== "store" && targetType !== "service_provider") ||
        !isUuid(targetId) || !Number.isInteger(stars) || stars < 1 || stars > 5 ||
        typeof comment !== "string" || comment.length > 1000) {
      return sendError(res, 400, "Destino, avaliação de 1 a 5 e comentário válidos são obrigatórios.");
    }
    if (targetType === "store") {
      const store = await Store.findOne({ where: { id: targetId, verified: true } });
      if (!store) return sendError(res, 404, "Negócio não encontrado.");
      if (store.ownerId === user.id) return sendError(res, 403, "Não pode avaliar o seu próprio negócio.");
    } else {
      const provider = await ServiceProvider.findOne({ where: { id: targetId, platformMember: true } });
      if (!provider?.subscriptionExpiresAt || provider.subscriptionExpiresAt.getTime() <= Date.now()) {
        return sendError(res, 404, "Prestador não encontrado.");
      }
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
});
