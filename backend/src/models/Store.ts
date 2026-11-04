import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class Store extends Model<InferAttributes<Store>, InferCreationAttributes<Store>> {
  declare id: CreationOptional<string>;
  declare ownerId: string;
  declare name: string;
  declare slug: string;
  declare category: string;
  declare description: string;
  declare address: string;
  declare latitude: number;
  declare longitude: number;
  declare verified: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export function initializeStoreModel(sequelize: Sequelize): void {
  Store.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ownerId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "owner_id" },
    name: { type: DataTypes.STRING(160), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    category: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "stores"));
}
