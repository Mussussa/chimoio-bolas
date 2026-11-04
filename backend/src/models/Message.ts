import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";
import type { MessageType } from "./types.js";

export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<string>;
  declare negotiationId: string;
  declare senderId: string;
  declare content: string;
  declare proposalAmount: string | null;
  declare messageType: MessageType;
  declare createdAt: CreationOptional<Date>;
}

export function initializeMessageModel(sequelize: Sequelize): void {
  Message.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    negotiationId: { type: DataTypes.UUID, allowNull: false, field: "negotiation_id" },
    senderId: { type: DataTypes.UUID, allowNull: false, field: "sender_id" },
    content: { type: DataTypes.TEXT, allowNull: false },
    proposalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "proposal_amount" },
    messageType: { type: DataTypes.ENUM("text", "proposal", "system_alert"), allowNull: false, defaultValue: "text", field: "message_type" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "messages"));
}
