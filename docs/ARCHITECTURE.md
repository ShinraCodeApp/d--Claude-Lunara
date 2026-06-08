# Lunara by ShinraCode — Arquitectura Completa

## Visión General del Sistema

Lunara es una plataforma de salud femenina de nivel enterprise diseñada para escalar a millones de usuarias. La arquitectura sigue un patrón de microservicios con API Gateway centralizado.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Mobile (iOS + Android) | React Native + Expo SDK 51 | Cross-platform, rendimiento nativo, ecosistema maduro |
| Backend API | Node.js 20 + TypeScript + Fastify | Alta performance, tipado estricto, async I/O |
| ORM | Prisma 5 | Type-safe, migraciones automáticas, multi-DB |
| Database Primaria | PostgreSQL 16 | ACID, relaciones complejas, extensiones avanzadas |
| Cache / Sesiones | Redis 7 | Ultra-rápido, pub/sub, sesiones distribuidas |
| Servicio IA | Python 3.11 + FastAPI + OpenAI | ML ecosystem, async, OpenAI integration |
| Admin Panel | Next.js 14 + Tailwind + shadcn/ui | SSR, rendimiento, componentes accesibles |
| Auth | JWT + OAuth2 Google + Apple Sign-In | Estándar industria, refresh tokens seguros |
| Push Notifications | Firebase Cloud Messaging + APNs | Cobertura total Android + iOS |
| Pagos | RevenueCat | Maneja Google Play Billing + Apple IAP |
| Storage | AWS S3 + CloudFront CDN | Escalable, global, bajo costo |
| Cloud | AWS (ECS Fargate, RDS, ElastiCache) | Enterprise, HA, auto-scaling |
| Contenedores | Docker + Docker Compose | Portabilidad, reproducibilidad |
| CI/CD | GitHub Actions | Automatización completa |
| Monitoreo | Sentry + DataDog | Error tracking + métricas |
| Testing | Jest + Supertest + Detox | Cobertura completa |

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTES                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  App Android │  │   App iOS    │  │  Admin Panel Web │  │
│  │(React Native)│  │(React Native)│  │   (Next.js 14)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼──────────────────  ┼────────────┘
          │                │                    │
          └────────────────┼────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    AWS CloudFront CDN                        │
│              (WAF + DDoS Protection + TLS 1.3)              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  API GATEWAY (Fastify)                       │
│           Rate Limiting · Auth Middleware · CORS             │
│                   Load Balancer (ALB)                        │
└────┬──────────────┬──────────────────┬─────────────────┬────┘
     │              │                  │                 │
     ▼              ▼                  ▼                 ▼
┌─────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐
│  Auth   │  │  Cycle API  │  │  AI Service  │  │  Admin   │
│ Service │  │  & Health   │  │  (FastAPI)   │  │  Service │
│(Node.js)│  │  (Node.js)  │  │  (Python)    │  │(Node.js) │
└────┬────┘  └──────┬──────┘  └──────┬───────┘  └────┬─────┘
     │              │                │               │
     └──────────────┴────────────────┴───────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐   ┌────────────────────────┐
│   PostgreSQL 16     │   │      Redis 7            │
│   (AWS RDS)         │   │   (AWS ElastiCache)     │
│   Primary DB        │   │   Cache · Sessions      │
│   + Read Replicas   │   │   Pub/Sub · Rate Limit  │
└─────────────────────┘   └────────────────────────┘

              External Services:
┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐
│Firebase │  │RevenueCat│  │OpenAI  │  │AWS S3    │
│FCM/APNs │  │Billing   │  │API     │  │Storage   │
└─────────┘  └──────────┘  └────────┘  └──────────┘
```

---

## Estructura del Monorepo

```
lunara/
├── apps/
│   ├── mobile/                    # React Native + Expo
│   │   ├── src/
│   │   │   ├── api/               # API clients y hooks
│   │   │   ├── components/        # Componentes reutilizables
│   │   │   │   ├── ui/            # Primitivos UI (Button, Card, etc.)
│   │   │   │   ├── cycle/         # Componentes del ciclo
│   │   │   │   ├── garden/        # Jardín Lunar
│   │   │   │   └── ai/            # Chat IA
│   │   │   ├── screens/           # Pantallas
│   │   │   │   ├── auth/          # Login, Registro, Onboarding
│   │   │   │   ├── dashboard/     # Home principal
│   │   │   │   ├── cycle/         # Calendario y registro
│   │   │   │   ├── insights/      # Estadísticas y gráficas
│   │   │   │   ├── wellness/      # Bienestar y meditación
│   │   │   │   ├── garden/        # Jardín Lunar gamificación
│   │   │   │   ├── ai-chat/       # Chat con IA
│   │   │   │   ├── profile/       # Perfil usuario
│   │   │   │   ├── premium/       # Suscripción premium
│   │   │   │   └── settings/      # Configuración
│   │   │   ├── navigation/        # React Navigation v6
│   │   │   ├── store/             # Zustand state management
│   │   │   ├── hooks/             # Custom hooks
│   │   │   ├── theme/             # Tokens, colores, tipografía
│   │   │   ├── utils/             # Utilidades y helpers
│   │   │   └── assets/            # Imágenes, fuentes, animaciones
│   │   ├── android/
│   │   ├── ios/
│   │   └── package.json
│   │
│   ├── admin/                     # Next.js 14 Panel Admin
│   │   ├── src/
│   │   │   ├── app/               # App Router
│   │   │   ├── components/        # Componentes admin
│   │   │   ├── lib/               # Utilities
│   │   │   └── services/          # API calls
│   │   └── package.json
│   │
│   └── web/                       # Landing page (Next.js)
│
├── services/
│   ├── api/                       # Backend principal Node.js
│   │   ├── src/
│   │   │   ├── config/            # Configuración global
│   │   │   ├── modules/           # Módulos por dominio
│   │   │   │   ├── auth/          # Autenticación
│   │   │   │   ├── users/         # Usuarios
│   │   │   │   ├── cycles/        # Ciclos menstruales
│   │   │   │   ├── symptoms/      # Síntomas
│   │   │   │   ├── predictions/   # Motor de predicciones
│   │   │   │   ├── wellness/      # Bienestar
│   │   │   │   ├── garden/        # Jardín Lunar
│   │   │   │   ├── notifications/ # Push notifications
│   │   │   │   ├── subscriptions/ # RevenueCat
│   │   │   │   ├── ai/            # Integración IA
│   │   │   │   ├── reports/       # Informes PDF
│   │   │   │   └── admin/         # Panel admin APIs
│   │   │   ├── middleware/        # Auth, rate limit, CORS, security
│   │   │   ├── plugins/           # Fastify plugins
│   │   │   ├── utils/             # Helpers
│   │   │   └── server.ts          # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Esquema completo DB
│   │   │   └── migrations/        # Migraciones
│   │   └── package.json
│   │
│   └── ai/                        # Python FastAPI IA Service
│       ├── app/
│       │   ├── routers/           # Endpoints
│       │   ├── services/          # Lógica IA
│       │   ├── models/            # Pydantic models
│       │   └── main.py            # Entry point
│       └── requirements.txt
│
├── packages/
│   ├── shared-types/              # TypeScript types compartidos
│   ├── ui-components/             # Design system compartido
│   └── prediction-engine/         # Algoritmos de predicción (TS)
│
├── infrastructure/
│   ├── terraform/                 # IaC AWS
│   ├── k8s/                       # Kubernetes manifests (futuro)
│   └── scripts/                   # Deploy scripts
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.ai
│   └── Dockerfile.admin
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/                 # CI/CD pipelines
├── docs/
│   ├── ARCHITECTURE.md            # Este documento
│   ├── API.md                     # Documentación API
│   ├── DATABASE.md                # Esquema base de datos
│   ├── DEPLOYMENT.md              # Guía de despliegue
│   ├── SECURITY.md                # Políticas de seguridad
│   └── USER_MANUAL.md             # Manual de usuario
└── package.json                   # Root workspace
```

---

## Módulos del Sistema

### 1. Módulo de Autenticación
- Registro con email/contraseña
- OAuth2 Google Sign-In
- Apple Sign-In (requerido por App Store)
- JWT access tokens (15 min) + refresh tokens (30 días)
- Rotación automática de refresh tokens
- Blacklist en Redis para logout/revocación
- 2FA opcional (TOTP)

### 2. Motor de Predicciones
Algoritmo basado en:
- Regresión lineal ponderada (últimos 6 ciclos)
- Método del calendario (Ogino-Knaus adaptado)
- Ajuste dinámico por irregularidades
- Ventana fértil: día ovulación ± 5 días
- Confianza estadística expresada como porcentaje

### 3. Sistema de Gamificación — Jardín Lunar
Niveles de evolución:
- 🌱 Semilla (0-99 XP)
- 🌿 Brote (100-299 XP)
- 🌸 Flor (300-599 XP)
- 🌕 Jardín Lunar Completo (600+ XP)

Fuentes de XP:
- Registro diario: 10 XP
- Registro completo (síntomas + estado): 20 XP
- Racha de 7 días: 50 XP bonus
- Ciclo completo registrado: 30 XP
- Ver tutorial: 5 XP
- Video recompensado: 15 Cristales

### 4. Cristales Lunares (Moneda Virtual)
- No comprable directamente (ética)
- Ganados por logros y videos recompensados
- Canjeados por: temas, fondos, avatares, decoraciones jardín, accesorios mascota
- Nunca bloquean funciones médicas

### 5. Sistema de Suscripciones
- Free: funciones básicas + anuncios AdMob
- Premium Mensual: $4.99/mes
- Premium Anual: $34.99/año ($2.92/mes, ahorro 42%)
- Trial: 7 días gratis con Premium
- RevenueCat maneja entitlements cross-platform

### 6. IA de Salud Femenina
- Modelo: GPT-4o con system prompt especializado
- Context window: historial de ciclo del usuario
- Limitaciones claras: no diagnóstico médico
- Disclaimer obligatorio en cada respuesta
- Rate limiting: 20 mensajes/día (free), ilimitado (premium)

---

## Seguridad

### OWASP Top 10 Mitigaciones
1. **Injection**: Prisma ORM (prepared statements), validación Zod
2. **Broken Auth**: JWT corta duración, refresh rotation, bcrypt cost 12
3. **Sensitive Data**: AES-256-GCM para datos médicos, TLS 1.3
4. **XXE**: Deshabilitado en parsers
5. **Broken Access Control**: RBAC middleware en todos los endpoints
6. **Security Misconfiguration**: Helmet.js, headers seguros
7. **XSS**: Content Security Policy, sanitización inputs
8. **Insecure Deserialization**: Validación estricta con Zod
9. **Components with Vulnerabilities**: Dependabot + npm audit CI
10. **Insufficient Logging**: Structured logging, audit trail

### GDPR Compliance
- Consentimiento explícito al registro
- Right to be forgotten: eliminación completa en 30 días
- Data portability: exportación JSON de datos personales
- Data minimization: solo datos necesarios
- Privacy policy y Terms of Service
- DPO designado en panel admin

### Encriptación de Datos Médicos
- En reposo: columnas sensibles con pgcrypto (AES-256)
- En tránsito: TLS 1.3 obligatorio
- Datos de ciclo, síntomas, notas: encriptados a nivel columna
- Backups encriptados con AWS KMS

---

## Performance

### Targets de SLA
- API response time P99: < 200ms
- App startup time: < 2s
- Offline support: datos últimos 3 meses en SQLite local
- Sync en background cuando hay conectividad
- Cache Redis: TTL 5 min para predicciones, 1h para contenido estático

### Escalabilidad
- Horizontal: ECS Fargate auto-scaling (2-20 instancias)
- DB: RDS PostgreSQL con read replicas
- CDN: CloudFront para assets estáticos
- Queue: SQS para emails y notificaciones diferidas

---

## Flujo de Datos — Predicción de Ciclo

```
Usuario registra período
        ↓
