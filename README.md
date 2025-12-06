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

## Purga de datos eliminados

Para ejecutar la limpieza de registros soft-deleted después del período de retención:

```bash
npm run purge:soft-deleted
```

Este comando ejecuta el servicio `purgeSoftDeletedEntitiesService`, que:

- Anonimiza usuarios, correos, formularios y submissions que lleven más de 30 días en estado `DELETED`.
- Elimina los tokens de verificación asociados.
- Devuelve un resumen en consola con la cantidad de recursos procesados.
