import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiCheckCircle, FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import type { MessageForm, Negotiation, Profile } from "../../lib/types";
import CategoryImage from "../marketplace/CategoryImage";
import { FALLBACK_IMAGE } from "../../lib/categoryPlaceholders";

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
    <section className="px-[clamp(20px,7vw,100px)] pb-12 pt-[18px]" id="negociacoes">
      <div className="mb-[26px] flex items-end justify-between gap-[22px] max-[700px]:flex-col"><div><p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">SERVIÇOS E PROPOSTAS</p><h2 className="my-2 mt-[9px] font-[Manrope,sans-serif] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.04em]">Negociações</h2><p className="m-0 text-[13px] text-[var(--muted)]">Acompanha as conversas e propostas ligadas aos serviços.</p></div></div>
      {!sessionExists && <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[var(--muted)]">Inicia sessão para abrir negociações.</p>}
      {negotiations.map((negotiation) => (
        <article className="my-3 rounded-xl border border-[var(--line)] bg-white p-5" id={`negociacao-${negotiation.id}`} key={negotiation.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-[5px]">
              <b className="font-[Manrope,sans-serif] text-[15px] font-bold text-[var(--navy)]">{negotiation.service?.title ?? "Serviço"}</b>
              <span className="text-[11px] text-[var(--muted)]">
                {profile?.id === negotiation.clientId
                  ? `Prestador: ${negotiation.provider?.user?.name ?? "Conta do prestador"}`
                  : `Cliente: ${negotiation.client?.name ?? "Conta do cliente"}`}
                {" · "}{statusLabels[negotiation.status] ?? negotiation.status}
                {" · "}{negotiation.agreedPrice
                  ? `${Number(negotiation.agreedPrice).toLocaleString("pt-MZ")} MT`
                  : "sem preço acordado"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" href={`#chat-${negotiation.id}`}><FiMessageCircle aria-hidden="true" />Ir para o chat</a>
              {negotiation.status === "accepted" && profile?.id === negotiation.clientId && (
                <button type="button" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white" onClick={() => onComplete(negotiation.id)}>
                  <FiCheckCircle aria-hidden="true" />Confirmar conclusão
                </button>
              )}
            </div>
          </div>
          {negotiation.service && (
            <div className="my-[14px] flex min-w-0 items-center gap-3 rounded-lg border border-[var(--line)] p-[10px] text-inherit no-underline max-[560px]:flex-wrap">
              <CategoryImage className="h-[54px] w-[74px] flex-none rounded-md bg-[#eaf1f4] object-cover" src={negotiation.service.images?.[0]} alt="" placeholder={FALLBACK_IMAGE} />
              <span className="grid min-w-0 gap-1">
                <small className="text-[10px] text-[var(--muted)]">Serviço em negociação</small>
                <b className="overflow-hidden text-ellipsis whitespace-nowrap">{negotiation.service.title}</b>
              </span>
              {negotiation.provider?.id && (
                <Link
                  className="ml-auto whitespace-nowrap text-[11px] font-bold text-[var(--blue)]"
                  to={`/prestadores/${encodeURIComponent(negotiation.provider.id)}#servico-${encodeURIComponent(negotiation.service.id)}`}
                >
                  Ver serviço
                </Link>
              )}
            </div>
          )}
          <div className="my-4 grid gap-[9px]" id={`chat-${negotiation.id}`}>{negotiation.messages?.map((message) => (
            <div
              className={`w-fit max-w-[min(80%,540px)] justify-self-start rounded-[9px_9px_9px_2px] bg-[#f0f4f6] px-[13px] py-[11px] text-xs ${message.senderId === profile?.id ? "ml-auto justify-self-end rounded-[9px_9px_2px_9px] bg-[#185a86] text-right text-white" : ""}`}
              key={message.id}
            >
              <b className="text-[10px]">
                {message.senderId === profile?.id ? "Você" : message.sender?.name ?? "Participante"}
                {message.messageType === "proposal" && ` · Proposta de ${Number(message.proposalAmount).toLocaleString("pt-MZ")} MT`}
              </b>
              <p className="mt-1 leading-[1.5]">{message.content}</p>
              <time className={`mt-1.5 block text-[9px] ${message.senderId === profile?.id ? "text-[#c9dfed]" : "text-[#87949b]"}`}>{new Date(message.createdAt).toLocaleString("pt-MZ")}</time>
              {message.messageType === "proposal" && message.senderId !== profile?.id && negotiation.status === "pending" && <span className="mt-2 flex gap-[10px]">
                <button className="inline-flex items-center gap-1 border-0 bg-transparent font-bold text-[var(--blue)]" type="button" onClick={() => onRespondToProposal(negotiation.id, message.id, "accept")}><FiCheck aria-hidden="true" />Aceitar</button>
                <button className="inline-flex items-center gap-1 border-0 bg-transparent font-bold text-[var(--blue)]" type="button" onClick={() => onRespondToProposal(negotiation.id, message.id, "reject")}><FiX aria-hidden="true" />Recusar</button>
              </span>}
            </div>
          ))}</div>
          {negotiation.status !== "completed" && negotiation.status !== "rejected" && (
            <form className="grid grid-cols-1 items-end gap-2 border-t border-[var(--line)] pt-3 min-[851px]:grid-cols-[minmax(0,2fr)_minmax(150px,1fr)_auto]" onSubmit={(event) => void onSendMessage(event)}>
              <label className="grid gap-[6px] text-[10px] font-bold text-[var(--muted)]">
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
              <label className="grid gap-[6px] text-[10px] font-bold text-[var(--muted)]">
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
              <button type="submit" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white disabled:cursor-wait disabled:opacity-[.56]" disabled={busy}><FiSend aria-hidden="true" />Enviar</button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
