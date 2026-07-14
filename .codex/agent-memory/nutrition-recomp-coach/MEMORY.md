---
name: nutrition-recomp-coach-memory
updated: 2026-07-11
status: curated-index
policy: verify-before-use
---

# Memoria curada del Coach Nutricional

Esta memoria contiene reglas de flujo y enlaces a snapshots históricos. Los datos
numéricos de usuario no son actuales por defecto: confirmar siempre el último
export, check-in o mensaje del usuario.

## Fuentes de datos históricos

- [Perfil biométrico y objetivos](user_perfil.md) — snapshot fechado de perfil,
  peso y objetivo.
- [Plan nutricional](user_nutricion_actual.md) — snapshot de macros, comidas y
  ajustes; revisar estado antes de reutilizarlo.
- [Entrenamiento y progresiones](user_entrenamiento.md) — snapshot de rutina,
  cardio, fuerza y molestias; no sustituye una evaluación actual.

## Reglas de flujo confirmadas

- Comunicarse en español.
- No hacer commits ni preguntar por commits.
- En un check-in semanal, analizar primero el export completo y compararlo con el
  import anterior antes de hablar de ajustes.
- No generar automáticamente el siguiente import: pedir confirmación primero.
- No modificar el entrenamiento si el usuario no lo solicita.
- Registrar la adherencia real; no compensar incumplimientos con castigo.
- Tratar BIA, peso, fuerza y cardio como señales complementarias, no como una única
  medición de composición corporal.
- Confirmar si cereales, legumbres y proteínas están pesados en crudo o cocinados.

## Reglas de seguridad

- Activar `poblaciones-especiales` ante embarazo, minoría de edad, ERC, diabetes,
  TCA, hipertensión u otra condición relevante.
- No convertir un rango calórico, proteico o de pérdida de peso en una prescripción
  clínica.
- Si la memoria contradice datos actuales, prevalecen los datos actuales y se marca
  el snapshot antiguo como histórico.

## Mantenimiento

Actualizar este índice solo tras una petición explícita del usuario. Toda nota nueva
debe incluir `updated`, fuente y estado (`current`, `historical` o `superseded`).
