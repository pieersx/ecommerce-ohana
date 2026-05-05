require('dotenv').config();

const app = require('./app');
const prisma = require('./config/prisma');

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');

    app.listen(PORT, () => {
      console.log(`Backend listo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL.', error);
    process.exit(1);
  }
}

startServer();
