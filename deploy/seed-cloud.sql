-- Seed cloud PostgreSQL with the same schema and Lima catalog used locally.
-- Run from the repository root with:
-- psql "$DATABASE_URL" -f deploy/seed-cloud.sql

\ir ../docker/postgres/init/01-schema.sql
