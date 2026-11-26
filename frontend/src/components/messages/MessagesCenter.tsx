import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { FiInbox, FiShoppingBag, FiTool } from "react-icons/fi";
import type { StoreConversation, StoreConversationMessage } from "../../lib/api";
import type { MessageForm, Negotiation, Profile } from "../../lib/types";
import Negotiations from "../negotiations/Negotiations";
import { StoreConversationPage } from "../../pages/PublicPages";

type MessagesCenterProps = Readonly<{
  profile: Profile | null;
  session: Session | null;
  sessionExists: boolean;
  busy: boolean;
  negotiations: Negotiation[];
  selectedNegotiation: string;
  messageForm: MessageForm;
  conversations: StoreConversation[];
  storeMessages: StoreConversationMessage[];
  storeMessage: string;
  onSelectField: (negotiationId: string, field: "content" | "proposalAmount", value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onRespondToProposal: (negotiationId: string, messageId: string, action: "accept" | "reject") => void;
  onComplete: (negotiationId: string) => void;
  onStoreMessageChange: (value: string) => void;
  onOpenStoreConversation: (conversationId: string) => void;
  onSendStoreMessage: (event: FormEvent<HTMLFormElement>, conversationId: string) => void;
}>;

export default function MessagesCenter(props: MessagesCenterProps) {
  const { conversationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isClient = props.profile?.role === "client";
  const canSeeServices = !props.profile || props.profile.role === "client" || props.profile.role === "prestador";
  const canSeeStores = isClient || props.profile?.role === "lojista" || props.profile?.role === "prestador";
  const requestedTopic = searchParams.get("assunto");
  const activeTopic = canSeeStores && (
    !canSeeServices || requestedTopic === "lojas" || Boolean(conversationId)
  ) ? "lojas" : "servicos";

  if (props.profile?.role === "admin") return <Navigate to="/painel" replace />;

  function selectTopic(topic: "servicos" | "lojas") {
    setSearchParams({ assunto: topic });
  }

  return (
    <main className="min-h-[60vh]">
      <header className="items-end px-[clamp(20px,7vw,100px)] pb-5 pt-12">
        <div>
          <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">A SUA CAIXA DE ENTRADA</p>
          <h1 className="my-2 mt-[9px] inline-flex items-center gap-2 font-[Manrope,sans-serif] text-[clamp(28px,3.5vw,38px)] font-extrabold tracking-[-.04em]"><FiInbox aria-hidden="true" />Mensagens</h1>
          <p className="m-0 text-[13px] text-[var(--muted)]">Conversas e negociações, organizadas por assunto.</p>
        </div>
      </header>
      {canSeeServices && canSeeStores && (
        <nav className="mx-[clamp(20px,7vw,100px)] flex w-fit gap-1 rounded-[9px] border border-[#e1e8eb] bg-[#f0f4f6] p-1" role="tablist" aria-label="Assunto das mensagens">
          <button
            type="button"
            role="tab"
            aria-selected={activeTopic === "servicos"}
            aria-controls="messages-topic-panel"
            className={`inline-flex min-h-[34px] items-center gap-2 rounded-md border-0 px-3 text-xs font-bold ${activeTopic === "servicos" ? "bg-white text-[var(--navy)] shadow-[0_1px_3px_#18354816]" : "bg-transparent text-[#647684]"}`}
            onClick={() => selectTopic("servicos")}
          >
            <FiTool aria-hidden="true" />Serviços <span className={`min-w-[18px] rounded-[10px] px-[5px] py-0.5 text-center text-[10px] ${activeTopic === "servicos" ? "bg-[var(--yellow-soft)] text-[var(--blue)]" : "bg-[#eaf0f3] text-[#607684]"}`}>{props.negotiations.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTopic === "lojas"}
            aria-controls="messages-topic-panel"
            className={`inline-flex min-h-[34px] items-center gap-2 rounded-md border-0 px-3 text-xs font-bold ${activeTopic === "lojas" ? "bg-white text-[var(--navy)] shadow-[0_1px_3px_#18354816]" : "bg-transparent text-[#647684]"}`}
            onClick={() => selectTopic("lojas")}
          >
            <FiShoppingBag aria-hidden="true" />Lojas e produtos <span className={`min-w-[18px] rounded-[10px] px-[5px] py-0.5 text-center text-[10px] ${activeTopic === "lojas" ? "bg-[var(--yellow-soft)] text-[var(--blue)]" : "bg-[#eaf0f3] text-[#607684]"}`}>{props.conversations.length}</span>
          </button>
        </nav>
      )}
      <div id="messages-topic-panel" role="tabpanel">
        {activeTopic === "servicos" && canSeeServices && (
          <Negotiations
            negotiations={props.negotiations}
            sessionExists={props.sessionExists}
            profile={props.profile}
            busy={props.busy}
            selectedNegotiation={props.selectedNegotiation}
            messageForm={props.messageForm}
            onSelectField={props.onSelectField}
            onSendMessage={props.onSendMessage}
            onRespondToProposal={props.onRespondToProposal}
            onComplete={props.onComplete}
          />
        )}
        {activeTopic === "lojas" && canSeeStores && (
          <StoreConversationPage
            session={props.session}
            profile={props.profile}
            conversations={props.conversations}
            messages={props.storeMessages}
            message={props.storeMessage}
            busy={props.busy}
            onMessageChange={props.onStoreMessageChange}
            onOpen={props.onOpenStoreConversation}
            onSend={props.onSendStoreMessage}
          />
        )}
      </div>
    </main>
  );
}

export function LegacyStoreConversationRedirect() {
  const { conversationId } = useParams();
  return (
    <Navigate
      to={conversationId ? `/mensagens/lojas/${encodeURIComponent(conversationId)}` : "/mensagens?assunto=lojas"}
      replace
    />
  );
}
