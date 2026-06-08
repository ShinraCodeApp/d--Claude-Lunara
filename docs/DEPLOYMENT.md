# Lunara — Guía de Despliegue

## Requisitos Previos

- Docker 24+ y Docker Compose 2.20+
- Node.js 20+ y Yarn 1.22+
- Python 3.11+ (para servicio IA)
- Cuenta AWS (ECS, RDS, ElastiCache, S3)
- Cuenta Firebase (Cloud Messaging)
- Cuenta RevenueCat (billing)
- Cuenta OpenAI (API key)
- Cuenta EAS (Expo Application Services)

---

## Desarrollo Local

### 1. Clonar y configurar

```bash
git clone https://github.com/shinracode/lunara.git
cd lunara
cp .env.example .env
# Editar .env con tus valores
```

### 2. Iniciar servicios con Docker

```bash
# Servicios base (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Verificar health
docker-compose ps
```

### 3. Backend API

```bash
cd services/api
yarn install
yarn prisma:generate
yarn prisma:migrate    # Crea tablas
yarn prisma:seed       # Datos iniciales
yarn dev               # http://localhost:3000
# Swagger: http://localhost:3000/docs
```

### 4. Servicio IA

```bash
cd services/ai
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# http://localhost:8000/docs
```

### 5. Panel Admin

```bash
cd apps/admin
yarn install
yarn dev  # http://localhost:3001
```

### 6. App Móvil

```bash
cd apps/mobile
yarn install
npx expo start
# Escanear QR con Expo Go
# O: yarn android / yarn ios
```

---

## Despliegue con Docker Compose

```bash
# Levantar todo
docker-compose up -d

# Con herramientas de desarrollo (pgAdmin, Redis Commander)
docker-compose --profile tools up -d

# Ver logs
docker-compose logs -f api
docker-compose logs -f ai-service

# Parar
docker-compose down
```

---

## Despliegue en AWS (Producción)

### Infraestructura requerida

```
AWS Account
├── VPC con subnets privadas y públicas
├── RDS PostgreSQL 16 (Multi-AZ)
├── ElastiCache Redis 7 (cluster mode)
├── ECS Fargate (3 servicios: api, ai, admin)
├── ALB (Application Load Balancer)
├── CloudFront CDN
├── S3 (assets y reportes)
├── Route 53 (DNS)
├── ACM (certificados SSL)
├── ECR (container registry)
├── SES (emails)
└── KMS (encryption keys)
```

### Variables de entorno en AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name lunara/production \
  --secret-string file://.env
```

### Deploy Pipeline (GitHub Actions)

Los pushes a `main` activan el deploy automático:
1. Tests (API + IA)
2. Build Docker images
3. Push a ECR
4. Blue/Green deploy en ECS
5. Notificación Slack

---

## Publicación en Stores

### Android (Google Play)

```bash
cd apps/mobile

# Build AAB
eas build --platform android --profile production

# Submit
eas submit --platform android --latest
```

**Checklist Google Play:**
- [ ] App icon 512x512 PNG
- [ ] Feature graphic 1024x500
- [ ] Screenshots (teléfono + tablet)
- [ ] Privacy Policy URL
- [ ] Content rating (completar cuestionario)
- [ ] Configurar RevenueCat en Google Play Console
- [ ] SHA-1 fingerprint para OAuth

### iOS (App Store)

```bash
# Build IPA
eas build --platform ios --profile production

# Submit
eas submit --platform ios --latest
```

**Checklist App Store:**
- [ ] Apple Developer Program ($99/año)
- [ ] App Store Connect configurado
- [ ] Capacidades: Push Notifications, Sign In with Apple
- [ ] Privacy Nutrition Label (datos de salud)
- [ ] Age rating: 12+
- [ ] RevenueCat configurado con SharedSecret

---

## Base de Datos — Migraciones

```bash
# Generar nueva migración
yarn workspace @lunara/api prisma migrate dev --name nombre_migracion

# Aplicar en producción (CI/CD lo hace automáticamente)
yarn workspace @lunara/api prisma migrate deploy

# Ver estado de migraciones
yarn workspace @lunara/api prisma migrate status
```

---

## Monitoreo

### Sentry — Error Tracking
- Dashboard: sentry.io/shinracode/lunara
- Alertas configuradas para errores 500+

### DataDog — APM y Métricas
- API response times
- Error rates
- DB query performance
- Custom metrics: ciclos registrados/día, AI messages/día

### Health Checks
- API: `GET /health`
- AI Service: `GET /health`
- Admin: `GET /api/health`

---

## Backups

### PostgreSQL
- RDS automated backups: 7 días de retención
- Snapshots manuales antes de migraciones mayores
- Backups encriptados con AWS KMS

### Redis
- ElastiCache automático con AOF persistence

### S3
- Versionado activado en bucket de assets
- Cross-region replication para PDFs de reportes

---

## Seguridad — Checklist Producción

- [ ] Todos los secretos en AWS Secrets Manager
- [ ] TLS 1.3 obligatorio (CloudFront + ALB)
- [ ] WAF rules configuradas (SQL injection, XSS, rate limit)
- [ ] VPC sin acceso público a RDS y Redis
- [ ] IAM roles con least privilege
- [ ] CloudTrail activado
- [ ] GuardDuty activado
- [ ] Dependabot activado en GitHub
- [ ] npm audit en CI/CD
- [ ] OWASP ZAP en staging
- [ ] Penetration testing antes del launch
