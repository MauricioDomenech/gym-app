-- ========================================
-- MIGRACIÓN: Agregar columna observations a volume_workout_progress
-- ========================================

-- Agregar columna observations a la tabla volume_workout_progress
ALTER TABLE volume_workout_progress 
ADD COLUMN IF NOT EXISTS observations TEXT DEFAULT '';

-- Actualizar registros existentes para tener observaciones vacías
UPDATE volume_workout_progress 
SET observations = '' 
WHERE observations IS NULL;

-- ========================================
-- COMENTARIOS
-- ========================================

-- Esta migración agrega la funcionalidad de observaciones a los ejercicios de volumen
-- Permite a los usuarios agregar notas personales sobre cada ejercicio registrado
-- El campo es opcional y se inicializa como cadena vacía para registros existentes

-- Para ejecutar este script:
-- 1. Conéctate a tu base de datos Supabase
-- 2. Ve a la sección SQL Editor
-- 3. Ejecuta este script
-- 4. Verifica que la columna observations aparezca en la tabla volume_workout_progress