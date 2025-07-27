-- ========================================
-- MIGRACIÓN A APLICACIÓN COLABORATIVA
-- Convierte base de datos con usuarios individuales a datos compartidos
-- ========================================

-- ⚠️  ADVERTENCIA: Esto eliminará datos existentes de usuarios individuales
-- Si tienes datos importantes, haz un backup primero

-- 1. Eliminar políticas existentes de usuarios individuales
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can read their own workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Users can insert their own workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Users can update their own workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Users can delete their own workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Users can read their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can insert their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can update their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can delete their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can read their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

-- También eliminar políticas con nombres genéricos que pudieran existir
DROP POLICY IF EXISTS "Anyone can read workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Anyone can insert workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Anyone can update workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Anyone can delete workout progress" ON workout_progress;
DROP POLICY IF EXISTS "Anyone can read shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Anyone can insert shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Anyone can update shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Anyone can delete shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Anyone can read user settings" ON user_settings;
DROP POLICY IF EXISTS "Anyone can insert user settings" ON user_settings;
DROP POLICY IF EXISTS "Anyone can update user settings" ON user_settings;
DROP POLICY IF EXISTS "Anyone can delete user settings" ON user_settings;

-- 2. Eliminar restricciones de foreign key
ALTER TABLE workout_progress DROP CONSTRAINT IF EXISTS workout_progress_user_id_fkey;
ALTER TABLE shopping_lists DROP CONSTRAINT IF EXISTS shopping_lists_user_id_fkey;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

-- 3. Eliminar columnas user_id (esto eliminará datos existentes)
ALTER TABLE workout_progress DROP COLUMN IF EXISTS user_id;
ALTER TABLE shopping_lists DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_settings DROP COLUMN IF EXISTS user_id;

-- 4. Eliminar tabla users
DROP TABLE IF EXISTS users CASCADE;

-- 5. Actualizar constraint único en user_settings
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_setting_key_key;
ALTER TABLE user_settings ADD CONSTRAINT unique_setting_key UNIQUE (setting_key);

-- 6. Crear políticas públicas
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

-- 7. Recrear índices sin user_id
DROP INDEX IF EXISTS idx_workout_progress_user_exercise;
DROP INDEX IF EXISTS idx_shopping_lists_user;
DROP INDEX IF EXISTS idx_user_settings_user_key;
DROP INDEX IF EXISTS idx_users_session;

CREATE INDEX IF NOT EXISTS idx_workout_progress_exercise ON workout_progress(exercise_id, day, week);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);

-- 8. Insertar configuraciones por defecto
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

-- ✅ Migración completada
-- La aplicación ahora es completamente colaborativa