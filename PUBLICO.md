# Política de retención y purga de datos

Nuestra política de retención garantiza que los datos eliminados por los usuarios se traten en concordancia con los plazos legales y con la expectativa de privacidad.

## Ventana de retención

- Los recursos marcados con estado `DELETED` permanecen 30 días en retención suave.
- Transcurrido ese plazo, el comando de purga elimina o anonimiza definitivamente la información sensible.

## Alcance de la purga

Al cumplirse los 30 días desde la eliminación suave, el servicio de purga afecta a los siguientes recursos relacionados con la cuenta:

| Recurso         | Acción                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Usuarios**    | Anonimización de nombre y correo principal; marca `purgedAt`.                                   |
| **User emails** | Anonimización de correos secundarios asociados; marca `purgedAt`.                               |
| **Formularios** | Anonimización de nombre y correo de destino; se marcan como `DELETED` y se registra `purgedAt`. |
| **Submissions** | Se purga el contenido (`data`), se conserva metadata anónima y se marca `purgedAt`.             |
| **Tokens**      | Tokens de verificación vinculados al usuario o a sus correos se eliminan de forma definitiva.   |

> Nota: si se purga un usuario, se fuerza la purga de todos sus formularios y submissions asociadas, sin importar que todavía no hayan cumplido el plazo individual.

## Estrategia de anonimización

Los campos personales se transforman de la siguiente manera:

- **Correos electrónicos** (usuario principal y secundarios): se reemplazan por direcciones sintéticas con el formato `anon-<hash>@PURGE_PLACEHOLDER_DOMAIN`. El hash se deriva mediante SHA-256 y un `PURGE_HASH_SALT` privado, lo que impide reconstruir el valor original.
- **Nombre de usuario**: se reemplaza por el literal `"Anonymized User"`.
- **Nombre de formulario**: se reemplaza por `"Anonymized Form"`.
- **Correo de destino del formulario**: se trata igual que los correos de usuario (`anon-<hash>@...`).
- **Submissions**: el campo `data` se borra y se genera una `metadata` neutral con: cantidad de campos (`fieldCount`), tamaño del payload (`payloadSize`), hash de las claves de los campos (`keysHash`, generado con la misma estrategia con sal) y un indicador `containsFile`. Esta metadata permite conservar estadísticas globales sin exponer contenido identificable.

## Seguridad de la nueva representación

- Los hashes son deterministas para el mismo valor de entrada, lo que permite identificar duplicados en análisis agregados, pero son irreversibles para terceros gracias a la sal privada.
- Las direcciones sintéticas conservan un formato válido, evitando errores de validación en las integraciones existentes.
- Los recursos purgados conservan `purgedAt` para trazabilidad y auditoría.
- La metadata de submissions no incluye valores originales, únicamente métricas agregadas seguras.
