---
name: USDA verified macros for common foods in plan (April 2026)
description: Per-100g USDA FoodData Central values for recurring foods in Mauri's nutrition plan; use to spot-check future plan revisions
type: reference
---

## USDA FoodData Central — valores por 100g (verificado abril 2026)

| Alimento | kcal | P (g) | C (g) | G (g) | Fuente USDA |
|----------|------|--------|--------|--------|-------------|
| Nueces inglesas crudas | 654 | 15.2 | 13.7 | 65.2 | FDC #170187 |
| Salmón atlántico farmed crudo | 208 | 20.4 | 0 | 13.4 | FDC #175167 |
| Pechuga pollo cruda sin piel | 120 | 22.5 | 0 | 2.6 | nutritionvalue.org |
| Pechuga pavo cruda sin piel | 114 | 23.3 | 0 | 2.3 | nutritionvalue.org |
| Lomo cerdo tenderloin lean | 109 | 21.0 | 0 | 2.2 | USDA SR Legacy |
| Lomo cerdo top loin (lean+fat) | 155 | 21.6 | 0 | 6.4 | USDA SR Legacy |
| Ternera top round lean | 127 | 23.5 | 0 | 3.7 | USDA SR Legacy |
| Ternera sirloin (más probable) | ~172 | 26.3 | 0 | 7.0 | USDA SR Legacy |
| Aguacate Hass crudo | 160 | 2.0 | 8.5 | 14.7 | FDC all varieties |
| Crema de arroz polvo (dry) | 371 | 6.3 | 82.4 | 0.5 | nutritionvalue.org USDA |
| Atún claro aceite oliva escurrido | 198 | 29.1 | 0 | 8.2 | USDA SR Legacy #173708 |
| Skipjack (atún listado) crudo | 103 | 22.0 | 0 | 1.1 | USDA #175156 |
| Bonito Sarda sarda (FAO) | ~144 | ~22.0 | 0 | ~6.0 | FAO/Seafish (no en FDC) |
| Whey concentrate genérico | ~120 | 24.0 | 3.0 | 1.5 | per 30g serving |

## Notas de discrepancia importantes

**Pollo crudo**: El CSV usa 165 kcal/100g y 31g P/100g. USDA da 120 kcal y 22.5g P.
La diferencia del +37% sugiere que el agente de nutrición usa valores de pollo cocinado (al cocinar
el pollo pierde ~25-30% de peso en agua, concentrando los macros). Sin embargo, si el usuario
pesa crudo y cocina, los gramos de proteína TOTALES sí son correctos (mismo contenido final).
VEREDICTO: El error está en la densidad calórica declarada por 100g, pero los totales del día
pueden ser correctos si la cantidad de pollo se calibró para alcanzar el objetivo proteico.

**Atún en aceite escurrido**: La GRASA está sobreestimada en el CSV (+33%).
USDA: 8.2g G/100g. CSV: ~10.9g G/100g. Probablemente el usuario/agente usa valores de atún
sin escurrir bien, o valores de marca española que retiene más aceite.

**Proteína atún**: CSV SUBestima proteína (~25.5g/100g vs USDA 29.1g/100g, -12%).
Esto es FAVORABLE para el usuario (más proteína real de la que registra).

**Lomo cerdo proteína**: CSV 27g P/100g vs USDA 21g P/100g (+28%). Posible error de base
de datos, o el agente usa valores de lomo ibérico vs lomo de cerdo blanco.

**How to apply**: En futuras revisiones, si el pollo o cerdo aparecen con proteína >25g/100g
en crudo, marcar como sospechoso. Para atún en aceite, la grasa declarada tiende a estar
inflada entre 30-35% respecto a USDA.
