-- ========================================
-- SCHEMA PARA APLICACIÓN COLABORATIVA
-- Todos los datos son compartidos globalmente
-- ========================================

-- Create workout_progress table (sin user_id - datos globales)
CREATE TABLE IF NOT EXISTS workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id TEXT NOT NULL,
  day TEXT NOT NULL,
  week INTEGER NOT NULL,
  weights DECIMAL[] NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_lists table (sin user_id - datos globales)
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_weeks INTEGER[] NOT NULL,
  selected_days TEXT[] NOT NULL,
  items JSONB NOT NULL,
  generated_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table (sin user_id - configuraciones globales)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create public policies - todos pueden acceder a todo
CREATE POLICY "Public read workout_progress" ON workout_progress FOR SELECT USING (true);
CREATE POLICY "Public insert workout_progress" ON workout_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update workout_progress" ON workout_progress FOR UPDATE USING (true);
CREATE POLICY "Public delete workout_progress" ON workout_progress FOR DELETE USING (true);

CREATE POLICY "Public read shopping_lists" ON shopping_lists FOR SELECT USING (true);
CREATE POLICY "Public insert shopping_lists" ON shopping_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update shopping_lists" ON shopping_lists FOR UPDATE USING (true);
CREATE POLICY "Public delete shopping_lists" ON shopping_lists FOR DELETE USING (true);

CREATE POLICY "Public read user_settings" ON user_settings FOR SELECT USING (true);
CREATE POLICY "Public insert user_settings" ON user_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_settings" ON user_settings FOR UPDATE USING (true);
CREATE POLICY "Public delete user_settings" ON user_settings FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_progress_exercise ON workout_progress(exercise_id, day, week);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);

-- ========================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ========================================

-- Insertar configuraciones por defecto
INSERT INTO user_settings (setting_key, setting_value) VALUES
('gym-app-theme', '"dark"'),
('gym-app-current-week', '1'),
('gym-app-current-day', '"lunes"'),
('gym-app-table-columns', '[
  {"key": "comida", "label": "Comida", "visible": true},
  {"key": "alimento", "label": "Alimento", "visible": true},
  {"key": "cantidad", "label": "Cantidad", "visible": true},
  {"key": "proteinas", "label": "Proteínas", "visible": true},
  {"key": "grasas", "label": "Grasas", "visible": true},
  {"key": "carbs", "label": "Carbs", "visible": true},
  {"key": "fibra", "label": "Fibra", "visible": false},
  {"key": "calorias", "label": "Calorías", "visible": true}
]')
ON CONFLICT (setting_key) DO NOTHING;