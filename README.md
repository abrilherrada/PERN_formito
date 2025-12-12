# Formito Backend

## Flujo de autenticación

1. **Login (`POST /api/auth/login`)**
   - Devuelve un access token JWT corto (Authorization `Bearer`).
   - Emite un refresh token persistido como cookie `formito_refresh` (HttpOnly, SameSite=Lax y Secure en producción).
2. **Acceso a recursos protegidos**
   - Se envía el access token en `Authorization: Bearer <token>`.
   - Un middleware (`verifyToken`) invalida tokens vencidos, de usuarios suspendidos/eliminados y cualquier token emitido antes de la última actualización sensible (`credentialsUpdatedAt`).
3. **Rotación del refresh (`POST /api/auth/refresh`)**
   - Acepta cookie o body `{ refreshToken }`.
   - Valida que la sesión no esté revocada/expirada, genera nuevo access + refresh, marca el token anterior con `revokedReason="ROTATED"` y enlaza el nuevo.
4. **Logout (`POST /api/auth/logout`)**
   - Identificador vía cookie, body o `sessionTokenId`.
   - Revoca la sesión con motivo `LOGOUT` y limpia la cookie.
   - Si se usa `sessionTokenId` debe enviarse un access token válido; se verifica propiedad/admin mediante `ensureSessionOwnership`.
5. **Flujos sensibles**
   - Reseteo de contraseña, cambios de credenciales, suspensiones o eliminaciones actualizan `credentialsUpdatedAt` y revocan todas las sesiones con el motivo correspondiente.
   - Cualquier access token emitido antes de esa marca se rechaza con `TOKEN_STALE`.

### Política de contraseñas

- Longitud mínima: 10 caracteres.
- Debe incluir al menos una letra minúscula, una mayúscula, un número y un carácter especial.
- En un reset de contraseña, el backend rechaza reutilizar la contraseña actual y responde con código `AUTH_PASSWORD_REUSED`.

### Endpoints relacionados

| Endpoint                                         | Expectativas                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `POST /api/auth/login`                           | Devuelve access token + cookie de refresh.                             |
| `POST /api/auth/refresh`                         | Requiere refresh token (cookie o body).                                |
| `POST /api/auth/logout`                          | Identificador vía cookie/body; `sessionTokenId` requiere access token. |
| `GET /api/users/me`                              | Requiere access token vigente.                                         |
| `PATCH /api/users/me`                            | Cambios que afecten credenciales revocan sesiones automáticamente.     |
| `PATCH /api/users/:id` / `DELETE /api/users/:id` | Flujos administrativos con revocación y marca de timestamp.            |

## Uso de cookies con Axios (frontend)

El refresh token vive en una cookie HttpOnly, por lo que el frontend debe enviar credenciales en las llamadas a `/api/auth/refresh` y `/api/auth/logout` (cuando depende de la cookie).

### Configuración global recomendada

```js
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true; // envía cookies cross-site cuando SameSite lo permite
```

### Configuración por petición

Si preferís hacerlo de forma puntual:

```js
await axios.post("/api/auth/refresh", {}, { withCredentials: true });
```

Asegurate también de que las solicitudes autenticadas incluyan el access token vigente:

```js
const api = axios.create({
 baseURL: import.meta.env.VITE_API_URL,
 withCredentials: true,
});

api.interceptors.request.use((config) => {
 const token = authStore.getState().accessToken;
 if (token) {
  config.headers.Authorization = `Bearer ${token}`;
 }
 return config;
});
```

> Nota: al desplegar, la cookie `Secure` requiere HTTPS y el dominio debe estar dentro de los permitidos por CORS.

## Rate limiting

Todos los endpoints sensibles usan `express-rate-limit` con un `MemoryStore` en cada proceso. Esto significa que:

- Los contadores se resetean automáticamente cuando se reinicia la instancia.
- En un despliegue con múltiples réplicas, cada proceso llevaría su propio conteo; para un store compartido habría que evaluar una solución centralizada más adelante.

### Límites actuales

| Endpoint / Contexto                             | Clave de rate limit             | Ventana    | Límite | Comentarios                                         |
| ----------------------------------------------- | ------------------------------- | ---------- | ------ | --------------------------------------------------- |
| `POST /api/auth/login` (por IP)                 | IP                              | 15 minutos | 10     | Combina con el limitador por cuenta.                |
| `POST /api/auth/login` (por cuenta)             | `login-account:<email>`         | 15 minutos | 5      | Solo cuenta intentos fallidos y bloquea al usuario. |
| `POST /api/auth/register`                       | IP                              | 1 hora     | 5      | Evita registros masivos desde la misma IP.          |
| `POST /api/auth/reset-password` (por email)     | `password-reset:<email>`        | 10 minutos | 1      | Fuerza un enfriamiento entre envíos.                |
| `POST /api/auth/reset-password` (por IP)        | IP                              | 1 hora     | 3      | Cubre intentos de fuerza bruta por IP.              |
| `POST /api/auth/resend-verification` (cooldown) | `verification-cooldown:<email>` | 2 minutos  | 1      | Evita spam inmediato al mismo correo.               |
| `POST /api/auth/resend-verification` (hourly)   | `verification-hour:<email>`     | 1 hora     | 5      | Limita envíos reiterados al mismo correo.           |
| `POST /api/auth/resend-verification` (por IP)   | IP                              | 1 hora     | 20     | Controla abuso desde una misma IP.                  |
| `POST /api/auth/refresh`                        | IP                              | 1 minuto   | 20     | Protege contra abuso de refresh tokens.             |
| `POST /api/auth/logout`                         | IP                              | 1 minuto   | 20     | Evita floods de logout.                             |
| `POST /api/forms/:formId` (por formulario)      | `<formId>:<ip>`                 | 1 minuto   | 10     | Limita envíos repetidos a un mismo formulario.      |
| `POST /api/forms/:formId` (global por IP)       | IP                              | 1 hora     | 100    | Limita envíos globales desde una IP.                |

### Respuesta cuando se excede el límite

Los limitadores devuelven `HTTP 429` con el body uniforme:

```json
{
 "message": "Too many login attempts from this IP. Please wait 15 minutes.",
 "code": "RATE_LIMIT_EXCEEDED",
 "retryAfter": 900
}
```

- `message` describe el motivo (personalizado por endpoint).
- `code` siempre es `RATE_LIMIT_EXCEEDED`.
- `retryAfter` se envía en segundos cuando la información está disponible. También se incluye el header `Retry-After`.

El frontend debe manejar `429` mostrando el mensaje y, opcionalmente, un contador basado en `retryAfter`.

## Purga de datos eliminados

Para ejecutar la limpieza de registros soft-deleted después del período de retención:

```bash
npm run purge:soft-deleted
```

Este comando ejecuta el servicio `purgeSoftDeletedEntitiesService`, que:

- Anonimiza usuarios, correos, formularios y submissions que lleven más de 30 días en estado `DELETED`.
- Elimina los tokens de verificación asociados.
- Devuelve un resumen en consola con la cantidad de recursos procesados.
