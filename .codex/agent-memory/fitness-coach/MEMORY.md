# Fitness Coach Memory

## User Profile
- Male, 44 years old, works remotely from home
- Starting definicion phase: 102kg, ~21% BF (BIA), goal 93kg ~14% BF
- Has diverticulosis (takes salvado de trigo)
- Previous error: lost 63% lean mass in aggressive cut (1000 kcal deficit)
- Previous error: 3x12 for everything, no periodization, 1x/week frequency
- Available equipment: full gym access, can do double sessions (weights AM + cardio PM)
- 22 weeks available (March-July 2026), deadline: August trip
- Supplements: Whey Isolate, Creatine 3g, Caffeine 200mg, Omega-3 + D3
- Current training split: PPL x2 with DUP (force + hypertrophy)

## Definicion Phase Structure (in code)
- File: src/phases/definicion/types/definicion.ts
- 5 sub-phases: deficit_1 (S1-7), diet_break_1 (S8), deficit_2 (S9-15), diet_break_2 (S16), deficit_3 (S17-22)
- Mesocycles: 5 weeks (4 progressive + 1 deload)
- RPE progression per exercise via rpe_progresion array [S1, S2, S3, S4] + rpe_deload
- Exercise data in: src/assets/data/definicion/plan_definicion.json
- Nutrition CSVs per phase in: src/assets/data/definicion/{deficit_fase1,2,3,diet_break}/
- Progress analytics: src/phases/definicion/utils/progressAnalytics.ts

## Key Nutrition Values
- Fase 1: 2,155 kcal, 177g protein
- Fase 2: 2,308 kcal, 189g protein
- Fase 3: 2,365 kcal, 191g protein
- Diet break: 2,808 kcal, 214g protein
