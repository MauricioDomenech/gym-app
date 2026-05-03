---
name: calcular-tdee
description: "Calculate TDEE, BMR, and macros."
---

# Calculadora de TDEE y Macronutrientes

## Datos necesarios del usuario

Antes de calcular, pregunta:
1. **Peso** (kg)
2. **Altura** (cm)
3. **Edad** (anos)
4. **Sexo** (hombre/mujer)
5. **Nivel de actividad** (sedentario, ligeramente activo, moderadamente activo, activo, muy activo)
6. **Objetivo** (perder grasa, recomposicion, mantenimiento, volumen)
7. **% grasa corporal aproximado** (si lo sabe)

## Paso 1: Calcular TMB (Mifflin-St Jeor)

La formula mas precisa segun la evidencia (dentro del 10% del metabolismo real).

**Hombres**: TMB = (10 x peso[kg]) + (6.25 x altura[cm]) - (5 x edad) + 5
**Mujeres**: TMB = (10 x peso[kg]) + (6.25 x altura[cm]) - (5 x edad) - 161

## Paso 2: Calcular TDEE

| Nivel | Factor | Descripcion |
|-------|--------|-------------|
| Sedentario | x1.2 | Trabajo de oficina, poco movimiento |
| Ligeramente activo | x1.375 | Ejercicio ligero 1-3 dias/semana |
| Moderadamente activo | x1.55 | Ejercicio moderado 3-5 dias/semana |
| Activo | x1.725 | Ejercicio intenso 6-7 dias/semana |
| Muy activo | x1.9 | Atletas, trabajo fisico + entrenamiento |

**TDEE = TMB x Factor de actividad**

## Paso 3: Aplicar deficit/superavit segun objetivo

| Objetivo | Ajuste calorico | Velocidad de cambio |
|----------|-----------------|---------------------|
| Perder grasa (agresivo) | -500 kcal/dia | 0.5-1% peso/semana |
| Recomposicion | -250 a -300 kcal/dia | 0.3-0.5% peso/semana |
| Mantenimiento | 0 kcal | Sin cambio |
| Volumen limpio | +200 a +300 kcal/dia | 0.25-0.5% peso/semana |

## Paso 4: Distribuir macronutrientes

### Proteina (PRIORIDAD #1)

| Contexto | Gramos por kg/dia |
|----------|-------------------|
| Recomposicion | 1.8-2.4 g/kg |
| Deficit agresivo | 2.3-3.1 g/kg masa magra |
| Mantenimiento | 1.6-2.0 g/kg |
| Volumen | 1.6-2.2 g/kg |

### Grasa (PRIORIDAD #2)

- **Referencia principal**: 20-35% de calorias totales
- **Rango practico**: 0.6-1.0 g/kg/dia segun contexto, adherencia y calorias disponibles
- **Hombres**: minimo 50-60g/dia (salud hormonal)
- **Mujeres**: minimo 35-45g/dia

### Carbohidratos (RESTO)

- Calorias restantes despues de proteina y grasa
- 1g proteina = 4 kcal | 1g carb = 4 kcal | 1g grasa = 9 kcal

## Paso 5: Presentar resultados

Presenta los resultados en una tabla clara:

```
RESULTADOS PERSONALIZADOS
========================
TMB: XXXX kcal
TDEE: XXXX kcal
Calorias objetivo: XXXX kcal (deficit de XXX kcal)

MACRONUTRIENTES DIARIOS
========================
Proteina: XXXg (XXX kcal - XX%)
Grasa: XXXg (XXX kcal - XX%)
Carbohidratos: XXXg (XXX kcal - XX%)

DISTRIBUCION POR COMIDA (4 comidas)
========================
Proteina por comida: ~XXg
```

## Paso 6: Ajustes segun progreso

- Pesar a diario, usar **promedio semanal**
- Si no hay perdida en 2-3 semanas: reducir 100-150 kcal
- Si se pierde mas de 1% peso/semana: subir 100-150 kcal
- Recalcular TDEE cada 5-10 kg de cambio

## Regla de Nuckols para velocidad de perdida

% grasa corporal / 20 = % de peso corporal a perder por semana

Ejemplo: 20% grasa = perder ~1%/semana | 12% grasa = ~0.6%/semana

## Fuentes

- Mifflin-St Jeor et al. (1990) — Formula TMB
- ISSN Position Stand (2017) — Proteina para personas activas
- Helms et al. (2014) — Proteina en deficit: 2.3-3.1 g/kg FFM
- Nuckols / Stronger by Science — Ritmo de perdida
