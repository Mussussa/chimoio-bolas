import type { Sequelize } from "sequelize";
import { describe, expect, it, vi } from "vitest";
import { syncDatabaseSchema } from "./syncDatabase.js";

describe("syncDatabaseSchema", () => {
  it("cria tabelas em falta e repõe políticas RLS sem alterar ou apagar tabelas existentes", async () => {
    const sync = vi.fn().mockResolvedValue(undefined);
    const query = vi.fn().mockResolvedValue([[], {}]);
    const database = { sync, query } as unknown as Sequelize;

    await syncDatabaseSchema(database);

    expect(sync).toHaveBeenCalledOnce();
    expect(sync).toHaveBeenCalledWith();
    const statements = query.mock.calls.map(([statement]) => String(statement));
    expect(statements).toContain("alter table public.stores enable row level security");
    expect(statements).toContain("create policy \"Public can read stores\" on public.stores for select to anon, authenticated using (true)");
    expect(statements).toContain("create policy \"Public can read products\" on public.products for select to anon, authenticated using (true)");
    expect(statements).toContain("create or replace view public.map_stores as select id, name, category, address, latitude, longitude, verified from public.stores");
    expect(statements).toContain("revoke all on public.map_stores from public, anon, authenticated");
    expect(statements).toContain("grant select on public.map_stores to anon, authenticated");
    expect(statements.some((statement) => statement.includes("notify pgrst, 'reload schema'"))).toBe(true);
    expect(statements.some((statement) => /\b(drop table|alter table .* (add|drop|alter column))\b/i.test(statement))).toBe(false);
  });
});
