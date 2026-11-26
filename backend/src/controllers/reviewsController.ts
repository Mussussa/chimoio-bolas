import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { Review, ServiceProvider, Store, User } from "../models/index.js";
import { serializePublicReview } from "./publicReview.js";

// Regista a avaliação de uma loja ou prestador; o frontend pode actualizar a classificação e a lista de avaliações.
export const createReview: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const { targetType, targetId, rating, comment = "", imageUrl = null } = req.body as {
      targetType: "store" | "service_provider"; targetId: string; rating: number; comment?: string; imageUrl?: string | null;
    };
    const stars = Number(rating);
    if (targetType === "store") {
      const store = await Store.findByPk(targetId);
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
      comment: comment.trim(),
      imageUrl
    });
    const savedReview = await Review.findByPk(review.id, {
      attributes: ["id", "rating", "comment", "imageUrl", "createdAt"],
      include: [{ model: User, as: "client", attributes: ["name", "avatarUrl"] }]
    });
    if (!savedReview) throw new Error("A avaliação foi criada, mas não foi possível carregá-la.");
    return sendSuccess(res, { review: serializePublicReview(savedReview) }, 201, "Avaliação registada.");
  } catch (error) {
    next(error);
  }
};
