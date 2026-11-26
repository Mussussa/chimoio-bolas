import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type InformationPageType = "seguranca" | "privacidade" | "termos";

type InformationPageProps = Readonly<{
  type: InformationPageType;
}>;

const informationPages: Record<InformationPageType, {
  title: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[]; highlightOnRead?: boolean }>;
}> = {
  seguranca: {
    title: "Dicas de segurança",
    introduction: "A YELLOW ajuda a descobrir negócios e profissionais locais e a iniciar contacto. Como as negociações acontecem diretamente entre utilizadores, toma precauções antes de partilhar dados ou fazer pagamentos.",
    sections: [
      {
        title: "Antes de negociar",
        paragraphs: [
          "Confirma os detalhes do produto ou serviço, o preço, o estado, a disponibilidade e as condições de entrega diretamente com a loja ou o prestador.",
          "Consulta o perfil, as avaliações e o estado de verificação. A verificação é uma informação adicional e não substitui a tua própria análise."
        ]
      },
      {
        title: "Pagamentos e encontros",
        highlightOnRead: true,
        paragraphs: [
          "Evita enviar dinheiro por M-Pesa antes de confirmares o produto ou serviço, o preço e a identidade do destinatário. Sempre que possível, verifica presencialmente o artigo antes de pagar. Nunca partilhes PINs, palavras-passe ou códigos de confirmação.",
          "Quando for necessário encontrar alguém, escolhe um local público, informa uma pessoa de confiança e não vás sozinho se não te sentires seguro."
        ]
      },
      {
        title: "Protege a tua conta",
        paragraphs: [
          "Usa uma palavra-passe forte, mantém os teus dados de acesso privados e termina a sessão em dispositivos partilhados.",
          "Se suspeitares de fraude, interrompe o contacto e conserva mensagens e comprovativos relevantes. Não publiques dados pessoais de outras pessoas."
        ]
      },
      {
        title: "Limites da plataforma",
        paragraphs: [
          "A YELLOW facilita a descoberta e o contacto, mas não participa nem garante o resultado de negociações, pagamentos, entregas ou serviços acordados diretamente entre utilizadores."
        ]
      }
    ]
  },
  privacidade: {
    title: "Privacidade e Dados",
    introduction: "Este rascunho explica, de forma geral, como a YELLOW poderá tratar dados para disponibilizar a plataforma. A versão final deve identificar com precisão os responsáveis, os contactos e os prazos aplicáveis.",
    sections: [
      {
        title: "Dados que podem ser tratados",
        paragraphs: [
          "Para criar e gerir uma conta, a plataforma pode tratar dados fornecidos pelo utilizador, como nome, contacto, tipo de conta e informações do perfil ou do negócio.",
          "Anúncios, avaliações e mensagens incluem o conteúdo que os próprios utilizadores decidem publicar ou enviar. A localização só é usada quando fornecida no perfil ou autorizada pelo utilizador para funcionalidades de proximidade."
        ]
      },
      {
        title: "Como os dados são usados",
        paragraphs: [
          "Os dados podem ser usados para autenticar contas, apresentar lojas e serviços, permitir conversas, gerir avaliações, manter a segurança e operar as funcionalidades da YELLOW.",
          "A informação necessária pode ser processada pelos fornecedores técnicos usados para alojamento, autenticação e armazenamento da plataforma."
        ]
      },
      {
        title: "Partilha, conservação e segurança",
        paragraphs: [
          "Os dados de perfil e os anúncios podem ficar visíveis a outros utilizadores conforme as funcionalidades públicas da plataforma. As mensagens destinam-se aos participantes da conversa.",
          "A YELLOW deve conservar os dados apenas pelo período necessário às finalidades informadas ou às obrigações aplicáveis e adotar medidas razoáveis para os proteger."
        ]
      },
      {
        title: "As tuas escolhas",
        paragraphs: [
          "Podes rever e atualizar alguns dados do perfil nas definições da conta. A versão final desta política deverá explicar como pedir acesso, correção ou eliminação de dados e indicar um contacto de privacidade."
        ]
      }
    ]
  },
  termos: {
    title: "Termos de utilização",
    introduction: "Este rascunho reúne regras gerais para usar a YELLOW. Ao criar uma conta ou utilizar a plataforma, espera-se que respeites estas regras e a legislação aplicável.",
    sections: [
      {
        title: "O que a YELLOW oferece",
        paragraphs: [
          "A YELLOW permite descobrir lojas, produtos e prestadores de serviços em Chimoio, consultar informação publicada e iniciar contacto com outros utilizadores.",
          "A plataforma facilita a ligação entre utilizadores. As condições de compra, contratação, pagamento, entrega e execução são acordadas diretamente entre as partes."
        ]
      },
      {
        title: "Conta e informação publicada",
        paragraphs: [
          "És responsável por manter os dados da tua conta atualizados e por proteger as tuas credenciais.",
          "Ao publicar um anúncio, perfil, mensagem ou avaliação, confirma que a informação é correta, que tens autorização para a partilhar e que não viola direitos de terceiros."
        ]
      },
      {
        title: "Utilização aceitável",
        paragraphs: [
          "Não uses a plataforma para fraude, assédio, discriminação, atividades ilegais, spam, recolha indevida de dados ou publicação de conteúdo enganador.",
          "A YELLOW pode analisar conteúdo e tomar medidas proporcionais perante violações destas regras, incluindo limitar ou remover conteúdo ou contas, de acordo com procedimentos a detalhar na versão final."
        ]
      },
      {
        title: "Verificação e transações",
        paragraphs: [
          "O estado de verificação apresentado num perfil informa sobre uma etapa de confirmação da plataforma; não constitui garantia de identidade, qualidade, segurança ou cumprimento de uma transação.",
          "A YELLOW não é parte nos acordos entre utilizadores e não garante a qualidade, disponibilidade, entrega, pagamento ou resultado de produtos e serviços publicados."
        ]
      },
      {
        title: "Alterações e contacto",
        paragraphs: [
          "Estes termos podem ser atualizados para refletir alterações na plataforma ou requisitos aplicáveis. A versão final deverá indicar como serão comunicadas alterações relevantes e disponibilizar um canal de contacto."
        ]
      }
    ]
  }
};

