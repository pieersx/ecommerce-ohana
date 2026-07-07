# Ohana Moments Monorepo

Monorepo con:

- `backend/`: API REST en Node.js + Express.
- `frontend/`: base inicial en React para desarrollar luego.
- `docker-compose.yml`: base de datos PostgreSQL para desarrollo local.

El backend usa:

- `Prisma` como ORM
- `JWT + bcrypt` para autenticación
- `Zod` para validación de requests

## Requisitos

- Node.js 20+
- pnpm
- Docker y Docker Compose

## Levantar el proyecto

1. Copia las variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Inicia PostgreSQL:

```bash
pnpm run db:up
```

Si quieres reiniciar la base y volver a cargar los datos seed iniciales:

```bash
pnpm run db:reset
```

3. Instala dependencias del monorepo:

```bash
pnpm install
```

4. Genera el cliente de Prisma:

```bash
pnpm run prisma:generate
```

5. Levanta el backend:

```bash
pnpm run dev:backend
```

6. Si luego quieres levantar el frontend:

```bash
pnpm run dev:frontend
```

## Workspace

El monorepo usa `pnpm-workspace.yaml` con tres paquetes:

- `backend`
- `frontend`
- `e2e`

## Tests

```bash
pnpm run test:backend   # integracion API (node:test + supertest, base ohana_moments_test)
pnpm run test:e2e       # Playwright (levanta backend :4100 y frontend :5273, base ohana_moments_e2e)
```

Ambos requieren PostgreSQL local corriendo (`pnpm run db:up`).

## Credenciales iniciales

- Admin: `admin@ohana.com` / `admin123`
- Cliente: `cliente@correo.com` / `cliente123`

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products`
- `GET /api/users`
- `POST /api/users`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/dashboard`
- `POST /api/payments/checkout`
- `GET /api/catalog/categories`
- `GET /api/catalog/districts`

## Backend

- ORM: `Prisma`
- Autenticación: `JWT` + `bcrypt`
- Validación: `Zod`
- Seguridad base: `Helmet`, rate limits, CORS por entorno y logs HTTP

## Frontend

- React + Vite
- Variable principal: `VITE_API_URL`
- Rutas principales: catálogo, login/registro, carrito/checkout, pedidos y panel admin

## Despliegue en produccion (AWS)

La app esta desplegada en AWS (App Runner + RDS PostgreSQL + S3 + ECR).
Ver `DEPLOY.md` para la arquitectura y `deploy/.env.production` (gitignored) para credenciales.

Redeploy tras cambios de codigo:

```bash
bash deploy/aws-deploy.sh
```
