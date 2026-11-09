import type { FormEvent } from "react";
import type { MessageForm, Negotiation, Profile } from "../lib/types";

type NegotiationsProps = {
  negotiations: Negotiation[];
  sessionExists: boolean;
  profile: Profile | null;
  busy: boolean;
  selectedNegotiation: string;
  messageForm: MessageForm;
  onSelectField: (negotiationId: string, field: "content" | "proposalAmount", value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onRespondToProposal: (negotiationId: string, messageId: string, action: "accept" | "reject") => void;
  onComplete: (negotiationId: string) => void;
};

export default function Negotiations({
  negotiations,
  sessionExists,
  profile,
  busy,
  selectedNegotiation,
  messageForm,
  onSelectField,
  onSendMessage,
  onRespondToProposal,
  onComplete
}: NegotiationsProps) {
  return (
    <section className="section negotiations" id="negociacoes">
      <div className="section-head"><div><p className="eyebrow">MENSAGENS E PROPOSTAS</p><h2>Negociações</h2><p>Conversa e propostas passam pelo Express; não há pagamentos ou escrow na plataforma.</p></div></div>
      {!sessionExists && <p className="empty">Inicia sessão para abrir negociações.</p>}
      {negotiations.map((negotiation) => (
        <article className="negotiation-card" key={negotiation.id}>
          <div className="negotiation-head">
            <div><b>Negociação {negotiation.id.slice(0, 8)}</b><span>{negotiation.status} · {negotiation.agreed_price ? `${Number(negotiation.agreed_price).toLocaleString("pt-MZ")} MT` : "sem preço acordado"}</span></div>
            {negotiation.status === "accepted" && profile?.id === negotiation.client_id && <button className="button button-dark" onClick={() => onComplete(negotiation.id)}>Confirmar conclusão</button>}
          </div>
          <div className="messages">{negotiation.messages?.map((message) => (
            <div className={message.sender_id === profile?.id ? "message mine" : "message"} key={message.id}>
              <b>{message.message_type === "proposal" ? `Proposta · ${Number(message.proposal_amount).toLocaleString("pt-MZ")} MT` : "Mensagem"}</b>
              <p>{message.content}</p>
              {message.message_type === "proposal" && message.sender_id !== profile?.id && negotiation.status === "pending" && <span>
                <button onClick={() => onRespondToProposal(negotiation.id, message.id, "accept")}>Aceitar</button>
                <button onClick={() => onRespondToProposal(negotiation.id, message.id, "reject")}>Recusar</button>
              </span>}
            </div>
          ))}</div>
          {negotiation.status !== "completed" && negotiation.status !== "rejected" && (
            <form className="message-form" onSubmit={(event) => void onSendMessage(event)}>
              <input required value={selectedNegotiation === negotiation.id ? messageForm.content : ""} onFocus={() => {
                if (selectedNegotiation !== negotiation.id) onSelectField(negotiation.id, "content", "");
              }} onChange={(event) => onSelectField(negotiation.id, "content", event.target.value)} placeholder="Escreve uma mensagem ou proposta..." />
              <input type="number" min="0.01" step="0.01" value={selectedNegotiation === negotiation.id ? messageForm.proposalAmount : ""} onFocus={() => {
                if (selectedNegotiation !== negotiation.id) onSelectField(negotiation.id, "proposalAmount", "");
              }} onChange={(event) => onSelectField(negotiation.id, "proposalAmount", event.target.value)} placeholder="Proposta MT (opcional)" />
              <button className="button button-dark" disabled={busy}>Enviar</button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
