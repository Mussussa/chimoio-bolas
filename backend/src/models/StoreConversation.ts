import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class StoreConversation extends Model<InferAttributes<StoreConversation>, InferCreationAttributes<StoreConversation>> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare clientId: string;
  declare productId: string | null;
  declare createdAt: CreationOptional<Date>;
}

export function initializeStoreConversationModel(sequelize: Sequelize): void {
  StoreConversation.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    storeId: { type: DataTypes.UUID, allowNull: false, field: "store_id" },
    clientId: { type: DataTypes.UUID, allowNull: false, field: "client_id" },
    productId: { type: DataTypes.UUID, allowNull: true, field: "product_id" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, {
    ...modelOptions(sequelize, "store_conversations"),
    indexes: [{ fields: ["store_id", "created_at"] }, { fields: ["client_id", "created_at"] }]
  });
}
