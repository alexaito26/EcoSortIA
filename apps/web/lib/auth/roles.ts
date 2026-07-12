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
  "/history": ["admin", "operator", "viewer"],
  "/devices": ["admin", "operator", "viewer"],
  "/logs": ["admin"],
  "/users": ["admin"],
  "/home": ["admin", "operator", "viewer", "user"],
} as const satisfies Record<string, readonly UserRole[]>;

/** Elementos de navegacion del panel de staff (dashboard). */
export type NavItem = {
  href: string;
  label: string;
  roles: readonly UserRole[];
};

export const STAFF_NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Resumen", roles: ROLE_ACCESS["/dashboard"] },
  { href: "/monitor", label: "Monitor", roles: ROLE_ACCESS["/monitor"] },
  { href: "/history", label: "Historial", roles: ROLE_ACCESS["/history"] },
  { href: "/devices", label: "Dispositivos", roles: ROLE_ACCESS["/devices"] },
  { href: "/logs", label: "Logs", roles: ROLE_ACCESS["/logs"] },
  { href: "/users", label: "Usuarios", roles: ROLE_ACCESS["/users"] },
];

/** Filtra la navegacion segun el rol del usuario. */
export function navForRole(role: UserRole): NavItem[] {
  return STAFF_NAV.filter((item) => item.roles.includes(role));
}
