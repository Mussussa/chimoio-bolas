import type { RequestHandler } from "express";
import { auditLogger } from "../config/logger.js";
import { sendError, sendSuccess } from "../http/responses.js";
import { Product, Store, StoreConversation, StoreMessage, User } from "../models/index.js";

// Localiza a conversa apenas para um dos participantes; é uma verificação interna antes de servir pedidos do chat.
async function findConversationForUser(id: string, user: User): Promise<StoreConversation | null> {
  const conversation = await StoreConversation.findByPk(id);
  if (!conversation) return null;
  if (conversation.clientId === user.id) return conversation;
  if (user.role !== "lojista") return null;
  const store = await Store.findOne({ where: { id: conversation.storeId, ownerId: user.id }, attributes: ["id"] });
  return store ? conversation : null;
}

// Lista conversas do cliente ou da loja do lojista; o frontend mostra a caixa de conversas e a última mensagem.
export const listStoreConversations: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    let where: { clientId?: string; storeId?: string };
    if (user.role === "lojista") {
      const store = await Store.findOne({ where: { ownerId: user.id }, attributes: ["id"] });
      if (!store) return sendSuccess(res, { conversations: [] }, 200, "Não há conversas da loja.");
      where = { storeId: store.id };
    } else {
      where = { clientId: user.id };
    }

    const conversations = await StoreConversation.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        { model: Store, as: "store", attributes: ["id", "name", "slug", "logoUrl"] },
        { model: User, as: "client", attributes: ["id", "name", "avatarUrl"] },
        { model: Product, as: "product", attributes: ["id", "name", "images"], required: false },
        {
          model: StoreMessage,
          as: "messages",
          separate: true,
          limit: 1,
          order: [["createdAt", "DESC"]],
          include: [{ model: User, as: "sender", attributes: ["id", "name", "avatarUrl"] }]
        }
      ]
    });
    return sendSuccess(res, { conversations }, 200, "Conversas da loja carregadas.");
  } catch (error) {
    next(error);
  }
};

// Cria uma conversa com a loja e envia a primeira mensagem; o frontend abre o novo chat.
export const createStoreConversation: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const { storeId, productId, content } = req.body as {
      storeId: string; productId?: string; content: string;
    };
    const store = await Store.findByPk(storeId);
    if (!store) return sendError(res, 404, "Loja não encontrada.");
    if (store.ownerId === user.id) return sendError(res, 409, "Não pode iniciar uma conversa com a sua própria loja.");
    if (productId) {
      const product = await Product.findOne({ where: { id: productId, storeId: store.id } });
      if (!product) return sendError(res, 404, "Produto não encontrado nesta loja.");
    }

    const result = await StoreConversation.sequelize!.transaction(async (transaction) => {
      const conversation = await StoreConversation.create({
        storeId: store.id,
        clientId: user.id,
        productId: productId ?? null
      }, { transaction });
      const message = await StoreMessage.create({
        conversationId: conversation.id,
        senderId: user.id,
        content: content.trim()
      }, { transaction });
      return { conversation, message };
    });
    auditLogger.record({
      actorId: user.id,
      action: "store_conversation.created",
      ip: req.ip,
      metadata: { conversationId: result.conversation.id, storeId: store.id, productId: productId ?? null }
    });
    return sendSuccess(res, result, 201, "Conversa iniciada com a loja.");
  } catch (error) {
    next(error);
  }
};

// Carrega as mensagens de uma conversa autorizada; o frontend apresenta o histórico do chat.
export const listStoreMessages: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const conversation = await findConversationForUser(req.params.id as string, user);
    if (!conversation) return sendError(res, 404, "Conversa não encontrada.");
    const messages = await StoreMessage.findAll({
      where: { conversationId: conversation.id },
      order: [["createdAt", "ASC"]],
      include: [{ model: User, as: "sender", attributes: ["id", "name", "avatarUrl"] }]
    });
    return sendSuccess(res, { messages }, 200, "Mensagens carregadas.");
  } catch (error) {
    next(error);
  }
};

// Envia uma mensagem numa conversa autorizada; o frontend actualiza o chat com a nova mensagem.
export const sendStoreMessage: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const conversation = await findConversationForUser(req.params.id as string, user);
    if (!conversation) return sendError(res, 404, "Conversa não encontrada.");
    const message = await StoreMessage.create({
      conversationId: conversation.id,
      senderId: user.id,
      content: String(req.body.content).trim()
    });
    auditLogger.record({
      actorId: user.id,
      action: "store_conversation.message_sent",
      ip: req.ip,
      metadata: { conversationId: conversation.id, messageId: message.id }
    });
    return sendSuccess(res, { message }, 201, "Mensagem enviada.");
  } catch (error) {
    next(error);
  }
};
