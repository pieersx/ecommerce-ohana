# Imagen única de producción: backend Express que también sirve el frontend compilado.
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY e2e/package.json e2e/package.json

RUN pnpm install --frozen-lockfile --filter ohana-backend --filter ohana-frontend

COPY backend backend
COPY frontend frontend

RUN pnpm --filter ohana-backend prisma:generate

ENV VITE_API_URL=/api
RUN pnpm --filter ohana-frontend build

ENV NODE_ENV=production \
    PORT=4000 \
    SERVE_FRONTEND=true

EXPOSE 4000

CMD ["node", "backend/src/server.js"]
