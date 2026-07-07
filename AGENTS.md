# AGENTS.md

## Workspace
- Usa `pnpm` en la raiz. Este repo no usa `npm`, `turbo`, lint ni typecheck.
- Paquetes del monorepo: `backend/`, `frontend/` y `e2e/`.
- `frontend/` es la tienda completa en Vite + React (catalogo, carrito, pedidos, cuenta, admin).

## Comandos reales
- Setup inicial: `cp backend/.env.example backend/.env`
- Instalar dependencias: `pnpm install`
- Generar cliente Prisma: `pnpm run prisma:generate`
- Levantar PostgreSQL: `pnpm run db:up`
- Reiniciar base con schema + seeds: `pnpm run db:reset`
- Backend dev: `pnpm run dev:backend`
- Frontend dev: `pnpm run dev:frontend`
- Verificacion minima de frontend: `pnpm run build:frontend`

## Backend
- Entry point del backend: `backend/src/server.js`
- La app Express se arma en `backend/src/app.js`
- Stack backend ya fijado: `Prisma` + `JWT`/`bcrypt` + `Zod`
- Si cambias payloads o params de rutas, actualiza tambien `backend/src/validators/schemas.js`
- La verificacion manual de la API vive en `api.http`

## Base de datos
- La base local no se gestiona con migraciones de Prisma.
- Docker inicializa PostgreSQL desde `docker/postgres/init/01-schema.sql`.
- Prisma modela la misma BD en `backend/prisma/schema.prisma`.
- Si cambias el esquema, manten sincronizados `backend/prisma/schema.prisma` y `docker/postgres/init/01-schema.sql`.
- Despues de cambios de schema o seeds, usa `pnpm run db:reset`.

## Tests
- Integracion backend: `pnpm run test:backend` (node:test + supertest; recrea la base `ohana_moments_test` desde el schema SQL; requiere `pnpm run db:up`).
- E2E: `pnpm run test:e2e` (Playwright; levanta backend en :4100 y frontend en :5273 contra la base `ohana_moments_e2e`).
- `NODE_ENV=test` desactiva los rate limiters.

## Deploy
- Produccion en AWS (App Runner + RDS + S3). Redeploy: `bash deploy/aws-deploy.sh`.
- Credenciales de produccion en `deploy/.env.production` (gitignored). Ver `DEPLOY.md`.

## Verificacion manual
- Para backend, usa `GET /api/health` y los requests de `api.http`.
- Los tokens pegados en `api.http` se vuelven obsoletos; vuelve a hacer login y reemplazalos antes de probar rutas protegidas.

## Credenciales seed
- Admin: `admin@ohana.com` / `admin123`
- Cliente: `cliente@correo.com` / `cliente123`

## Reglas de permisos utiles
- Escritura en `users` y `products` requiere admin.
- `orders` requiere autenticacion.
- Solo admin puede cambiar `estado` de pedidos.
- Un cliente solo puede editar o eliminar sus propios pedidos en estado `Pendiente`.
