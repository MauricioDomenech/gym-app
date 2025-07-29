#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Script para sincronizar archivos CSV/MD desde la raíz hacia src/assets/data
 * Ejecutar con: node sync-data.js
 */

const sourceDir = './';
const targetDir = './src/assets/data/';

const syncWeek = (weekNumber) => {
  const sourceWeekDir = path.join(sourceDir, `semana${weekNumber}`);
  const targetWeekDir = path.join(targetDir, `semana${weekNumber}`);

  if (!fs.existsSync(sourceWeekDir)) {
    console.log(`❌ No se encontró directorio: ${sourceWeekDir}`);
    return;
  }

  if (!fs.existsSync(targetWeekDir)) {
    fs.mkdirSync(targetWeekDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceWeekDir);
  let syncedFiles = 0;

  files.forEach(file => {
    if (file.endsWith('.csv') || file.endsWith('.md')) {
      const sourcePath = path.join(sourceWeekDir, file);
      const targetPath = path.join(targetWeekDir, file);

      const sourceStats = fs.statSync(sourcePath);
      let shouldSync = true;

      if (fs.existsSync(targetPath)) {
        const targetStats = fs.statSync(targetPath);
        shouldSync = sourceStats.mtime > targetStats.mtime;
      }

      if (shouldSync) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ Sincronizado: semana${weekNumber}/${file}`);
        syncedFiles++;
      } else {
        console.log(`⏭️  Sin cambios: semana${weekNumber}/${file}`);
      }
    }
  });

  return syncedFiles;
};

console.log('🔄 Iniciando sincronización de datos...\n');

const week1Synced = syncWeek(1);
const week2Synced = syncWeek(2);

console.log(`\n📊 Resumen:`);
console.log(`   - Semana 1: ${week1Synced} archivos sincronizados`);
console.log(`   - Semana 2: ${week2Synced} archivos sincronizados`);

if (week1Synced > 0 || week2Synced > 0) {
  console.log('\n🚀 ¡Sincronización completada! Ejecuta "npm run build" para aplicar cambios.');
} else {
  console.log('\n✨ Todos los archivos están actualizados.');
}