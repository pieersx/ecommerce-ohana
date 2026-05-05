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

El monorepo usa `pnpm-workspace.yaml` con dos paquetes:

- `backend`
- `frontend`

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
- `GET /api/catalog/categories`
- `GET /api/catalog/districts`

## Backend

- ORM: `Prisma`
- Autenticación: `JWT` + `bcrypt`
- Validación: `Zod`

## Ejemplo de creación de pedido

```json
{
  "id_distrito": 1,
  "direccion_envio": "Av. Universitaria 123, Lima",
  "metodo_pago": "transferencia",
  "detalles": [
    {
      "id_producto": 1,
      "cantidad": 2,
      "texto_personalizado": "Ohana",
      "tecnica_personalizacion": "Sublimado"
    }
  ]
}
```
