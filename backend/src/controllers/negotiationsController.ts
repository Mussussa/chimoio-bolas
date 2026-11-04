import { Op } from "sequelize";
import type { RequestHandler } from "express";
import { sequelize } from "../config/database.js";
import { isValidPrice } from "../domain/rules.js";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";
import { Message, Negotiation, Service, ServiceProvider, User } from "../models/index.js";

async function findParticipantNegotiation(id: string, user: User): Promise<Negotiation | null> {
  const negotiation = await Negotiation.findByPk(id);
  if (!negotiation) return null;
  const provider = await ServiceProvider.findByPk(negotiation.providerId);
  if (negotiation.clientId !== user.id && provider?.userId !== user.id) return null;
  return negotiation;
}

export const listNegotiations: RequestHandler = async (req, res, next) => {
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
};

export const createNegotiation: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const serviceId = req.body.serviceId as string;
    const service = await Service.findOne({ where: { id: serviceId, published: true } });
    if (!service) return sendError(res, 404, "Serviço não encontrado ou não publicado.");
    const provider = await ServiceProvider.findByPk(service.providerId);
    if (!provider || !provider.platformMember || provider.userId === user.id) {
      return sendError(res, 409, "Este serviço não está disponível para negociação.");
    }
    const negotiation = await Negotiation.create({
      clientId: user.id,
      providerId: provider.id,
      serviceId: service.id,
      status: "pending",
      agreedPrice: null,
      clientProofFile: null,
      providerProofFile: null
    });
    return sendSuccess(res, { negotiation }, 201, "Negociação iniciada.");
  } catch (error) {
    next(error);
  }
};

export const createMessage: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const negotiationId = req.params.id as string;
    const negotiation = await findParticipantNegotiation(negotiationId, user);
    if (!negotiation) return sendError(res, 404, "Negociação não encontrada.");
    if (negotiation.status === "completed" || negotiation.status === "rejected") {
      return sendError(res, 409, "Esta negociação já foi encerrada.");
    }
    const { content, messageType = "text", proposalAmount } = req.body as {
      content: string; messageType?: "text" | "proposal"; proposalAmount?: number;
    };
    if (messageType === "proposal") {
      const amount = Number(proposalAmount);
      if (negotiation.status !== "pending" || !isValidPrice(amount)) {
        return sendError(res, 409, "A proposta requer uma negociação pendente e um valor positivo.");
      }
      const created = await sequelize.transaction(async (transaction) => {
        const lockedNegotiation = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!lockedNegotiation || lockedNegotiation.status !== "pending") return null;
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
    auditLogger.record({
      actorId: user.id,
      action: "negotiation.message_sent",
      ip: req.ip,
      metadata: { negotiationId: negotiation.id, messageId: message.id, messageType: "text" }
    });
    return sendSuccess(res, { message }, 201, "Mensagem enviada.");
  } catch (error) {
    next(error);
  }
};

export const respondToProposal: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const negotiationId = req.params.id as string;
    const messageId = req.params.messageId as string;
    const action = req.body.action as "accept" | "reject";
    const negotiation = await findParticipantNegotiation(negotiationId, user);
    if (!negotiation) return sendError(res, 404, "Negociação não encontrada.");
    if (negotiation.status !== "pending") {
      return sendError(res, 409, "A proposta já não pode ser respondida.");
    }
    const message = await Message.findOne({ where: { id: messageId, negotiationId: negotiation.id, messageType: "proposal" } });
    if (!message) return sendError(res, 404, "Proposta não encontrada.");
    if (message.senderId === user.id) return sendError(res, 403, "Não pode responder à sua própria proposta.");
    const updated = await sequelize.transaction(async (transaction) => {
      const lockedNegotiation = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lockedNegotiation || lockedNegotiation.status !== "pending") return null;
      const latestProposal = await Message.findOne({
        where: { negotiationId: negotiation.id, messageType: "proposal" },
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        transaction
      });
      if (latestProposal?.id !== message.id || latestProposal.senderId === user.id) return null;
      lockedNegotiation.status = action === "accept" ? "accepted" : "rejected";
      if (action === "accept") lockedNegotiation.agreedPrice = latestProposal.proposalAmount;
      await lockedNegotiation.save({ transaction });
      return lockedNegotiation;
    });
    if (!updated) return sendError(res, 409, "A negociação mudou ou já existe uma proposta mais recente.");
    auditLogger.record({
      actorId: user.id,
      action: action === "accept" ? "negotiation.proposal_accepted" : "negotiation.proposal_rejected",
      ip: req.ip,
      metadata: { negotiationId: updated.id, messageId: message.id, amountMt: Number(message.proposalAmount) }
    });
    return sendSuccess(res, { negotiation: updated }, 200, "Resposta à proposta registada.");
  } catch (error) {
    next(error);
  }
};

export const completeNegotiation: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const negotiationId = req.params.id as string;
    const negotiation = await findParticipantNegotiation(negotiationId, user);
    if (!negotiation) return sendError(res, 404, "Negociação não encontrada.");
    if (user.id !== negotiation.clientId) {
      return sendError(res, 403, "Só o cliente pode confirmar a conclusão do serviço.");
    }
    const updated = await sequelize.transaction(async (transaction) => {
      const lockedNegotiation = await Negotiation.findByPk(negotiation.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!lockedNegotiation || lockedNegotiation.status !== "accepted") return null;
      lockedNegotiation.status = "completed";
      await lockedNegotiation.save({ transaction });
      return lockedNegotiation;
    });
    if (!updated) return sendError(res, 409, "Só uma negociação aceite pode ser concluída.");
    auditLogger.record({
      actorId: user.id,
      action: "negotiation.completed",
      ip: req.ip,
      metadata: { negotiationId: updated.id, from: "accepted", to: "completed" }
    });
    return sendSuccess(res, { negotiation: updated }, 200, "Negociação concluída.");
  } catch (error) {
    next(error);
  }
};
