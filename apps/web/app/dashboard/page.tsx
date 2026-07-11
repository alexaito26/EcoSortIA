import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DashboardPage() {
  const profile = await requireRole(ROLE_ACCESS["/dashboard"]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {profile.email} - rol: {profile.role}
          </p>
        </div>
        <LogoutButton />
      </header>
      <p className="text-muted-foreground">
        Metricas, graficos e historial se implementan en la Fase 3.
      </p>
    </main>
  );
}
