import { requireRole } from "@/lib/auth/session";
import { ROLE_ACCESS } from "@/lib/auth/roles";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const profile = await requireRole(ROLE_ACCESS["/home"]);

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Hola, {profile.full_name ?? "usuario"}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <LogoutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tus EcoPuntos</CardTitle>
          <CardDescription>Rol actual: {profile.role}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-foreground">{profile.eco_points}</p>
          <p className="text-sm text-muted-foreground">Sigue reciclando para ganar mas puntos.</p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        El area completa del usuario (impacto, reciclar, recompensas) llega en la Fase 3.
      </p>
    </main>
  );
}
