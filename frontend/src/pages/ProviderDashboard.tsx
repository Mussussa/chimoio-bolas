import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiBriefcase, FiCheckCircle, FiGrid, FiMessageCircle, FiTool, FiUser } from "react-icons/fi";
import type { Session } from "@supabase/supabase-js";
import ProviderOverview from "../components/provider/ProviderOverview";
import ProviderProfileForm from "../components/provider/ProviderProfileForm";
import ProviderServiceForm from "../components/provider/ProviderServiceForm";
import ProviderServiceList from "../components/provider/ProviderServiceList";
import type { ProviderProfileDraft } from "../components/provider/providerTypes";
import {
  deleteProviderService,
  loadProviderDashboard,
  publishProviderService,
  updateProviderProfile,
  updateProviderService,
  type ProviderDashboardData,
  type ProviderService
} from "../lib/api";
import type { Profile, ProviderServiceForm as ProviderServiceDraft } from "../lib/types";
import { supabase } from "../lib/supabase";

type ProviderDashboardProps = Readonly<{
  session: Session;
  refreshCatalog: () => Promise<void>;
  onProfileChange: (profile: Pick<Profile, "name" | "avatarUrl">) => void;
}>;

type ProviderTab = "overview" | "profile" | "services";

function profileDraftFromDashboard(dashboard: ProviderDashboardData): ProviderProfileDraft {
  return {
    name: dashboard.profile.name,
    bio: dashboard.provider.bio,
    category: dashboard.provider.category,
    basePrice: dashboard.provider.basePrice,
    neighborhood: dashboard.provider.neighborhood ?? ""
  };
}

