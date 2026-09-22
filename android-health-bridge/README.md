# Coach · Salud (Android)

App nativa Kotlin + Jetpack Compose, Material 3 Expressive (`MaterialExpressiveTheme`, formas de botón expresivas), Health Connect y WorkManager. Vive junto a la web, no la reemplaza.

## Compilar

JDK 17 o superior y Android SDK 36; `ANDROID_HOME` debe apuntar al SDK local.

```sh
./gradlew :app:assembleDebug :app:lintDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`. Debug y release sólo permiten HTTPS. No contiene endpoint, claves ni datos de salud precargados. La versión release necesita firma de distribución; el APK debug sirve para revisión e instalación personal de prueba.

## Activación inicial (todavía no realizada)

1. Preparar y aprobar receptor y esquema privado de Coach por separado. Configurar credencial exclusiva de ingestión, nunca una clave de lectura o de Supabase en el móvil.
2. Instalar APK en el móvil. Configurar la URL HTTPS final `/api/health-sync` y el token una vez.
3. Conceder lectura de ejercicios y pulsaciones y acceso en segundo plano. Si Health Connect no admite este último, actualizarlo; la app no pretende ser automática sin ese permiso.
4. Habilitar sincronización. Android programa trabajo periódico persistente cada 15 minutos como mínimo; batería, red y restricciones del fabricante pueden retrasarlo. No es tiempo real. Forzar detención desde ajustes de Android también detiene trabajo hasta volver a abrir la app.
5. Verificar una sesión nueva y las muestras de pulso sin abrir la app después de entrenar. El emulador no certifica Samsung Health → móvil real.

## Privacidad y corrección

- Permisos sólo de lectura; no escribe en Health Connect. No pide credenciales Samsung.
- Endpoint y token cifrados con AES-GCM/Android Keystore en almacenamiento privado excluido del backup. Sin logs de registros o secretos. HTTPS obligatorio y redirecciones rechazadas para no reenviar credenciales.
- Deshabilitar cancela trabajo. Una petición que ya haya salido puede terminar; no revoca ni borra registros recibidos.
- Ventana inicial: últimos 30 días, limitada además por permisos de Health Connect. Posteriores: checkpoint menos seis horas. Paginación completa, ACK exacto y checkpoint sólo tras confirmar todos los lotes. Los reintentos vuelven a enviar datos de forma idempotente.
- Lotes de hasta 200 registros y menos de 1 MB. Las pulsaciones se dividen siempre por minuto UTC y bloques de hasta 5000 muestras ordenadas. ID: `<metadata.id>#minute-<epochMinute>-<blockIndex>`. Se conservan intervalos originales, fuente, revisión y todas las muestras; el receptor debe tratar estos IDs como opacos.
- **Límite de v1:** no usa Changes API. No propaga borrados ni revisiones de registros fuera de la ventana solapada. Si una corrección elimina todas las muestras de un minuto o reduce los bloques, las piezas anteriores requieren reconciliación en el servidor. No usar esta importación como historial clínico ni afirmar un espejo completo. Futuro: Changes API y borrado coordinado por ID de origen.
- La prueba de cinta del 22/09 se excluye sólo después de identificar su ID real en el receptor. No se presume que una etiqueta de cinta signifique correr, ni se editan planes o progreso legacy.

## Estado de verificación

22/09/2026: APK debug compilado, lint sin errores (advertencias de estilo y versiones), 2 pruebas instrumentadas aprobadas en Pixel_10 API 37. Pantalla y apertura del diálogo de permisos inspeccionadas; configuración vacía y automatismo apagado en el emulador. Pendiente prueba de extremo a extremo en móvil real. No hay receptor desplegado ni datos reales sincronizados por este cambio.
