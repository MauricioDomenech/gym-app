# Coach · entrenamiento y progreso · 05/10/2026

Pedido: implementación autónoma de las mejoras de la comparativa openGym y publicación, autorizadas por Mauri en Telegram el 04/10 por la noche. Implementación propia; no se incorpora código AGPL de openGym. Se revisaron sus componentes, estados, estilos y contratos como referencia de comportamiento.

## Qué cambia

- Propuesta editable de la última sesión comparable: misma variante, rutina, día y puesto, sólo fechas anteriores. No copia el esfuerzo ni marca series realizadas.
- Guardado individual de series con confirmación remota, recarga de lo confirmado y finalización automática del ejercicio cuando corresponda. Se conserva la opción de guardar el ejercicio completo y de terminar parcial.
- RIR opcional por serie y calentamientos separados de las series, el volumen de trabajo y las comparaciones. El RIR global histórico no se transforma en RIR individual.
- Descanso según el plan, automático tras una serie nueva confirmada o manual; pausa, reanudar, ±15 s, saltar y estado Listo. Temporizador por fecha límite, no por decremento acumulado. Sonido optativo y Wake Lock mientras Entrenamiento está visible, si el navegador los permite.
- Máquina ocupada: posponer temporalmente un ejercicio; no cambia ni guarda un nuevo orden de la rutina.
- Calculadora simétrica de discos con peso de barra editable y tamaños disponibles. Supone suficientes discos; nunca redondea la carga hacia arriba.
- Resumen al completar los registros: series, reps, volumen externo, calentamientos y cardio. Sin botón obligatorio Finalizar ni duración de sesión inventada.
- Sugerencias explicadas a partir de la prescripción y del historial comparable, sin aplicación automática. Excluir un ejercicio atípico de sugerencias sin borrarlo.
- Marcas de trabajo comparables: reps a la misma carga o carga a las mismas reps, sin calentamientos, variantes distintas, primeras exposiciones o registros en curso.
- Progreso de 28/90/365 días o todo el historial de fuerza; salud/peso hasta un año en ventanas de API de 35 días. Navegación de hasta dos años de semanas.
- Mapa de 14 regiones con participación principal/secundaria separable, ejercicios contribuyentes y última exposición. No es un modelo de fatiga ni de estímulo fisiológico equivalente.
- Historial completo en Progreso: corregir registros y añadir una sesión olvidada consultando la versión del plan vigente en esa fecha en el servidor. Reutiliza una sesión del mismo día en vez de duplicarla. No crea sesiones vacías al abrir el formulario.
- Peso: media móvil de siete días por fuente sólo con al menos tres días medidos; sin interpolación de días ausentes. Sueño junto al registro de ejercicio, sin inferir causalidad.
- Coach + reloj: actividades Samsung, pulso y velocidad resumidos dentro de cada intervalo, distancia sólo si el intervalo coincide, muestras deduplicadas, contradicciones excluidas y huecos visibles. Posibles coincidencias de cardio por fecha/tipo/duración, nunca vínculos confirmados ni actividades sumadas. Comparación exploratoria con otra actividad anterior de tipo, duración, velocidad y cobertura semejantes.

## Contrato y seguridad de datos

Se amplía el JSON existente con campos opcionales (`TrainingSet.rir/kind/recordedAt`, `TrainingLog.recording/excludeFromProgression`). `recordedAt` es la confirmación de registro, no el comienzo de ejecución. No hay nuevas tablas ni migraciones remotas. Los registros anteriores siguen siendo válidos.

Los borradores permanecen sólo en memoria. Supabase sigue siendo la fuente única; no hay entrenamiento en localStorage, outbox ni elección de copias. Se conservan revisión CAS, idempotencia, validación compartida y autenticación de propietario. Una revisión concurrente no se sobrescribe. Los clientes antiguos sin `X-Coach-Recording: series-v1` no pueden quitar metadatos de series ya existentes: reciben 426 sin modificación.

La nueva lectura `GET /api/progress?resource=activity&from=…&to=…` exige el propietario autenticado, un intervalo de como máximo 35 días, perfil/dispositivo configurados y Samsung Health. El navegador recibe resúmenes, no muestras crudas ni rutas GPS. Las consultas no modifican el archivo de salud.

## Publicación reproducible

Rama de entrega: `feature/coach-overnight-20261005`, separada del checkout original que conserva los cambios pendientes de Android. La base de publicación es el backend que **ya estaba desplegado**, antes fuera del historial Git, más el frontend `d0612c8`. La semilla histórica de servidor permanece idéntica a producción (v2); la app de producción usa planes versionados de la base, no esa semilla. No se publica ni cambia ninguna rutina.

Se versionan los esquemas y pruebas correspondientes al backend ya desplegado para que la rama sea comprobable; no se ejecutan esos SQL sobre producción. La prueba instrumental Android de 41 tipos pertenece al trabajo del puente y queda fuera de este cambio.

## Comprobaciones

- `npm run lint`, `npm run build`, `npm run build:api`.
- `COACH_TEST_PGLITE=/tmp/coach-overnight-tests/node_modules/@electric-sql/pglite/dist/index.js node --test tests/*.test.mjs`: 92 pruebas, sin fallos ni omisiones. PGlite es una dependencia temporal de QA, no de la aplicación.
- QA móvil sintético: 15 escenarios, 320/390/430/768 px, guardado por serie, fallo/reintento, pausa del reloj, recarga, orden temporal, protección de cambios, resumen, lectura del reloj, ventanas largas, conflicto de historial, edición, sesión olvidada y coherencia al volver a entrenar y conservación del formulario al reintentar una lectura fallida. Claro/oscuro y capturas inspeccionadas.
- Evidencia de la tarea: workspace `projects/coach/overnight-20261004/`. La evidencia final de publicación y de invariancia de registros/planes se conserva allí y en el directorio de release de la Studio.

## Límites deliberados

No se cambia la rutina automáticamente, no se reconstruyen tiempos, lados o RIR antiguos, no se importan exports legacy ni se afirma una mejora fisiológica por una marca. Sonido y pantalla encendida dependen del navegador; no hay notificación nativa garantizada con el teléfono bloqueado. La relación Coach/reloj es orientativa porque los registros de Coach no tienen hora de inicio. Plan sigue informativo; clima y Configuración permanecen; no se añade biblioteca visible ni persistencia offline.
