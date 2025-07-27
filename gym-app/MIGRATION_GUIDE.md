# Guía de Migración a Supabase

## ✅ Migración Completada

Tu aplicación gym-app ha sido migrada exitosamente de Redis a Supabase como base de datos principal.

## 🗃️ Esquema de Base de Datos

### Tablas Creadas:

1. **`users`** - Gestión de usuarios temporales
   - `id` (UUID, primary key)
   - `session_id` (texto único)
   - `created_at` (timestamp)

2. **`workout_progress`** - Progreso de entrenamientos
   - `id` (UUID, primary key)
   - `user_id` (UUID, referencia a users)
   - `exercise_id` (texto)
   - `day`, `week` (datos de ejercicio)
   - `weights` (array de decimales)
   - `date` (texto)

3. **`shopping_lists`** - Listas de compras
   - `id` (UUID, primary key)
   - `user_id` (UUID, referencia a users)
   - `selected_weeks`, `selected_days` (arrays)
   - `items` (JSONB)
   - `generated_date` (texto)

4. **`user_settings`** - Configuraciones de usuario
   - `id` (UUID, primary key)
   - `user_id` (UUID, referencia a users)
   - `setting_key` (texto)
   - `setting_value` (JSONB)

### Seguridad (RLS)
- Row Level Security habilitado en todas las tablas
- Políticas configuradas para acceso basado en session_id
- Los usuarios solo pueden acceder a sus propios datos

## 🔧 Configuración Necesaria

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
SUPABASE_URL=https://pyijssavikrgttishppb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aWpzc2F2aWtyZ3R0aXNocHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTY2OTMsImV4cCI6MjA2OTE3MjY5M30.NT8AvO6DATBhKwg6aa8_Iy2lMAok5KxcK32fcMG6uYU
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### 2. Configuración en Vercel

En tu dashboard de Vercel, agrega las siguientes variables de entorno:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Ejecutar el SQL en Supabase

Ve a tu proyecto Supabase → SQL Editor → ejecuta el contenido de `database/schema.sql`

## 🔄 Funcionalidades

### Sistema Híbrido
- **Primario**: Supabase (todas las operaciones principales)
- **Fallback**: API original (si Supabase falla)
- **Migración automática**: Datos de localStorage se migran automáticamente

### Compatibilidad
- Mantiene la misma interfaz pública (`DatabaseService`)
- No requiere cambios en componentes existentes
- Funcionalidad de exportar/importar preservada

## 📋 Pasos de Implementación

### Lo que se ha hecho:
1. ✅ Instalación de `@supabase/supabase-js`
2. ✅ Creación de clientes Supabase (client/server)
3. ✅ Esquema de base de datos completo
4. ✅ Configuración de Row Level Security
5. ✅ Refactorización del API backend
6. ✅ Actualización del DatabaseService con fallback
7. ✅ Eliminación de dependencia Redis

### Lo que debes hacer:
1. **Ejecutar el SQL** en tu proyecto Supabase:
   - Copia el contenido de `database/schema.sql`
   - Pégalo en Supabase SQL Editor
   - Ejecuta las queries

2. **Configurar variables de entorno**:
   - Crea `.env.local` con las credenciales
   - Actualiza Vercel con las variables

3. **Opcional - Service Role Key**:
   - Ve a Settings → API en tu proyecto Supabase
   - Copia el "service_role" key (no el anon key)
   - Úsalo para `SUPABASE_SERVICE_ROLE_KEY`

## 🚀 Ventajas de la Migración

- **Performance**: Consultas SQL nativas vs. key-value storage
- **Escalabilidad**: Base de datos PostgreSQL robusta
- **Costos**: Potencialmente más económico que Redis
- **Funcionalidades**: Real-time, Auth, Storage disponibles
- **Tooling**: Dashboard web para administración
- **Backup**: Backups automáticos incluidos

## 🔍 Testing

Después de configurar todo:
1. Abre la aplicación
2. Verifica que los datos se cargan correctamente
3. Haz cambios (agregar progreso, crear lista de compras)
4. Verifica en Supabase dashboard que los datos se guardan
5. Revisa los logs de Vercel para confirmar que no hay errores

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de Vercel Functions
2. Verifica las variables de entorno
3. Confirma que el SQL se ejecutó correctamente
4. El sistema debería hacer fallback automático a Redis si está configurado