import type { RequestHandler } from "express";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";
import { Service, ServiceProvider, User } from "../models/index.js";
import { SERVICE_CATEGORIES } from "../models/ServiceProvider.js";

export const registerProvider: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    if (user.role !== "client" && user.role !== "prestador") {
      return sendError(res, 403, "Esta conta não pode registar um perfil de prestador.");
    }

    const { category, bio, basePrice } = req.body as {
      category: string[];
      bio: string;
      basePrice: number;
    };
    const existing = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (existing) return sendError(res, 409, "Já existe um perfil de prestador para esta conta.");

    const provider = await ServiceProvider.sequelize!.transaction(async (transaction) => {
      user.role = "prestador";
      await user.save({ transaction });
      return ServiceProvider.create({
        userId: user.id,
        category: category as (typeof SERVICE_CATEGORIES)[number][],
        bio: bio.trim(),
        basePrice: Number(basePrice).toFixed(2),
        verified: false,
        platformMember: true
      }, { transaction });
    });

    return sendSuccess(res, { provider }, 201, "Perfil de prestador criado gratuitamente.");
  } catch (error) {
    next(error);
  }
};

export const getMyProviderDashboard: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Perfil de prestador não encontrado.");

    const services = await Service.findAll({
      where: { providerId: provider.id },
      order: [["createdAt", "DESC"]]
    });

    return sendSuccess(res, {
      provider,
      services,
      profile: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }
    }, 200, "Painel do prestador carregado.");
  } catch (error) {
    next(error);
  }
};

export const updateMyProvider: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Perfil de prestador não encontrado.");

    const { name, category, bio, basePrice, avatarUrl } = req.body as {
      name: string;
      category: string[];
      bio: string;
      basePrice: number | string;
      avatarUrl?: string | null;
    };
    const unsupportedCategory = category.find((item) =>
      !SERVICE_CATEGORIES.some((supportedCategory) => supportedCategory === item) &&
      !provider.category.some((currentCategory) => currentCategory === item)
    );
    if (unsupportedCategory) {
      return sendError(res, 400, `A área “${unsupportedCategory}” não é permitida.`);
    }

    const services = await Service.findAll({ where: { providerId: provider.id } });
    const removedCategory = services.find((service) => !category.includes(service.category));
    if (removedCategory) {
      return sendError(res, 400, `A categoria “${removedCategory.category}” ainda está em uso por um serviço.`);
    }

    await user.sequelize!.transaction(async (transaction) => {
      user.name = name.trim();
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl?.trim() || null;
      provider.category = category as typeof provider.category;
      provider.bio = bio.trim();
      provider.basePrice = Number(basePrice).toFixed(2);
      await Promise.all([user.save({ transaction }), provider.save({ transaction })]);
    });

    return sendSuccess(res, {
      provider,
      profile: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }
    }, 200, "Perfil do prestador actualizado.");
  } catch (error) {
    next(error);
  }
};

export const publishProviderService: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Crie um perfil de prestador gratuito antes de publicar serviços.");

    const { title, description, category, price, deliveryTime, images } = req.body as {
      title: string;
      description: string;
      category: string;
      price: number;
      deliveryTime: string;
      images?: string[];
    };
    if (!provider.category.includes(category as typeof provider.category[number])) {
      return sendError(res, 400, "Escolha uma categoria associada ao seu perfil de prestador.");
    }

    const service = await Service.create({
      providerId: provider.id,
      title: title.trim(),
      description: description.trim(),
      category,
      price: Number(price).toFixed(2),
      deliveryTime: deliveryTime.trim(),
      images: images ?? [],
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

export const updateMyService: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Perfil de prestador não encontrado.");
    const service = await Service.findOne({ where: { id: req.params.id, providerId: provider.id } });
    if (!service) return sendError(res, 404, "Serviço não encontrado no seu perfil.");

    const { title, description, category, price, deliveryTime, images } = req.body as {
      title: string;
      description: string;
      category: string;
      price: number;
      deliveryTime: string;
      images: string[];
    };
    if (!provider.category.includes(category as typeof provider.category[number])) {
      return sendError(res, 400, "Escolha uma categoria associada ao seu perfil de prestador.");
    }

    service.title = title.trim();
    service.description = description.trim();
    service.category = category;
    service.price = Number(price).toFixed(2);
    service.deliveryTime = deliveryTime.trim();
    service.images = images ?? [];
    await service.save();

    return sendSuccess(res, { service }, 200, "Serviço actualizado.");
  } catch (error) {
    next(error);
  }
};

export const deleteMyService: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Perfil de prestador não encontrado.");
    const service = await Service.findOne({ where: { id: req.params.id, providerId: provider.id } });
    if (!service) return sendError(res, 404, "Serviço não encontrado no seu perfil.");
    await service.destroy();
    return sendSuccess(res, null, 200, "Serviço removido.");
  } catch (error) {
    next(error);
  }
};
