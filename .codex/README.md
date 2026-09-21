# Agentes y skills de gym-app

## Perfiles

- [fitness-coach](agents/fitness-coach.toml): decisiones de entrenamiento.
- [nutrition-recomp-coach](agents/nutrition-recomp-coach.toml): alimentación y composición corporal.
- [abogado-del-diablo](agents/abogado-del-diablo.toml): revisión científica de recomendaciones significativas.

Los perfiles usan TOML con `name`, `description` y `developer_instructions`. Las descripciones delimitan cuándo usarlos; las instrucciones remiten a las skills pertinentes. Una tarea de código o formato no activa asesoramiento deportivo por sí sola.

Cada skill vive en `skills/<nombre>/SKILL.md`. Los catálogos de ejercicios, técnica y condiciones clínicas tienen referencias que se consultan solo para el apartado relevante. Los procedimientos breves son autocontenidos. Se conserva compatibilidad conceptual entre modelos sin imponer un modelo en los perfiles.

Las memorias viven en `agent-memory/`. Su lectura es contextual; no se presupone que se carguen automáticamente. Su escritura o eliminación requiere petición explícita del usuario. Los exports actuales prevalecen sobre recuerdos históricos para decidir cambios semanales.

## Validación

```bash
npm run validate:agents
npm run validate:agents -- --cases
npm run validate:agents -- --behavioral
```

El comando base ejecuta el test del validador y verifica el formato local, identidades, descripciones, rutas, enlaces, fechas de los índices y estructura de los casos. Usa Node y su biblioteca estándar. La comprobación del formato simple de los perfiles no sustituye a un parser TOML general: si se añaden campos o formatos distintos, hay que ampliar su soporte.

El límite de 240 caracteres por descripción es un presupuesto editorial de este repositorio, no un límite publicado de Codex. Las comprobaciones estructurales no certifican que una frase sea científicamente correcta ni que el agente la cumpla. Se eliminan las pruebas basadas en exigir una redacción literal como sustituto de esa evaluación.

`--cases` muestra las solicitudes y criterios de [agent-evals.json](../scripts/agent-evals.json). `--behavioral` ejecuta esos mismos casos mediante [run-agent-evals.mjs](../scripts/run-agent-evals.mjs) con Codex CLI instalado y autenticado; requiere conexión al servicio y consume uso del modelo. Esta batería solicita explícitamente `gpt-6-astra`, omite la configuración personal y registra el modelo solicitado y la versión de CLI. Los perfiles no fijan modelo; esta ejecución no certifica su comportamiento en Sol o Luna.

En macOS, el comando usa el ejecutor integrado de ChatGPT/Codex si existe; en otros casos usa `codex` del PATH. Puedes elegir otra instalación compatible mediante `GYM_AGENT_EVAL_CODEX`. Por ejemplo:

```bash
GYM_AGENT_EVAL_CODEX=/Applications/ChatGPT.app/Contents/Resources/codex npm run validate:agents -- --behavioral
```

No se actualiza la instalación global ni se sustituye Astra por otro modelo si falla.

Cada caso inicia una ejecución efímera de solo lectura. Se copian únicamente `AGENTS.md`, los perfiles y las skills a un directorio temporal; no se copian exports, `.env`, código de la aplicación ni memorias. El prompt limita las lecturas a esa copia y no permite servicios externos, escritura ni delegación. Es una restricción de la prueba, no una política nueva de los perfiles; por ello, no comprueba navegación web ni la integración entre coaches y revisor. El sandbox de solo lectura no es aislamiento total de lecturas del equipo: los casos son locales y de confianza.

Los resultados incluyen respuesta, rutas declaradas y eventos para comprobar qué archivos se consultaron. Se conserva `report.json` y la copia de las instrucciones en el directorio temporal indicado. Una ejecución fallida termina con error y no se declara aprobada. Un JSON válido solo demuestra captura correcta: las respuestas quedan en `pending_review` hasta contrastarlas con los criterios observables, sin puntuaciones automáticas por palabras clave.

Para cerrar una modificación de comportamiento, revisa las capturas y registra resultado, evidencia, modelo y limitaciones en el informe del cambio. Corrige los fallos y repite solo los casos afectados. El test y la ejecución de casos están conectados al comando principal; la valoración científica sigue siendo una revisión de contenido.

## Recarga

Tras modificar agentes o skills, inicia una sesión nueva de Codex para cargar los perfiles actualizados. Las ejecuciones CLI de los casos son nuevas, pero no recargan la sesión de escritorio que inició la modificación.

Guía de la intervención: [resumen del artículo](../docs/resumen-skills-prompts-gpt-6-astra.md).
