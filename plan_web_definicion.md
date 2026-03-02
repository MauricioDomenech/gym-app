# Plan: Nueva Fase "Definición" para gym-app

## Contexto

El usuario completó una fase de volumen y ahora inicia un plan de corte/definición de 22 semanas (marzo → agosto 2026) con el objetivo de bajar de 102kg/21% BF a ~93kg/14% BF. El plan tiene 3 fases de déficit + 2 diet breaks, entrenamiento PPL x2 con DUP, y necesita tracking de composición corporal. Quiere una sección en la web similar a la fase de volumen pero adaptada a este plan más complejo.

**Nombre**: "Definición" en la UI, `definicion` como ID interno en código.
**Color**: Verde esmeralda (`emerald-600` / `teal-600`) — distinto de mantenimiento (azul) y volumen (naranja).

---

## Estructura de archivos a crear

```
src/phases/definicion/
├── components/
│   ├── DefinicionApp.tsx                    # Componente principal
│   ├── layout/
│   │   ├── DefinicionPhaseTimeline.tsx      # NUEVO: timeline de 5 sub-fases (22 semanas)
│   │   └── DefinicionWeekSelector.tsx       # NUEVO: selector de semana dentro de sub-fase
│   ├── exercises/
│   │   ├── DefinicionExerciseCard.tsx       # Card con RPE badge + indicador deload
│   │   ├── DefinicionExerciseList.tsx       # Lista de ejercicios del día
│   │   ├── DefinicionIndividualTracker.tsx  # Tracker con campo RPE percibido
│   │   ├── DefinicionAlternativesList.tsx   # Alternativas (adaptar de volume)
│   │   ├── DefinicionExerciseImageModal.tsx # Modal de imagen (adaptar de volume)
│   │   └── DefinicionCopyWeekData.tsx       # Copiar datos entre semanas
│   ├── nutrition/
│   │   ├── DefinicionNutritionTable.tsx     # Tabla nutrición con indicador sub-fase
│   │   └── DefinicionColumnToggle.tsx       # Toggle columnas
│   ├── cardio/
│   │   └── DefinicionCardioTracker.tsx      # NUEVO: seguimiento cardio diario
│   ├── body/
│   │   ├── DefinicionBodyTracker.tsx        # NUEVO: formulario composición corporal
│   │   └── DefinicionBodyChart.tsx          # NUEVO: gráfico evolución (SVG)
│   ├── shopping/
│   │   └── DefinicionShoppingList.tsx       # Lista de compras
│   └── summary/
│       └── DefinicionSummary.tsx            # NUEVO: dashboard 22 semanas
├── contexts/
│   └── DefinicionDataContext.tsx             # Contexto con sub-fases y mesociclos
├── services/
│   ├── definicionCSVParser.ts               # Parser que mapea semana → sub-fase → CSV
│   ├── definicionExerciseParser.ts          # Parser JSON con RPE dinámico
│   └── definicionSupabaseService.ts         # CRUD para tablas definicion_*
├── types/
│   └── definicion.ts                        # Tipos + constantes sub-fases + utilidades
└── index.ts

src/assets/data/definicion/
├── deficit_fase1/fase1_{dia}.csv  ×7     # 2,150 kcal (semanas 1-7)
├── deficit_fase2/fase2_{dia}.csv  ×7     # 2,250 kcal (semanas 9-15)
├── deficit_fase3/fase3_{dia}.csv  ×7     # 2,300 kcal (semanas 17-22)
├── diet_break/break_{dia}.csv     ×7     # ~2,700 kcal (semanas 8, 16)
└── plan_definicion.json                   # Ejercicios PPL x2 con DUP

database/
└── definicion-schema.sql                  # 5 tablas nuevas
```

**Total: ~45 archivos nuevos** (28 CSVs + 1 JSON + ~16 componentes/servicios/tipos)

---

## Diferencias clave vs Volumen

