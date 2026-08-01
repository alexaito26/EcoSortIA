# EcoSort AI — web (`apps/web`)

Aplicacion Next.js (App Router) + PWA del monorepo EcoSort AI.

## Desarrollo

Desde la raiz del monorepo:

```bash
pnpm install
cp ../../.env.example .env.local   # completar variables publicas
pnpm --filter web dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Despliegue

Publicado en Vercel (Root Directory = `apps/web`). Un push a `main` que
toque este paquete (o dependencias del workspace) dispara produccion.
Detalle: [docs/deployment.md](../../docs/deployment.md).
