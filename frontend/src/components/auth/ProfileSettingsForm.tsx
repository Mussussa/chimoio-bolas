import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { FiUser } from "react-icons/fi";
import type { Profile, ProfileUpdate } from "../../lib/types";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";

type ProfileSettingsFormProps = Readonly<{
  profile: Profile;
  saving: boolean;
  onSave: (values: ProfileUpdate, avatarFile: File | null) => Promise<void>;
}>;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AGE_GROUPS = ["18-24", "25-34", "35+"] as const;

function isAgeGroup(value: string): value is typeof AGE_GROUPS[number] {
  return value === "18-24" || value === "25-34" || value === "35+";
}

export default function ProfileSettingsForm({ profile, saving, onSave }: ProfileSettingsFormProps) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [ageGroup, setAgeGroup] = useState(profile.ageGroup ?? "");
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setAgeGroup(profile.ageGroup ?? "");
    setNeighborhood(profile.neighborhood ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
    setAvatarFile(null);
    setAvatarFailed(false);
  }, [profile]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!AVATAR_TYPES.has(file.type)) {
      setFormError("Escolha uma fotografia JPEG, PNG ou WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFormError("A fotografia deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }
    setFormError(null);
    setAvatarFailed(false);
    setAvatarFile(file);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    void onSave({
      name: name.trim(),
      phone: phone.trim() || null,
      ageGroup: isAgeGroup(ageGroup) ? ageGroup : null,
      neighborhood: neighborhood || null,
      avatarUrl
    }, avatarFile);
  }

  const displayedAvatar = avatarPreview ?? avatarUrl;

  return (
    <section className="px-[clamp(20px,7vw,100px)] py-12">
      <div className="mb-[26px] flex items-end justify-between gap-[22px] max-[700px]:flex-col">
        <div>
          <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">A SUA CONTA</p>
          <h2 className="my-2 mt-[9px] font-[Manrope,sans-serif] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.04em]">Dados pessoais</h2>
          <p className="m-0 text-[13px] text-[var(--muted)]">Atualize o seu perfil, contacto e bairro de residência.</p>
        </div>
      </div>
      <form className="grid grid-cols-1 gap-[14px] rounded-xl border border-[var(--line)] bg-white p-6 min-[851px]:grid-cols-2 [&>label]:grid [&>label]:gap-[7px] [&>label]:text-[11px] [&>label]:font-bold [&>label]:text-[#506472]" onSubmit={submit}>
        <div className="col-span-full grid gap-3 rounded-lg border border-[var(--line)] bg-[#f9fbfc] p-4 max-[850px]:col-auto">
          <div className="flex items-center gap-[14px]">
            {displayedAvatar && !avatarFailed
              ? <img className="h-16 w-16 flex-none rounded-full border border-[var(--line)] bg-[#f5f8f9] object-cover" src={displayedAvatar} alt={`Fotografia de ${profile.name}`} onError={() => setAvatarFailed(true)} />
              : <span className="grid h-16 w-16 flex-none place-items-center rounded-full bg-[#eaf1f4] text-[var(--blue)]" role="img" aria-label="Avatar padrão, sem fotografia de perfil">
                  {profile.name.trim()
                    ? <b className="font-[Manrope,sans-serif] text-xl font-extrabold">{profile.name.trim().slice(0, 1).toLocaleUpperCase()}</b>
                    : <FiUser aria-hidden="true" className="text-2xl" />}
                </span>}
            <div>
              <strong className="text-[13px] text-[var(--navy)]">Fotografia de perfil</strong>
              <p className="mt-[5px] text-[11px] text-[var(--muted)]">JPEG, PNG ou WebP, até 5 MB. Se não enviar uma fotografia, mostramos um avatar padrão.</p>
            </div>
          </div>
          <label className="grid gap-[7px] text-[11px] font-bold text-[#506472]">
            <span>Selecionar fotografia</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
          </label>
          {(avatarUrl || avatarFile) && (
            <button type="button" className="justify-self-start border-0 bg-transparent text-xs font-bold text-[var(--blue)]" onClick={() => { setAvatarUrl(null); setAvatarFile(null); setAvatarFailed(false); }}>
              Remover fotografia
            </button>
          )}
        </div>

        <label>
          Nome público
          <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Telefone
          <input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label>
          Faixa etária
          <select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
            <option value="">Prefiro não indicar</option>
            <option value="18-24">18–24</option>
            <option value="25-34">25–34</option>
            <option value="35+">35+</option>
          </select>
        </label>
        <label>
          Bairro de residência em Chimoio
          <select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}>
            <option value="">Selecione um bairro (opcional)</option>
            {CHIMOIO_NEIGHBORHOODS.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        {formError && <p className="col-span-full m-0 rounded-md bg-[#fff0ec] px-[14px] py-3 text-[13px] text-[#9e3b2e]" role="alert">{formError}</p>}
        <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] justify-self-start rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white disabled:cursor-wait disabled:opacity-[.56]" type="submit" disabled={saving}>
          {saving ? "A guardar..." : "Guardar dados pessoais"}
        </button>
      </form>
    </section>
  );
}
