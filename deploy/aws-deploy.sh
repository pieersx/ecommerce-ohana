#!/usr/bin/env bash
# Redespliega Ohana Moments a AWS App Runner.
# Uso: bash deploy/aws-deploy.sh
set -euo pipefail

REGION=us-east-1
ACCOUNT=717319160926
ECR_REPO=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/ohana-app
SERVICE_NAME=ohana-app

cd "$(dirname "$0")/.."

echo "==> Build de imagen"
docker build --platform linux/amd64 -t ohana-app:latest .

echo "==> Push a ECR"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
docker tag ohana-app:latest "$ECR_REPO:latest"
docker push "$ECR_REPO:latest"

echo "==> Nuevo deployment en App Runner"
SERVICE_ARN=$(aws apprunner list-services --region $REGION \
  --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" --output text)
aws apprunner start-deployment --service-arn "$SERVICE_ARN" --region $REGION

echo "==> Listo. Sigue el estado con:"
echo "aws apprunner describe-service --service-arn $SERVICE_ARN --query 'Service.Status'"
