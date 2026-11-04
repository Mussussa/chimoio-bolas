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
                         'negotiations', 'messages', 'reviews')`
    );
    const rows = result as Array<{ tablename: string; rowsecurity: boolean }>;
    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.rowsecurity)).toBe(true);

    const [removedObjects] = await sequelize.query(
      `select table_name as name
       from information_schema.tables
       where table_schema = 'public' and table_name in ('campaigns', 'ad_batches')
       union all
       select column_name as name
       from information_schema.columns
       where table_schema = 'public'
         and ((table_name = 'service_providers' and column_name in ('subscription_tier', 'subscription_started_at', 'subscription_expires_at'))
           or (table_name = 'negotiations' and column_name = 'escrow_status'))`
    );
    expect(removedObjects).toEqual([]);
  });
});
