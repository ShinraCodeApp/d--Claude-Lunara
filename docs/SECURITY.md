# Lunara — Política de Seguridad

## Principios

1. **Privacy by Design** — los datos médicos son lo más sensible del sistema
2. **Defense in Depth** — múltiples capas de seguridad
3. **Least Privilege** — mínimos permisos necesarios
4. **Zero Trust** — verificar siempre, nunca asumir

---

## OWASP Top 10 — Mitigaciones Implementadas

### A01: Broken Access Control
- RBAC middleware en todos los endpoints
- Verificación de ownership en recursos (ej: ciclo pertenece al usuario)
- JWT con claims mínimos necesarios
- Separación total entre usuarios, premium y admin

### A02: Cryptographic Failures
- AES-256-GCM para datos médicos en reposo
- TLS 1.3 obligatorio en tránsito
- bcrypt (cost 12) para contraseñas
- Tokens JWT RS256 (en producción)
- AWS KMS para gestión de claves

### A03: Injection
- Prisma ORM con prepared statements (previene SQL injection)
- Validación estricta con Zod en todos los inputs
- Sanitización de HTML en notas de usuario
- Nunca concatenar strings en queries

### A04: Insecure Design
- Threat modeling previo al diseño
- Rate limiting por endpoint sensible
- Separación de responsabilidades por microservicio
- Audit logs para acciones críticas

### A05: Security Misconfiguration
- Helmet.js para headers de seguridad (HSTS, CSP, X-Frame-Options)
- Variables de entorno nunca hardcodeadas
- Swagger UI deshabilitado en producción
- Docker rootless (usuario no-root en contenedores)
- Dependabot para actualizaciones automáticas

### A06: Vulnerable Components
- npm audit en CI/CD pipeline
- GitHub Dependabot alerts
- Docker base images actualizadas (alpine)
- OWASP Dependency Check en CI

### A07: Authentication Failures
- Refresh token rotation con detección de reuse attacks
- Blacklist de tokens revocados en Redis
- Rate limiting estricto en endpoints de auth (10 req/15min)
- Bloqueo de cuenta tras 10 intentos fallidos (TODO)
- Password requirements: 8+ chars, upper+lower+number
- 2FA TOTP opcional

### A08: Data Integrity Failures
- Webhook signatures verificadas (RevenueCat HMAC)
- JWT signature verificada en cada request
- Prisma previene NoSQL injection por diseño

### A09: Logging & Monitoring
- Structured logging con Pino (JSON)
- Audit trail para: login, cambios de datos médicos, admin actions
- Sentry para error tracking
- DataDog para anomaly detection
- Alertas para: errores 500+ inusuales, picos de tráfico

### A10: SSRF
- Lista blanca de URLs permitidas para llamadas externas
- No seguir redirects en fetch calls
- Validación de IPs de entrada (no loopback, no RFC1918 en prod)

---

## GDPR Compliance

### Datos recopilados
| Dato | Base legal | Retención |
|------|-----------|-----------|
| Email | Contrato | Hasta eliminación |
| Datos ciclo | Consentimiento explícito | Hasta eliminación |
| Síntomas | Consentimiento explícito | Hasta eliminación |
| Logs de sesión | Interés legítimo | 30 días |
| Datos de pago | Obligación legal | 7 años |

### Derechos del usuario implementados
- **Derecho de acceso:** GET /users/data-export
- **Derecho al olvido:** DELETE /users/account (soft delete + hard delete en 30 días)
- **Portabilidad:** Exportación JSON de todos los datos
- **Rectificación:** PUT /users/profile
- **Oposición:** Configuración de notificaciones

### Consentimiento
- Aceptación explícita de T&C y Privacy Policy en registro
- Consentimiento específico para datos de salud
- Log de consentimiento en base de datos

### Medidas técnicas
- Datos encriptados (AES-256-GCM) a nivel de aplicación
- Pseudonimización donde es posible
- Minimización de datos
- Acceso admin con audit trail

---

## Encriptación de Datos Médicos

Los siguientes campos se encriptan con AES-256-GCM antes de almacenar en DB:

```
menstrual_cycles.notes
daily_logs.notes
mood_logs.notes
symptom_logs.notes
ai_messages.content
```

La clave de encriptación se gestiona con AWS KMS en producción.
En desarrollo, se usa una clave local en .env (ENCRYPTION_KEY).

---

## Token Security

### Access Token (JWT)
- Algoritmo: HS256 (dev) / RS256 (prod)
- Expiración: 15 minutos
- Claims: sub (userId), jti (unique ID)
- Blacklist en Redis para revocación inmediata

### Refresh Token (Opaque)
- 320 bits de entropía (40 bytes hex)
- HttpOnly cookie (no accesible desde JS)
- SameSite=Strict (previene CSRF)
- Rotación en cada uso
- Detección de reuse attack (revoca toda la familia)
- TTL: 30 días

---

## Penetration Testing

Antes del launch inicial y trimestral:
- OWASP ZAP automated scan
- Manual pentest por terceros
- Bug bounty program (futuro)

Scope del pentest:
- API endpoints
- Auth flows
- Mobile app (APK/IPA analysis)
- Admin panel
- Docker configurations

---

## Incident Response

### Niveles de severidad
- **P0 (Crítico):** Breach de datos médicos, sistema caído → Respuesta en 1 hora
- **P1 (Alto):** Vulnerabilidad de auth, datos expuestos → Respuesta en 4 horas
- **P2 (Medio):** Bug de seguridad sin explotación conocida → Respuesta en 24 horas
- **P3 (Bajo):** Mejoras de hardening → Respuesta en 1 semana

### Notificación GDPR
- Breach significativo → Notificar a autoridad en 72 horas
- Breach con riesgo para usuarios → Notificar a usuarios afectados
