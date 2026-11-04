import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { decryptField } from "../config/encryption.js";
import { initializeEncryptedField } from "./encryptedFields.js";
import { modelOptions } from "./modelOptions.js";
import type { UserRole } from "./types.js";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare role: CreationOptional<UserRole>;
  declare avatarUrl: string | null;
  declare createdAt: CreationOptional<Date>;
}

export function initializeUserModel(sequelize: Sequelize): void {
  User.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const stored = this.getDataValue("phone") as string | null;
        return stored?.startsWith("enc:v1:") ? decryptField(stored) : stored;
      }
    },
    role: { type: DataTypes.ENUM("client", "lojista", "prestador", "admin"), allowNull: false, defaultValue: "client" },
    avatarUrl: { type: DataTypes.TEXT, allowNull: true, field: "avatar_url" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "users"));
  initializeEncryptedField(User, "phone");
}
