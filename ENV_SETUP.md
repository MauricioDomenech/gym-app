# Configuración de Variables de Entorno

## Variables Requeridas

### REDIS_URL
La URL de conexión a tu base de datos Redis.

**Formato:**
```
redis://default:PASSWORD@HOST:PORT
```

**Ejemplo:**
```
REDIS_URL="redis://default:Fwn1uMXJjvv1a2EZhQoV0fs3eu0C1EFB@redis-18509.c339.eu-west-3-1.ec2.redns.redis-cloud.com:18509"
```

## Configuración Local

1. Crea un archivo `.env.local` en la carpeta `gym-app/`
2. Agrega la variable `REDIS_URL` con tu URL de Redis

## Configuración en Vercel

1. Ve a tu dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a la pestaña "Settings"
4. Haz clic en "Environment Variables"
5. Agrega la variable `REDIS_URL` con tu URL de Redis
6. Selecciona todos los environments (Production, Preview, Development)
7. Haz clic en "Save"

## Verificación

Para verificar que la configuración funciona:

1. Despliega tu aplicación en Vercel
2. Abre las herramientas de desarrollador en tu navegador
3. Ve a la pestaña "Console"
4. Deberías ver mensajes como:
   - "🔄 Connecting to Redis..."
   - "✅ Connected to Redis successfully"
   - "🚀 API called: POST /api/database"

Si ves errores 405 "Method Not Allowed", significa que la API no está configurada correctamente. 