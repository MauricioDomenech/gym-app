# Skills y prompts para GPT-6 Astra: resumen y aplicación futura a gym-app

Fuente: [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), Eric Provencher, OpenAI Developers, publicado el 11 de septiembre de 2026. Lectura y contraste local: 13 de septiembre de 2026.

**Aplicación posterior:** la reparación del 13 de septiembre de 2026 se documenta en [cambios y validación](aplicacion-guia-agentes-gpt-6-astra.md). Las observaciones siguientes describen el estado previo a esa intervención.

Este documento distingue el resumen del artículo de las observaciones propias sobre el repositorio. Es una referencia para una intervención posterior; no modifica la configuración de los agentes.

## Resumen del artículo

- Las instrucciones acumuladas para modelos anteriores deben reevaluarse con Astra: algunas ayudas ahora estorban.
- Las skills agrupan instrucciones Markdown, recursos y scripts para tareas concretas.
- Sus nombres y descripciones ocupan contexto. Demasiadas descripciones extensas provocan recortes que dificultan elegir correctamente.
- Las descripciones deben delimitar activadores precisos, evitando contradicciones y usos excesivos: una migración no equivale a cualquier trabajo con bases de datos.
- La carga progresiva permite consultar solo lo pertinente: una entrada breve dirige a referencias y scripts específicos.
- Las recetas rígidas pueden limitar el criterio del modelo. Las instrucciones compartidas también deben considerar a Sol y Luna.
- `AGENTS.md` requiere mantenimiento: orientar lecturas según la tarea, mantener documentación vigente y evitar comprobaciones redundantes.
- Los permisos deben delimitar operaciones concretas y seguras; restricciones heredadas demasiado amplias pueden generar paradas innecesarias.
- Astra puede detenerse tras una primera implementación. Conviene definir qué incluye terminar: ejecutar, inspeccionar, corregir y hasta dónde continuar explorando.
- El artículo menciona mejoras en `skill-creator` y propone pedir una auditoría para revisar estas instrucciones.

Estas son recomendaciones del autor; el texto no aporta un experimento comparativo ni una garantía de rendimiento para este repositorio. [Artículo original](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).

## Lo que observé en el repositorio

La inspección fue acotada a `AGENTS.md`, `package.json`, `.codex/README.md`, el agente `fitness-coach`, la skill `disenar-rutina` y el validador con sus casos estáticos. No constituye una auditoría completa de todos los agentes ni una revisión científica de sus recomendaciones.

### 1. Ya hay una base de organización y validación

`AGENTS.md` identifica tres perfiles especializados y remite a las skills del proyecto. También exige descripciones cortas. En `disenar-rutina`, la descripción efectivamente ocupa una sola línea.

`package.json` conecta `npm run validate:agents` con `scripts/validate-agent-config.mjs`. Existe, por tanto, un punto de entrada real para validar una futura modificación; no hace falta crear otro sistema desde cero.

### 2. El agente de entrenamiento contiene instrucciones que merecen revisión conjunta

En `.codex/agents/fitness-coach.toml` encontré:

- Una descripción con una lista extensa de temas y cinco ejemplos de conversación.
- Tablas, protocolos y formatos de salida dentro del cuerpo del agente, además de referencias a skills especializadas.
- Una explicación que presenta la frecuencia de entrenamiento como orientativa, seguida de una comprobación final que exige una frecuencia mínima.
- Una pauta de deload individualizable que convive con calendarios y condiciones más rígidos en otras secciones.
- Una prohibición explícita de actualizar memoria automáticamente, junto con texto heredado al final que invita a guardar patrones y afirma que la memoria está vacía.

Estos son conflictos o candidatos a revisión del texto, no evidencia de que hayan causado un fallo concreto en una ejecución. La skill `disenar-rutina` también incluye tablas, tres variantes obligatorias por ejercicio y un mesociclo fijo: habrá que contrastar sus obligaciones con las del agente antes de cambiar cualquiera de los dos.

### 3. La documentación local tiene referencias desactualizadas

`.codex/README.md` enumera archivos de agentes con extensión `.md`, mientras que los perfiles existentes son `.toml`. Además, describe un frontmatter mínimo, pero los archivos actuales incluyen `developer_instructions`.

Una aplicación posterior debería corregir estas referencias usando la estructura realmente instalada como fuente de verdad.

### 4. Las evaluaciones actuales son estáticas

`validate-agent-config.mjs` verifica archivos, campos, referencias, frases requeridas y metadatos de memoria. Los seis casos de `scripts/agent-evals.json` incluyen un campo `prompt`, pero el script no lo ejecuta contra un modelo: comprueba que ciertas cadenas aparezcan en las instrucciones.

Por ello, un resultado correcto no demostraría que el agente elige la skill adecuada, evita preguntas repetidas o completa un encargo. Además, una reformulación válida puede romper una comprobación basada en una frase literal. La futura edición deberá revisar instrucciones y comprobaciones conjuntamente, conservando la intención de seguridad.

## Propuesta concreta para una intervención posterior

Esta propuesta es elaboración propia para `gym-app`, no una lista de cambios exigida por OpenAI.

1. Revisar los tres `.toml` y las skills que referencian; registrar cada contradicción con su ubicación y decidir cuál es el contrato vigente.
2. Resolver primero las discrepancias ya observadas: referencias `.md`/`.toml`, obligaciones de frecuencia y deload, y consentimiento para memoria. Cualquier cambio de criterio deportivo necesitará revisión científica específica.
3. Probar el comportamiento con encargos representativos: una consulta puntual sobre un ejercicio, un plan completo con información disponible y otro con información esencial ausente. Añadir un cambio de interfaz para comprobar que no activa asesoramiento deportivo solo por pertenecer a una aplicación de gimnasio.
4. Mantener la revisión del `abogado-del-diablo` para recomendaciones significativas, conforme a las instrucciones actuales del proyecto. Documentar cualquier propuesta de cambio de ese contrato antes de aplicarla.
5. Ejecutar `npm run validate:agents` tras los cambios de configuración y comprobar los casos de comportamiento. Registrar resultados observados y pendientes por separado. Reiniciar la sesión después de modificar agentes o skills, como indica actualmente `AGENTS.md`.

El criterio de aceptación de esa intervención será que los contratos de seguridad y consentimiento sigan vigentes, las referencias correspondan a archivos reales, las instrucciones contradictorias queden resueltas y los casos representativos produzcan el comportamiento esperado. Ninguno de esos resultados se da por conseguido con este resumen.

## Archivos de referencia local

- `AGENTS.md`
- `.codex/README.md`
- `.codex/agents/fitness-coach.toml`
- `.codex/skills/disenar-rutina/SKILL.md`
- `scripts/validate-agent-config.mjs`
- `scripts/agent-evals.json`
- `package.json`
