import "dotenv/config";
import { Sequelize } from "sequelize";

const databaseUrl = process.env.DATABASE_URL;

export function assertDatabaseUrl(): void {
  if (!databaseUrl) throw new Error("DATABASE_URL tem de apontar para o PostgreSQL local.");
}

export const sequelize = new Sequelize(databaseUrl ?? "postgres://missing:missing@127.0.0.1:5432/missing", {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: { max: 5, min: 0, acquire: 30_000, idle: 10_000 },
  dialectOptions: process.env.DATABASE_SSL === "true" ? { ssl: { require: true, rejectUnauthorized: false } } : {}
});
