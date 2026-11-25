import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    basePrice: dashboard.provider.basePrice
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
    <section className="provider-dashboard section" id="painel-prestador">
      <header className="provider-dashboard-heading">
        <div>
          <p className="eyebrow">ÁREA DO PRESTADOR</p>
          <h1>O seu espaço profissional</h1>
          <p>Apresente as suas competências e mantenha os serviços atualizados.</p>
        </div>
        <span className={`provider-status ${dashboard?.provider.verified ? "is-verified" : ""}`}>
          {dashboard?.provider.verified ? "Perfil verificado" : "Perfil em análise"}
        </span>
      </header>

      <nav className="provider-tabs" aria-label="Secções do painel do prestador">
        <button type="button" className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")}>Visão geral</button>
        <button type="button" className={tab === "profile" ? "is-active" : ""} onClick={() => setTab("profile")}>Perfil profissional</button>
        <button type="button" className={tab === "services" ? "is-active" : ""} onClick={() => setTab("services")}>Serviços</button>
        <Link className="messages-dashboard-tab" to="/mensagens">Mensagens</Link>
      </nav>

      {error && <p className="provider-feedback is-error" role="alert">{error}</p>}
      {message && <output className="provider-feedback">{message}</output>}
      {loading && <output className="provider-loading">A carregar o painel...</output>}

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
        <div className="provider-services-layout">
          <ProviderServiceForm
            categories={dashboard.provider.category}
            saving={saving}
            initialService={editingService}
            onSubmit={submitService}
            onCancelEdit={() => setEditingService(null)}
          />
          <section className="provider-panel">
            <header className="provider-panel-heading">
              <div><p className="eyebrow">PORTFÓLIO</p><h2>Serviços publicados</h2></div>
              <span className="provider-count">{dashboard.services.length}</span>
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