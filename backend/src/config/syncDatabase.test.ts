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
    expect(statements).toContain("alter table public.reviews add column if not exists image_url text");
    expect(statements).toContain("create or replace view public.public_reviews as select reviews.target_type, reviews.target_id, reviews.rating, reviews.comment, reviews.created_at, users.name as reviewer_name, users.avatar_url as reviewer_avatar_url, reviews.image_url from public.reviews left join public.users as users on users.id = reviews.client_id");
    expect(statements).toContain("drop policy if exists \"Users create store conversations\" on public.store_conversations");
    expect(statements).toContain("create policy \"Users create store conversations\" on public.store_conversations for insert to authenticated with check (client_id = auth.uid() and exists (select 1 from public.stores s join public.users u on u.id = auth.uid() where s.id = store_id and s.owner_id <> auth.uid() and u.role in ('client', 'lojista', 'prestador')) and (product_id is null or exists (select 1 from public.products p where p.id = product_id and p.store_id = public.store_conversations.store_id)))");
    expect(statements).toContain("create or replace view public.map_stores as select id, name, category, address, latitude, longitude, verified from public.stores");
    expect(statements).toContain("revoke all on public.map_stores from public, anon, authenticated");
    expect(statements).toContain("grant select on public.map_stores to anon, authenticated");
    expect(statements.some((statement) => statement.includes("notify pgrst, 'reload schema'"))).toBe(true);
    expect(statements.some((statement) => /\b(drop table|alter table .* (drop|alter column))\b/i.test(statement))).toBe(false);
  });
});
