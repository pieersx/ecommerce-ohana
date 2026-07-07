# Deploy Ohana Moments (AWS)

## Arquitectura en producción

- **App Runner** (`ohana-app`, us-east-1): un solo servicio con la imagen Docker de ECR.
  El backend Express sirve la API en `/api` y el frontend compilado (SPA) en `/`.
  HTTPS incluido: https://xkrncjbapq.us-east-1.awsapprunner.com
- **RDS PostgreSQL 16** (`ohana-db`, db.t4g.micro, 20GB gp3): base `ohana_moments`.
- **ECR** (`ohana-app`): imágenes Docker.
- **S3** (`ohana-uploads-717319160926`): imágenes subidas desde el panel admin y por
  clientes (`S3_UPLOADS_BUCKET`); lectura pública solo del prefijo `uploads/`.
- Roles IAM: `ohana-apprunner-ecr-access` (pull de ECR) y `ohana-apprunner-instance`
  (PutObject en el bucket de uploads).

Todas las credenciales reales están en `deploy/.env.production` (**gitignored**).

## Redeploy (después de cambios de código)

```bash
bash deploy/aws-deploy.sh
```

Hace: build de la imagen → push a ECR → `start-deployment` en App Runner.

## Variables del backend en producción

Configuradas como variables de entorno del servicio App Runner:

```bash
NODE_ENV=production
PORT=4000
SERVE_FRONTEND=true          # el backend sirve frontend/dist (mismo origen, sin CORS)
DATABASE_URL=...             # ver deploy/.env.production
JWT_SECRET=...               # ver deploy/.env.production
JWT_EXPIRES_IN=7d
PAYMENT_PROVIDER=external    # sin PAYMENT_CHECKOUT_BASE_URL => checkout simulado
S3_UPLOADS_BUCKET=ohana-uploads-717319160926
AWS_REGION=us-east-1
```

El frontend se compila dentro del Dockerfile con `VITE_API_URL=/api` (mismo origen).

## Base de datos

Sin migraciones de Prisma: el schema canónico + seed de Lima vive en
`docker/postgres/init/01-schema.sql`. Para (re)sembrar la base cloud:

```bash
docker exec -i ohana-postgres psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < docker/postgres/init/01-schema.sql
```

⚠️ El seed resetea las tablas. La contraseña del admin en producción ya NO es la del
seed: se actualizó a la de `deploy/.env.production` (variable `ADMIN_PASSWORD`).
Si vuelves a sembrar, vuelve a ejecutar el UPDATE del hash del admin.

## Notas de seguridad / producción

- No se almacenan datos de tarjeta; el pago con tarjeta requiere integrar un
  checkout externo (Culqi/Izipay/Mercado Pago) vía `PAYMENT_CHECKOUT_BASE_URL`.
- El security group del RDS permite 5432 desde internet (necesario para App Runner
  sin VPC connector). Mitigado con contraseña fuerte; mejora recomendada: VPC
  connector de App Runner + cerrar el SG.
- Rota `JWT_SECRET` y `ADMIN_PASSWORD` si se filtra `deploy/.env.production`.

## Costos aproximados (us-east-1)

- RDS db.t4g.micro + 20GB gp3: ~US$14/mes
- App Runner 1 vCPU / 2GB: ~US$10/mes en reposo + cómputo activo por uso
- S3/ECR: centavos

Para pausar gastos: `aws rds stop-db-instance --db-instance-identifier ohana-db` y
`aws apprunner pause-service --service-arn <ARN>`.
