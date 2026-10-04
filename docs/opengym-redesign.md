# Rediseño Coach · 04/10/2026

Pedido de Mauri: adoptar distribución y estilo visual openGym, con código propio. Inicio conserva clima; navegación Inicio/Plan/Entrenar/Progreso/Configuración. Plan informativo sin edición; sin biblioteca de ejercicios.

## Implementado localmente
- Superficies negras/grises y acento verde, tarjetas compactas, navegación fija y acceso central a Entrenar. Tema claro preservado.
- Semana con fechas, sesión de hoy, registro de peso y resumen en Inicio; eliminados placeholders de comidas.
- Plan semanal desplegable de sólo lectura desde la rutina privada existente.
- Entrada directa al primer ejercicio sin registro; anterior/siguiente y cardio al final. Animación visible, carga/repeticiones con controles +/− y entrada manual. Campos secundarios plegados. Notas y alternativas preservadas.
- Estadísticas: tarjetas, calendario de 52 semanas (series/volumen), distribución por región muscular principal con geometría anatómica MuscleMap (MIT), idéntica a las vistas masculinas frontal/trasera usadas por openGym, distribución de RIR y sesiones recientes. Se conservan los seis gráficos previos de entrenamiento, fuerza, pasos, sueño y peso.
- Persistencia, autenticación y rutinas no modificadas. Sin migración, sincronización, commit, push ni despliegue.

## Límites de datos explícitos
RIR existente por ejercicio, no por serie. Volumen contabiliza carga externa/lastre × reps, no masa corporal. Clasificación muscular primaria del catálogo, sin contar sinergistas y sin estimar recuperación/fatiga. No se incorporan coeficientes de balance estructural ni métricas fisiológicas ficticias. Extender RIR por serie requiere un cambio de contrato y posible migración, pendiente de decisión si se desea.

## Validación
Lint, build, build:api y diff --check. 24 tests existentes de progreso, persistencia, peso corporal y completitud pasan. Navegador Chrome móvil con datos sintéticos: 320/390/430/768, Plan de siete días, steppers, protección al navegar con cambios, fallo de guardado/reintento, persistencia confirmada/recarga, paso a cardio, Configuración y Progreso. QA adicional de los seis gráficos: tooltip táctil, métricas, valores, semanas, temas, vacío y error/reintento.

Capturas y scripts: `/Users/mauri/.openclaw/workspace/projects/coach/redesign-20261004`.
Pendiente aceptación visual de Mauri y publicación. No se comprobó conexión Studio ni se afirma que esté apagada.

## Mapa anatómico · petición Telegram13863
Sustituido esquema por los trazados SVG exactos del recurso body-paths.js, cuya geometría openGym atribuye a MuscleMap MIT. Renderizador propio; atribución y licencia en public/MUSCLEMAP-LICENSE.txt. Igualdad JSON comprobada contra fuente, lint/build/API y captura móvil revisada. Sin cambios de base de datos.

## Publicación y respaldo Git · 04/10/2026

Publicado en producción y confirmado funcional por Mauri. El commit de respaldo incluye el frontend, sus dependencias e imágenes, idénticos al snapshot desplegado; conserva las validaciones anteriores (lint, build, API y 24 tests). No incluye los cambios locales pendientes de backend, SQL ni Android. Por tanto este commit no representa por sí solo todo el backend de producción. La rama feature/hoy-mobile tiene el despliegue automático desactivado en vercel.json.
