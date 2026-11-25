import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
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
    <main className="messages-center">
      <header className="section messages-center-heading">
        <div>
          <p className="eyebrow">A SUA CAIXA DE ENTRADA</p>
          <h1>Mensagens</h1>
          <p>Conversas e negociações, organizadas por assunto.</p>
        </div>
      </header>
      {canSeeServices && canSeeStores && (
        <nav className="message-topics" role="tablist" aria-label="Assunto das mensagens">
          <button
            type="button"
            role="tab"
            aria-selected={activeTopic === "servicos"}
            aria-controls="messages-topic-panel"
            className={activeTopic === "servicos" ? "is-active" : ""}
            onClick={() => selectTopic("servicos")}
          >
            Serviços <span>{props.negotiations.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTopic === "lojas"}
            aria-controls="messages-topic-panel"
            className={activeTopic === "lojas" ? "is-active" : ""}
            onClick={() => selectTopic("lojas")}
          >
            Lojas e produtos <span>{props.conversations.length}</span>
          </button>
        </nav>
      )}
      <div id="messages-topic-panel" role="tabpanel" className="messages-center-content">
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
