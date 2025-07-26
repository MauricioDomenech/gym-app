# Configuración de Base de Datos - Redis

## Pasos para configurar Redis

### 1. Crear una base de datos Redis en Vercel

1. Ve a tu dashboard de Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto o crea uno nuevo
3. Ve a la pestaña "Storage"
4. Haz clic en "Create Database"
5. Selecciona "Redis" (Serverless Redis)
6. Dale un nombre a tu base de datos (ej: "gym-app-db")
7. Selecciona la región más cercana
8. Haz clic en "Create"

### 2. Obtener las credenciales

Una vez creada la base de datos, verás la URL de conexión de Redis similar a:

```
redis://default:PASSWORD@host:port
```

### 3. Configurar variables de entorno

#### En desarrollo local:

Crea un archivo `.env.local` en la carpeta `gym-app/` con:

```env
REDIS_URL="redis://default:Fwn1uMXJjvv1a2EZhQoV0fs3eu0C1EFB@redis-18509.c339.eu-west-3-1.ec2.redns.redis-cloud.com:18509"
```

#### En producción (Vercel):

La variable `REDIS_URL` ya estará configurada automáticamente cuando conectes la base de datos a tu proyecto.

### 4. Instalar dependencias

```bash
npm install redis
```

### 5. Desplegar

```bash
npm run build
vercel --prod
```

## Migración de datos

La aplicación automáticamente migrará los datos del localStorage a la base de datos la primera vez que se cargue en un dispositivo que tenga datos existentes.

## Costo

Redis en Vercel tier gratuito incluye:

- Perfecto para aplicaciones personales como esta
- Conexiones concurrentes limitadas
- Almacenamiento limitado

## Configuración para desarrollo

Para desarrollo local, también puedes usar la variable de entorno con el prefijo `VITE_`:

```env
VITE_REDIS_URL="redis://default:Fwn1uMXJjvv1a2EZhQoV0fs3eu0C1EFB@redis-18509.c339.eu-west-3-1.ec2.redns.redis-cloud.com:18509"
```

## Solución de problemas

Si tienes problemas:

1. Verifica que la variable `REDIS_URL` esté correctamente configurada
2. Asegúrate de que la base de datos esté conectada al proyecto
3. Revisa los logs en Vercel Dashboard
4. Verifica que el cliente Redis pueda conectarse a la URL proporcionada
