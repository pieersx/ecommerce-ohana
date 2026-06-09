require('dotenv').config();

const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

async function startServer() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');

    app.listen(env.port, () => {
      console.log(`Backend listo en http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL.', error);
    process.exit(1);
  }
}

startServer();
