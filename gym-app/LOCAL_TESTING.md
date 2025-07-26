# Pruebas Locales de Base de Datos

## Configuración Inicial

1. **Instala las dependencias:**

   ```bash
   npm install
   ```

2. **Crea el archivo `.env.local`:**
   ```env
   REDIS_URL="redis://default:Fwn1uMXJjvv1a2EZhQoV0fs3eu0C1EFB@redis-18509.c339.eu-west-3-1.ec2.redns.redis-cloud.com:18509"
   ```

## Opciones de Prueba

### Opción 1: Probar solo la conexión Redis

```bash
node test-connection.js
```

**Resultado esperado:**

```
🧪 Testing Redis connection...
🔗 Redis URL: redis://***:***@redis-18509.c339.eu-west-3-1.ec2.redns.redis-cloud.com:18509
🔄 Connecting to Redis...
✅ Connected to Redis successfully
🧪 Testing basic operations...
✅ Set operation successful
✅ Get operation successful, value: test-value
✅ Delete operation successful
✅ Disconnected from Redis
🎉 All tests passed! Redis connection is working correctly.
```

### Opción 2: Probar la API completa localmente

1. **Inicia el servidor API:**

   ```bash
   npm run server
   ```

2. **En otra terminal, prueba la API:**

   ```bash
   node test-api-local.js
   ```

3. **O inicia ambos servidores juntos:**
   ```bash
   npm run dev:full
   ```

### Opción 3: Probar con la aplicación completa

1. **Inicia el servidor API:**

   ```bash
   npm run server
   ```

2. **En otra terminal, inicia la aplicación:**

   ```bash
   npm run dev
   ```

3. **Abre http://localhost:5173 en tu navegador**

4. **Abre las herramientas de desarrollador y ve a la pestaña Console**

5. **Deberías ver mensajes como:**
   - ✅ "Migración a Redis completada exitosamente"
   - 🔄 "Connecting to Redis..."
   - ✅ "Connected to Redis successfully"

## Solución de Problemas

### Error: "REDIS_URL not configured"

- Verifica que el archivo `.env.local` existe
- Verifica que la variable `REDIS_URL` esté correctamente configurada

### Error: "Connection refused"

- Verifica que la URL de Redis sea correcta
- Verifica que la base de datos Redis esté activa en Vercel

### Error: "Method Not Allowed"

- Verifica que el servidor API esté corriendo en el puerto 3001
- Verifica que el proxy en `vite.config.ts` esté configurado correctamente

### Error: "Network error"

- Verifica que el servidor API esté corriendo
- Verifica que no haya conflictos de puertos

## Verificación de Logs

El servidor API mostrará logs detallados:

- 🚀 API called: POST /api/database
- 📨 Request body: {...}
- 🔑 Performing action: get for key: test-user:gym-app-theme
- 📖 Retrieved item: found/not found
- 💾 Saved item successfully
