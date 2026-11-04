import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare name: string;
  declare description: string;
  declare price: string;
  declare category: string;
  declare variants: CreationOptional<Record<string, unknown>[]>;
  declare images: CreationOptional<string[]>;
  declare minOrderQty: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
}

export function initializeProductModel(sequelize: Sequelize): void {
  Product.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    storeId: { type: DataTypes.UUID, allowNull: false, field: "store_id" },
    name: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false },
    variants: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    images: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    minOrderQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: "min_order_qty" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "products"));
}
