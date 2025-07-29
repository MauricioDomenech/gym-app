# 📝 Guía para Actualizar Archivos CSV

## ❌ **Problema Resuelto:**
Los archivos CSV no se actualizaban porque había **archivos duplicados** en dos ubicaciones diferentes.

## 📂 **Estructura de Archivos:**

### **🎯 Archivos que usa la aplicación:**
```
src/assets/data/
├── semana1/
│   ├── lunes.csv
│   ├── martes.csv
│   ├── miercoles.csv
│   ├── jueves.csv
│   ├── viernes.csv
│   ├── sabado.csv
│   ├── domingo.csv
│   └── Plan Integral Entrenamiento y Nutrición - Semana 1.md
└── semana2/
    ├── lunes.csv
    ├── martes.csv
    ├── miercoles.csv
    ├── jueves.csv
    ├── viernes.csv
    ├── sabado.csv
    ├── domingo.csv
    └── Plan Integral Entrenamiento y Nutrición - Semana 2.md
```

### **📋 Archivos de backup/trabajo:**
```
semana1/ (en raíz del proyecto)
semana2/ (en raíz del proyecto)
```

## 🔄 **Cómo Actualizar Archivos CSV:**

### **Método 1: Editar directamente** (Recomendado)
```bash
# Editar directamente los archivos que usa la aplicación
nano src/assets/data/semana1/lunes.csv
nano src/assets/data/semana2/martes.csv
# etc...
```

### **Método 2: Usar script de sincronización**
```bash
# 1. Editar archivos en raíz
nano semana1/lunes.csv
nano semana2/martes.csv

# 2. Sincronizar hacia assets
npm run sync-data

# 3. Construir aplicación
npm run build
```

### **Método 3: Todo en un comando**
```bash
# Editar archivos en raíz, luego:
npm run build:sync
```

## 🛠️ **Scripts Disponibles:**

### **`npm run sync-data`**
- Sincroniza archivos CSV/MD desde raíz hacia `src/assets/data/`
- Solo copia archivos si son más nuevos
- Muestra qué archivos se sincronizaron

### **`npm run build:sync`**
- Ejecuta sincronización + build en un comando
- Perfecto para deploy

## 📋 **Checklist para Updates:**

### ✅ **Antes del Deploy:**
1. [ ] Editar archivos CSV necesarios
2. [ ] Ejecutar `npm run sync-data` (si editaste en raíz)
3. [ ] Ejecutar `npm run build`
4. [ ] Verificar que no hay errores de build
5. [ ] Deploy

### ✅ **Verificar que funciona:**
1. [ ] Abrir aplicación
2. [ ] Ir a día modificado
3. [ ] Verificar que se ven los nuevos ejercicios
4. [ ] Probar funcionalidad (guardar pesos, etc.)

## 🚨 **Problemas Comunes:**

### **"Los cambios no aparecen"**
- **Causa:** Editaste archivos en ubicación incorrecta
- **Solución:** Ejecutar `npm run sync-data`

### **"Cache del navegador"**
- **Causa:** El navegador tiene archivos viejos en cache
- **Solución:** Ctrl+F5 (o Cmd+Shift+R en Mac)

### **"Vercel no actualiza"**
- **Causa:** Los archivos correctos no están en el repositorio
- **Solución:** Hacer commit de archivos en `src/assets/data/`

## 📊 **Cómo Verificar Archivos:**

```bash
# Ver fechas de modificación
ls -la src/assets/data/semana1/*.csv
ls -la semana1/*.csv

# Comparar contenido
diff src/assets/data/semana1/lunes.csv semana1/lunes.csv
```

## 🎯 **Mejores Prácticas:**

1. **Editar directamente en `src/assets/data/`** para evitar confusión
2. **Usar `npm run build:sync`** si prefieres editar en raíz
3. **Siempre hacer build** antes de hacer commit
4. **Verificar en local** antes de hacer deploy

---

## 🔧 **Resumen Técnico:**

- **Vite importa archivos con** `?raw` desde `src/assets/data/`
- **Los archivos se embeben** en el bundle durante el build
- **No se cargan dinámicamente** desde la web
- **Por eso hay que hacer build** después de cambios

¡Con esta guía ya no habrá más confusión con archivos CSV! 🎉