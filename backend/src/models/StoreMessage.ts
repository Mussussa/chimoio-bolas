import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class StoreMessage extends Model<InferAttributes<StoreMessage>, InferCreationAttributes<StoreMessage>> {
  declare id: CreationOptional<string>;
  declare conversationId: string;
  declare senderId: string;
  declare content: string;
  declare createdAt: CreationOptional<Date>;
}

export function initializeStoreMessageModel(sequelize: Sequelize): void {
  StoreMessage.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    conversationId: { type: DataTypes.UUID, allowNull: false, field: "conversation_id" },
    senderId: { type: DataTypes.UUID, allowNull: false, field: "sender_id" },
    content: { type: DataTypes.TEXT, allowNull: false },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, {
    ...modelOptions(sequelize, "store_messages"),
    indexes: [{ fields: ["conversation_id", "created_at"] }]
  });
}
