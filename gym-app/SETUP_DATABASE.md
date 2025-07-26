# Configuración de Base de Datos - Vercel KV

## Pasos para configurar Vercel KV

### 1. Crear una base de datos KV en Vercel

1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto o crea uno nuevo
3. Ve a la pestaña "Storage"
4. Haz clic en "Create Database"
5. Selecciona "KV (Redis)"
6. Dale un nombre a tu base de datos (ej: "gym-app-db")
7. Selecciona la región más cercana
8. Haz clic en "Create"

### 2. Obtener las credenciales

Una vez creada la base de datos, verás las credenciales:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### 3. Configurar variables de entorno

#### En desarrollo local:

Crea un archivo `.env.local` en la carpeta `gym-app/` con:

```env
KV_REST_API_URL=tu_kv_rest_api_url
KV_REST_API_TOKEN=tu_kv_rest_api_token
```

#### En producción (Vercel):

Las variables ya estarán configuradas automáticamente cuando conectes la base de datos a tu proyecto.

### 4. Desplegar

```bash
npm run build
vercel --prod
```

## Migración de datos

La aplicación automáticamente migrará los datos del localStorage a la base de datos la primera vez que se cargue en un dispositivo que tenga datos existentes.

## Costo

Vercel KV tier gratuito incluye:

- 30,000 comandos por mes
- 256 MB de almacenamiento
- Perfecto para aplicaciones personales como esta

## Solución de problemas

Si tienes problemas:

1. Verifica que las variables de entorno estén correctamente configuradas
2. Asegúrate de que la base de datos esté conectada al proyecto
3. Revisa los logs en Vercel Dashboard
