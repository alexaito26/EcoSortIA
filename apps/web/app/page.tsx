import Link from "next/link";
import { WASTE_CATEGORIES } from "@ecosort/shared";
import { getProfile } from "@/lib/auth/session";
import { redirectPathForRole } from "@/lib/auth/roles";
import { buttonVariants } from "@/components/ui/button";

const CATEGORY_LABELS: Record<string, string> = {
  plastic: "Plastico",
  glass: "Vidrio",
  reject: "Rechazo",
  unknown: "Desconocido",
};

export default async function Home() {
  const profile = await getProfile();
  const target = profile ? redirectPathForRole(profile.role) : "/login";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
        Clasificacion inteligente de residuos
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">EcoSort AI</h1>
      <p className="text-balance text-muted-foreground">
        Recicla mejor con ayuda de IA e IoT. Clasificamos automaticamente tus residuos y te
        recompensamos con EcoPuntos.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {WASTE_CATEGORIES.map((category) => (
          <span
            key={category}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
          >
            {CATEGORY_LABELS[category] ?? category}
          </span>
        ))}
      </div>
      <Link href={target} className={buttonVariants({ size: "lg" })}>
        {profile ? "Ir a mi panel" : "Ingresar"}
      </Link>
    </main>
  );
}