export default function ProviderDashboard({ session, refreshCatalog, onProfileChange }: ProviderDashboardProps) {
  const [dashboard, setDashboard] = useState<ProviderDashboardData | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProviderProfileDraft | null>(null);
  const [editingService, setEditingService] = useState<ProviderService | null>(null);
  const [tab, setTab] = useState<ProviderTab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const result = await loadProviderDashboard(session);
      setDashboard(result);
      setProfileDraft(profileDraftFromDashboard(result));
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [session]);

  async function uploadMedia(file: File, folder: "profile" | "services"): Promise<string> {
    if (!supabase) throw new Error("O serviço de fotografias está temporariamente indisponível.");
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };
    const extension = extensionByType[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      throw new Error("Cada imagem deve ser JPEG, PNG ou WebP e ter até 5 MB.");
    }
    const filePath = `${session.user.id}/${folder}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("provider-media")
      .upload(filePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from("provider-media").getPublicUrl(filePath).data.publicUrl;
  }

  async function saveProfile(draft: ProviderProfileDraft, avatar: File | null) {
    setSaving(true);
    setUploading(Boolean(avatar));
    setError(null);
    setMessage(null);
    try {
      const avatarUrl = avatar ? await uploadMedia(avatar, "profile") : dashboard?.profile.avatarUrl ?? null;
      const result = await updateProviderProfile(session, {
        ...draft,
        basePrice: Number(draft.basePrice),
        avatarUrl
      });
      setDashboard((current) => current ? { ...current, ...result } : current);
      setProfileDraft({ ...draft, basePrice: String(result.provider.basePrice) });
      onProfileChange({ name: result.profile.name, avatarUrl: result.profile.avatarUrl });
      await refreshCatalog();
      setMessage("Perfil profissional atualizado.");
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function submitService(draft: ProviderServiceDraft, newPhotos: File[], currentPhotos: string[]) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const uploadedPhotos = await Promise.all(newPhotos.map((photo) => uploadMedia(photo, "services")));
      const payload = {
        ...draft,
        price: Number(draft.price),
        images: [...currentPhotos, ...uploadedPhotos]
      };
      if (editingService) {
        await updateProviderService(session, editingService.id, payload);
        setMessage("Serviço atualizado.");
      } else {
        await publishProviderService(session, payload);
        setMessage("Serviço publicado no catálogo.");
      }
      setEditingService(null);
      const result = await loadProviderDashboard(session);
      setDashboard(result);
      setProfileDraft(profileDraftFromDashboard(result));
      await refreshCatalog();
    } catch (publishError) {
      setError((publishError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeService(service: ProviderService) {
    if (!window.confirm(`Remover o serviço “${service.title}”?`)) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await deleteProviderService(session, service.id);
      setDashboard((current) => current
        ? { ...current, services: current.services.filter((item) => item.id !== service.id) }
        : current);
      if (editingService?.id === service.id) setEditingService(null);
      setMessage("Serviço removido.");
      await refreshCatalog();
    } catch (removeError) {
      setError((removeError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function editService(service: ProviderService) {
    setEditingService(service);
    setError(null);
    setMessage(null);
  }

  return (
    <section className="min-h-[calc(100vh-160px)] px-[clamp(20px,7vw,100px)] pt-11 pb-[70px] max-[560px]:pb-12" id="painel-prestador">
      <header className="flex flex-col items-start justify-between gap-5 border-b border-[#e7e1ca] pb-6 min-[561px]:flex-row min-[561px]:items-center">
        <div>
          <p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#2f856c]">ÁREA DO PRESTADOR</p>
          <h1 className="my-2 font-[Manrope,sans-serif] text-[32px] font-extrabold text-[#302b18] max-[560px]:text-[27px]">O seu espaço profissional</h1>
          <p className="m-0 text-[13px] text-[#716e60]">Apresente as suas competências e mantenha os serviços atualizados.</p>
        </div>
        <span className={`rounded-md px-[11px] py-2 text-[11px] font-bold ${dashboard?.provider.verified ? "bg-[#e6f4ec] text-[#267155]" : "bg-[#fff3da] text-[#885a1c]"}`}>
          <span className="inline-flex items-center gap-1.5">{dashboard?.provider.verified ? <FiCheckCircle aria-hidden="true" /> : <FiBriefcase aria-hidden="true" />}{dashboard?.provider.verified ? "Perfil verificado" : "Perfil não verificado"}</span>
        </span>
      </header>

      <nav className="my-5 mb-6 flex gap-6 overflow-x-auto border-b border-[#e7e1ca] max-[560px]:gap-[15px]" aria-label="Secções do painel do prestador">
        <button type="button" aria-pressed={tab === "overview"} className={`inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 text-[13px] font-bold max-[560px]:text-xs ${tab === "overview" ? "border-b-[#2f856c] text-[#2f856c]" : "text-[#716e60]"}`} onClick={() => setTab("overview")}><FiGrid aria-hidden="true" />Visão geral</button>
        <button type="button" aria-pressed={tab === "profile"} className={`inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 text-[13px] font-bold max-[560px]:text-xs ${tab === "profile" ? "border-b-[#2f856c] text-[#2f856c]" : "text-[#716e60]"}`} onClick={() => setTab("profile")}><FiUser aria-hidden="true" />Perfil profissional</button>
        <button type="button" aria-pressed={tab === "services"} className={`inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 text-[13px] font-bold max-[560px]:text-xs ${tab === "services" ? "border-b-[#2f856c] text-[#2f856c]" : "text-[#716e60]"}`} onClick={() => setTab("services")}><FiTool aria-hidden="true" />Serviços</button>
        <Link className="ml-auto inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-0.5 pb-3 text-[13px] font-bold text-[#765900] hover:border-b-[#9abbd0] max-[560px]:text-xs" to="/mensagens"><FiMessageCircle aria-hidden="true" />Mensagens</Link>
      </nav>

      {error && <p className="my-[14px] flex items-start gap-2 rounded-md bg-[#fff0ec] px-[14px] py-3 text-[13px] text-[#9e3b2e]" role="alert"><FiAlertCircle className="mt-0.5 flex-none" aria-hidden="true" />{error}</p>}
      {message && <output className="my-[14px] flex items-center gap-2 rounded-md bg-[#eaf5ef] px-[14px] py-3 text-[13px] text-[#267155]"><FiCheckCircle aria-hidden="true" />{message}</output>}
      {loading && <output className="my-[14px] flex items-center gap-2 rounded-md bg-[#eaf5ef] px-[14px] py-3 text-[13px] text-[#267155]" aria-live="polite"><FiBriefcase aria-hidden="true" />A carregar o painel...</output>}

      {!loading && dashboard && tab === "overview" && (
        <ProviderOverview
          dashboard={dashboard}
          onEditProfile={() => setTab("profile")}
          onManageServices={() => setTab("services")}
        />
      )}
      {!loading && dashboard && profileDraft && tab === "profile" && (
        <ProviderProfileForm
          draft={profileDraft}
          avatarUrl={dashboard.profile.avatarUrl}
          saving={saving}
          uploading={uploading}
          onSave={saveProfile}
          onDraftChange={setProfileDraft}
          onToggleCategory={(category) => setProfileDraft((current) => {
            if (!current) return current;
            const categories = new Set(current.category);
            if (categories.has(category)) categories.delete(category);
            else categories.add(category);
            return { ...current, category: [...categories] };
          })}
        />
      )}
      {!loading && dashboard && tab === "services" && (
        <div className="grid items-start gap-4 min-[851px]:grid-cols-2">
          <ProviderServiceForm
            categories={dashboard.provider.category}
            saving={saving}
            initialService={editingService}
            onSubmit={submitService}
            onCancelEdit={() => setEditingService(null)}
          />
          <section className="min-w-0 rounded-lg border border-[#e7e1ca] bg-white p-[22px] max-[560px]:p-[17px]">
            <header className="mb-4 flex items-center justify-between gap-[14px]">
              <div><p className="mb-1.5 text-[10px] font-extrabold tracking-[.17em] text-[#2f856c]">PORTFÓLIO</p><h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[#302b18]">Serviços publicados</h2></div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e9f4ef] text-xs font-extrabold text-[#2f856c]">{dashboard.services.length}</span>
            </header>
            <ProviderServiceList
              services={dashboard.services}
              saving={saving}
              onEdit={editService}
              onDelete={(service) => void removeService(service)}
            />
          </section>
        </div>
      )}
    </section>
  );
}