| Aspecto | Volumen | Definición |
|---------|---------|------------|
| Semanas | 2 (repetidas) | 22 (3 fases + 2 diet breaks) |
| Navegación | 3 tabs (Resumen, S1, S2) | Timeline de 5 sub-fases + selector de semana |
| Nutrición | 1 plan para todas las semanas | 4 planes distintos según sub-fase |
| RPE | No tiene | Por ejercicio, progresivo por mesociclo |
| Deload | No tiene | Cada 5ª semana (reduce volumen/RPE) |
| Body tracking | No tiene | Peso, % grasa, medidas semanales |
| Cardio tracking | No tiene | LISS/HIIT diario con duración |
| Tabs contenido | 2 (Nutrición, Compras) | 4 (Nutrición, Cardio, Cuerpo, Compras) |
| Color | Naranja/Rojo | Esmeralda/Teal |

---

## Diseño de navegación

```
┌──────────────────────────────────────────────────────────────┐
│  Plan Nutricional y Ejercicios - Definición     [☀/🌙] [←]  │ Header
├──────────────────────────────────────────────────────────────┤
│  [===Fase 1===][DB][===Fase 2===][DB][==Fase 3==]           │ PhaseTimeline
│       ●                                                      │ (● = semana actual)
│              Semana 3/22 — Fase 1 Déficit (2,150 kcal)      │
├──────────────────────────────────────────────────────────────┤
│  [Res] [S1] [S2] [S3●] [S4] [S5⟳] [S6] [S7]               │ WeekSelector
├──────────────────────────────────────────────────────────────┤
│  [Lu] [Ma] [Mi●] [Ju] [Vi] [Sa] [Do]                        │ DaySelector
├──────────────────────────────────────────────────────────────┤
│  [Nutrición y Ejercicios] [Cardio] [Cuerpo] [Compras]       │ ContentTabs
├──────────────────────────────────────────────────────────────┤
│  ... contenido según tab seleccionado ...                    │
└──────────────────────────────────────────────────────────────┘

Leyenda WeekSelector: ● = actual, ⟳ = deload
```

---

## Datos estáticos: estructura de CSVs

Formato idéntico al de volumen (11 columnas):
```
comida,hora,alimento,cantidad,unidad,kcal,proteinas_g,carbohidratos_g,grasas_g,fibra_g,notas
```

Horario adaptado al plan del informe:
```
Desayuno pre-entreno,07:00,...         ~400 kcal (~30g prot)
Post-entreno (batido),10:00,...        ~390 kcal (~42g prot)  ← whey 1.5 scoops + 60g crema arroz
Comida ligera,13:00,...                ~300-350 kcal (~33g prot)
Pre-cardio,16:30,...                   ~200 kcal (~15g prot)
Post-cardio,18:00,...                  ~150 kcal (~25g prot)
Cena,20:30,...                         ~450 kcal (~35g prot)
```

Los CSVs de diet break usan la misma estructura pero con porciones más grandes (~2,700 kcal).

---

## Datos estáticos: plan_definicion.json

```json
{
  "plan": [
    {
      "orden": 0,
      "dia": "Lunes",
      "tipo": "Push 1 (Fuerza)",
      "musculos": "Pecho + Deltoide anterior + Triceps",
      "ejercicios": [
        {
          "nombre": "Press banca inclinado 30°",
          "series": "4",
          "repeticiones": "5-7",
          "rpe_progresion": [7, 7.5, 8, 8.5],
          "rpe_deload": 6,
          "descanso": "3 min",
          "imagen": "img_corte_lun_01.jpg",
          "alternativas": [...]
        }
      ]
    }
  ],
  "cardio": {
    "lunes": { "tipo": "liss", "duracion": "30 min", "detalle": "Caminata inclinada 8-10%, 5.5-6 km/h" },
    "martes": { "tipo": "liss", "duracion": "25-30 min", "detalle": "Caminata inclinada 6-8%" },
    "miercoles": null,
    "jueves": { "tipo": "liss", "duracion": "25-30 min", "detalle": "Caminata inclinada" },
    "viernes": { "tipo": "liss", "duracion": "25-30 min", "detalle": "Caminata inclinada" },
    "sabado": { "tipo": "hiit", "duracion": "15-20 min", "detalle": "6-8 intervalos 30s sprint + 90s caminata", "opcional": true },
    "domingo": null
  }
}
```

---

## Base de datos: 5 tablas nuevas

Archivo: `database/definicion-schema.sql`

