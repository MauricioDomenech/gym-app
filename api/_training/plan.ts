import type {
  TrainingCardioPlan,
  TrainingRoutine,
  TrainingRoutineItem,
} from '../../src/components/training/trainingStorage.js';

const source = 'projects/coach/review-20260924/rutina-reconstruida.md · aprobado por Mauri 24/09/2026';

const cardioProgression = [{ id: 'accepted-160', label: 'Objetivo acordado', moderateMinutes: 160 }] as const;
const cardioNotes = 'Dosis acordada: 210 minutos totales, 160 moderados semanales. Ajustar velocidad y pendiente para sostener esfuerzo tolerable, no perseguir 130 ppm. No aumentar automáticamente por calendario. Si la recuperación o la fuerza empeoran, revisar la dosis. No duplicar otras caminatas moderadas.';
const cardioIntensity = 'Caminar en cinta con velocidad e inclinación que permitan hablar en frases, pero hagan difícil cantar. Respiración claramente elevada sin necesitar pausas para decir unas pocas palabras. La prueba del habla es aproximada: no una prueba diagnóstica ni un umbral medido.';
const loadGuidance = 'No prescribo kilos iniciales a partir de números cuya máquina o unidad no estén confirmadas. Registrar máquina, configuración y unidad; en Smith, aclarar si el número incluye la barra.';
const unilateral = 'Hacer ambos lados. Descansar antes de repetir el mismo lado; se pueden alternar sin sumar un descanso completo después de cada lado.';
const id = (n: number) => `exercise.catalog.${String(n).padStart(3, '0')}`;
const alt = (n: number, reps?: string, rest?: string, instructions = '') => ({ exerciseId: id(n), ...(reps ? { reps } : {}), ...(rest ? { rest } : {}), instructions });
const item = (slot: string, n: number, sets: number, reps: string, rest: string, alternatives: TrainingRoutineItem['alternatives'] = [], instructions = ''): TrainingRoutineItem => ({
  id: slot, exerciseId: id(n), sets, reps, rir: '2–3', rest, loadGuidance, alternatives, instructions,
});
const fly = 'Cambia de press a aperturas: menos participación de tríceps. Priorizar el otro press si está disponible.';
const row = 'Respaldo horizontal del jalón, no idéntico. Preferir cambiar el orden para conservar el jalón; revisar si el cambio se vuelve habitual.';
const legs = [alt(33, '8–12'), alt(65, '8–12')];
const side = [alt(38, '12–15'), alt(10, '12–15')];
const curl = [alt(32)];
const A: TrainingRoutineItem[] = [
  item('r1-a-01', 29, 2, '6–10', '2–3 min', legs),
  item('r1-a-02', 3, 3, '6–10', '2–3 min', [alt(42), alt(6, '10–15', undefined, fly)], 'Banco alrededor de 30°. Aclarar si la carga incluye la barra.'),
  item('r1-a-03', 18, 3, '8–12', '2 min', [alt(20, '8–12', undefined, row), alt(50, '8–12 por lado', '90–120 s antes de repetir lado', row + ' ' + unilateral)]),
  item('r1-a-04', 31, 2, '8–12', '90–120 s', curl),
  item('r1-a-05', 37, 2, '12–15 por lado', '60–90 s antes de repetir lado', side, unilateral),
  item('r1-a-06', 15, 2, '10–15', '60–90 s', [alt(74), alt(75)]),
];
const B: TrainingRoutineItem[] = [
  item('r1-b-01', 33, 2, '8–12', '2–3 min', [alt(65), alt(29, '6–10')]),
  item('r1-b-02', 20, 3, '8–12', '2 min', [alt(50, '8–12 por lado', '90–120 s antes de repetir lado', unilateral), alt(66)]),
  item('r1-b-03', 4, 2, '10–15', '90–120 s', [alt(6), alt(5)]),
  item('r1-b-04', 34, 2, '10–15', '90–120 s', [alt(67, '8–12', '2 min'), alt(68, '8–12', '2 min')], 'Mover desde la cadera, sin arquear de más la zona lumbar al terminar. Calibrar carga y recorrido; no sustituye el curl femoral.'),
  item('r1-b-05', 21, 2, '12–15', '60–90 s', [alt(22), alt(69)]),
  item('r1-b-06', 24, 2, '8–12', '90–120 s', [alt(54), alt(70)]),
  item('r1-b-07', 35, 2, '10–15', '90–120 s', [alt(36), alt(73, '10–15 por lado', undefined, unilateral)]),
  item('r1-b-08', 16, 2, '8–12 por lado', '60–90 s antes de repetir lado', [], 'Pausa de 2 s extendido, tronco controlado. Si la polea está ocupada, cambiar el orden. ' + unilateral),
  item('r1-b-09', 56, 2, '12–20', '60–90 s', [alt(77, undefined, undefined, 'Palmas arriba y antebrazos apoyados.'), alt(78, '12–20 por lado', undefined, 'Polea baja y antebrazo apoyado, palma arriba. ' + unilateral)], 'Palmas arriba y antebrazos apoyados. Al final de las pesas.'),
];
const C: TrainingRoutineItem[] = [
  item('r1-c-01', 29, 2, '6–10', '2–3 min', legs),
  item('r1-c-02', 42, 2, '8–12', '2 min', [alt(3, '8–12', '2 min', 'Banco alrededor de 30°; indicar si la carga incluye la barra.'), alt(6, '10–15', undefined, fly)]),
  item('r1-c-03', 50, 2, '8–12 por lado', '90–120 s antes de repetir lado', [alt(20, '8–12', '2 min'), alt(66, '8–12', '2 min')], unilateral),
  item('r1-c-04', 31, 2, '8–12', '90–120 s', curl),
  item('r1-c-05', 18, 2, '8–12', '2 min', [alt(48), alt(47)], 'Agarre ancho cómodo. Neutro y supino comparten polea; si está ocupada, cambiar el orden y volver.'),
  item('r1-c-06', 37, 2, '12–15 por lado', '60–90 s antes de repetir lado', side, unilateral),
  item('r1-c-07', 14, 2, '10–15', '90–120 s', [alt(71), alt(72)]),
  item('r1-c-08', 64, 2, '6–10', '90–120 s', [], 'De rodillas, recorrido que permita volver con control. Cortar antes de perder control del tronco. Si no hay rueda, cambiar el orden; no hay otro suplente acordado.'),
  item('r1-c-09', 76, 2, '12–20', '60–90 s', [alt(79, undefined, undefined, 'Palmas abajo y antebrazos apoyados.'), alt(80, '12–20 por lado', undefined, 'Polea baja y antebrazo apoyado, palma abajo. ' + unilateral)], 'Palmas abajo y antebrazos apoyados. Al final de las pesas.'),
];

