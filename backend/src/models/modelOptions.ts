import type { Sequelize } from "sequelize";

export function modelOptions(sequelize: Sequelize, tableName: string) {
  return {
    sequelize,
    tableName,
    timestamps: true,
    underscored: true,
    createdAt: "createdAt",
    updatedAt: false
  } as const;
}
