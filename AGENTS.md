# Instrucciones del repositorio

Responde en español con ortografía natural. Conserva literalmente identificadores, comandos y rutas técnicas.

## Contexto y alcance

Vite + React + TypeScript. `src/App.tsx` selecciona la fase; el código de cada fase vive en `src/phases/definicion`, `src/phases/maintenance` y `src/phases/volume`. UI, servicios y tipos comunes están en `src/shared/`; los contextos globales, en `src/contexts/`.

Consulta solo los archivos relacionados con la tarea. Datos de planes y nutrición: `src/assets/data/`. Imágenes: `public/images/`. Para cambios de persistencia, revisa `src/shared/services/`, `api/database.ts` y el SQL pertinente de `database/`. El alcance explícito del usuario prevalece sobre preferencias de las skills, dentro de los permisos y reglas de seguridad de la sesión.

Antes de editar, verifica ruta física, rama y estado de Git. Conserva cambios ajenos. No hagas reset, limpieza, cambio de rama, commit o push sin encargo. No guardes secretos ni credenciales; no apliques migraciones ni sincronizaciones de datos como parte de una comprobación local.

## Implementación y cierre

Reutiliza patrones existentes: componentes funcionales TypeScript, PascalCase para componentes, `useSomething` para hooks e imports relativos explícitos. Mantén nuevas funciones en la fase correspondiente antes de crear abstracciones compartidas.

Completa el cambio autorizado, las comprobaciones pertinentes y las correcciones de fallos propios. Puedes repetir esas comprobaciones locales sin pedir permiso por cada paso. No te detengas en un primer borrador si aún falta trabajo del encargo. Si falta información esencial o un permiso real, explica qué bloquea y avanza en lo independiente; no repitas preguntas ya respondidas.

| Cambio | Validación pertinente |
|--------|-----------------------|
| React, TypeScript o datos consumidos por la app | `npm run lint`, `npm run build` y comprobación focalizada del comportamiento |
| API | `npm run build:api` y comprobación del contrato afectado |
| Agentes, skills o su validador | `npm run validate:agents`; casos de comportamiento cuando cambie el criterio o el enrutamiento |
| Solo documentación | Referencias, contenido y `git diff --check`; no necesita compilar toda la app |

No hay framework de tests de la aplicación configurado. La validación de agentes usa `node:test` para probar su propio validador. Para cambios visibles, inspecciona el resultado si puedes y declara el QA pendiente; lint/build no sustituyen esa inspección.

`npm run dev` inicia Vite; `npm run server`, Express; `npm run dev:full`, ambos. `sync-data` y `build:sync` modifican datos: úsalos solo cuando el encargo incluya sincronizarlos.

En revisiones de código, usa `autoreview` si está disponible y entrega hallazgos antes de editar, salvo que el usuario haya pedido correcciones. Si se solicita commit o PR, usa un resumen breve en español, alcance, validaciones y capturas si hay UI; documenta migraciones o configuración cuando corresponda.

## Agentes y skills

Elige por la decisión solicitada, no por pertenecer a una aplicación de gimnasio:

- `.codex/agents/fitness-coach.toml`: programación, técnica, cardio y recuperación.
- `.codex/agents/nutrition-recomp-coach.toml`: alimentación, suplementos y composición corporal.
- `.codex/agents/abogado-del-diablo.toml`: evidencia científica; debe revisar recomendaciones significativas de los coaches antes de entregarlas.

Un cambio de código, traducción o formato sin decisiones deportivas no activa estos perfiles. Para usarlos, consulta el `.toml` correspondiente y solo las skills necesarias de `.codex/skills/`. Las descripciones deben delimitar su uso; el detalle condicional va en referencias enlazadas. Conserva criterios comprensibles para distintos modelos, sin confiar en capacidades exclusivas de uno.

Para planes e imports, usa el plan y export reales de la fase/semana. No inventes progreso, cargas, RIR, adherencia ni comentarios. Conserva cada `[USER_FEEDBACK]` literal en su ejercicio, con semana de origen, separado de `[COACH_PLAN]`, y comprueba el conteo contra la fuente. Respeta el esquema de datos vigente.

La memoria de proyecto está en `.codex/agent-memory/`: consulta solo lo pertinente y contrasta fechas con datos actuales. Escribe o elimina recuerdos únicamente si el usuario lo pide explícitamente; no guardes secretos. No asumas carga automática ni que los índices estén vacíos.

La estructura y ejecución de evaluaciones se documentan en [.codex/README.md](.codex/README.md). Tras modificar `.codex/agents` o `.codex/skills`, inicia una sesión nueva para cargar los perfiles actualizados; termina primero las ediciones y comprobaciones autorizadas.
