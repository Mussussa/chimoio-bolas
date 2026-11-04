import type { Session } from "@supabase/supabase-js";

export async function api<T>(path: string, session: Session, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      ...(options.body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });
  const result = await response.json() as { success?: boolean; data?: T; message?: string; error_code?: string };
  if (!response.ok) throw new Error(result.message ?? `Pedido falhou (${response.status}).`);
  if (!result.success || result.data === undefined) throw new Error("A API devolveu uma resposta inválida.");
  return result.data;
}
