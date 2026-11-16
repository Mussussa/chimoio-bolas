import { useCallback, useEffect, useState, type Dispatch, type SetStateAction, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  completeNegotiation as completeNegotiationRequest,
  loadNegotiations,
  respondToProposal as respondToProposalRequest,
  sendNegotiationMessage,
  startNegotiation as startNegotiationRequest
} from "../lib/api";
import type { MessageForm, Negotiation, Notice } from "../lib/types";

type UseNegotiationsOptions = {
  session: Session | null;
  setNotice: Dispatch<SetStateAction<Notice>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
};

export default function useNegotiations({ session, setNotice, setBusy }: UseNegotiationsOptions) {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState("");
  const [messageForm, setMessageForm] = useState<MessageForm>({ content: "", proposalAmount: "" });

  const refresh = useCallback(async () => {
    if (!session) {
      setNegotiations([]);
      return;
    }
    setNegotiations(await loadNegotiations(session));
  }, [session]);

  useEffect(() => {
    let active = true;
    if (!session) {
      setNegotiations([]);
      return;
    }
    void loadNegotiations(session)
      .then((items) => { if (active) setNegotiations(items); })
      .catch((error: Error) => { if (active) setNotice({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [session, setNotice]);

  const runApi = useCallback(async <T,>(request: (currentSession: Session) => Promise<T>): Promise<T | null> => {
    if (!session) {
      setNotice({ text: "Inicia sessão para continuar.", error: true });
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await request(session);
      setNotice({ text: "Operação concluída." });
      return result;
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
      return null;
    } finally {
      setBusy(false);
    }
  }, [session, setBusy, setNotice]);

  const start = useCallback(async (serviceId: string) => {
    const result = await runApi((currentSession) => startNegotiationRequest(currentSession, serviceId));
    if (result) {
      await refresh();
      setSelectedNegotiation(result.negotiation.id);
      return true;
    }
    return false;
  }, [refresh, runApi]);

  const sendMessage = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNegotiation) return;
    const isProposal = messageForm.proposalAmount.trim() !== "";
    const result = await runApi((currentSession) => sendNegotiationMessage(currentSession, selectedNegotiation, {
      content: messageForm.content,
      messageType: isProposal ? "proposal" : "text",
      ...(isProposal ? { proposalAmount: Number(messageForm.proposalAmount) } : {})
    }));
    if (result) {
      setMessageForm({ content: "", proposalAmount: "" });
      await refresh();
    }
  }, [messageForm, refresh, runApi, selectedNegotiation]);

  const updateMessageField = useCallback((negotiationId: string, field: "content" | "proposalAmount", value: string) => {
    if (selectedNegotiation !== negotiationId) {
      setSelectedNegotiation(negotiationId);
      setMessageForm({ content: field === "content" ? value : "", proposalAmount: field === "proposalAmount" ? value : "" });
      return;
    }
    setMessageForm((current) => ({ ...current, [field]: value }));
  }, [selectedNegotiation]);

  const respond = useCallback(async (negotiationId: string, messageId: string, action: "accept" | "reject") => {
    const result = await runApi((currentSession) => respondToProposalRequest(currentSession, negotiationId, messageId, action));
    if (result) await refresh();
  }, [refresh, runApi]);

  const complete = useCallback(async (negotiationId: string) => {
    const result = await runApi((currentSession) => completeNegotiationRequest(currentSession, negotiationId));
    if (result) await refresh();
  }, [refresh, runApi]);

  const pendingCount = negotiations.filter((item) => item.status === "pending").length;
  return {
    negotiations,
    pendingCount,
    selectedNegotiation,
    messageForm,
    refresh,
    start,
    sendMessage,
    updateMessageField,
    respond,
    complete
  };
}
