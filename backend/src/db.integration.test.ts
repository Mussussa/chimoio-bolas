import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDatabaseUrl, sequelize } from "./config/database.js";
import { initializeModels } from "./models/index.js";

const enabled = process.env.RUN_DB_INTEGRATION === "true";

describe.skipIf(!enabled)("Supabase/PostgreSQL local", () => {
  beforeAll(async () => {
    assertDatabaseUrl();
    initializeModels(sequelize);
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it("criou todas as tabelas e activou RLS", async () => {
    const [result] = await sequelize.query(
      `select tablename, rowsecurity
       from pg_tables
       where schemaname = 'public'
         and tablename in ('users', 'stores', 'products', 'service_providers', 'services',
                           'campaigns', 'negotiations', 'messages', 'reviews', 'ad_batches')`
    );
    const rows = result as Array<{ tablename: string; rowsecurity: boolean }>;
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.rowsecurity)).toBe(true);
  });
});
