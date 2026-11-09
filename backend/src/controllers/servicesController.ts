import type { RequestHandler } from "express";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";
import { Service, ServiceProvider, User } from "../models/index.js";

export const registerProvider: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    if (user.role !== "client" && user.role !== "prestador") {
      return sendError(res, 403, "Esta conta não pode registar um perfil de prestador.");
    }

    // category é agora recebido como um array de strings
    const { category, bio, basePrice } = req.body as {
      category: string[]; 
      bio: string; 
      basePrice: number;
    };

    const price = Number(basePrice);
    const existing = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (existing) return sendError(res, 409, "Já existe um perfil de prestador para esta conta.");

    const provider = await ServiceProvider.sequelize!.transaction(async (transaction) => {
      user.role = "prestador";
      await user.save({ transaction });
      return ServiceProvider.create({
        userId: user.id,
        category, // Guarda o array de categorias de serviços selecionadas
        bio: bio.trim(),
        basePrice: price.toFixed(2),
        verified: false,
        platformMember: true
      }, { transaction });
    });

    return sendSuccess(res, { provider }, 201, "Perfil de prestador criado gratuitamente.");
  } catch (error) {
    next(error);
  }
};

export const publishService: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Crie um perfil de prestador gratuito antes de publicar serviços.");
    
    const { title, description, price, deliveryTime } = req.body as {
      title: string; 
      description: string; 
      price: number; 
      deliveryTime: string;
    };
    
    const numericPrice = Number(price);
    const service = await Service.create({
      providerId: provider.id,
      title: title.trim(),
      description: description.trim(),
      price: numericPrice.toFixed(2),
      deliveryTime: deliveryTime.trim(),
      published: true,
      internalPlatformService: true
    });

    auditLogger.record({
      actorId: user.id,
      action: "service.created",
      ip: req.ip,
      metadata: { serviceId: service.id }
    });

    return sendSuccess(res, { service }, 201, "Serviço publicado gratuitamente.");
  } catch (error) {
    next(error);
  }
};