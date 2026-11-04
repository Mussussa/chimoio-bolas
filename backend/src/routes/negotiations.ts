import { Router } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { Message, Negotiation, Service, ServiceProvider, User } from "../models/index.js";
import { canTransitionEscrow, isUuid, isValidPrice } from "../domain/rules.js";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";

export const negotiationsRouter = Router();

async function findParticipantNegotiation(id: string, user: User): Promise<Negotiation | null> {
  const negotiation = await Negotiation.findByPk(id);
  if (!negotiation) return null;
  const provider = await ServiceProvider.findByPk(negotiation.providerId);
  if (negotiation.clientId !== user.id && provider?.userId !== user.id) return null;
  return negotiation;
}

negotiationsRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const provider = user.role === "prestador" ? await ServiceProvider.findOne({ where: { userId: user.id } }) : null;
    const where = provider
      ? { [Op.or]: [{ clientId: user.id }, { providerId: provider.id }] }
      : { clientId: user.id };
    const negotiations = await Negotiation.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: Message, as: "messages", separate: true, order: [["createdAt", "ASC"]] }]
    });
    return sendSuccess(res, { negotiations }, 200, "Negociações carregadas.");
  } catch (error) {
    next(error);
  }
});

negotiationsRouter.post("/", authenticate, requireRole("client"), async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const serviceId = req.body.serviceId;
    if (!isUuid(serviceId)) return sendError(res, 400, "Indique um serviço válido.");
    const service = await Service.findOne({ where: { id: serviceId, published: true } });
    if (!service) return sendError(res, 404, "Serviço não encontrado ou não publicado.");
    const provider = await ServiceProvider.findByPk(service.providerId);
    if (!provider || provider.userId === user.id || !provider.subscriptionExpiresAt ||
        provider.subscriptionExpiresAt.getTime() <= Date.now()) {
      return sendError(res, 409, "Este serviço não está disponível para negociação.");
    }
    const negotiation = await Negotiation.create({
      clientId: user.id,
      providerId: provider.id,
      serviceId: service.id,
      status: "pending",
      agreedPrice: null,
      escrowStatus: "inactive",
      clientProofFile: null,
      providerProofFile: null
    });
    return sendSuccess(res, { negotiation }, 201, "Negociação iniciada.");
  } catch (error) {
    next(error);
  }
});

negotiationsRouter.post("/:id/messages", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const negotiationId = req.params.id;
    if (!isUuid(negotiationId)) return sendError(res, 400, "Identificador de negociação inválido.");
    const negotiation = await findParticipantNegotiation(negotiationId, user);
    if (!negotiation) return sendError(res, 404, "Negociação não encontrada.");
    if (negotiation.status === "completed" || negotiation.status === "rejected") {
      return sendError(res, 409, "Esta negociação já foi encerrada.");
    }
    const { content, messageType = "text", proposalAmount } = req.body as {
      content?: unknown; messageType?: unknown; proposalAmount?: unknown;
    };
    if (typeof content !== "string" || !content.trim() || content.length > 4000) {
      return sendError(res, 400, "A mensagem é obrigatória e deve ter até 4.000 caracteres.");
    }
    if (messageType !== "text" && messageType !== "proposal") {
      return sendError(res, 400, "Tipo de mensagem inválido.");
    }
    if (messageType === "proposal") {
      const amount = Number(proposalAmount);
      if (negotiation.status !== "pending" || negotiation.escrowStatus !== "inactive" || !isValidPrice(amount)) {
        return sendError(res, 409, "A proposta requer negociação pendente, escrow inactivo e valor positivo.");
      }
      const created = await sequelize.transaction(async (transaction) => {
        const lockedNegotiation = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!lockedNegotiation || lockedNegotiation.status !== "pending" || lockedNegotiation.escrowStatus !== "inactive") {
          return null;
        }
        lockedNegotiation.agreedPrice = amount.toFixed(2);
        await lockedNegotiation.save({ transaction });
        const message = await Message.create({
          negotiationId: lockedNegotiation.id,
          senderId: user.id,
          content: content.trim(),
          messageType: "proposal",
          proposalAmount: amount.toFixed(2)
        }, { transaction });
        return { message, negotiation: lockedNegotiation };
      });
      if (!created) return sendError(res, 409, "A negociação mudou de estado; actualize e tente novamente.");
      auditLogger.record({
        actorId: user.id,
        action: "negotiation.proposal_submitted",
        ip: req.ip,
        metadata: { negotiationId: created.negotiation.id, messageId: created.message.id, amountMt: amount }
      });
      return sendSuccess(res, created, 201, "Proposta enviada em MT.");
    }
    const message = await sequelize.transaction(async (transaction) => {
      const current = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!current || current.status === "completed" || current.status === "rejected") return null;
      return Message.create({
        negotiationId: current.id,
        senderId: user.id,
        content: content.trim(),
        messageType: "text",
        proposalAmount: null
      }, { transaction });
    });
    if (!message) return sendError(res, 409, "A negociação foi encerrada; actualize e tente novamente.");
    return sendSuccess(res, { message }, 201, "Mensagem enviada.");
  } catch (error) {
    next(error);
  }
});

