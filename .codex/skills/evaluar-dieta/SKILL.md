---
name: evaluar-dieta
description: "Evaluate a current diet."
---

# Evaluador de Dieta

## Checklist de evaluación

### 1. Calorías totales
- [ ] Tiene un objetivo calórico definido
- [ ] Las calorías reales coinciden con el objetivo (margen +-100 kcal)
- [ ] El déficit no es excesivo (>750 kcal = riesgo de perder músculo)
- [ ] El déficit no es insuficiente para ver resultados

### 2. Proteína
- [ ] Alcanza mínimo 1.6 g/kg/dia (idealmente 1.8-2.4 g/kg)
- [ ] Distribuida en 3-5 comidas (20-40g por comida)
- [ ] Fuentes de alta calidad (leucina suficiente: 2.5-5g por comida)
- [ ] Incluye proteína antes de dormir (caseina o similar)

### 3. Grasas
- [ ] No menos del 20% de calorías totales como referencia principal de salud hormonal
- [ ] Rango práctico aproximado: 0.6-1.0 g/kg/dia según contexto, adherencia y calorías disponibles
- [ ] Fuentes saludables (omega-3, aceite oliva, aguacate, frutos secos)
- [ ] Hombres: mínimo 50-60g/dia | Mujeres: mínimo 35-45g/dia

### 4. Carbohidratos
- [ ] Suficientes para soportar el entrenamiento
- [ ] Priorizados alrededor del entrenamiento
- [ ] Mayoria complejos (avena, arroz integral, boniato, quinoa)
- [ ] Simples solo peri-entrenamiento (platano, arroz blanco)

### 5. Micronutrientes y fibra
- [ ] Incluye verduras variadas (mínimo 3-4 porciones/dia)
- [ ] Incluye frutas (2-3 porciones/dia)
- [ ] Fibra adecuada (25-35g/dia)
- [ ] Variedad de colores en verduras/frutas

### 6. Hidratación
- [ ] 3+ litros/dia hombres, 2.5+ litros/dia mujeres
- [ ] Extra en días de entrenamiento (+500ml-1L)

### 7. Timing
- [ ] Comida pre-entreno (1-3h antes): proteína + carbohidratos
- [ ] Comida post-entreno (dentro de 2-3h): proteína + carbohidratos
- [ ] Proteína distribuida a lo largo del dia (no concentrada en 1-2 comidas)

## Errores comunes a detectar

| Error | Problema | Solucion |
|-------|----------|----------|
| Proteína muy baja (<1.3 g/kg) | Riesgo de perder músculo | Subir a 1.8-2.4 g/kg |
| Grasa muy baja (<20% kcal) | Problemas hormonales | Subir a 25-30% |
| Déficit excesivo (>750 kcal) | Pérdida muscular, metabolismo lento | Reducir déficit a 300-500 kcal |
| Sin proteína post-entreno | Subóptimo para síntesis muscular | Añadir 20-40g proteína post-entreno |
| Toda la proteína en 1-2 comidas | Desperdicio (hay techo por comida) | Distribuir en 4-5 comidas |
| Sin verduras | Deficiencias de micronutrientes | Mínimo 3-4 porciones/dia |
| Alcohol frecuente | Inhibe síntesis proteica, calorías vacias | Minimizar o eliminar |
| Alimentos ultra-procesados >30% | Baja saciedad, peor calidad nutricional | Sustituir por alimentos enteros |

## Formato de respuesta

```
EVALUACIÓN DE TU DIETA
======================

CALORÍAS: [OK/BAJO/ALTO] — Xg actuales vs Xg objetivo
PROTEÍNA: [OK/BAJO/ALTO] — Xg actuales (X.X g/kg) vs recomendado X.X-X.X g/kg
GRASAS: [OK/BAJO/ALTO] — Xg actuales (XX% kcal) vs recomendado XX-XX%
CARBOHIDRATOS: [OK/BAJO/ALTO] — Xg actuales

PUNTOS FUERTES:
- ...
- ...

AREAS DE MEJORA:
1. [Prioridad alta] ...
2. [Prioridad media] ...
3. [Prioridad baja] ...

CAMBIOS SUGERIDOS:
- Cambiar [esto] por [esto] para mejorar [esto]
- Añadir [esto] para cubrir [esto]
```
