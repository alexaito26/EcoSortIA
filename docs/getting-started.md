# Primeros pasos - EcoSort AI

## Requisitos

- Node.js >= 24 (ver `.nvmrc`)
- pnpm >= 11

Instalar pnpm si no lo tienes:

```bash
npm install -g pnpm
# o: corepack enable pnpm
```

## Instalacion

```bash
git clone <repo>
cd EcoSortIA
pnpm install
```

## Variables de entorno

Copia la plantilla y complétala (los valores reales llegan en la Fase 2):

```bash
cp .env.example apps/web/.env.local
```

Nunca subas secretos reales. `.env*` esta en `.gitignore` (excepto `.env.example`).

## Comandos utiles

```bash
pnpm dev         # desarrollo (todas las apps)
pnpm build       # build de produccion
pnpm lint        # linter
pnpm typecheck   # verificacion de tipos
pnpm format      # formateo con Prettier
```

## Solo la app web

```bash
pnpm --filter web dev
```