negotiationsRouter.post("/:id/proposals/:messageId/respond", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const negotiationId = req.params.id;
    const messageId = req.params.messageId;
    if (!isUuid(negotiationId) || !isUuid(messageId)) {
      return sendError(res, 400, "Identificador de proposta inválido.");
    }
    const negotiation = await findParticipantNegotiation(negotiationId, user);
    if (!negotiation) return sendError(res, 404, "Negociação não encontrada.");
    if (negotiation.status !== "pending" || negotiation.escrowStatus !== "inactive") {
      return sendError(res, 409, "A proposta já não pode ser respondida.");
    }
    const message = await Message.findOne({ where: { id: messageId, negotiationId: negotiation.id, messageType: "proposal" } });
    if (!message) return sendError(res, 404, "Proposta não encontrada.");
    if (message.senderId === user.id) return sendError(res, 403, "Não pode responder à sua própria proposta.");
    if (req.body.action !== "accept" && req.body.action !== "reject") {
      return sendError(res, 400, "A resposta deve ser accept ou reject.");
    }
    const updated = await sequelize.transaction(async (transaction) => {
      const lockedNegotiation = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lockedNegotiation || lockedNegotiation.status !== "pending" || lockedNegotiation.escrowStatus !== "inactive") {
        return null;
      }
      const latestProposal = await Message.findOne({
        where: { negotiationId: negotiation.id, messageType: "proposal" },
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        transaction
      });
      if (latestProposal?.id !== message.id || latestProposal.senderId === user.id) return null;
      lockedNegotiation.status = req.body.action === "accept" ? "accepted" : "rejected";
      if (req.body.action === "accept") lockedNegotiation.agreedPrice = latestProposal.proposalAmount;
      await lockedNegotiation.save({ transaction });
      return lockedNegotiation;
    });
    if (!updated) return sendError(res, 409, "A negociação mudou ou já existe uma proposta mais recente.");
    auditLogger.record({
      actorId: user.id,
      action: req.body.action === "accept" ? "negotiation.proposal_accepted" : "negotiation.proposal_rejected",
      ip: req.ip,
      metadata: { negotiationId: updated.id, messageId: message.id, amountMt: Number(message.proposalAmount) }
    });
    return sendSuccess(res, { negotiation: updated }, 200, "Resposta à proposta registada.");
  } catch (error) {
    next(error);
  }
});

negotiationsRouter.post("/:id/escrow", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const negotiationId = req.params.id;
    if (!isUuid(negotiationId)) return sendError(res, 400, "Identificador de negociação inválido.");
    const negotiation = await findParticipantNegotiation(negotiationId, user);
    if (!negotiation) return sendError(res, 404, "Negociação não encontrada.");
    const action = req.body.action as "fund" | "dispute" | "release" | "deliver";
    if (!["fund", "dispute", "release", "deliver"].includes(action)) {
      return sendError(res, 400, "Acção de escrow inválida.");
    }
    if (action !== "deliver" && !canTransitionEscrow(negotiation.escrowStatus, action, negotiation.status === "accepted")) {
      return sendError(res, 409, "A transição de escrow não é permitida neste estado.");
    }
    if (action === "fund" && user.id !== negotiation.clientId) {
      return sendError(res, 403, "Só o cliente pode activar o escrow simulado.");
    }
    if (action === "release" && user.id !== negotiation.clientId) {
      return sendError(res, 403, "Só o cliente pode confirmar a conclusão e libertar o escrow.");
    }
    if (action === "deliver" && user.id === negotiation.clientId) {
      return sendError(res, 403, "Só o prestador pode registar a entrega do serviço.");
    }
    if (action === "deliver" && negotiation.escrowStatus !== "active") {
      return sendError(res, 409, "A entrega exige escrow activo.");
    }
    const proofFile = req.body.proofFile;
    if (proofFile !== undefined && (typeof proofFile !== "string" || proofFile.length > 2000)) {
      return sendError(res, 400, "Referência do comprovativo inválida.");
    }
    if (action === "deliver" && !proofFile) return sendError(res, 400, "Indique a referência do comprovativo de entrega.");
    const previousEscrowStatus = negotiation.escrowStatus;
    const updated = await sequelize.transaction(async (transaction) => {
      const lockedNegotiation = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lockedNegotiation || (action !== "deliver" && !canTransitionEscrow(lockedNegotiation.escrowStatus, action, lockedNegotiation.status === "accepted")) ||
          (action === "deliver" && lockedNegotiation.escrowStatus !== "active") ||
          (action === "release" && !lockedNegotiation.providerProofFile)) {
        return null;
      }
      if (action === "fund") {
        lockedNegotiation.escrowStatus = "active";
        if (proofFile) lockedNegotiation.clientProofFile = proofFile;
      } else if (action === "dispute") {
        lockedNegotiation.escrowStatus = "disputed";
      } else if (action === "deliver") {
        lockedNegotiation.providerProofFile = proofFile as string;
      } else {
        lockedNegotiation.escrowStatus = "completed";
        lockedNegotiation.status = "completed";
      }
      await lockedNegotiation.save({ transaction });
      return lockedNegotiation;
    });
    if (!updated) return sendError(res, 409, "A negociação mudou de estado; actualize e tente novamente.");
    if (action !== "deliver") {
      auditLogger.record({
        actorId: user.id,
        action: action === "fund" ? "escrow.activated" : action === "dispute" ? "escrow.disputed" : "escrow.completed",
        ip: req.ip,
        metadata: {
          negotiationId: updated.id,
          from: previousEscrowStatus,
          to: updated.escrowStatus,
          amountMt: updated.agreedPrice === null ? null : Number(updated.agreedPrice)
        }
      });
    } else {
      auditLogger.record({
        actorId: user.id,
        action: "escrow.delivery_submitted",
        ip: req.ip,
        metadata: { negotiationId: updated.id, escrowStatus: updated.escrowStatus }
      });
    }
    return sendSuccess(res, { negotiation: updated, payment: { simulated: true, amount: updated.agreedPrice, currency: "MT" } }, 200, "Estado do escrow actualizado.");
  } catch (error) {
    next(error);
  }
});
