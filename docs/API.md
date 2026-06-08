# Lunara API — Documentación Completa v1.0

**Base URL:** `https://api.lunara.app/api/v1`  
**Auth:** Bearer JWT (header `Authorization: Bearer <token>`)

---

## Autenticación

### POST /auth/register
Registro de nueva usuaria.
```json
{
  "email": "luna@example.com",
  "password": "SecurePass123!",
  "firstName": "Luna",
  "acceptTerms": true
}
```
**Respuesta:** `{ accessToken, refreshToken, user, isNewUser }`

### POST /auth/login
```json
{ "email": "luna@example.com", "password": "..." }
```
**Respuesta:** `{ accessToken, user }` + cookie HttpOnly `refreshToken`

### POST /auth/google
```json
{ "idToken": "GOOGLE_ID_TOKEN" }
```

### POST /auth/apple
```json
{
  "identityToken": "APPLE_IDENTITY_TOKEN",
  "authorizationCode": "...",
  "fullName": { "givenName": "Luna", "familyName": "García" }
}
```

### POST /auth/refresh
Rota el refresh token. Token en cookie HttpOnly.

### POST /auth/logout
Revoca el refresh token actual.

### GET /auth/me
Devuelve el usuario autenticado.

### POST /auth/forgot-password
```json
{ "email": "luna@example.com" }
```

### POST /auth/reset-password
```json
{ "token": "...", "password": "NewSecurePass!" }
```

---

## Ciclos Menstruales

### GET /cycles
Lista ciclos (paginado).  
Query: `?limit=12&offset=0`

### GET /cycles/current
Estado actual del ciclo + predicción activa.

**Respuesta:**
```json
{
  "activeCycle": { "id": "...", "startDate": "2024-06-01" },
  "prediction": {
    "predictedStartDate": "2024-06-28",
    "ovulationDate": "2024-06-14",
    "fertilityWindowStart": "2024-06-09",
    "fertilityWindowEnd": "2024-06-15",
    "confidence": 0.85
  },
  "dayOfCycle": 7,
  "phase": "follicular"
}
```

### POST /cycles
Iniciar período.
```json
{ "startDate": "2024-06-01", "notes": "Opcional" }
```

### PUT /cycles/:id/end
```json
{ "endDate": "2024-06-06" }
```

### POST /cycles/:id/bleeding
```json
{
  "date": "2024-06-02",
  "intensity": "MEDIUM",
  "notes": "Opcional"
}
```
Intensidades: `SPOTTING | LIGHT | MEDIUM | HEAVY | VERY_HEAVY`

### GET /cycles/calendar?year=2024&month=6
Vista de calendario con días marcados.

### GET /cycles/stats
Estadísticas del ciclo: promedio, variabilidad, regularidad.

---

## Predicciones

### GET /predictions/current
Predicción activa con puntuaciones de fertilidad diaria.

### GET /predictions/history
Historial de predicciones.

### GET /predictions/fertility-score
Puntuaciones de fertilidad diaria (0-100) para el ciclo actual.

---

## Síntomas y Bienestar

### GET /symptoms
Lista de síntomas disponibles por categoría.

### POST /symptoms/log
```json
{
  "date": "2024-06-02",
  "symptomId": "uuid",
  "intensity": "MODERATE",
  "notes": "Opcional"
}
```
Intensidades: `MILD | MODERATE | SEVERE`

### GET /symptoms/logs
Historial de síntomas.  
Query: `?startDate=2024-01-01&endDate=2024-06-30`

### POST /symptoms/mood
```json
{
  "date": "2024-06-02",
  "mood": "HAPPY",
  "intensity": 4
}
```
Moods: `HAPPY | SAD | ANXIOUS | STRESSED | MOTIVATED | RELAXED | IRRITABLE | NEUTRAL | EMOTIONAL | ENERGETIC | TIRED`

### POST /symptoms/daily-log
Log diario completo (XP + racha).
```json
{
  "date": "2024-06-02",
  "energyLevel": 4,
  "sleepHours": 7.5,
  "sleepQuality": 4,
  "libido": 3
}
```

---

## Jardín Lunar (Gamificación)

### GET /garden
Estado completo del jardín, wallet de cristales, racha y logros recientes.

### POST /garden/rewarded-video
Reclamar cristales por video recompensado.
```json
{ "adUnitId": "ca-app-pub-..." }
```
**Respuesta:** `{ crystalsEarned: 15 }`

### POST /garden/customize
```json
{
  "background": "luna_night",
  "decorations": ["starflower", "moon_crystal"],
  "mascotAccessory": "crown"
}
```

### GET /garden/achievements
Lista de todos los logros con estado (bloqueado/desbloqueado).

---

## IA — Chat Luna

### POST /ai/chat
```json
{
  "messages": [
    { "role": "user", "content": "¿Qué síntomas son normales durante la ovulación?" }
  ],
  "cycleContext": {
    "day_of_cycle": 14,
    "phase": "ovulatory",
    "avg_cycle_length": 28
  }
}
```
**Respuesta:** `{ content, tokens, remainingToday }`

**Límites:** Free: 20/día | Premium: 200/día

### GET /ai/chats
Historial de conversaciones.

### GET /ai/chats/:id
Mensajes de una conversación específica.

### POST /ai/analyze (PREMIUM)
Análisis de patrones del ciclo con IA.

### POST /ai/monthly-insight (PREMIUM)
```json
{ "year": 2024, "month": 6 }
```

---

## Suscripciones

### GET /subscriptions/status
Estado actual de la suscripción.

### POST /subscriptions/webhook
Webhook de RevenueCat (configurar en dashboard RevenueCat).

### POST /subscriptions/restore
```json
{
  "platform": "ios",
  "revenuecatUserId": "rc_user_id"
}
```

---

## Notificaciones

### POST /notifications/register-device
```json
{
  "fcmToken": "FCM_TOKEN",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

### GET /notifications/settings
### PUT /notifications/settings
```json
{
  "periodReminder": true,
  "periodReminderDays": 2,
  "ovulationReminder": true,
  "dailyLogReminder": true,
  "dailyLogTime": "20:00"
}
```

### GET /notifications
Lista de notificaciones.

### POST /notifications/:id/read
### POST /notifications/read-all

---

## Informes PDF (PREMIUM)

### GET /reports
Lista de informes generados.

### POST /reports/monthly
```json
{ "year": 2024, "month": 6 }
```

### POST /reports/annual
```json
{ "year": 2024 }
```

### GET /reports/:id/download
URL firmada de S3 (válida 1 hora).

---

## Bienestar

### GET /wellness/content
Contenido de bienestar por tipo.  
Query: `?type=tip|meditation|recipe|exercise`

### GET /wellness/energy-map
Mapa de energía según la fase actual del ciclo.

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Request inválido |
| 401 | No autorizado / token expirado |
| 403 | Sin permisos / función premium |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email ya registrado) |
| 422 | Datos de validación incorrectos |
| 429 | Rate limit excedido |
| 500 | Error interno del servidor |

---

## Rate Limits

| Endpoint | Límite |
|---------|--------|
| General | 100 req/min |
| POST /auth/login | 10 req/15min |
| POST /auth/forgot-password | 5 req/15min |
| POST /ai/chat (Free) | 20 msg/día |
| POST /ai/chat (Premium) | 200 msg/día |