export default function InformationPage({ type }: InformationPageProps) {
  const page = informationPages[type];
  const [highlightPaymentSafety, setHighlightPaymentSafety] = useState(false);

  useEffect(() => {
    setHighlightPaymentSafety(false);
    if (type !== "seguranca") return;

    const revealByScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight > 0 && window.scrollY / scrollableHeight >= 0.3) {
        setHighlightPaymentSafety(true);
      }
    };
    const revealTimer = window.setTimeout(() => setHighlightPaymentSafety(true), 7000);
    window.addEventListener("scroll", revealByScroll, { passive: true });
    revealByScroll();

    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("scroll", revealByScroll);
    };
  }, [type]);

  return (
    <article className="mx-auto min-h-[65vh] max-w-[900px] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <Link to="/" className="mb-5 inline-block text-[13px] font-bold text-[#765900]">← Voltar a explorar</Link>
      <header className="mb-8">
        <p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">YELLOW · INFORMAÇÃO & AJUDA</p>
        <h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">{page.title}</h1>
        <p className="max-w-[760px] leading-[1.75] text-[#536978]">{page.introduction}</p>
        <p className="mt-4 inline-flex rounded-md bg-[#fff7d6] px-3 py-2 text-xs font-semibold text-[#765900]">
          Rascunho — conteúdo sujeito a revisão antes da publicação como política definitiva.
        </p>
      </header>
      <div className="grid gap-6">
        {page.sections.map((section) => (
          <section
            className={`rounded-xl border p-6 shadow-[0_8px_18px_#16354a08] transition-[border-color,background-color,box-shadow] duration-700 motion-reduce:transition-none ${
              section.highlightOnRead && highlightPaymentSafety
                ? "border-[#e8c84b] bg-[#fff9df] shadow-[0_10px_28px_#7659001a]"
                : "border-[#e7e1ca] bg-white"
            }`}
            key={section.title}
          >
            <h2 className="mb-3 font-[Manrope,sans-serif] text-lg font-extrabold text-[#302b18]">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p className="mb-3 last:mb-0 text-[13px] leading-[1.75] text-[#536978]" key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
