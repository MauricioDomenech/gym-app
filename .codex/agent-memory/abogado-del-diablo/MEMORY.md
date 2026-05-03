# Abogado del Diablo — Memoria

## Claims verificados
- [BIA accuracy limitations](verified_bia_accuracy.md) — Home BIA scales have +/-5% body fat error vs DEXA; weekly changes <0.7kg are noise
- [TDEE calculation accuracy](verified_tdee_accuracy.md) — Mifflin-St Jeor +/-10% in 70% of obese individuals; total TDEE error +/-300-400 kcal
- [Valsalva IAP by exercise](verified_valsalva_iap.md) — Squats >200mmHg, deadlift 161-176mmHg; relevant for diverticular disease
- [Cooking conversion factors](verified_cooking_conversion_factors.md) — White rice x2.8-3.0, brown rice x2.0-2.5, whole wheat pasta x2.4-2.8
- [Fat intake and hormonal health](verified_fat_intake_hormonal.md) — Low fat (<20% kcal) reduces testosterone 10-15% (Whittaker 2021); "0.8g/kg minimum" is practical guideline, not from single study
- [Vitamin D deficiency in Spain](verified_vitamin_d_spain.md) — 88% below 30ng/mL; 2000 IU/day preferred; paradoxical for sunny country
- [Alpert fat oxidation rate](verified_alpert_fat_oxidation.md) — CORRECTED to ~22 kcal/lb/day (not 31); widely misquoted in fitness
- [Deficit thresholds for muscle preservation](verified_deficit_muscle_preservation.md) — Murphy 2022: >500kcal inhibits LBM gains; Helms 2014: 2.3-3.1 g/kg FFM for lean athletes in deficit; Garthe 2011: 0.7%/week preserves LBM better in athletes; Nuckols: %BF/20 = safe %/week
- [T3 suppression and overtraining risk](verified_t3_suppression_deficit.md) — Caloric restriction suppresses T3 as adaptive mechanism; risk accumulates with >6-8 weeks deficit + high training volume; MATADOR data verified (12.3 vs 8.0 kg) but NOT extrapolable to trained athletes directly

## Claims desmentidos
- Cooking factor for white rice /2.5 — INCORRECT, should be /2.8-3.0
- Cooking factor for brown rice /2.8 — INCORRECT, should be /2.0-2.5
- "0.8 g/kg fat is the evidence-based minimum" — MISLEADING; actual threshold is 20% of maintenance kcal
- "Murphy 2022 establece umbral de 700 kcal para catabolismo" — INCORRECTO; Murphy establece ~500 kcal como límite para preservar ganancias. No hay umbral explícito de 700 kcal en el paper.
- "Omega-3 suplementado permite reducir el umbral mínimo de grasa total para hormonas" — SIN EVIDENCIA; el umbral hormonal depende de grasa total, no de calidad de ácidos grasos

## Hallazgos de revisiones
- [Silent food substitutions](finding_silent_food_changes.md) — Nutrition agent sometimes changes foods without being asked; always git diff
- [Domingo cardio labels](finding_domingo_cardio_labels.md) — Domingo CSVs have pre/post-cardio labels but cardio is null; needs same fix as miercoles

## Fuentes confiables descubiertas
- Frontiers in Nutrition 2024 (BIA reliability study) — excellent methodology
- MacroFactor help articles — honest about TDEE calculator limitations
- PMC 6945051 (Valsalva systematic review) — comprehensive IAP data
- Whittaker 2021 (JSBMB) — gold standard meta-analysis on fat and testosterone
- PubMed 21179052 — vitamin D deficiency in Spain cohort study

## Claims verificados (USDA 2024-2026)
- [USDA verified macros](verified_usda_macros.md) — Nueces/salmón/pollo/pavo/lomo/ternera/aguacate/crema arroz vs USDA FoodData Central
- Atún claro en aceite escurrido: PROTEÍNA subestimada en plan (~29g/100g real vs ~25g declarado)
- Proteína pollo 200g crudo: 330 kcal en CSV es +37% sobre USDA (240 kcal real) — reconfirmado como error sistemático de cocinado vs crudo
- Lomo cerdo proteína: 27g/100g en CSV vs 21g/100g USDA — sobreestimación del +28%
- Ternera filete: 26g P/100g CSV consistente con sirloin (no top round), kcal 150/100g sugiere corte mixto lean+fat
- Salmón atlántico farmed: 208 kcal/100g, 20.4g P, 13.4g G — CSV prácticamente perfecto
- Nueces 16g: CSV exactamente correcto vs USDA (104.6 kcal real, +0.4 diferencia)
- Salmón 4x/semana: SEGURO para mercurio (FDA Best Choice category); omega-3 total ~2.9g/día dentro del límite EFSA 5g/día
- Deficit 834 kcal/día (~31% TDEE de 2720): EXCEDE el límite Murphy 2022 (~500 kcal) para preservación de LBM
- Proteína 179g/día = 2.24 g/kg FFM (80kg): MARGINALMENTE por debajo del mínimo Helms 2014 (2.3 g/kg FFM)

## Claims desmentidos
- Cooking factor for white rice /2.5 — INCORRECT, should be /2.8-3.0
- Cooking factor for brown rice /2.8 — INCORRECT, should be /2.0-2.5
- "0.8 g/kg fat is the evidence-based minimum" — MISLEADING; actual threshold is 20% of maintenance kcal
- "Murphy 2022 establece umbral de 700 kcal para catabolismo" — INCORRECTO; Murphy establece ~500 kcal como límite para preservar ganancias. No hay umbral explícito de 700 kcal en el paper.
- "Omega-3 suplementado permite reducir el umbral mínimo de grasa total para hormonas" — SIN EVIDENCIA; el umbral hormonal depende de grasa total, no de calidad de ácidos grasos

## Hallazgos de revisiones
- [Silent food substitutions](finding_silent_food_changes.md) — Nutrition agent sometimes changes foods without being asked; always git diff
- [Domingo cardio labels](finding_domingo_cardio_labels.md) — Domingo CSVs have pre/post-cardio labels but cardio is null; needs same fix as miercoles
- Pollo crudo 165g/100g vs USDA 120/100g: diferencia persistente desde sesiones anteriores; posiblemente el agente de nutrición usa valores de pollo cocinado o con piel

## Fuentes confiables descubiertas
- Frontiers in Nutrition 2024 (BIA reliability study) — excellent methodology
- MacroFactor help articles — honest about TDEE calculator limitations
- PMC 6945051 (Valsalva systematic review) — comprehensive IAP data
- Whittaker 2021 (JSBMB) — gold standard meta-analysis on fat and testosterone
- PubMed 21179052 — vitamin D deficiency in Spain cohort study
- FDA/EPA Fish Advice 2024 (fda.gov/food/consumers/advice-about-eating-fish) — salmon as Best Choice, safe 2-4x/week
- EFSA 2026 (DOI: 10.2903/j.efsa.2026.9858) — EPA+DHA safe up to 5g/day supplemental

## User-specific notes
- User (Mauri): 43 years, 101.5kg (updated Apr 2026), diverticulosis diagnosed, takes wheat bran
- Diverticulosis + high animal protein intake flagged as potential concern (PMC 11966515)
- User tends toward frustration when scale doesn't move — needs data-driven reassurance, not platitudes
- Current plan (Apr 2026): ~1886 kcal declared, deficit ~834 kcal/día (31% TDEE) — AGGRESSIVO
- Plan matemáticamente correcto: sumatorias cuadran a ±2 kcal en todos los días
