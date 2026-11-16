import type { RequestHandler } from "express";
import { Op } from "sequelize";
import { sendError, sendSuccess } from "../http/responses.js";
import { Product, Review, Service, ServiceProvider, Store, User } from "../models/index.js";

export const getPublicStore: RequestHandler = async (req, res, next) => {
  try {
    const identifier = req.params.slug as string;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const store = await Store.findOne({
      where: isUuid ? { [Op.or]: [{ slug: identifier }, { id: identifier }] } : { slug: identifier }
    });
    if (!store) return sendError(res, 404, "Loja não encontrada.");
    const [products, reviews] = await Promise.all([
      Product.findAll({ where: { storeId: store.id }, order: [["createdAt", "DESC"]] }),
      Review.findAll({
        where: { targetType: "store", targetId: store.id },
        attributes: ["id", "rating", "comment", "createdAt"],
        order: [["createdAt", "DESC"]]
      })
    ]);
    return sendSuccess(res, { store, products, reviews }, 200, "Loja carregada.");
  } catch (error) {
    next(error);
  }
};

export const getPublicProduct: RequestHandler = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id as string);
    if (!product) return sendError(res, 404, "Produto não encontrado.");
    const store = await Store.findByPk(product.storeId);
    if (!store) return sendError(res, 404, "Produto não encontrado.");
    return sendSuccess(res, { product, store }, 200, "Produto carregado.");
  } catch (error) {
    next(error);
  }
};

export const getPublicProvider: RequestHandler = async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findOne({
      where: { id: req.params.id as string, platformMember: true }
    });
    if (!provider) return sendError(res, 404, "Prestador não encontrado.");
    const [profile, services, reviews] = await Promise.all([
      User.findByPk(provider.userId, { attributes: ["id", "name", "avatarUrl"] }),
      Service.findAll({
        where: { providerId: provider.id, published: true, internalPlatformService: true },
        order: [["createdAt", "DESC"]]
      }),
      Review.findAll({
        where: { targetType: "service_provider", targetId: provider.id },
        attributes: ["id", "rating", "comment", "createdAt"],
        order: [["createdAt", "DESC"]]
      })
    ]);
    return sendSuccess(res, { provider, profile, services, reviews }, 200, "Perfil público do prestador carregado.");
  } catch (error) {
    next(error);
  }
};

export const getPublicReviews: RequestHandler = async (req, res, next) => {
  try {
    const targetType = req.params.targetType as "store" | "service_provider";
    const targetId = req.params.targetId as string;
    const target = targetType === "store"
      ? await Store.findOne({ where: { id: targetId, verified: true }, attributes: ["id"] })
      : await ServiceProvider.findOne({ where: { id: targetId, platformMember: true }, attributes: ["id"] });
    if (!target) return sendError(res, 404, "Perfil não encontrado.");

    const reviews = await Review.findAll({
      where: { targetType, targetId },
      attributes: ["id", "rating", "comment", "createdAt"],
      order: [["createdAt", "DESC"]]
    });
    return sendSuccess(res, { reviews }, 200, "Avaliações carregadas.");
  } catch (error) {
    next(error);
  }
};
