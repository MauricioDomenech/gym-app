# Plan Recomp Lenta 2026 — Protocolo Semanal

## Objetivo

Desde la semana 7, el objetivo principal deja de ser llegar a 90 kg a mitad de agosto. El objetivo actual es bajar grasa lentamente, mantener o ganar masa muscular, sostener rendimiento en el gimnasio y continuar hasta fin de diciembre de 2026 con un plan revisado semana a semana.

## Nutricion Base

- Calorias iniciales: mantener el rango actual, aproximadamente 1930-2028 kcal/dia, promedio cercano a 1965 kcal/dia.
- Proteina: 190-210 g/dia.
- Grasas: 55-65 g/dia.
- Carbohidratos: resto de calorias segun dia y entrenamiento.
- No subir a 2300 kcal como punto de partida.
- No bajar mas calorias por defecto.

## Reglas De Ajuste

Mantener el plan si:

- El peso baja aproximadamente 0.25-0.45 kg/semana.
- La fuerza se mantiene o sube.
- La energia, el sueno y el hambre son manejables.
- No aparecen molestias persistentes ni fatiga acumulada.

Subir 100-150 kcal/dia o reducir fatiga si:

- El peso baja mas de 0.8 kg/semana.
- La fuerza cae en varios ejercicios relevantes.
- El usuario entrena vacio o con RPE anormalmente alto.
- Empeoran sueno, energia, hambre o irritabilidad.
- Aparecen molestias articulares/tendinosas o mala recuperacion.

Considerar bajar 50-100 kcal/dia o aumentar pasos solo si durante 3 semanas:

- El peso no baja.
- La cintura no baja.
- La adherencia real fue alta.
- Cardio y pasos fueron consistentes.

## Cardio

Los cardios del plan actual son obligatorios:

- Lunes: LISS 45 min.
- Martes: LISS 45 min.
- Miercoles: LISS 45 min.
- Jueves: LISS 45 min.
- Viernes: LISS 45 min.
- Sabado o domingo: HIIT 18-20 min, segun programacion.

Si un cardio no se hace por enfermedad, agenda o fatiga real, se registra como no completado. No se compensa con castigo ni cardio extra agresivo.

## Entrenamiento

- Mantener PPL x2 si la recuperacion sigue siendo buena.
- Preservar ejercicios y estructura salvo ajustes puntuales.
- Compuestos: evitar fallo; trabajar normalmente con 1-3 RIR.
- Aislamientos: permitir 0-2 RIR, pero no convertir toda la semana en RIR 0.
- Si una semana tiene muchos RIR 0, la semana siguiente debe priorizar consolidar antes que subir todo.
- Si hay fatiga, primero bajar volumen o tecnicas intensivas antes que bajar intensidad de forma global.

## Flujo De Trabajo Semanal Para Codex

Cuando el usuario deje los datos de una semana:

1. Leer el export real: `datos_actualizados/DD-MM-YYYY/definicion-semana-XX-export.json`.
2. Leer el import previo si existe: `definicion-semana-XX-import.json`.
3. Comparar prescripcion vs resultados reales:
   - peso y composicion,
   - datos extra de balanza BIA si el usuario los aporta: grasa corporal, grasa subcutanea, grasa visceral, musculo esqueletico, masa muscular, agua corporal, peso sin grasa, masa osea, proteina, TMB e IMC,
   - cardio completado,
   - comidas relax/adherencia reportada por el usuario,
   - ejercicios con progresion,
   - ejercicios con RIR 0/fallo,
   - molestias o problemas de agenda.
   Si faltan los datos extra de balanza, no bloquear el check-in: seguir con JSON, peso, fuerza, cardio y adherencia.
4. Charlar con el usuario sobre la semana, explicar lectura de datos y acordar criterios generales para la siguiente semana.
5. Preguntar explicitamente si quiere generar el siguiente import.
6. Solo si el usuario confirma, generar `definicion-semana-(XX+1)-import.json`.
7. El JSON debe tener:
   - `version: "1.0"`,
   - `phase: "definicion"`,
   - `weekTo` correcto,
   - `workoutProgress`,
   - `cardioLogs`,
   - `coachNotes`.
8. En cada `workoutProgress[].observations`, escribir la recomendacion concreta para esa semana:
   - subir, mantener o consolidar,
   - peso recomendado,
   - reps objetivo,
   - RIR objetivo,
   - condicion para bajar o mantener,
   - notas de descanso, tecnica o maquina si aplica.
9. Validar el JSON con `jq empty` y con la forma minima que exige `weeklyDataService.ts`.

## Semana 7 Generada

Archivo generado:

`datos_actualizados/03-05-2026/definicion-semana-07-import.json`

Ese archivo es el modelo operativo para futuras semanas: parte del export real anterior, preserva la estructura compatible con la app, marca cardio obligatorio y usa `observations` como instrucciones legibles por ejercicio.
