---
name: plan-alimentacion
description: "Build meal plans with macros."
---

# Generador de Planes de Alimentacion

## Datos necesarios

1. **Calorias objetivo** (usar /calcular-tdee si no las tiene)
2. **Macros objetivo** (proteina, carbs, grasas en gramos)
3. **Restricciones alimentarias** (vegetariano, sin lactosa, alergias, etc.)
4. **Numero de comidas** preferido (3, 4, 5 o 6)
5. **Horario de entrenamiento** (para timing de comidas peri-entreno)

## Estructura de cada comida

Cada comida debe incluir:
- **Alimento** con cantidad en gramos
- **Macros** (proteina, carbohidratos, grasa)
- **Calorias**
- **Notas** de preparacion si aplica

## Alimentos base por macronutriente

### Proteinas de alta calidad (priorizar)
| Alimento | Proteina/100g | Notas |
|----------|---------------|-------|
| Pechuga de pollo | 31g | La base de toda dieta fitness |
| Pavo | 29g | Muy magro |
| Atun en lata | 26g | Economico, practico |
| Ternera magra | 26g | Rica en hierro y zinc |
| Salmon | 25g | Omega-3 + vitamina D |
| Huevos | ~6g/unidad | Perfil aminoacido completo |
| Yogur griego | 10g | Snack con probioticos |
| Lentejas (secas) | 25g | Fibra + hierro (vegetal) |
| Tofu firme | 17g | Opcion vegetal |
| Whey protein | ~24g/scoop | Suplemento, no sustituye comida real |

### Carbohidratos complejos (base diaria)
- Avena, arroz integral, boniato/batata, quinoa, patata, pan integral

### Carbohidratos simples (peri-entrenamiento)
- Platano, arroz blanco, frutos rojos, miel (pequenas cantidades)

### Grasas saludables
- Aceite de oliva virgen extra, aguacate, frutos secos, semillas chia/lino, chocolate negro 85%+

### Verduras (volumen y micronutrientes)
- Espinacas, brocoli, pimientos, zanahorias, tomates, col rizada

## Plantilla de plan diario

```
DIA: [Lunes/Martes/etc.]
Calorias totales: XXXX kcal | P: XXXg | C: XXXg | G: XXXg

DESAYUNO (HH:MM) — XXX kcal
- [Alimento] ([cantidad]g) — Xg P / Xg C / Xg G
- [Alimento] ([cantidad]g) — Xg P / Xg C / Xg G
Total: Xg P / Xg C / Xg G

MEDIA MANANA / PRE-ENTRENO (HH:MM) — XXX kcal
- ...

ALMUERZO (HH:MM) — XXX kcal
- ...

MERIENDA / POST-ENTRENO (HH:MM) — XXX kcal
- ...

CENA (HH:MM) — XXX kcal
- ...

SNACK NOCTURNO (opcional) — XXX kcal
- Caseina (25-40g) para sintesis proteica nocturna
```

## Reglas de distribucion

- **Proteina**: 20-40g por comida, espaciadas cada 3-4h
- **Pre-entreno** (1-3h antes): proteina + carbohidratos complejos
- **Post-entreno** (dentro de 2-3h): proteina rapida (whey) + carbohidratos
- **Antes de dormir**: caseina o proteina de liberacion lenta
- **Dias de entreno**: mas carbohidratos (40-50% calorias)
- **Dias de descanso**: menos carbohidratos (30-40%), mas grasas

## Meal prep semanal (domingo, 2-3h)

1. **Proteinas**: 1.5 kg pollo + 500g salmon + 12 huevos duros
2. **Carbohidratos**: 500g arroz integral + 1 kg boniato + 300g quinoa
3. **Verduras**: brocoli, espinacas, pimientos cortados
4. **Porcionar** en tuppers etiquetados por dia
5. **Congelar** porciones de jueves-viernes

## Notas importantes

- La frecuencia de comidas NO importa para resultados (estudio Tavares 2025): 3 o 6 comidas da igual si el total diario es correcto
- Regla 80/20: 80% alimentos nutritivos, 20% por placer
- Las verduras congeladas son igual de nutritivas que las frescas
- Hidratacion: 3+ litros/dia hombres, 2.5+ litros/dia mujeres
