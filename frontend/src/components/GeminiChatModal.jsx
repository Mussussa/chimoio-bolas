import { useState } from "react";
import { Bot, Send, Sparkles, UserRound, X } from "lucide-react";
import { api } from "../api.js";

export default function GeminiChatModal({ ad, onClose }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([{ from: "bot", text: `Olá! Posso ajudar com ${ad.titulo}. O que gostaria de saber?` }]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    const deviceId = localStorage.getItem("chimoio-device-id") || makeDeviceId();
    localStorage.setItem("chimoio-device-id", deviceId);
    setMessages((items) => [...items, { from: "user", text }]);
    setQuestion("");
    setError("");
    setBusy(true);
    try {
      const result = await api("/chat/perguntar", { method: "POST", body: { deviceId, pergunta: text, adId: ad.id } });
      setCount(result.count);
      setMessages((items) => [...items, { from: "bot", text: result.resposta }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="chat-modal modal-card" role="dialog" aria-modal="true" aria-label="Assistente de compras">
        <header className="chat-head"><span className="chat-avatar"><Bot size={20} /></span><div><b>Assistente Boladas</b><small><i /> Online · {ad.plano}</small></div><span className="chat-count"><Sparkles size={13} /> {count}/10</span><button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
        <div className="chat-context"><img src={ad.fotoUrl} alt="" /><span><small>A falar sobre</small><b>{ad.titulo}</b><strong>{Number(ad.preco).toLocaleString("pt-MZ")} MT</strong></span></div>
        <div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.from}`} key={`${message.from}-${index}`}><span className="message-icon">{message.from === "bot" ? <Bot size={14} /> : <UserRound size={14} />}</span><p>{message.text}</p></div>)}{busy && <div className="typing-indicator">A preparar resposta...</div>}</div>
        {error && <div className="chat-error">{error}</div>}
        <form className="chat-input" onSubmit={send}><input value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="Escreva a sua pergunta..." disabled={busy || count >= 10} /><button aria-label="Enviar pergunta" disabled={busy || !question.trim() || count >= 10}><Send size={17} /></button></form>
        <div className="chat-disclaimer">Respostas automáticas para ajudar na sua escolha.</div>
      </section>
    </div>
  );
}

function makeDeviceId() {
  return globalThis.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
