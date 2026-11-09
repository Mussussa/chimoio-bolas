import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export const STORE_CATEGORIES = [
  "Imóveis",
  "Eletrónicos",
  "Automóveis",
  "Agricultura",
  "Materiais de Construção",
  "Moda & Vestuário",
  "Alimentação & Bebidas",
  "Saúde & Beleza",
  "Casa & Decoração",
  "Diversos"
] as const;

export class Store extends Model<InferAttributes<Store>, InferCreationAttributes<Store>> {
  declare id: CreationOptional<string>;
  declare ownerId: string;
  declare name: string;
  declare slug: string;
  declare category: Array<typeof STORE_CATEGORIES[number]>;
  declare description: string;
  declare address: string;
  declare latitude: number | null;
  declare longitude: number | null;
  declare verified: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export function initializeStoreModel(sequelize: Sequelize): void {
  Store.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ownerId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "owner_id" },
    name: { type: DataTypes.STRING(160), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    category: { 
      type: DataTypes.ARRAY(DataTypes.STRING), 
      allowNull: false,
      defaultValue: []
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "stores"));
}

//backend/src/models/Store.ts