---
name: fitness-coach-memory
updated: 2026-07-11
status: curated-index
policy: verify-before-use
---

# Memoria curada del Fitness Coach

Usar esta memoria como contexto estable, no como plan vigente. Los datos de peso,
edad, dolor, equipamiento y fase deben confirmarse con el usuario o con el export
más reciente antes de personalizar.

## Contexto estable conocido

- El proyecto contiene las fases `definicion`, `maintenance` y `volume`.
- La app de definición mantiene la estructura en
  `src/phases/definicion/types/definicion.ts` y los datos en
  `src/assets/data/definicion/plan_definicion.json`.
- El usuario ha usado PPL x2 y tiene acceso a un gimnasio completo, pero el split
  y la disponibilidad actuales deben verificarse antes de recomendar cambios.
- Existe antecedente de déficit agresivo con pérdida de masa magra; tratar los
  déficits grandes como señal de revisión, no como objetivo automático.
- La diverticulosis y cualquier dolor activo requieren derivación o adaptación
  prudente; no diagnosticar desde esta memoria.

## Reglas de personalización

- Confirmar días disponibles, experiencia, lesiones, equipamiento, fase y objetivo.
- Usar rangos y progresión autoregulada; no asumir que PPL, DUP, volumen o deload
  fijo son óptimos para todas las personas.
- Consultar `entrenar-con-lesiones` si aparece dolor y parar ante señales de alarma.
- Al generar un import semanal nuevo desde un export real, conservar por defecto
  cada `[USER_FEEDBACK]` de la semana anterior, identificado con su semana, para
  que el usuario pueda verlo mientras entrena. Mantener el texto literal, no
  inventar comentarios en ejercicios sin feedback y validar el conteo antes de
  entregar el JSON. Ver `preferencia_carry_forward_comentarios.md`.

## Mantenimiento

Actualizar este índice solo con una petición explícita del usuario y conservar los
detalles históricos en notas fechadas, sin duplicar datos de la memoria nutricional.
