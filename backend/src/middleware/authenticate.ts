import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { sendError } from "../http/responses.js";
import { User } from "../models/index.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || !supabase) {
    sendError(res, 401, "Autenticação necessária.");
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      sendError(res, 401, "Sessão inválida ou expirada.");
      return;
    }
    const email = data.user.email;
    if (!email) {
      sendError(res, 401, "A conta autenticada não tem e-mail.");
      return;
    }

    const [user] = await User.findOrCreate({
      where: { id: data.user.id },
      defaults: {
        id: data.user.id,
        name: String(data.user.user_metadata.name ?? email.split("@")[0]),
        email,
        phone: null,
        role: "client",
        avatarUrl: null
      }
    });
    req.appUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Array<"client" | "lojista" | "prestador" | "admin">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.appUser || !roles.includes(req.appUser.role)) {
      sendError(res, 403, "Não tem permissão para esta operação.");
      return;
    }
    next();
  };
}
