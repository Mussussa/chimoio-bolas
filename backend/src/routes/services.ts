import { Router } from "express";
import { Op } from "sequelize";
import { campaignCosts, campaignQuotas, isUuid, subscriptionCosts } from "../domain/rules.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { AdBatch, Campaign, Product, Service, ServiceProvider, Store, User, type PackageType, type SubscriptionTier } from "../models/index.js";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";

export const servicesRouter = Router();

type CampaignBatchResult =
  | { campaign: Campaign; batch: AdBatch; batchCreated: boolean; campaignCount: number; publishedToWeb: boolean }
  | { error: string; status: 403 | 409 };

servicesRouter.post("/providers/renew", authenticate, requireRole("prestador"), async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider) return sendError(res, 404, "Perfil de prestador não encontrado.");
    const plan = req.body.subscriptionTier;
    if (plan !== undefined && plan !== "basico" && plan !== "premium") {
      return sendError(res, 400, "Escolha o plano Básico ou Premium.");
    }
    const renewed = await ServiceProvider.sequelize!.transaction(async (transaction) => {
      const lockedProvider = await ServiceProvider.findByPk(provider.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lockedProvider) return null;
      if (plan) lockedProvider.subscriptionTier = plan;
      lockedProvider.subscriptionStartedAt = new Date();
      lockedProvider.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await lockedProvider.save({ transaction });
      return lockedProvider;
    });
    if (!renewed) return sendError(res, 409, "O perfil mudou durante a renovação. Tente novamente.");
    const price = subscriptionCosts[renewed.subscriptionTier as "basico" | "premium"];
    return sendSuccess(res, { provider: renewed, payment: { simulated: true, amount: price, currency: "MT", renewedDays: 30 } }, 200, "Subscrição renovada.");
  } catch (error) {
    next(error);
  }
});

servicesRouter.post("/providers/register", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    if (user.role !== "client" && user.role !== "prestador") {
      return sendError(res, 403, "Esta conta não pode registar um perfil de prestador.");
    }
    const { category, bio, basePrice, subscriptionTier = "basico" } = req.body as {
      category?: unknown; bio?: unknown; basePrice?: unknown; subscriptionTier?: unknown;
    };
    const price = Number(basePrice);
    if (typeof category !== "string" || !category.trim() || category.length > 100 ||
        typeof bio !== "string" || !bio.trim() || bio.length > 2000 ||
        !Number.isFinite(price) || price < 0 || price > 9_999_999_999.99 ||
        (subscriptionTier !== "basico" && subscriptionTier !== "premium")) {
      return sendError(res, 400, "Categoria, biografia, preço e plano Básico/Premium válidos são obrigatórios.");
    }
    const existing = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (existing) return sendError(res, 409, "Já existe um perfil de prestador para esta conta.");

    const provider = await ServiceProvider.sequelize!.transaction(async (transaction) => {
      user.role = "prestador";
      await user.save({ transaction });
      return ServiceProvider.create({
        userId: user.id,
        category: category.trim(),
        bio: bio.trim(),
        basePrice: price.toFixed(2),
        subscriptionTier,
        subscriptionStartedAt: new Date(),
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        verified: false,
        platformMember: true
      }, { transaction });
    });
    return sendSuccess(res, {
      provider,
      payment: { simulated: true, amount: subscriptionCosts[subscriptionTier as "basico" | "premium"], currency: "MT", periodDays: 30 }
    }, 201, "Perfil de prestador registado.");
  } catch (error) {
    next(error);
  }
});

servicesRouter.post("/services", authenticate, requireRole("prestador"), async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = await ServiceProvider.findOne({ where: { userId: user.id } });
    if (!provider || !provider.platformMember) return sendError(res, 404, "Perfil de prestador não encontrado.");
    if (!provider.subscriptionExpiresAt || provider.subscriptionExpiresAt.getTime() <= Date.now()) {
      return sendError(res, 403, "A subscrição simulada expirou; renove-a antes de publicar outro serviço.");
    }
    const { title, description, price, deliveryTime } = req.body as {
      title?: unknown; description?: unknown; price?: unknown; deliveryTime?: unknown;
    };
    const numericPrice = Number(price);
    if (typeof title !== "string" || !title.trim() || title.length > 180 ||
        typeof description !== "string" || !description.trim() || description.length > 5000 ||
        !Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 9_999_999_999.99 ||
        typeof deliveryTime !== "string" || !deliveryTime.trim() || deliveryTime.length > 100) {
      return sendError(res, 400, "Título, descrição, preço e prazo válidos são obrigatórios.");
    }
    const service = await Service.create({
      providerId: provider.id,
      title: title.trim(),
      description: description.trim(),
      price: numericPrice.toFixed(2),
      deliveryTime: deliveryTime.trim(),
      published: true,
      internalPlatformService: true
    });
    return sendSuccess(res, { service, notice: "Serviço publicado na plataforma." }, 201, "Serviço publicado.");
  } catch (error) {
    next(error);
  }
});

