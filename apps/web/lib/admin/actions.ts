"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userRoleSchema } from "@ecosort/shared";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: userRoleSchema,
});

export type AdminActionState = { error?: string; success?: string };

export async function changeUserRole(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireRole(["admin"]);

  const parsed = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Datos invalidos." };
  }

  if (parsed.data.userId === admin.id) {
    return { error: "No puedes cambiar tu propio rol." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_user", {
    target: parsed.data.userId,
    new_role: parsed.data.role,
  });

  if (error) {
    return { error: "No se pudo actualizar el rol." };
  }

  revalidatePath("/users");
  return { success: "Rol actualizado." };
}
