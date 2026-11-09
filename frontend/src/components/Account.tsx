import { useState, type FormEvent } from "react";
import type { AuthForm } from "../lib/types";

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

      // Garante que o estado guarda apenas os 9 dígitos limpos
      setAuthForm({ ...authForm, phone: rawPhone });
    }

    onSubmit(event);
  };

  return (
    <section className="section auth-section" id="conta">
      <div className="auth-card">
        <p className="eyebrow">CONTA DO MARKETPLACE</p>
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
              <div className="phone-input-group" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ 
                  padding: "10px 12px", 
                  background: "#f1f1f1", 
                  border: "1px solid #ccc", 
                  borderRadius: "6px", 
                  fontWeight: 600,
                  color: "#333",
                  whiteSpace: "nowrap"
                }}>
                  🇲🇿 +258
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
                    // Apenas aceita dígitos e limita a 9 caracteres
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
                    setAuthForm({ ...authForm, phone: digits });
                  }} 
                  style={{ width: "100%" }}
                />
              </div>
              <small style={{ color: "#666", fontSize: "0.75rem" }}>Insira os 9 dígitos sem o prefixo (ex: 841234567)</small>
            </label>
          )}

          <label className="password-label">
            Palavra-passe
            <div className="password-input-wrapper" style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem"
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {authMode === "signup" && (
            <label className="password-label">
              Confirmar Palavra-passe
              <div className="password-input-wrapper" style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </label>
          )}

          {authError && (
            <p className="error-message" style={{ color: "#d9534f", fontSize: "0.875rem", marginTop: "4px" }}>
              ⚠️ {authError}
            </p>
          )}

          <button className="button button-dark full-button" disabled={busy}>
            {authMode === "login" ? "Entrar" : "Registar"}
          </button>
        </form>

        <button 
          className="link-button" 
          onClick={() => {
            setAuthError(null);
            onToggleMode();
          }}
        >
          {authMode === "login" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entrar"}
        </button>
      </div>
    </section>
  );
}