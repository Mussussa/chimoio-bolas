import "dotenv/config";
import { Sequelize } from "sequelize";

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não está configurada com a ligação PostgreSQL do projecto Supabase.");
  }
  return databaseUrl;
}

export function assertDatabaseUrl(): void {
  requireDatabaseUrl();
}

const databaseUrl = requireDatabaseUrl();
const databaseOptions = {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: { max: 5, min: 0, acquire: 30_000, idle: 10_000 },
  dialectOptions: process.env.DATABASE_SSL === "true" ? { ssl: { require: true, rejectUnauthorized: false } } : {}
} as const;

export const sequelize = new Sequelize(databaseUrl, databaseOptions);