API recibe POST /cycles
        ↓
Validación Zod + Auth middleware
        ↓
Guardar en PostgreSQL (tabla cycles)
        ↓
Trigger: Recalcular predicciones
        ↓
Prediction Engine (TypeScript)
    - Consulta últimos 6 ciclos
    - Calcula duración promedio ponderada
    - Calcula varianza (irregularidad)
    - Determina próxima menstruación
    - Calcula ventana fértil
    - Genera probabilidad de ovulación diaria
        ↓
Guardar predicciones en PostgreSQL
        ↓
Invalidar cache Redis usuario
        ↓
Respuesta con predicciones actualizadas
        ↓
Schedule notificaciones push (FCM/APNs)
```

---

## APIs Externas Integradas

| Servicio | Uso | SDK |
|---------|-----|-----|
| OpenAI GPT-4o | Chat IA salud | openai npm |
| Firebase FCM | Notificaciones Android | firebase-admin |
| APNs | Notificaciones iOS | node-apn |
| RevenueCat | Suscripciones | react-native-purchases |
| Google Sign-In | OAuth móvil | @react-native-google-signin |
| Apple Sign-In | OAuth iOS | @invertase/react-native-apple-authentication |
| AWS S3 | Storage | @aws-sdk/client-s3 |
| Sentry | Error tracking | @sentry/react-native |
| Google AdMob | Anuncios (free tier) | react-native-google-mobile-ads |

---

## Versioning y Releases

- Versionado semántico: MAJOR.MINOR.PATCH
- Branch strategy: GitFlow (main, develop, feature/*, hotfix/*, release/*)
- API versioning: URL path (/api/v1/, /api/v2/)
- Backward compatible por 2 versiones mínimo
- Changelogs automáticos con conventional commits
