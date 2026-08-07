import { Suspense } from "react";
import { ClaimLoginClient } from "./claim-login-client";

export default function ClaimLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-12">Cargando…</main>
      }
    >
      <ClaimLoginClient />
    </Suspense>
  );
}
