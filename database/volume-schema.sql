-- ========================================
-- SCHEMA PARA VOLUMEN - DATOS SEPARADOS
-- ========================================

-- Tabla para progreso de ejercicios de volumen
CREATE TABLE IF NOT EXISTS volume_workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id TEXT NOT NULL,
  day TEXT NOT NULL,
  week INTEGER NOT NULL,
  weights DECIMAL[] NOT NULL,
  series_count INTEGER NOT NULL DEFAULT 3,
  date TEXT NOT NULL,
  is_alternative BOOLEAN DEFAULT FALSE,
  alternative_index INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para listas de compras de volumen
CREATE TABLE IF NOT EXISTS volume_shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_weeks INTEGER[] NOT NULL,
  selected_days TEXT[] NOT NULL,
  items JSONB NOT NULL,
  generated_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para configuraciones específicas de volumen
CREATE TABLE IF NOT EXISTS volume_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE volume_workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_settings ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para volume_workout_progress
CREATE POLICY "Public read volume_workout_progress" ON volume_workout_progress FOR SELECT USING (true);
CREATE POLICY "Public insert volume_workout_progress" ON volume_workout_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update volume_workout_progress" ON volume_workout_progress FOR UPDATE USING (true);
CREATE POLICY "Public delete volume_workout_progress" ON volume_workout_progress FOR DELETE USING (true);

-- Políticas públicas para volume_shopping_lists
CREATE POLICY "Public read volume_shopping_lists" ON volume_shopping_lists FOR SELECT USING (true);
CREATE POLICY "Public insert volume_shopping_lists" ON volume_shopping_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update volume_shopping_lists" ON volume_shopping_lists FOR UPDATE USING (true);
CREATE POLICY "Public delete volume_shopping_lists" ON volume_shopping_lists FOR DELETE USING (true);

-- Políticas públicas para volume_settings
CREATE POLICY "Public read volume_settings" ON volume_settings FOR SELECT USING (true);
CREATE POLICY "Public insert volume_settings" ON volume_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update volume_settings" ON volume_settings FOR UPDATE USING (true);
CREATE POLICY "Public delete volume_settings" ON volume_settings FOR DELETE USING (true);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_volume_workout_progress_exercise ON volume_workout_progress(exercise_id, day, week);
CREATE INDEX IF NOT EXISTS idx_volume_settings_key ON volume_settings(setting_key);

-- Datos por defecto para volumen
INSERT INTO volume_settings (setting_key, setting_value) VALUES
('volume-current-week', '1'),
('volume-current-day', '"lunes"'),
('volume-table-columns', '[
  {"key": "comida", "label": "Comida", "visible": true},
  {"key": "hora", "label": "Hora", "visible": true},
  {"key": "alimento", "label": "Alimento", "visible": true},
  {"key": "cantidad", "label": "Cantidad", "visible": true},
  {"key": "unidad", "label": "Unidad", "visible": true},
  {"key": "kcal", "label": "Kcal", "visible": true},
  {"key": "proteinas_g", "label": "Proteínas", "visible": true},
  {"key": "carbohidratos_g", "label": "Carbs", "visible": true},
  {"key": "grasas_g", "label": "Grasas", "visible": true},
  {"key": "fibra_g", "label": "Fibra", "visible": false},
  {"key": "notas", "label": "Notas", "visible": true}
]')
ON CONFLICT (setting_key) DO NOTHING;

-- ========================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ========================================

-- La tabla volume_workout_progress incluye campos adicionales:
-- - is_alternative: indica si se está usando un ejercicio alternativo
-- - alternative_index: índice de la alternativa en el array de alternativas
-- - series_count: cantidad de series usadas para este ejercicio (dinámico: 2-5 series)

-- La tabla volume_settings almacena configuraciones específicas del módulo volumen
-- para mantener la independencia con el módulo de mantenimiento

-- Los datos de ejemplo incluyen la configuración de columnas para la tabla
-- nutricional de volumen que tiene 11 columnas en lugar de 8

-- ========================================
-- MIGRACIÓN PARA TABLAS EXISTENTES
-- ========================================

-- Si la tabla ya existe, agregar la nueva columna
ALTER TABLE volume_workout_progress 
ADD COLUMN IF NOT EXISTS series_count INTEGER DEFAULT 3;

-- Actualizar registros existentes que no tengan series_count
UPDATE volume_workout_progress 
SET series_count = 3 
WHERE series_count IS NULL;