import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@ecosort/shared";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  eco_points: number;
};

/** Devuelve el usuario autenticado (o null) validando con el servidor de Auth. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Devuelve el perfil del usuario autenticado (o null). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, eco_points")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Exige sesion; si no hay, redirige a /login. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige un rol permitido; sin sesion -> /login, sin permiso -> /403. */
export async function requireRole(allowed: readonly UserRole[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!allowed.includes(profile.role)) redirect("/403");
  return profile;
}
