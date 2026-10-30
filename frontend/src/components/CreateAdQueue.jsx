import { useState } from "react";
import { CheckCircle2, Clock3, ImagePlus, Send, ShieldCheck, Smartphone } from "lucide-react";
import { api } from "../api.js";

const planValues = { basico: 100, destaque: 150, premium: 250 };

export default function CreateAdQueue({ batches, activeUser, onCreated, onNotify }) {
  const [form, setForm] = useState({ titulo: "", descricao: "", preco: "", fotoUrl: "", plano: "basico", tipo: "produto" });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const waiting = batches.filter((batch) => !batch.publicadoWeb);
  const queuedAdCount = waiting.reduce((total, batch) => total + batch.adsIds.length, 0);
  const planLabels = { basico: "Básico", destaque: "Destaque", premium: "Premium" };

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return onNotify("Escolha um ficheiro de imagem.", true);
    if (file.size > 8 * 1024 * 1024) return onNotify("A imagem deve ter no máximo 8 MB.", true);
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result);
      setPreview(image);
      setForm((current) => ({ ...current, fotoUrl: image }));
    };
    reader.onerror = () => onNotify("Não foi possível ler esta imagem.", true);
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api("/anuncios/criar-e-pagar", { method: "POST", body: { ...form, userId: activeUser?.id } });
      await onCreated();
      onNotify(`Pagamento simulado com sucesso · ${result.ad.valorPago} MT. O anúncio entrou na fila.`);
      setForm({ titulo: "", descricao: "", preco: "", fotoUrl: "", plano: "basico", tipo: "produto" });
      setPreview("");
    } catch (error) {
      onNotify(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="queue-page">
      <div className="page-heading"><span className="eyebrow">Para quem faz acontecer</span><h1>O seu negócio, <em>em destaque.</em></h1><p>Chegue a mais clientes em Chimoio com um anúncio simples e rápido.</p></div>
      <div className="queue-layout">
        <form className="form-card" onSubmit={submit}>
          <div className="form-card-title"><div><span className="eyebrow">Novo anúncio</span><h2>Conte-nos a sua bolada</h2></div><span className="step-number">01 <i /> 02</span></div>
          {activeUser?.role !== "lojista" && <div className="inline-warning">Mude o perfil no topo para um Lojista para criar um anúncio.</div>}
          <div className="form-grid">
            <label className="field full">Nome do produto ou serviço<input required maxLength="90" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} placeholder="Ex.: Capulanas coloridas" /></label>
            <label className="field">Tipo<select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}><option value="produto">Produto</option><option value="servico">Serviço</option></select></label>
            <label className="field">Preço (MT)<input required type="number" min="1" step="1" value={form.preco} onChange={(event) => setForm({ ...form, preco: event.target.value })} placeholder="350" /></label>
            <label className="field full">Descrição<textarea required maxLength="600" rows="3" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="O que torna a sua oferta especial?" /></label>
            <label className="field full">Fotografia <span className="photo-input">
              <input value={form.fotoUrl.startsWith("data:") ? "" : form.fotoUrl} onChange={(event) => { setForm({ ...form, fotoUrl: event.target.value }); setPreview(event.target.value); }} placeholder="Cole o link da fotografia ou escolha um ficheiro" />
              <span className="file-picker"><ImagePlus size={16} /> Escolher<input type="file" accept="image/*" onChange={handlePhoto} /></span>
            </span>{preview && <img className="form-preview" src={preview} alt="Pré-visualização do anúncio" onError={() => setPreview("")} />}</label>
          </div>
          <div className="plans-title"><div><span className="eyebrow">Escolha o seu plano</span><small>Pagamento único · simulação EscalePay</small></div></div>
          <div className="plan-options">
            {[
              ["basico", "Básico", "Aparece no carrossel", 100],
              ["destaque", "Destaque", "Inclui assistente IA", 150],
              ["premium", "Premium", "IA + recomendações", 250]
            ].map(([id, label, detail, value]) => <button type="button" className={form.plano === id ? `plan-option selected ${id}` : "plan-option"} key={id} onClick={() => setForm({ ...form, plano: id })}><span className="plan-radio" /><b>{label}</b><small>{detail}</small><strong>{value} MT</strong></button>)}
          </div>
          <button className="button button-dark submit-ad" type="submit" disabled={busy || activeUser?.role !== "lojista"}><Smartphone size={17} /> {busy ? "A processar..." : `Simular pagamento EscalePay · ${planValues[form.plano]} MT`} <Send size={15} /></button>
          <p className="fine-print"><ShieldCheck size={14} /> M-Pesa / e-Mola · Demonstração, nenhum valor é cobrado.</p>
        </form>

        <aside className="queue-card">
          <div className="queue-card-head"><div><span className="eyebrow">Publicação automática</span><h2>Fila do carrossel</h2></div><span className="queue-counter" aria-label={`${queuedAdCount} anúncios em espera`}>{queuedAdCount}</span></div>
          <p className="queue-explainer">Cada lote aceita anúncios de um só plano. Publica ao chegar a 6 anúncios ou após 30 minutos.</p>
          {!queuedAdCount && <div className="queue-empty"><Clock3 size={22} /><span>A fila está vazia. O próximo anúncio começa um lote do seu plano.</span></div>}
          {waiting.map((batch) => <div className="queue-batch" key={batch.id}>
            <div className="queue-batch-heading">
              <span><Clock3 size={14} /> Lote {batch.id.slice(-6)} · {planLabels[batch.plano]}</span>
              <span>{batch.adsIds.length}/6 · {batch.receitaTotal} MT</span>
            </div>
            <div className="queue-meter"><i style={{ width: `${Math.min((batch.adsIds.length / 6) * 100, 100)}%` }} /></div>
            {(batch.ads ?? []).map((ad, index) => <div className="queue-row" key={ad.id}><span className={`queue-position ${ad.plano}`}>{String(index + 1).padStart(2, "0")}</span><img src={ad.fotoUrl} alt="" /><span className="queue-row-copy"><b>{ad.titulo}</b><small>{planLabels[ad.plano]} · {ad.store?.nome}</small></span><span className="queue-row-price">{ad.valorPago} MT</span></div>)}
          </div>)}
          <div className="queue-assurance"><CheckCircle2 size={16} /> Meta Ads requer 6 anúncios do mesmo plano e receita mínima de 600 MT.</div>
        </aside>
      </div>
    </section>
  );
}
