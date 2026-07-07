// Recrea la base de datos de test y carga docker/postgres/init/01-schema.sql.
// Se ejecuta antes de `node --test` (ver script "test" en package.json).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const TEST_DB = process.env.TEST_DB_NAME || 'ohana_moments_test';
const ADMIN_URL = process.env.TEST_ADMIN_DATABASE_URL
  || 'postgresql://ohana_user:ohana_password@localhost:5432/ohana_moments';

async function main() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const schemaPath = path.join(__dirname, '..', '..', 'docker', 'postgres', 'init', '01-schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const testUrl = new URL(ADMIN_URL);
  testUrl.pathname = `/${TEST_DB}`;

  const testDb = new Client({ connectionString: testUrl.toString() });
  await testDb.connect();
  await testDb.query(schemaSql);
  await testDb.end();

  console.log(`Base de test ${TEST_DB} lista.`);
}

main().catch((error) => {
  console.error('No se pudo preparar la base de test. ¿Está corriendo `pnpm run db:up`?');
  console.error(error.message);
  process.exit(1);
});
