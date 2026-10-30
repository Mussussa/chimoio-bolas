import { useState } from "react";
import { BadgeCheck, BriefcaseBusiness, ImagePlus, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  { id: "basico", name: "Básico", price: 1000, campaigns: 2, description: "2 campanhas externas por mês + publicação na plataforma." },
  { id: "premium", name: "Premium", price: 1500, campaigns: 4, description: "4 campanhas externas, destaque superior e prioridade." }
];

const emptyForm = {
  nome: "",
  contacto: "",
  email: "",
  telefone: "",
  bairro: "",
  titulo: "",
  descricao: "",
  preco: "",
  fotoUrl: "",
  plano: "basico"
};

export default function ProviderRegistration({ onRegistered, onNotify }) {
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return onNotify("Escolha um ficheiro de imagem.", true);
    if (file.size > 5 * 1024 * 1024) return onNotify("A imagem deve ter no máximo 5 MB.", true);
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
    if (!form.fotoUrl) return onNotify("Adicione uma fotografia para o primeiro serviço.", true);
    setBusy(true);
    try {
      await onRegistered(form);
    } catch (error) {
      onNotify(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="provider-page">
      <div className="page-heading"><span className="eyebrow">Serviços locais</span><h1>O seu talento,<br /><em>em toda a cidade.</em></h1><p>Registe-se, escolha um plano mensal e deixe a publicação dos seus serviços connosco.</p></div>
      <div className="provider-layout">
        <form className="form-card provider-form" onSubmit={submit}>
          <div className="form-card-title"><div><span className="eyebrow">Criar conta de prestador</span><h2>Dados do negócio</h2></div><BriefcaseBusiness size={21} /></div>
          <div className="form-grid">
            <label className="field">Nome do prestador<input required maxLength="80" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Ex.: Electricista Chimoio" /></label>
            <label className="field">Pessoa de contacto<input required maxLength="80" value={form.contacto} onChange={(event) => setForm({ ...form, contacto: event.target.value })} placeholder="Nome completo" /></label>
            <label className="field">E-mail<input required type="email" maxLength="120" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nome@email.com" /></label>
            <label className="field">Telefone<input required type="tel" maxLength="30" value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} placeholder="+258 84 000 0000" /></label>
            <label className="field full">Bairro<input required maxLength="70" value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} placeholder="Ex.: Cimento" /></label>
          </div>

          <div className="provider-section-title"><span className="eyebrow">Primeiro serviço</span><small>O Admin revê e publica a sua loja na plataforma.</small></div>
          <div className="form-grid">
            <label className="field full">Nome do serviço<input required maxLength="90" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} placeholder="Ex.: Instalações eléctricas" /></label>
            <label className="field">Preço indicativo (MT)<input required type="number" min="1" step="1" value={form.preco} onChange={(event) => setForm({ ...form, preco: event.target.value })} placeholder="500" /></label>
            <label className="field">Fotografia <span className="file-picker provider-file-picker"><ImagePlus size={16} /> Escolher imagem<input type="file" accept="image/*" onChange={handlePhoto} /></span></label>
            {preview && <img className="form-preview provider-preview" src={preview} alt="Pré-visualização do serviço" />}
            <label className="field full">Descrição<textarea required maxLength="600" rows="3" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descreva o serviço que presta." /></label>
          </div>

          <div className="provider-section-title"><span className="eyebrow">Categoria Individual · mensal</span><small>O plano Empresarial ainda não está disponível.</small></div>
          <div className="provider-plan-options">
            {plans.map((plan) => <button type="button" key={plan.id} className={form.plano === plan.id ? "provider-plan selected" : "provider-plan"} onClick={() => setForm({ ...form, plano: plan.id })}>
              <span className="plan-radio" /><span className="provider-plan-name">{plan.name}{plan.id === "premium" && <Sparkles size={13} />}</span><b>{plan.price.toLocaleString("pt-MZ")} MT<small>/mês</small></b><span className="provider-plan-description">{plan.description}</span>
            </button>)}
          </div>
          <div className="provider-included"><BadgeCheck size={16} /> Inclui publicação do perfil e serviços na plataforma após aprovação do Admin.</div>
          <button className="button button-dark submit-ad" disabled={busy}>{busy ? "A criar conta..." : "Registar e simular pagamento mensal"}</button>
          <p className="fine-print"><ShieldCheck size={14} /> Pagamento mensal simulado · A conta e o serviço aguardam revisão administrativa.</p>
        </form>

        <aside className="provider-side-card">
          <span className="provider-side-mark"><BriefcaseBusiness size={21} /></span>
          <span className="eyebrow">A sua loja, o nosso trabalho</span>
          <h2>Você presta.<br /><em>Nós promovemos.</em></h2>
          <p>Os prestadores não entram na fila de anúncios avulsos. A equipa Chimoio Boladas revê e publica os dados da sua loja.</p>
          <ul><li>Plano mensal sem lotes mistos</li><li>Campanhas externas realizadas pela equipa</li><li>Renove ou altere o plano no seu painel</li><li>Premium tem destaque superior e prioridade</li></ul>
          <div className="provider-enterprise">PLANO EMPRESARIAL <span>Em breve</span></div>
        </aside>
      </div>
    </section>
  );
}
