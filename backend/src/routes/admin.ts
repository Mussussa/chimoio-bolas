import { Router } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { AdBatch, Campaign, Negotiation, Store } from "../models/index.js";
import { canPublishToMeta, isUuid } from "../domain/rules.js";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";

export const adminRouter = Router();

adminRouter.post("/stores/:id/verify", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const storeId = req.params.id;
    if (!isUuid(storeId)) return sendError(res, 400, "Identificador de loja inválido.");
    const store = await Store.findByPk(storeId);
    if (!store) return sendError(res, 404, "Loja não encontrada.");
    store.verified = true;
    await store.save();
    return sendSuccess(res, { store }, 200, "Loja verificada.");
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/negotiations/:id/resolve", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const negotiationId = req.params.id;
    if (!isUuid(negotiationId)) return sendError(res, 400, "Identificador de negociação inválido.");
    if (req.body.resolution !== "complete") {
      return sendError(res, 400, "A resolução deve ser complete.");
    }
    const negotiation = await sequelize.transaction(async (transaction) => {
      const current = await Negotiation.findByPk(negotiationId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!current || current.escrowStatus !== "disputed") return null;
      current.escrowStatus = "completed";
      current.status = "completed";
      await current.save({ transaction });
      return current;
    });
    if (!negotiation) return sendError(res, 409, "Só uma negociação existente em disputa pode ser resolvida.");
    auditLogger.record({
      actorId: req.appUser!.id,
      action: "escrow.admin_resolved",
      ip: req.ip,
      metadata: { negotiationId: negotiation.id, from: "disputed", to: "completed" }
    });
    return sendSuccess(res, { negotiation, payment: { simulated: true, resolvedByAdmin: true } }, 200, "Disputa resolvida.");
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/ad-batches", authenticate, requireRole("admin"), async (_req, res, next) => {
  try {
    const batches = await AdBatch.findAll({ order: [["createdAt", "DESC"]] });
    return sendSuccess(res, { batches }, 200, "Lotes carregados.");
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/ad-batches/:id/publish-meta", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const batchId = req.params.id;
    if (!isUuid(batchId)) return sendError(res, 400, "Identificador do lote inválido.");
    const batch = await AdBatch.findByPk(batchId);
    if (!batch) return sendError(res, 404, "Lote não encontrado.");
    const campaignCount = await Campaign.count({ where: { adBatchId: batch.id } });
    if (!canPublishToMeta(campaignCount, Number(batch.totalRevenue), batch.publishedToWeb)) {
      return sendError(res, 409, "Meta Ads requer seis campanhas do mesmo lote, receita mínima de 600 MT e publicação Web.");
    }
    batch.publishedToMeta = true;
    await batch.save();
    auditLogger.record({
      actorId: req.appUser!.id,
      action: "ad_batch.published_meta",
      ip: req.ip,
      metadata: { batchId: batch.id, campaignCount, totalRevenueMt: Number(batch.totalRevenue) }
    });
    return sendSuccess(res, { batch }, 200, "Lote publicado no Meta Ads.");
  } catch (error) {
    next(error);
  }
});

export async function publishExpiredBatches(): Promise<void> {
  const threshold = new Date(Date.now() - 30 * 60 * 1000);
  const expired = await AdBatch.findAll({ where: { status: "open", createdAt: { [Op.lte]: threshold } } });
  for (const batch of expired) {
    const published = await AdBatch.sequelize!.transaction(async (transaction) => {
      await batch.reload({ transaction, lock: transaction.LOCK.UPDATE });
      if (batch.status !== "open") return false;
      const campaigns = await Campaign.findAll({ where: { adBatchId: batch.id }, transaction });
      batch.publishedToWeb = true;
      batch.status = "published";
      for (const campaign of campaigns) {
        campaign.status = "published";
        await campaign.save({ transaction });
      }
      await batch.save({ transaction });
      return true;
    });
    if (published) {
      auditLogger.record({
        actorId: "system",
        action: "ad_batch.published_web",
        ip: "system",
        metadata: { batchId: batch.id, campaignCount: await Campaign.count({ where: { adBatchId: batch.id } }) }
      });
    }
  }
}
