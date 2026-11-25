import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { MessageForm, Negotiation, Profile } from "../../lib/types";

const quickMessages = [
  "Tenho interesse neste serviço.",
  "Podemos combinar os detalhes deste serviço?",
  "Qual é o prazo para realizar este serviço?",
  "Que materiais estão incluídos no preço?",
  "Gostaria de fazer uma proposta de preço."
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceite",
  rejected: "Recusada",
  completed: "Concluída"
};

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
      <div className="section-head"><div><p className="eyebrow">SERVIÇOS E PROPOSTAS</p><h2>Negociações</h2><p>Acompanha as conversas e propostas ligadas aos serviços.</p></div></div>
      {!sessionExists && <p className="empty">Inicia sessão para abrir negociações.</p>}
      {negotiations.map((negotiation) => (
        <article className="negotiation-card" id={`negociacao-${negotiation.id}`} key={negotiation.id}>
          <div className="negotiation-head">
            <div>
              <b>{negotiation.service?.title ?? "Serviço"}</b>
              <span>
                {profile?.id === negotiation.clientId
                  ? `Prestador: ${negotiation.provider?.user?.name ?? "Conta do prestador"}`
                  : `Cliente: ${negotiation.client?.name ?? "Conta do cliente"}`}
                {" · "}{statusLabels[negotiation.status] ?? negotiation.status}
                {" · "}{negotiation.agreedPrice
                  ? `${Number(negotiation.agreedPrice).toLocaleString("pt-MZ")} MT`
                  : "sem preço acordado"}
              </span>
            </div>
            <div className="negotiation-actions">
              <a className="button button-outline" href={`#chat-${negotiation.id}`}>Ir para o chat</a>
              {negotiation.status === "accepted" && profile?.id === negotiation.clientId && (
                <button type="button" className="button button-dark" onClick={() => onComplete(negotiation.id)}>
                  Confirmar conclusão
                </button>
              )}
            </div>
          </div>
          {negotiation.service && (
            <div className="negotiation-service-context">
              {negotiation.service.images?.[0] && <img src={negotiation.service.images[0]} alt="" />}
              <span>
                <small>Serviço em negociação</small>
                <b>{negotiation.service.title}</b>
              </span>
              {negotiation.provider?.id && (
                <Link
                  className="negotiation-service-link"
                  to={`/prestadores/${encodeURIComponent(negotiation.provider.id)}#servico-${encodeURIComponent(negotiation.service.id)}`}
                >
                  Ver serviço
                </Link>
              )}
            </div>
          )}
          <div className="messages" id={`chat-${negotiation.id}`}>{negotiation.messages?.map((message) => (
            <div
              className={`message ${message.senderId === profile?.id ? "mine" : "received"}`}
              key={message.id}
            >
              <b>
                {message.senderId === profile?.id ? "Você" : message.sender?.name ?? "Participante"}
                {message.messageType === "proposal" && ` · Proposta de ${Number(message.proposalAmount).toLocaleString("pt-MZ")} MT`}
              </b>
              <p>{message.content}</p>
              <time>{new Date(message.createdAt).toLocaleString("pt-MZ")}</time>
              {message.messageType === "proposal" && message.senderId !== profile?.id && negotiation.status === "pending" && <span>
                <button type="button" onClick={() => onRespondToProposal(negotiation.id, message.id, "accept")}>Aceitar</button>
                <button type="button" onClick={() => onRespondToProposal(negotiation.id, message.id, "reject")}>Recusar</button>
              </span>}
            </div>
          ))}</div>
          {negotiation.status !== "completed" && negotiation.status !== "rejected" && (
            <form className="message-form" onSubmit={(event) => void onSendMessage(event)}>
              <label>
                Resposta rápida
                <select
                  required
                  value={selectedNegotiation === negotiation.id ? messageForm.content : ""}
                  onChange={(event) => onSelectField(negotiation.id, "content", event.target.value)}
                >
                  <option value="" disabled>Escolha uma mensagem</option>
                  {quickMessages.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label>
                Proposta de preço (MT, opcional)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={selectedNegotiation === negotiation.id ? messageForm.proposalAmount : ""}
                  onChange={(event) => onSelectField(negotiation.id, "proposalAmount", event.target.value)}
                  placeholder="Ex.: 1 500"
                />
              </label>
              <button type="submit" className="button button-dark" disabled={busy}>Enviar</button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
