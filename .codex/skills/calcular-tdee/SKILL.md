---
name: calcular-tdee
description: "Calculate TDEE, BMR, and macros."
---

# Calculadora de TDEE y Macronutrientes

## Datos necesarios del usuario

Antes de calcular, pregunta:
1. **Peso** (kg)
2. **Altura** (cm)
3. **Edad** (años)
4. **Sexo** (hombre/mujer)
5. **Nivel de actividad** (sedentario, ligeramente activo, moderadamente activo, activo, muy activo)
6. **Objetivo** (perder grasa, recomposición, mantenimiento, volumen)
7. **% grasa corporal aproximado** (si lo sabe)

## Paso 1: Calcular TMB (Mifflin-St Jeor)

La fórmula es una estimación inicial; el error individual puede ser relevante y
debe calibrarse con la tendencia real del peso y la actividad.

**Hombres**: TMB = (10 x peso[kg]) + (6.25 x altura[cm]) - (5 x edad) + 5
**Mujeres**: TMB = (10 x peso[kg]) + (6.25 x altura[cm]) - (5 x edad) - 161

## Paso 2: Calcular TDEE

| Nivel | Factor | Descripción |
|-------|--------|-------------|
| Sedentario | x1.2 | Trabajo de oficina, poco movimiento |
| Ligeramente activo | x1.375 | Ejercicio ligero 1-3 días/semana |
| Moderadamente activo | x1.55 | Ejercicio moderado 3-5 días/semana |
| Activo | x1.725 | Ejercicio intenso 6-7 días/semana |
| Muy activo | x1.9 | Atletas, trabajo fisico + entrenamiento |

**TDEE = TMB x Factor de actividad**

## Paso 3: Aplicar déficit/superavit según objetivo

| Objetivo | Ajuste calórico | Velocidad de cambio |
|----------|-----------------|---------------------|
| Perder grasa (agresivo) | Ajuste individual y supervisado | Usar un ritmo conservador y revisarlo |
| Recomposición | Déficit pequeño o mantenimiento según contexto | Ajustar con tendencia, fuerza y adherencia |
| Mantenimiento | 0 kcal | Sin cambio |
| Volumen limpio | +200 a +300 kcal/dia | 0.25-0.5% peso/semana |

## Paso 4: Distribuir macronutrientes

### Proteína (PRIORIDAD #1)

| Contexto | Gramos por kg/dia |
|----------|-------------------|
| Recomposición | 1.8-2.4 g/kg |
| Déficit agresivo | 2.3-3.1 g/kg masa magra |
| Mantenimiento | 1.6-2.0 g/kg |
| Volumen | 1.6-2.2 g/kg |

### Grasa (PRIORIDAD #2)

- **Referencia principal**: 20-35% de calorías totales
- **Rango práctico**: 0.6-1.0 g/kg/dia según contexto, adherencia y calorías disponibles
- Evitar imponer mínimos por sexo; considerar energía total, salud, preferencias y contexto clínico

### Carbohidratos (RESTO)

- Calorías restantes después de proteína y grasa
- 1g proteína = 4 kcal | 1g carb = 4 kcal | 1g grasa = 9 kcal

## Paso 5: Presentar resultados

Presenta los resultados en una tabla clara:

```
RESULTADOS PERSONALIZADOS
========================
TMB: XXXX kcal
TDEE: XXXX kcal
Calorías objetivo: XXXX kcal (déficit de XXX kcal)

MACRONUTRIENTES DIARIOS
========================
Proteína: XXXg (XXX kcal - XX%)
Grasa: XXXg (XXX kcal - XX%)
Carbohidratos: XXXg (XXX kcal - XX%)

DISTRIBUCIÓN POR COMIDA (4 comidas)
========================
Proteína por comida: ~XXg
```

## Paso 6: Ajustes según progreso

- Pesar a diario, usar **promedio semanal**
- Si no hay pérdida en 2-3 semanas: reducir 100-150 kcal
- Si se pierde más de 1% peso/semana: subir 100-150 kcal
- Recalcular TDEE cada 5-10 kg de cambio

## Velocidad de pérdida

Usa un ritmo conservador como punto de partida y ajústalo con tendencia de peso,
rendimiento, hambre y composición corporal; no hay una fórmula universal basada
solo en el porcentaje de grasa.

## Fuentes

- Mifflin-St Jeor et al. (1990) — Fórmula TMB
- ISSN Position Stand (2017) — Proteína para personas activas
- Helms et al. (2014) — Proteína en déficit: 2.3-3.1 g/kg FFM
- Nuckols / Stronger by Science — Ritmo de pérdida
