import { Suspense } from "react";
import { ClaimClient } from "./claim-client";

export default function ClaimPage() {
  return <Suspense fallback={<main className="mx-auto max-w-md px-4 py-12">Cargando reclamo…</main>}><ClaimClient /></Suspense>;
}
