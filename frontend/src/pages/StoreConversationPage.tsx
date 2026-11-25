import { useEffect, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import type { StoreConversation, StoreConversationMessage } from "../lib/api";
import { storeProductHref } from "../lib/publicLinks";
import type { Profile } from "../lib/types";

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
    return <section className="section"><p className="empty">Inicia sessão para consultar as conversas com lojas. <Link to="/conta">Entrar</Link></p></section>;
  }

  const selected = conversations.find((item) => item.id === conversationId) ?? null;
  const selectedStoreHref = selected ? `/lojas/${encodeURIComponent(selected.store.slug)}` : "";
  const selectedProductHref = selected?.product
    ? storeProductHref(selected.store.slug, selected.product.id)
    : selectedStoreHref;

  return (
    <section className="section conversation-center">
      <div className="section-head"><div><p className="eyebrow">LOJAS E PRODUTOS</p><h1>Conversas</h1><p>Escolha uma conversa para ver o produto e quem está do outro lado.</p></div></div>
      <div className="conversation-layout">
        <aside className="conversation-list" aria-label="Lista de conversas">
          {!conversations.length && <p className="empty">Ainda não tens conversas com lojas.</p>}
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
                className={`conversation-list-item ${conversation.id === conversationId ? "is-active" : ""}`}
              >
                <div className="conversation-list-summary">
                  {productImage || otherPartyImage
                    ? <img src={productImage ?? otherPartyImage ?? ""} alt="" />
                    : <span className="conversation-avatar" aria-hidden="true">{otherParty.slice(0, 1).toLocaleUpperCase()}</span>}
                  <span className="conversation-list-copy">
                    <b>{otherParty}</b>
                    <span>{conversation.product ? `Produto: ${conversation.product.name}` : `Loja: ${conversation.store.name}`}</span>
                    <small>{lastMessage?.content ?? "Sem mensagens"}</small>
                  </span>
                </div>
                <button
                  type="button"
                  className="button button-dark conversation-open-button"
                  onClick={() => { onOpen(conversation.id); void navigate(`/mensagens/lojas/${conversation.id}`); }}
                >
                  Ir para o chat
                </button>
                <Link className="conversation-product-link" to={productHref}>
                  {conversation.product ? "Ver produto" : "Ver loja"}
                </Link>
              </article>
            );
          })}
        </aside>
        <div className="conversation-thread">
          {!selected ? <p className="empty">Escolhe uma conversa para ver as mensagens.</p> : (
            <>
              <header>
                <b>{profile?.role === "lojista" ? selected.client?.name ?? "Cliente" : selected.store.name}</b>
                <Link className="conversation-subject" to={selectedProductHref}>
                  {(selected.product?.images[0] || selected.store.logoUrl) && (
                    <img src={selected.product?.images[0] ?? selected.store.logoUrl ?? ""} alt="" />
                  )}
                  <span>
                    <small>{selected.product ? "Produto em conversa" : "Loja em conversa"}</small>
                    <b>{selected.product?.name ?? selected.store.name}</b>
                  </span>
                  <span className="conversation-product-link">{selected.product ? "Ver produto" : "Ver loja"}</span>
                </Link>
              </header>
              <div className="store-chat-messages">
                {messages.map((item) => (
                  <article className={`store-chat-message ${item.senderId === profile?.id ? "mine" : "received"}`} key={item.id}>
                    <b>{item.senderId === profile?.id ? "Você" : item.sender?.name ?? "Participante"}</b>
                    <p>{item.content}</p>
                    <time>{new Date(item.createdAt).toLocaleString("pt-MZ")}</time>
                  </article>
                ))}
              </div>
              <form className="store-chat-form" onSubmit={(event) => onSend(event, selected.id)}>
                <label htmlFor="store-quick-reply">Resposta rápida</label>
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
                <button type="submit" className="button button-dark" disabled={busy}>Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