const progression = cardioProgression.map(step => ({ ...step }));

const cardio = (moderateMinutes: number, warmupMinutes: number, cooldownMinutes: number): TrainingCardioPlan => ({
  moderateMinutes,
  warmupMinutes,
  cooldownMinutes,
  progressionMode: 'manual-tolerance',
  progression,
  intensity: cardioIntensity,
  notes: cardioNotes,
});

/**
 * Server-only plan seed for local/private activation. It is intentionally not
 * imported by the Vite client or copied into a public asset.
 */
export const acceptedTrainingPlan: TrainingRoutine = {
  id: 'coach.r1.2026-09-22',
  version: 2,
  name: 'Fuerza A/B/C + cardio · reemplazos',
  source,
  effectiveFrom: '2026-09-24',
  guidance: [
    'Son series de trabajo programadas, no calentamientos ni trabajo realizado.',
    'Elegir durante las aproximaciones una carga que permita el rango con recorrido controlado y el margen previsto.',
    'En las primeras exposiciones al nuevo reparto, usar el extremo prudente del RIR; alrededor de 2–3 también en los aislamientos mientras se calibra.',
    'En las sesiones siguientes, ganar repeticiones dentro del rango manteniendo técnica y RIR semejantes. Cuando todas las series del ejercicio lleguen al extremo superior con el margen previsto, usar el menor incremento disponible y razonable en la próxima exposición comparable.',
    'Si una carga impide cumplir el rango con técnica y margen previstos, revisar el descanso y ajustar kilos antes de recortar volumen; si la dosis bien calibrada deja fatiga residual o deteriora la calidad, recortar una serie del ejercicio implicado y reevaluar.',
    'No se programa una subida semanal obligatoria ni se prescriben fallo, repeticiones forzadas, dropsets o descarga por calendario.',
  ],
  days: [
    {
      id: 'r1-monday',
      weekday: 'monday',
      label: 'Lunes · A',
      kind: 'mixed',
      sessions: [{ id: 'r1-session-a', title: 'Fuerza A', kind: 'strength', items: A, cardio: cardio(20, 5, 5) }],
    },
    {
      id: 'r1-tuesday',
      weekday: 'tuesday',
      label: 'Martes · cinta',
      kind: 'cardio',
      sessions: [{ id: 'r1-session-cardio-tuesday', title: 'Cinta · martes', kind: 'cardio', items: [], cardio: cardio(50, 5, 5) }],
    },
    {
      id: 'r1-wednesday',
      weekday: 'wednesday',
      label: 'Miércoles · B',
      kind: 'mixed',
      sessions: [{ id: 'r1-session-b', title: 'Fuerza B', kind: 'strength', items: B, cardio: cardio(20, 5, 5) }],
    },
    {
      id: 'r1-thursday',
      weekday: 'thursday',
      label: 'Jueves · cinta',
      kind: 'cardio',
      sessions: [{ id: 'r1-session-cardio-thursday', title: 'Cinta · jueves', kind: 'cardio', items: [], cardio: cardio(50, 5, 5) }],
    },
    {
      id: 'r1-friday',
      weekday: 'friday',
      label: 'Viernes · C',
      kind: 'mixed',
      sessions: [{ id: 'r1-session-c', title: 'Fuerza C', kind: 'strength', items: C, cardio: cardio(20, 5, 5) }],
    },
    { id: 'r1-saturday', weekday: 'saturday', label: 'Sábado · descanso', kind: 'rest', sessions: [] },
    { id: 'r1-sunday', weekday: 'sunday', label: 'Domingo · descanso', kind: 'rest', sessions: [] },
  ],
};