1. **`definicion_workout_progress`** — igual que volume + campo `rpe_actual DECIMAL NULL`
2. **`definicion_shopping_lists`** — igual que volume
3. **`definicion_settings`** — igual que volume (guarda semana, día, columnas, start_date)
4. **`definicion_body_composition`** — NUEVA (week, peso, grasa_corporal, cintura, cadera, pecho, brazo, muslo, notas)
5. **`definicion_cardio_logs`** — NUEVA (day, week, tipo, duracion_minutos, completado, notas)

Mismas políticas RLS públicas que volumen.

---

## Tipos clave nuevos (definicion.ts)

```typescript
// Sub-fases con su configuración
type DefinicionSubPhase = 'deficit_1' | 'diet_break_1' | 'deficit_2' | 'diet_break_2' | 'deficit_3';

interface DefinicionSubPhaseConfig {
  id: DefinicionSubPhase;
  nombre: string;
  semanaInicio: number;  // 1-22
  semanaFin: number;
  kcalDiarias: number;
  deficit: number;
  esDietBreak: boolean;
}

// Constante con las 5 sub-fases
const DEFINICION_SUB_PHASES: DefinicionSubPhaseConfig[] = [
  { id: 'deficit_1', nombre: 'Fase 1 — Déficit', semanaInicio: 1, semanaFin: 7, kcalDiarias: 2150, deficit: 550, esDietBreak: false },
  { id: 'diet_break_1', nombre: 'Diet Break 1', semanaInicio: 8, semanaFin: 8, kcalDiarias: 2750, deficit: 0, esDietBreak: true },
  // ... etc
];

// Info de mesociclo (calculada dinámicamente)
interface MesocycleInfo {
  weekInMesocycle: number;  // 1-5
  isDeload: boolean;        // true si semana 5
  isDietBreak: boolean;
}

// Funciones utilitarias
getSubPhaseForWeek(week: number): DefinicionSubPhaseConfig
getMesocycleInfo(week: number): MesocycleInfo
getCurrentRPE(exercise, mesocycleInfo): number

// Progreso con RPE
interface DefinicionWorkoutProgress extends VolumeWorkoutProgress {
  rpeActual: number | null;  // RPE percibido por el usuario
}

// Composición corporal (nuevo)
interface DefinicionBodyComposition {
  week: number; date: string; peso: number;
  grasaCorporal?: number; cintura?: number; /* etc */
}

// Cardio log (nuevo)
interface DefinicionCardioLog {
  day: string; week: number; tipo: 'liss' | 'hiit' | 'caminata';
  duracionMinutos: number; completado: boolean;
}
```

---

## Parser CSV: mapeo semana → sub-fase

La diferencia clave con volumen: el parser no mapea `week → CSV` directamente, sino `week → subPhase → CSV`.

```
Semana 1-7   → lee CSVs de deficit_fase1/
Semana 8     → lee CSVs de diet_break/
Semana 9-15  → lee CSVs de deficit_fase2/
Semana 16    → lee CSVs de diet_break/
Semana 17-22 → lee CSVs de deficit_fase3/
```

Esto permite tener solo 28 CSVs en vez de 154 (22×7).

---

## Componentes nuevos más importantes

### 1. DefinicionPhaseTimeline
Barra horizontal proporcional con 5 segmentos coloreados. Muestra sub-fase actual y semana con un punto indicador. Clickeable para navegar. En móvil muestra solo la sub-fase actual con flechas ← →.

### 2. DefinicionWeekSelector
Botones de semana dentro de la sub-fase activa + botón "Resumen" (semana 0). Semanas deload marcadas con ícono ⟳. Semanas con datos marcadas con check ✓.

### 3. DefinicionIndividualTracker
Igual que volume pero agrega: slider RPE percibido (6-10, pasos de 0.5), badge RPE objetivo del mesociclo, indicador visual si es deload.

### 4. DefinicionCardioTracker (nuevo)
Muestra el cardio esperado para el día (tipo, duración), input de duración real, checkbox completado, notas. Historial de la semana.

### 5. DefinicionBodyTracker (nuevo)
Formulario semanal: peso (obligatorio), % grasa, medidas (cintura, cadera, etc). Tabla con últimas 4 entradas. Se accede desde la pestaña "Cuerpo".

