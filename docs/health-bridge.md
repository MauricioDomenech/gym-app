# Health Connect → Coach: revisión y activación

## Punto de pausa — 22/09/2026

Mauri pidió documentar y guardar el trabajo con commit/push para retomarlo más adelante. **Implementación local preparada; integración real todavía inactiva.** Guardar el código no autoriza activar servicios, aplicar SQL ni transferir datos de salud.

Objetivo: consultar automáticamente desde Coach las sesiones y pulsaciones de Samsung Health, sin capturas, exportaciones manuales ni licencia de Health Sync. Recorrido: reloj → Samsung Health → Health Connect → app Android propia → receptor de Coach → Supabase → consulta privada. El tramo Samsung Health → Health Connect se comprobó en el móvil; el resto sólo tiene validación local.

Rama de trabajo: `feature/hoy-mobile`. `vercel.json` desactiva el despliegue Git de esta rama. No fusionar a producción ni ejecutar un deploy como parte de la recuperación. Los cambios previos de `src/App.tsx`, `src/components/today/TodayApp.tsx` y `src/components/training/` son trabajo separado, no forman parte del puente.

### Qué está comprobado

- Compilación API y cuatro pruebas de contrato aprobadas: configuración cerrada, claves separadas, validación/límites, filtros de perfil, ACK y errores de persistencia.
- SQL ejecutado en PostgreSQL efímero (PGlite): idempotencia, revisión antigua no sobrescribe una nueva, exclusión preservada, separación de perfiles, rollback y denegación a `anon`/`authenticated`.
- APK debug compilado; lint Android sin errores, con advertencias de estilo/versiones. Dos pruebas instrumentadas aprobadas en Pixel_10 API 37: almacenamiento cifrado y rechazo de URLs inseguras; worker deshabilitado/checkpoint y cancelación.
- Pantalla inicial/inferior y diálogo de permisos inspeccionados. Configuración vacía, sincronización apagada; no se concedieron permisos para una transferencia real.
- Material 3 Expressive real con `MaterialExpressiveTheme` y formas expresivas; dependencia `1.5.0-alpha01`. No actualizarla sin volver a compilar y revisar compatibilidad.

No se han publicado estas rutas, aplicado sus tablas remotas, generado/configurado sus claves ni instalado el puente en el móvil de Mauri. No se ha conectado la consulta de registros a un asistente ni añadido su visualización a la web. No quedan resultados delegados necesarios para recuperar: los intentos delegados fallaron por el relay de herramientas; la implementación y QA local se completaron después directamente. La causa del relay no quedó reparada.

### Cómo retomar

1. Leer este documento y `../android-health-bridge/README.md`; comprobar rama/diff y conservar cualquier otro trabajo local.
2. Confirmar proyecto Vercel, dominio **estable de producción** y proyecto Supabase antes de configurar nada. La URL del móvil será `https://<dominio-estable>/api/health-sync`, no la URL única de un despliegue; no necesita cambiar con cada publicación. La app guarda la URL y clave durante la configuración inicial y no sigue redirecciones.
3. Obtener autorización explícita para publicar/configurar el receptor y aplicar `database/health-connect.sql`; la aprobación de commit/push no incluye esos pasos.
4. Seguir «Pasos pendientes de activación» al final; no dar por terminado hasta verificar segundo plano en el Samsung real, muestras completas y reintentos sin duplicados.

