import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export const SERVICE_CATEGORIES = [
  "Construção", "Eletricidade", "Hidráulica", "Carpintaria & Serralharia",
  "Transporte & Logística", "Hotelaria & Restauração", "Tecnologia & Informática",
  "Beleza & Estética", "Limpeza & Jardinagem", "Diversos"
] as const;

export class ServiceProvider extends Model<InferAttributes<ServiceProvider>, InferCreationAttributes<ServiceProvider>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare category: Array<typeof SERVICE_CATEGORIES[number]>;
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
    category: { 
      type: DataTypes.ARRAY(DataTypes.STRING), 
      allowNull: false,
      defaultValue: []
    },
    bio: { type: DataTypes.TEXT, allowNull: false },
    basePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "base_price" },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    platformMember: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "platform_member" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "service_providers"));
}