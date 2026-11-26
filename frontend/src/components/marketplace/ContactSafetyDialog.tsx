import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { FiArrowRight, FiShield } from "react-icons/fi";

type ContactSafetyDialogProps = Readonly<{
  onContinue: () => Promise<void>;
  onCancel: () => void;
}>;

export default function ContactSafetyDialog({ onContinue, onCancel }: ContactSafetyDialogProps) {
  const continueButton = useRef<HTMLButtonElement>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    continueButton.current?.focus();
  }, []);

  async function continueContact() {
    if (continuing) return;
    setContinuing(true);
    try {
      await onContinue();
    } finally {
      onCancel();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-[#162b3acc] p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !continuing) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !continuing) onCancel();
      }}
    >
      <section
        className="w-full max-w-[500px] rounded-2xl border border-[#f0df9e] bg-white p-6 shadow-[0_24px_70px_#102d4260]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="contact-safety-title"
        aria-describedby="contact-safety-description"
      >
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#fff7d6] text-[#765900]">
          <FiShield aria-hidden="true" className="text-xl" />
        </div>
        <p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">ANTES DE CONTACTAR</p>
        <h2 id="contact-safety-title" className="my-2 font-[Manrope,sans-serif] text-xl font-extrabold text-[#302b18]">
          Negocia com segurança
        </h2>
        <p id="contact-safety-description" className="text-[13px] leading-[1.7] text-[#536978]">
          A YELLOW facilita o contacto, mas não intermedeia nem garante pagamentos. Confirma o produto, o serviço, o preço e as condições diretamente com a outra pessoa antes de pagar.
        </p>
        <ul className="mt-4 grid gap-2 rounded-xl bg-[#fffaf0] p-4 text-[12px] leading-[1.6] text-[#536978]">
          <li>• Para produtos, verifica o artigo presencialmente sempre que possível.</li>
          <li>• Não envies dinheiro por M-Pesa antes de confirmares os detalhes e a identidade do destinatário.</li>
          <li>• Nunca partilhes PINs ou códigos de confirmação.</li>
        </ul>
        <Link
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#765900] hover:underline"
          to="/seguranca"
          onClick={onCancel}
        >
          Consultar dicas de segurança <FiArrowRight aria-hidden="true" />
        </Link>
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 min-[420px]:flex-row">
          <button
            type="button"
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[#c8d6dd] bg-white px-4 text-xs font-bold text-[#302b18] disabled:cursor-wait disabled:opacity-60"
            onClick={onCancel}
            disabled={continuing}
          >
            Voltar
          </button>
          <button
            ref={continueButton}
            type="button"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#302b18] px-4 text-xs font-bold text-white transition-colors hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-60"
            onClick={() => void continueContact()}
            disabled={continuing}
          >
            {continuing ? "A preparar conversa..." : "Continuar"}
            {!continuing && <FiArrowRight aria-hidden="true" />}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
