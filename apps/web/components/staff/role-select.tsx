"use client";

import { useActionState } from "react";
import { USER_ROLES, type UserRole } from "@ecosort/shared";
import { changeUserRole, type AdminActionState } from "@/lib/admin/actions";
import { ROLE_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: UserRole;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(changeUserRole, {});

  if (disabled) {
    return <span className="text-xs text-muted-foreground">Tu cuenta</span>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {USER_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : "Guardar"}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
      {state.success ? (
        <span className={cn("text-xs text-emerald-600")}>{state.success}</span>
      ) : null}
    </form>
  );
}
