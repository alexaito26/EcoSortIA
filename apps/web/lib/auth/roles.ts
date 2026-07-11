import type { UserRole } from "@ecosort/shared";

/** Ruta de destino tras iniciar sesion, segun el rol. */
export function redirectPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "operator":
      return "/monitor";
    case "viewer":
      return "/dashboard";
    case "user":
      return "/home";
    default:
      return "/home";
  }
}

/** Roles permitidos por area protegida. */
export const ROLE_ACCESS = {
  "/dashboard": ["admin", "operator", "viewer"],
  "/monitor": ["admin", "operator"],
  "/home": ["admin", "operator", "viewer", "user"],
} as const satisfies Record<string, readonly UserRole[]>;
