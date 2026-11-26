import { useEffect, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import type { StoreConversation, StoreConversationMessage } from "../lib/api";
import { storeProductHref } from "../lib/publicLinks";
import type { Profile } from "../lib/types";
import CategoryImage from "../components/marketplace/CategoryImage";
import { FALLBACK_IMAGE } from "../lib/categoryPlaceholders";

type StoreConversationPageProps = Readonly<{
  session: Session | null;
  profile: Profile | null;
  conversations: StoreConversation[];
  messages: StoreConversationMessage[];
  message: string;
  busy: boolean;
  onMessageChange: (value: string) => void;
  onOpen: (conversationId: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>, conversationId: string) => void;
}>;

export default function StoreConversationPage({
  session, profile, conversations, messages, message, busy, onMessageChange, onOpen, onSend
}: StoreConversationPageProps) {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (conversationId) onOpen(conversationId);
  }, [conversationId, onOpen]);

  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => onOpen(conversationId), 5000);
    return () => window.clearInterval(timer);
  }, [conversationId, onOpen]);

  if (!session) {
    return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Inicia sessão para consultar as conversas com lojas. <Link className="font-bold text-[#765900] underline" to="/conta">Entrar</Link></p></section>;
  }

  const selected = conversations.find((item) => item.id === conversationId) ?? null;
  const selectedStoreHref = selected ? `/lojas/${encodeURIComponent(selected.store.slug)}` : "";
  const selectedProductHref = selected?.product
    ? storeProductHref(selected.store.slug, selected.product.id)
    : selectedStoreHref;

  return (
    <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <div className="mb-[26px] flex flex-col gap-[22px] min-[851px]:flex-row min-[851px]:items-end min-[851px]:justify-between"><div><p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">LOJAS E PRODUTOS</p><h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">Conversas</h1><p className="m-0 text-[13px] text-[#716e60]">Escolha uma conversa para ver o produto e quem está do outro lado.</p></div></div>
      <div className="grid min-h-[420px] grid-cols-1 overflow-hidden rounded-xl border border-[#e7e1ca] bg-white min-[561px]:grid-cols-[minmax(220px,.75fr)_minmax(0,1.7fr)]">
        <aside className="grid max-h-[210px] content-start gap-px overflow-auto border-b border-[#e7e1ca] bg-[#e7e1ca] min-[561px]:max-h-none min-[561px]:border-b-0 min-[561px]:border-r" aria-label="Lista de conversas">
          {!conversations.length && <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Ainda não tens conversas com lojas.</p>}
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            const otherParty = profile?.role === "lojista"
              ? conversation.client?.name ?? "Cliente"
              : conversation.store.name;
            const otherPartyImage = profile?.role === "lojista"
              ? conversation.client?.avatarUrl
              : conversation.store.logoUrl;
            const productHref = conversation.product
              ? storeProductHref(conversation.store.slug, conversation.product.id)
              : `/lojas/${encodeURIComponent(conversation.store.slug)}`;
            const productImage = conversation.product?.images[0];

            return (
              <article
                key={conversation.id}
                className={`grid gap-2.5 bg-white p-[14px] text-[#302b18] ${conversation.id === conversationId ? "bg-[#fff7d6] shadow-[inset_3px_0_#ffd21a]" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <CategoryImage className="h-12 w-12 shrink-0 rounded-lg bg-[#eaf1f4] object-cover" src={productImage ?? otherPartyImage} placeholder={FALLBACK_IMAGE} alt="" />
                  <span className="grid min-w-0 gap-1">
                    <b>{otherParty}</b>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#716e60]">{conversation.product ? `Produto: ${conversation.product.name}` : `Loja: ${conversation.store.name}`}</span>
                    <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#716e60]">{lastMessage?.content ?? "Sem mensagens"}</small>
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[10px] py-2 text-[11px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18]"
                  onClick={() => { onOpen(conversation.id); void navigate(`/mensagens/lojas/${conversation.id}`); }}
                >
                  Ir para o chat
                </button>
                <Link className="text-[11px] font-bold text-[#765900] hover:underline" to={productHref}>
                  {conversation.product ? "Ver produto" : "Ver loja"}
                </Link>
              </article>
            );
          })}
        </aside>
        <div className="flex min-w-0 flex-col p-[18px]">
          {!selected ? <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Escolhe uma conversa para ver as mensagens.</p> : (
            <>
              <header className="grid gap-3 border-b border-[#e7e1ca] pb-[14px]">
                <b>{profile?.role === "lojista" ? selected.client?.name ?? "Cliente" : selected.store.name}</b>
                <Link className="flex min-w-0 items-center gap-2.5 text-inherit no-underline" to={selectedProductHref}>
                  <CategoryImage className="h-[52px] w-16 shrink-0 rounded-[7px] bg-[#eaf1f4] object-cover" src={selected.product?.images[0] ?? selected.store.logoUrl} placeholder={FALLBACK_IMAGE} alt="" />
                  <span className="grid min-w-0 gap-1">
                    <small className="text-[10px] text-[#716e60]">{selected.product ? "Produto em conversa" : "Loja em conversa"}</small>
                    <b className="overflow-hidden text-ellipsis whitespace-nowrap">{selected.product?.name ?? selected.store.name}</b>
                  </span>
                  <span className="ml-auto text-[11px] font-bold text-[#765900]">{selected.product ? "Ver produto" : "Ver loja"}</span>
                </Link>
              </header>
              <div className="grid flex-1 content-start gap-2.5 py-[18px]">
                {messages.map((item) => (
                  <article className={`max-w-[min(85%,520px)] justify-self-start rounded-[10px_10px_10px_2px] bg-[#f0f4f6] px-[14px] py-[11px] ${item.senderId === profile?.id ? "ml-auto justify-self-end rounded-[10px_10px_2px_10px] bg-[#fff7d6] text-right" : ""}`} key={item.id}>
                    <b className="text-[11px]">{item.senderId === profile?.id ? "Você" : item.sender?.name ?? "Participante"}</b>
                    <p className="my-[5px] break-words text-[13px]">{item.content}</p>
                    <time className="mt-1.5 block text-[10px] text-[#87949b]">{new Date(item.createdAt).toLocaleString("pt-MZ")}</time>
                  </article>
                ))}
              </div>
              <form className="grid grid-cols-1 items-stretch gap-2 border-t border-[#e7e1ca] pt-3 min-[561px]:grid-cols-[1fr_auto] min-[561px]:items-end" onSubmit={(event) => onSend(event, selected.id)}>
                <label className="col-span-full text-[10px] font-bold text-[#716e60]" htmlFor="store-quick-reply">Resposta rápida</label>
                <select
                  id="store-quick-reply"
                  required
                  value={message}
                  onChange={(event) => onMessageChange(event.target.value)}
                >
                  <option value="" disabled>Escolha uma resposta</option>
                  <option value="Obrigado pela informação.">Obrigado pela informação.</option>
                  <option value="Tenho interesse. Como podemos continuar?">Tenho interesse. Como podemos continuar?</option>
                  <option value="Ainda está disponível?">Ainda está disponível?</option>
                  <option value="Pode enviar mais detalhes, por favor?">Pode enviar mais detalhes, por favor?</option>
                  <option value="Podemos combinar os próximos passos?">Podemos combinar os próximos passos?</option>
                </select>
                <button type="submit" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]" disabled={busy}>Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
