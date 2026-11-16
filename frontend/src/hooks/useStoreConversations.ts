import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  loadStoreConversations,
  loadStoreMessages,
  sendStoreMessage,
  startStoreConversation,
  type StoreConversation,
  type StoreConversationMessage
} from "../lib/api";
import type { Notice } from "../lib/types";

type UseStoreConversationsOptions = {
  session: Session | null;
  setNotice: Dispatch<SetStateAction<Notice>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
};

export default function useStoreConversations({ session, setNotice, setBusy }: UseStoreConversationsOptions) {
  const [conversations, setConversations] = useState<StoreConversation[]>([]);
  const [messages, setMessages] = useState<StoreConversationMessage[]>([]);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!session) {
      setConversations([]);
      return;
    }
    setConversations(await loadStoreConversations(session));
  }, [session]);

  useEffect(() => {
    let active = true;
    if (!session) {
      setConversations([]);
      setMessages([]);
      return;
    }
    void loadStoreConversations(session)
      .then((items) => { if (active) setConversations(items); })
      .catch((error: Error) => { if (active) setNotice({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [session, setNotice]);

  const open = useCallback(async (conversationId: string) => {
    if (!session) return;
    try {
      setMessages(await loadStoreMessages(session, conversationId));
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    }
  }, [session, setNotice]);

  const start = useCallback(async (storeId: string, content: string, productId?: string): Promise<string | null> => {
    if (!session) {
      setNotice({ text: "Inicia sessão como cliente para contactar a loja.", error: true });
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await startStoreConversation(session, {
        storeId,
        content,
        ...(productId ? { productId } : {})
      });
      await refresh();
      return result.conversation.id;
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
      return null;
    } finally {
      setBusy(false);
    }
  }, [refresh, session, setBusy, setNotice]);

  const send = useCallback(async (event: FormEvent<HTMLFormElement>, conversationId: string) => {
    event.preventDefault();
    if (!session || !message.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await sendStoreMessage(session, conversationId, message);
      setMessage("");
      await Promise.all([open(conversationId), refresh()]);
      setNotice({ text: "Mensagem enviada." });
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }, [message, open, refresh, session, setBusy, setNotice]);

  return { conversations, messages, message, setMessage, refresh, open, start, send };
}
