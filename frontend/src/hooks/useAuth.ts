import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadProfile, updateProfile as updateProfileRequest } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { AuthForm, Notice, Profile, ProfileUpdate } from "../lib/types";

type UseAuthOptions = {
  setNotice: Dispatch<SetStateAction<Notice>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
};

export default function useAuth({ setNotice, setBusy }: UseAuthOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authForm, setAuthForm] = useState<AuthForm>({ email: "", password: "" });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void loadProfile(session)
      .then((nextProfile) => { if (active) setProfile(nextProfile); })
      .catch((error: Error) => { if (active) setNotice({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [session, setNotice]);

  const submitAuth = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setNotice({ text: "O acesso à conta está temporariamente indisponível. Tenta novamente mais tarde.", error: true });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (authMode === "login") {
        const result = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        });
        if (result.error) throw result.error;
      } else {
        const result = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { phone: `+258${authForm.phone ?? ""}` } }
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          setNotice({ text: "Conta criada com sucesso. Confirme o e-mail para iniciar sessão." });
        }
      }
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }, [authForm.email, authForm.password, authForm.phone, authMode, setBusy, setNotice]);

  const signOut = useCallback(async () => {
    const result = await supabase?.auth.signOut();
    if (result?.error) setNotice({ text: result.error.message, error: true });
  }, [setNotice]);

  const updateAccountProfile = useCallback(async (values: ProfileUpdate, avatarFile: File | null) => {
    if (!session) return;
    setProfileSaving(true);
    try {
      let avatarUrl = values.avatarUrl;
      if (avatarFile) {
        if (!supabase) throw new Error("O serviço de fotografias está temporariamente indisponível.");
        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp"
        };
        const extension = extensionByType[avatarFile.type];
        if (!extension || avatarFile.size > 5 * 1024 * 1024) {
          throw new Error("A fotografia deve ser JPEG, PNG ou WebP e ter até 5 MB.");
        }
        const filePath = `${session.user.id}/profile/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("provider-media")
          .upload(filePath, avatarFile, { cacheControl: "3600", contentType: avatarFile.type, upsert: false });
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from("provider-media").getPublicUrl(filePath).data.publicUrl;
      }

      const updated = await updateProfileRequest(session, { ...values, avatarUrl });
      setProfile((current) => current ? { ...current, ...updated } : current);
      setNotice({ text: "Os dados da conta foram atualizados." });
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    } finally {
      setProfileSaving(false);
    }
  }, [session, setNotice]);

  return {
    session,
    profile,
    setProfile,
    authForm,
    setAuthForm,
    authMode,
    setAuthMode,
    profileSaving,
    submitAuth,
    signOut,
    updateAccountProfile
  };
}
