import { useState, type FormEvent } from "react";
import { FiEye, FiEyeOff, FiAlertCircle, FiShield } from "react-icons/fi";
import type { AuthForm } from "../../lib/types";

type AccountProps = {
  authMode: "login" | "signup";
  authForm: AuthForm;
  busy: boolean;
  setAuthForm: (form: AuthForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
};

export default function Account({ authMode, authForm, busy, setAuthForm, onSubmit, onToggleMode }: AccountProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    if (authMode === "signup") {
      // 1. Validação de senhas
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError("As palavras-passe introduzidas não coincidem.");
        return;
      }

      if (authForm.password.length < 8) {
        setAuthError("A palavra-passe deve ter pelo menos 8 caracteres.");
        return;
      }

      // 2. Validação rigorosa dos 9 dígitos do número de Moçambique
      const rawPhone = (authForm.phone || "").replace(/\D/g, "");

      if (rawPhone.length !== 9) {
        setAuthError("O número de telemóvel deve conter exatamente 9 dígitos após o +258 (ex: 841234567).");
        return;
      }

      const validPrefixes = ["82", "83", "84", "85", "86", "87"];
      const prefix = rawPhone.slice(0, 2);

      if (!validPrefixes.includes(prefix)) {
        setAuthError(`O prefixo '${prefix}' é inválido. Use um operador de Moçambique (82, 83, 84, 85, 86 ou 87).`);
        return;
      }

      // 3. Validação de consentimento de recolha de dados
      if (!acceptedTerms) {
        setAuthError("É necessário concordar com a recolha e tratamento dos dados para criar a conta.");
        return;
      }

      // Garante que o estado guarda apenas os 9 dígitos limpos
      setAuthForm({ ...authForm, phone: rawPhone });
    }

    onSubmit(event);
  };

  return (
    <section className="px-[clamp(20px,7vw,100px)] pb-12 pt-[96px]" id="conta">
      <div className="mx-auto max-w-[540px] rounded-xl border border-[var(--line)] bg-white p-7 shadow-[0_8px_18px_#16354a08] [&_h2]:my-2 [&_h2]:mt-[9px] [&_h2]:font-[Manrope,sans-serif] [&_h2]:text-[clamp(24px,3vw,34px)] [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_label]:grid [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:font-bold [&_label]:text-[#506472]">
        <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">CONTA DO MARKETPLACE</p>
        <h2>{authMode === "login" ? "Bem-vindo de volta." : "Criar conta local em Chimoio."}</h2>
        
        <form onSubmit={handleSubmit}>
          <label>
            E-mail
            <input 
              required 
              type="email" 
              autoComplete="email" 
              placeholder="exemplo@email.com"
              value={authForm.email} 
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} 
            />
          </label>

          {authMode === "signup" && (
            <label>
              Número de Telemóvel (M-Pesa / e-Mola)
              <div className="flex items-center gap-[6px]">
                <span className="whitespace-nowrap rounded-md border border-[#ccc] bg-[#f1f1f1] px-3 py-[10px] text-xs font-semibold text-[#333]">
                  MZ +258
                </span>
                <input 
                  required 
                  type="tel" 
                  autoComplete="tel"
                  maxLength={9} 
                  placeholder="841234567" 
                  value={authForm.phone || ""} 
                  onChange={(event) => {
                    setAuthError(null);
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
                    setAuthForm({ ...authForm, phone: digits });
                  }} 
                />
              </div>
              <small className="text-xs font-normal text-[#666]">Insira os 9 dígitos sem o prefixo (ex: 841234567)</small>
            </label>
          )}

          <label className="grid gap-[7px] text-[11px] font-bold text-[#506472]">
            Palavra-passe
            <div className="relative flex items-center">
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                minLength={8} 
                autoComplete={authMode === "login" ? "current-password" : "new-password"} 
                placeholder="No mínimo 8 caracteres"
                value={authForm.password} 
                onChange={(event) => {
                  setAuthError(null);
                  setAuthForm({ ...authForm, password: event.target.value });
                }} 
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-[12px] flex cursor-pointer items-center justify-center border-0 bg-transparent text-[#506472] hover:text-[var(--blue)]"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </label>

          {authMode === "signup" && (
            <>
              <label className="grid gap-[7px] text-[11px] font-bold text-[#506472]">
                Confirmar Palavra-passe
                <div className="relative flex items-center">
                  <input 
                    required 
                    type={showConfirmPassword ? "text" : "password"} 
                    minLength={8} 
                    autoComplete="new-password" 
                    placeholder="Repita a palavra-passe"
                    value={authForm.confirmPassword || ""} 
                    onChange={(event) => {
                      setAuthError(null);
                      setAuthForm({ ...authForm, confirmPassword: event.target.value });
                    }} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-[12px] flex cursor-pointer items-center justify-center border-0 bg-transparent text-[#506472] hover:text-[var(--blue)]"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                    aria-label={showConfirmPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                  >
                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </label>

              {/* Aviso e consentimento de recolha de dados */}
              <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs leading-relaxed text-[#475569]">
                <div className="mb-1.5 flex items-center gap-1.5 font-bold text-[var(--navy)]">
                  <FiShield className="shrink-0 text-[var(--blue)]" size={15} />
                  <span>Privacidade e Recolha de Dados</span>
                </div>
                <p className="mb-2.5 text-[11px]">
                  O teu e-mail e número de telemóvel são recolhidos exclusivamente para autenticação, contacto direto entre compradores e vendedores em Chimoio e gestão de negociações. Não partilhamos os teus dados com terceiros para fins comerciais.
                </p>
                <div className="flex items-start gap-2">
                  <input
                    id="terms-consent"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAuthError(null);
                      setAcceptedTerms(e.target.checked);
                    }}
                    className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-[var(--navy)]"
                  />
                  <span
                    onClick={() => {
                      setAuthError(null);
                      setAcceptedTerms((prev) => !prev);
                    }}
                    className="cursor-pointer select-none text-[11px] font-semibold text-[#334155]"
                  >
                    Compreendo e concordo com a recolha destes dados e com os Termos de Utilização da YELLOW.
                  </span>
                </div>
              </div>
            </>
          )}

          {authError && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-[#fef2f2] p-2.5 text-xs font-medium text-[#dc2626]" role="alert">
              <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
              <span>{authError}</span>
            </div>
          )}

          <button className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white disabled:cursor-wait disabled:opacity-[.56]" disabled={busy}>
            {authMode === "login" ? "Entrar" : "Registar"}
          </button>
        </form>

        {authMode === "login" && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#64748b]">
            <FiShield size={13} className="shrink-0 text-[var(--blue)]" />
            <span>Sessão protegida. Os teus dados permanecem confidenciais.</span>
          </p>
        )}

        <button 
          className="mt-3 border-0 bg-transparent text-xs font-bold text-[var(--blue)] hover:underline"
          onClick={() => {
            setAuthError(null);
            setAcceptedTerms(false);
            onToggleMode();
          }}
        >
          {authMode === "login" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entrar"}
        </button>
      </div>
    </section>
  );
}