servicesRouter.post("/campaigns", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const { targetType, targetId, packageType } = req.body as {
      targetType?: unknown; targetId?: unknown; packageType?: unknown;
    };
    if (!["store", "product", "service", "custom"].includes(String(targetType)) ||
        !["standard", "premium", "basico", "destaque"].includes(String(packageType)) ||
        (targetType !== "custom" && !isUuid(targetId)) ||
        (targetId !== undefined && targetId !== null && !isUuid(targetId))) {
      return sendError(res, 400, "Tipo de alvo, identificador e pacote válidos são obrigatórios.");
    }
    if (targetType !== "custom") {
      let ownedTarget = false;
      if (targetType === "store") {
        ownedTarget = Boolean(await Store.findOne({ where: { id: targetId as string, ownerId: user.id } }));
      } else if (targetType === "product") {
        const product = await Product.findByPk(targetId as string, { include: [{ model: Store, as: "store" }] });
        ownedTarget = Boolean(product && (await Store.findOne({ where: { id: product.storeId, ownerId: user.id } })));
      } else {
        const service = await Service.findByPk(targetId as string);
        const owner = service ? await ServiceProvider.findOne({ where: { id: service.providerId, userId: user.id } }) : null;
        ownedTarget = Boolean(owner);
      }
      if (!ownedTarget) return sendError(res, 404, "O alvo da campanha não pertence a esta conta.");
    }
    if (user.role !== "prestador" && user.role !== "lojista") {
      return sendError(res, 403, "Só lojistas e prestadores podem criar campanhas.");
    }

    const plan = packageType as PackageType;
    const cost = campaignCosts[plan];
    if (cost === undefined) return sendError(res, 400, "O pacote de campanha não tem preço configurado.");
    const sequelize = Campaign.sequelize!;
    const result: CampaignBatchResult = await sequelize.transaction(async (transaction): Promise<CampaignBatchResult> => {
      if (user.role === "prestador") {
        const provider = await ServiceProvider.findOne({
          where: { userId: user.id },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!provider || !provider.subscriptionExpiresAt || provider.subscriptionExpiresAt.getTime() <= Date.now()) {
          return { error: "É necessária uma subscrição activa para campanhas." as const, status: 403 as const };
        }
        const recentCampaigns = await Campaign.count({
          where: { ownerId: user.id, createdAt: { [Op.gte]: provider.subscriptionStartedAt } },
          transaction
        });
        if (recentCampaigns >= campaignQuotas[provider.subscriptionTier as SubscriptionTier]) {
          return { error: "A quota simulada de campanhas deste ciclo foi atingida." as const, status: 409 as const };
        }
      }
      let openBatch = await AdBatch.findOne({
        where: { planType: plan, status: "open" },
        order: [["createdAt", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const batchCreated = !openBatch;
      if (!openBatch) {
        openBatch = await AdBatch.create({ planType: plan }, { transaction });
      }
      const campaign = await Campaign.create({
        ownerId: user.id,
        targetType: targetType as "store" | "product" | "service" | "custom",
        targetId: typeof targetId === "string" ? targetId : null,
        packageType: plan,
        cost: cost.toFixed(2),
        adBatchId: openBatch.id
      }, { transaction });
      const campaigns = await Campaign.findAll({ where: { adBatchId: openBatch.id }, transaction });
      const revenue = campaigns.reduce((sum, item) => sum + Number(item.cost), 0);
      openBatch.totalRevenue = revenue.toFixed(2);
      const publishToWeb = openBatch.status === "open" &&
        (campaigns.length >= 6 || Date.now() - openBatch.createdAt.getTime() >= 30 * 60 * 1000);
      if (publishToWeb) {
        openBatch.publishedToWeb = true;
        openBatch.status = "published";
        for (const item of campaigns) {
          item.status = "published";
          await item.save({ transaction });
        }
      }
      await openBatch.save({ transaction });
      return { campaign, batch: openBatch, batchCreated, campaignCount: campaigns.length, publishedToWeb: publishToWeb };
    });
    if ("error" in result) return sendError(res, result.status, result.error);
    if (result.batchCreated) {
      auditLogger.record({
        actorId: user.id,
        action: "ad_batch.created",
        ip: req.ip,
        metadata: { batchId: result.batch.id, planType: result.batch.planType }
      });
    }
    auditLogger.record({
      actorId: user.id,
      action: "ad_batch.updated",
      ip: req.ip,
      metadata: {
        batchId: result.batch.id,
        campaignId: result.campaign.id,
        campaignCostMt: cost,
        campaignCount: result.campaignCount,
        totalRevenueMt: Number(result.batch.totalRevenue)
      }
    });
    if (result.publishedToWeb) {
      auditLogger.record({
        actorId: user.id,
        action: "ad_batch.published_web",
        ip: req.ip,
        metadata: { batchId: result.batch.id, campaignCount: result.campaignCount }
      });
    }
    return sendSuccess(res, {
      campaign: result.campaign,
      batch: result.batch,
      payment: { simulated: true, amount: cost, currency: "MT" }
    }, 201, "Campanha criada.");
  } catch (error) {
    next(error);
  }
});