El diseño no exige Vercel Pro para uso personal: Hobby incluye funciones con cuotas compartidas con la web. Falta medir consumo real y comprobar cuota de Supabase; no prometer capacidad gratuita ilimitada. Referencias consultadas el 22/09/2026: [Hobby](https://vercel.com/docs/plans/hobby) y [URLs de despliegue/producción](https://vercel.com/docs/deployments/generated-urls).

### Artefactos y recuperación

El código, wrapper Gradle, pruebas y documentación se versionan. APK, cachés, SDK local, claves y firmas no se suben a Git. APK local de revisión: `android-health-bridge/app/build/outputs/apk/debug/app-debug.apk`; SHA-256 del artefacto verificado: `c86d3dda69b28481e8441d886f8f07cdaad1ca2724ab8d72b9e3a982c5fae148`. Se puede reconstruir con los comandos de este documento (el hash de una reconstrucción puede variar). La firma release estable sigue pendiente.

## Alcance preparado

- App Android: `android-health-bridge/`, Kotlin/Compose/Material 3 Expressive, permisos mínimos de lectura, configuración cifrada y WorkManager.
- POST privado `/api/health-sync`: ingestión validada, lotes ≤200 y ≤1.000.000 bytes, ACK sólo después de transacción persistida.
- GET privado `/api/health-records`: lectura paginada, filtros `from`, `to`, `recordType`, `sourceId`, `after`, `limit` (1–200), `includeExcluded=true` sólo para revisión. Por defecto no devuelve excluidos.
- `database/health-connect.sql`: tabla aislada con RLS y acceso exclusivo `service_role`; upsert idempotente/monotónico y exclusiones preservadas.

No modifica la web, sus rutinas, notas o progreso. No interpreta «cinta» como carrera. El `server.js` legacy no sirve estas nuevas rutas: están preparadas para las funciones de Vercel. No iniciar una sincronización real usando el servidor legacy.

## Configuración del receptor (aún no aplicada)

Variables privadas de servidor, sin prefijo VITE:

| Variable | Uso |
|---|---|
| `COACH_HEALTH_SUPABASE_URL` | Origen HTTPS del proyecto Supabase |
| `COACH_HEALTH_SERVICE_ROLE_KEY` | Sólo servidor; nunca APK/web |
| `COACH_HEALTH_PROFILE_ID` | Perfil canónico fijado en servidor |
| `COACH_HEALTH_DEVICE_ID` | Dispositivo canónico fijado en servidor |
| `COACH_HEALTH_SYNC_TOKEN_SHA256` | SHA-256 hexadecimal de token opaco aleatorio de ingestión |
| `COACH_HEALTH_READ_TOKEN_SHA256` | SHA-256 hexadecimal de otro token opaco aleatorio para consulta |

Los dos tokens deben ser distintos y de alta entropía (32 bytes aleatorios o más). La app sólo recibe el token de ingestión. El lector privado usa el de consulta. Si falta configuración, el receptor responde 503; no hay fallback público ni uso de credenciales legacy. No imprimir tokens ni pasarlos por URLs. No hay CORS público ni persistencia de credenciales en el navegador.

## Contrato de pulsaciones y límites v1

La app conserva todas las muestras y parte por minuto UTC, con máximo 5000 muestras por fragmento. `sourceId` es `<Health Connect metadata.id>#minute-<epochMinute>-<blockIndex>`; la API trata el identificador como opaco. Tiempos originales y origen se conservan. No sumar fragmentos como sesiones distintas ni sumar su duración: son series de muestras para correlacionar con las sesiones de ejercicio.

Ventana inicial de 30 días y posteriores con seis horas de solapamiento. Sin Changes API en v1: los borrados, revisiones antiguas o fragmentos eliminados por corrección requieren reconciliación. No se afirma espejo completo. La ausencia de red no adelanta el checkpoint; Android reintenta. La desactivación cancela nuevos trabajos, pero una petición ya enviada puede finalizar.

La prueba técnica Samsung del 22/09 11:20–11:22 Madrid se localizará con tiempos/origen y se excluirá por el ID **exacto revisado**. No hay heurística que excluya automáticamente otras sesiones.

## Validación local reproducible

```sh
npm run build:api
node --test tests/health-api.test.mjs
```

SQL real sin base remota: instalar PGlite en una carpeta temporal externa al repo y apuntar `COACH_TEST_PGLITE` a su `dist/index.js`:

```sh
npm install --prefix /tmp/coach-health-sql-test --no-audit --no-fund @electric-sql/pglite
COACH_TEST_PGLITE=/tmp/coach-health-sql-test/node_modules/@electric-sql/pglite/dist/index.js node --test tests/health-sql.test.mjs
```

Android (JDK17+, SDK36 y emulador):

```sh
cd android-health-bridge
./gradlew :app:assembleDebug :app:lintDebug :app:connectedDebugAndroidTest
```

Los tests usan exclusivamente datos sintéticos y una base PostgreSQL efímera. No ejecutar `sync-data`, migraciones remotas ni pruebas con credenciales reales como parte del QA local.

## Pasos pendientes de activación

1. Aprobar la aplicación del SQL y publicación/configuración privada del receptor.
2. Configurar tokens por canal local seguro, instalar APK en el móvil y conceder permisos una sola vez.
3. Verificar una sesión real completa sin abrir la app ni pulsar sincronizar: ID, tiempos, muestras, reintento sin duplicados y recuperación tras corte de red.
4. Excluir la prueba técnica por ID exacto y configurar el acceso privado de consulta para que yo recupere las sesiones.

No se creó ningún cronjob. El automatismo del móvil es WorkManager. APK debug de revisión; para instalaciones duraderas conviene conservar una firma release privada estable antes de distribuir actualizaciones.
