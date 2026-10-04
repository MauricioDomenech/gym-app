# Progreso — candidato local 03/10/2026

## Alcance

Pestaña Progreso: semana de entrenamiento, series y cardio frente al plan, evolución por ejercicio (carga máxima registrada/repeticiones totales/RIR), pasos Samsung, ventanas de sueño, pesajes Coach/Renpho y lectura descriptiva semanal. Navegación por cuatro semanas; historial de ejercicio y peso de 28 días hasta el corte seleccionado.

Recharts 3.10.1 (compatible con React 19) se carga sólo al abrir Progreso. SVG responsive, tooltip por toque, navegación de teclado y tabla equivalente de valores. Sin animación para evitar mareo. Controles de al menos 48 px, temas claro/oscuro y sin scroll horizontal desde 320 px.

## Elección de librería

- Recharts: componentes React/SVG, ResponsiveContainer y capa de accesibilidad; integración directa con el estado y tema actuales. Elegida.
- Chart.js: Canvas responsive y adecuado para series densas; para estos gráficos pequeños no aporta una ventaja que compense otra capa de integración React y accesibilidad manual.
- No se necesita un motor financiero, zoom complejo ni miles de puntos.

Fuentes consultadas 03/10/2026:
- https://recharts.github.io/
- https://github.com/recharts/recharts/wiki/Recharts-and-accessibility
- https://www.chartjs.org/docs/latest/configuration/responsive.html
- `npm view recharts version peerDependencies`: 3.10.1, admite React 19.

## Datos y límites

- Entrenamiento: GET existente; borradores vacíos no son trabajo. No exige `finishedAt`. Prescripciones guardadas prevalecen sobre plan vigente; no aplica retroactivamente un plan posterior. Semana sin plan histórico completo indica esa limitación.
- GET `/api/progress?from=YYYY-MM-DD&to=YYYY-MM-DD`: exige propietario verificado por Supabase Auth; rechaza otros métodos, fechas inválidas/futuras, rangos >35 días y parámetros extra. No recibe perfil ni dispositivo del cliente.
- Salud: proyección escalar paginada (500/página, máximo 10.000), perfil/dispositivo configurados y registros no excluidos. Nunca envía etapas de sueño ni muestras de sensores al navegador. No expone token lector ni service key.
- Pasos: Samsung exclusivamente; solapamientos o intervalos que cruzan día se muestran desconocidos, no sumados. Hoy fuera de la media; días cerrados no garantizan captura completa.
- Sueño: unión de ventanas por fecha de despertar Madrid; fin antes de las 12 h se clasifica nocturno, el resto se presenta aparte. Es una convención visible, no detección clínica de noches/siestas. No mide sueño neto. Causa reloj cargando sólo para las dos fechas confirmadas, enviada desde servidor autenticado, no en bundle público.
- Peso: Renpho en gramos convertido a kg; registros manuales Coach aparte, sin promediarlos ni inferir tendencia/grasa. Puntos sin línea.
- Fuente fallida no borra la disponible; error explícito/reintento, nunca ceros inventados.
- Lectura semanal automática y descriptiva, no consejo de cambio de rutina ni déficit calculado.
- Sin SQL, escritura de datos, commit ni push. Publicación autorizada y completada, ver cierre.

## Validación

- `npm run lint`, `npm run build`, `npm run build:api`, `git diff --check`: OK.
- 22 tests únicos: 8 de progreso + 14 existentes de peso, carga corporal y completitud. Incluyen autenticación, filtros, paginación, fechas, sueño partido/solapado, pasos duplicados, gramos, fallos parciales y contexto por fecha.
- QA Chromium local con fixtures sintéticos: 320/390/430/768 px, seis gráficos, sin overflow horizontal; toque/tooltip, selección de métrica, tabla, semanas, temas, vacío y error/reintento. Sin errores JS. Inspección visual oscuro/claro.
- Artefactos: workspace `projects/coach/progreso-20261003/` (capturas, qa.mjs, qa-result.json y harness temporal). No prueban integración con producción ni dispositivo físico.
- Bundle Progreso separado: ~116,65 kB gzip JS; no aumenta la carga inicial de Hoy con el motor gráfico.

Publicación autorizada por Mauri, Telegram 13806 (03/10/2026): «Siiii, quiero verlo». Publicado y comprobado: `dpl_GoPNH7ppPmCBzS4eqDDvqNo4SeMr`, READY, https://gym-app-seven-omega.vercel.app. API autenticada y navegador móvil 390 px con recarga correctos, seis gráficos y sin errores ni escrituras de entrenamiento. Registros revisión 40 y planes actual/v4 conservan los hashes del baseline. Sesión técnica cerrada sólo con scope local. Se conservan todos los cambios previos del checkout `feature/hoy-mobile`.
