# Deploy Ohana Moments

## Recommended Topology

- Frontend: Vercel or Netlify.
- Backend: Render, Railway, or Fly.io.
- Database: Neon, Supabase, Render PostgreSQL, or Railway PostgreSQL.

## Backend Variables

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-domain.com
PAYMENT_PROVIDER=external
PAYMENT_CHECKOUT_BASE_URL=https://your-payment-provider-checkout-url
```

`FRONTEND_URL` may contain comma-separated origins if you deploy preview and production domains.

## Frontend Variables

```bash
VITE_API_URL=https://your-backend-domain.com/api
```

## Database Seed

This project does not use Prisma migrations. The canonical schema and Lima catalog seed live in:

```bash
docker/postgres/init/01-schema.sql
```

For a cloud PostgreSQL database, run from the repository root:

```bash
psql "$DATABASE_URL" -f deploy/seed-cloud.sql
```

## Build Commands

Backend:

```bash
pnpm install
pnpm run prisma:generate
pnpm run start:backend
```

Frontend:

```bash
pnpm install
pnpm run build:frontend
```

## Production Notes

- Do not store card data in this app.
- Use an external hosted checkout provider for card payments.
- Rotate `JWT_SECRET` before production.
- Keep `FRONTEND_URL` strict in production; do not use wildcard CORS.
