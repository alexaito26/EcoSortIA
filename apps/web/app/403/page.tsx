import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-foreground">403</p>
      <h1 className="text-xl font-semibold text-foreground">Acceso no autorizado</h1>
      <p className="max-w-sm text-muted-foreground">
        Tu cuenta no tiene permisos para ver esta seccion.
      </p>
      <Link href="/home" className={buttonVariants()}>
        Ir a mi inicio
      </Link>
    </main>
  );
}
