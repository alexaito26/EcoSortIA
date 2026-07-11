"use client";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button variant="outline" type="submit">
        Cerrar sesion
      </Button>
    </form>
  );
}
