import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { modelOptions } from "./modelOptions.js";

export class Review extends Model<InferAttributes<Review>, InferCreationAttributes<Review>> {
  declare id: CreationOptional<string>;
  declare clientId: string;
  declare targetType: "store" | "service_provider";
  declare targetId: string;
  declare rating: number;
  declare comment: string;
  declare createdAt: CreationOptional<Date>;
}

export function initializeReviewModel(sequelize: Sequelize): void {
  Review.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    clientId: { type: DataTypes.UUID, allowNull: false, field: "client_id" },
    targetType: { type: DataTypes.ENUM("store", "service_provider"), allowNull: false, field: "target_type" },
    targetId: { type: DataTypes.UUID, allowNull: false, field: "target_id" },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...modelOptions(sequelize, "reviews"), indexes: [{ unique: true, fields: ["client_id", "target_type", "target_id"] }] });
}
