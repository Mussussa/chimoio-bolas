import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class ServiceProvider extends Model<InferAttributes<ServiceProvider>, InferCreationAttributes<ServiceProvider>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare category: string;
  declare bio: string;
  declare basePrice: string;
  declare verified: CreationOptional<boolean>;
  declare platformMember: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export function initializeServiceProviderModel(sequelize: Sequelize): void {
  ServiceProvider.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "user_id" },
    category: { type: DataTypes.STRING(100), allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: false },
    basePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "base_price" },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    platformMember: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "platform_member" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "service_providers"));
}
