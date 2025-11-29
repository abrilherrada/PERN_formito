# Formito Backend

## Purga de datos eliminados

Para ejecutar la limpieza de registros soft-deleted después del período de retención:

```bash
npm run purge:soft-deleted
```

Este comando ejecuta el servicio `purgeSoftDeletedEntitiesService`, que:

- Anonimiza usuarios, correos, formularios y submissions que lleven más de 30 días en estado `DELETED`.
- Elimina los tokens de verificación asociados.
- Devuelve un resumen en consola con la cantidad de recursos procesados.
