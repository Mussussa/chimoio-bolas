import { useEffect, useState, type FormEvent } from "react";
import type { Profile } from "../../lib/types";

type ProfileSettingsFormProps = Readonly<{
  profile: Profile;
  saving: boolean;
  onSave: (values: { name: string; phone: string | null }) => Promise<void>;
}>;

export default function ProfileSettingsForm({ profile, saving, onSave }: ProfileSettingsFormProps) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");

  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone ?? "");
  }, [profile.name, profile.phone]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({ name: name.trim(), phone: phone.trim() || null });
  }

  return (
    <section className="section profile-settings" id="perfil">
      <div className="section-head">
        <div>
          <p className="eyebrow">A SUA CONTA</p>
          <h2>Dados pessoais</h2>
          <p>Atualize o nome público e o contacto da conta.</p>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <label>
          Nome público
          <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Telefone
          <input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <button className="button button-dark" type="submit" disabled={saving}>
          {saving ? "A guardar..." : "Guardar dados pessoais"}
        </button>
      </form>
    </section>
  );
}