### 6. DefinicionBodyChart (nuevo)
Gráfico SVG simple de peso vs semanas en la vista Resumen. Zonas coloreadas para diet breaks. Sin dependencias externas.

### 7. DefinicionSummary
Dashboard con: timeline de progreso, promedios nutricionales por sub-fase, gráfico composición corporal, % ejercicios completados, sesiones cardio completadas.

---

## Cambios en archivos existentes

| Archivo | Cambio |
|---------|--------|
| `src/contexts/PhaseContext.tsx` | Agregar `'definicion'` al tipo `PhaseType` |
| `src/App.tsx` | Importar `DefinicionApp`, agregar rama `currentPhase === 'definicion'` |
| `src/components/phase/PhaseSelector.tsx` | Agregar tercer botón verde "Definición" |

---

## Orden de implementación

1. **Tipos** (`definicion.ts`) — constantes, interfaces, utilidades
2. **Schema SQL** (`definicion-schema.sql`) — crear tablas
3. **Integración PhaseContext** — agregar tipo + botón en PhaseSelector + rama en App.tsx
4. **Datos estáticos** — `plan_definicion.json` + CSVs (empezar con fase1 lunes para probar)
5. **Parsers** — CSV parser con mapeo semana→subfase, exercise parser
6. **Servicio Supabase** — CRUD para las 5 tablas
7. **Contexto** (`DefinicionDataContext.tsx`) — estado, carga, persistencia
8. **Layout** — `DefinicionApp.tsx` + `PhaseTimeline` + `WeekSelector`
9. **Nutrición** — tabla + column toggle
10. **Ejercicios** — card + list + tracker con RPE
11. **Cardio** — tracker diario
12. **Cuerpo** — formulario + gráfico
13. **Compras** — lista adaptada
14. **Resumen** — dashboard
15. **Completar CSVs** restantes (28 total)
16. **Imágenes** de ejercicios nuevos

---

## Archivos de referencia (fase volumen existente)

Estos archivos deben usarse como base/referencia para crear los equivalentes de definición:

| Archivo volumen (referencia) | Archivo definición (crear) |
|------------------------------|---------------------------|
| `src/phases/volume/types/volume.ts` | `src/phases/definicion/types/definicion.ts` |
| `src/phases/volume/services/volumeCSVParser.ts` | `src/phases/definicion/services/definicionCSVParser.ts` |
| `src/phases/volume/services/volumeExerciseParser.ts` | `src/phases/definicion/services/definicionExerciseParser.ts` |
| `src/phases/volume/services/volumeSupabaseService.ts` | `src/phases/definicion/services/definicionSupabaseService.ts` |
| `src/phases/volume/contexts/VolumeDataContext.tsx` | `src/phases/definicion/contexts/DefinicionDataContext.tsx` |
| `src/phases/volume/components/VolumeApp.tsx` | `src/phases/definicion/components/DefinicionApp.tsx` |
| `src/phases/volume/components/exercises/*` | `src/phases/definicion/components/exercises/*` |
| `src/phases/volume/components/nutrition/*` | `src/phases/definicion/components/nutrition/*` |
| `src/phases/volume/components/shopping/*` | `src/phases/definicion/components/shopping/*` |
| `src/assets/data/volumen/plan_volumen.json` | `src/assets/data/definicion/plan_definicion.json` |
| `src/assets/data/volumen/semana1/*.csv` | `src/assets/data/definicion/deficit_fase1/*.csv` |
| `database/volume-schema.sql` | `database/definicion-schema.sql` |

---

## Verificación

1. `npm run dev` — verificar que la app arranca sin errores
2. Seleccionar fase "Definición" en el PhaseSelector
3. Navegar entre sub-fases y semanas en el timeline
4. Verificar nutrición muestra datos distintos para fase 1 vs diet break
5. Verificar ejercicios muestran RPE correcto según semana del mesociclo
6. Verificar deload (semana 5, 10, 15, 20) muestra indicador visual y RPE reducido
7. Registrar peso en ejercicio → verificar persistencia (recargar página)
8. Registrar composición corporal → verificar en resumen
9. Registrar cardio → verificar completado
10. Generar lista de compras → verificar agregación correcta
11. Dark mode funciona en todos los componentes
12. Responsive: verificar timeline en móvil (380px)
