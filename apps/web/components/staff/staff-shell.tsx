"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  History,
  Cpu,
  ScrollText,
  Users,
  Menu,
  X,
  Leaf,
} from "lucide-react";
import type { UserRole } from "@ecosort/shared";
import type { NavItem } from "@/lib/auth/roles";
import { ROLE_LABELS } from "@/lib/format";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/monitor": Activity,
  "/history": History,
  "/devices": Cpu,
  "/logs": ScrollText,
  "/users": Users,
};

type Profile = { email: string | null; full_name: string | null; role: UserRole };

function NavLinks({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = ICONS[item.href] ?? LayoutDashboard;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  navItems,
  profile,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  profile: Profile;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold tracking-tight">EcoSort AI</span>
      </Link>

      <div className="flex-1">
        <NavLinks navItems={navItems} pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="space-y-3 border-t border-sidebar-border pt-4">
        <div className="px-1">
          <p className="truncate text-sm font-medium">{profile.full_name ?? "Sin nombre"}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          <Badge variant="secondary" className="mt-2">
            {ROLE_LABELS[profile.role]}
          </Badge>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Cerrar sesion
          </Button>
        </form>
      </div>
    </div>
  );
}

export function StaffShell({
  children,
  navItems,
  profile,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  profile: Profile;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent navItems={navItems} profile={profile} pathname={pathname} />
      </aside>

      {/* Overlay movil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground shadow-xl">
            <SidebarContent
              navItems={navItems}
              profile={profile}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior movil */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-bold tracking-tight">EcoSort AI</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
