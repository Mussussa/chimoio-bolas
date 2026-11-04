import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class Service extends Model<InferAttributes<Service>, InferCreationAttributes<Service>> {
  declare id: CreationOptional<string>;
  declare providerId: string;
  declare title: string;
  declare description: string;
  declare price: string;
  declare deliveryTime: string;
  declare published: CreationOptional<boolean>;
  declare internalPlatformService: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export function initializeServiceModel(sequelize: Sequelize): void {
  Service.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    providerId: { type: DataTypes.UUID, allowNull: false, field: "provider_id" },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    deliveryTime: { type: DataTypes.STRING(100), allowNull: false, field: "delivery_time" },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    internalPlatformService: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "internal_platform_service" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "services"));
}
