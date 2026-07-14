---
name: verificar-evidencia
description: "Verify scientific evidence for claims."
---

# Verificación de Evidencia Científica

## Protocolo de verificación en 6 pasos

### Paso 1: Aislar la afirmacion
Convierte la recomendación en una afirmacion falsificable:
- ❌ "La creatina es buena"
- ⚠️ "La creatina monohidrato produce una mejora porcentual fija de la fuerza" — requiere verificar población, resultado y magnitud; no asumir un porcentaje universal

### Paso 2: Identificar la fuente original
- ¿Se cita un estudio específico? → Buscarlo en PubMed
- ¿Se cita un autor? → Buscar sus publicaciones reales
- ¿No hay fuente? → BANDERA ROJA — marcar como "sin evidencia citada"

### Paso 3: Evaluar la calidad del estudio

| Criterio | Pregunta clave | Bandera roja si... |
|----------|---------------|---------------------|
| Tipo de estudio | ¿Es un RCT, observacional, o in vitro? | Se presenta un observacional como causal |
| Tamaño de muestra | ¿Cuantos participantes? | n < 20 |
| Población | ¿Quienes fueron los sujetos? | Ratas, atletas de elite, o solo hombres cuando se aplica a todos |
| Duración | ¿Cuanto duro el estudio? | < 4 semanas para hipertrofia/composición corporal |
| Grupo control | ¿Hubo grupo placebo/control? | Sin control ni cegamiento |
| Conflicto de interes | ¿Quien financio el estudio? | Financiado por el fabricante del producto evaluado |
| Reproducibilidad | ¿Otros estudios encontraron lo mismo? | Resultado de un solo estudio no replicado |
| Fecha | ¿Cuando se público? | Pre-2015 sin replicacion reciente |

### Paso 4: Búsqueda adversarial con herramientas web

Ejecutar como mínimo 3 búsquedas:

1. **Busca confirmatoria**: "[claim] evidence" o "[claim] meta-analysis"
2. **Busca contradictoria**: "[claim] debunked" o "[claim] no evidence" o "[claim] criticism"
3. **Busca de actualizacion**: "[claim] 2024 2025 2026 review"

#### Fuentes confiables (priorizar)
| Fuente | URL | Tipo |
|--------|-----|------|
| PubMed | pubmed.ncbi.nlm.nih.gov | Estudios primarios |
| PMC (full text) | ncbi.nlm.nih.gov/pmc | Texto completo gratuito |
| Examine.com | examine.com | Revisiones de suplementos |
| ISSN | jissn.biomedcentral.com | Position stands nutrición deportiva |
| Stronger by Science | strongerbyscience.com | Análisis de evidencia |
| Cochrane | cochranelibrary.com | Meta-análisis de alta calidad |
| ACSM | acsm.org | Guias de ejercicio |
| Mayo Clinic | mayoclinic.org | Informacion médica |

#### Fuentes NO confiables (evitar)
- Blogs de fitness sin referencias
- Videos de YouTube sin citas
- Sitios web de venta de suplementos
- Redes sociales (Instagram, TikTok)
- Articulos de periodicos generales (sensacionalismo)

### Paso 5: Triangulacion

Para que una afirmacion se considere **bien respaldada**, necesita:
- [ ] Al menos 2 estudios independientes que la apoyen
- [ ] Al menos 1 meta-análisis o revision sistematica
- [ ] Que la población estudiada sea relevante (no ratas, no atletas de elite si el usuario es principiante)
- [ ] Que el efecto sea clinicamente significativo (no solo estadisticamente)
- [ ] Que no haya evidencia contradictoria de calidad igual o superior

### Paso 6: Emitir veredicto

| Veredicto | Criterio | Ejemplo |
|-----------|----------|---------|
| ✅ VERIFICADO | Evidencia sólida Nivel 1-2, sin contradicciones | "Creatina 3-5g/dia aumenta fuerza" |
| ⚠️ PARCIAL | Evidencia existe pero con matices importantes | "El 12-3-30 quema grasa" (si, pero no más que otro LISS equivalente) |
| ❌ INCORRECTO | La evidencia no respalda o contradice | "Los BCAAs son necesarios con proteína adecuada" |
| ❓ INSUFICIENTE | No hay suficiente evidencia de calidad | "Myo-reps son superiores a series tradicionales para hipertrofia" |
| 🔄 DESACTUALIZADO | Era correcto pero nueva evidencia lo actualiza | "Ventana anabolica de 30 minutos" |

---

## Checklist rápido para claims comunes

### Nutrición
| Claim | Veredicto esperado | Verificar con |
|-------|-------------------|---------------|
| "Déficit 250-500 kcal óptimo para recomposición" | ⚠️ Rango orientativo, no óptimo universal | ISSN 2017, Helms 2014 |
| "Proteína 1.8-2.4 g/kg para recomposición" | ✅ Bien respaldado | Helms 2014, Jager 2017 |
| "Ventana anabolica 4-6h" | ⚠️ Parcial (matizar) | Schoenfeld & Aragon 2013 |
| "La cafeína mejora el rendimiento en un porcentaje fijo" | ⚠️ Depende de dosis, tarea, tolerancia y población | ISSN Position Stand Caffeine |
| "BCAAs innecesarios" | ✅ Correcto si proteína >1.6g/kg | Jackman 2017, Dieter 2016 |
| "Comer de noche engorda" | ❌ Mito | Balance calórico total importa |
| "Ayuno 16:8 superior para grasa" | ❌ No superior per se | Adherencia > método |

### Entrenamiento
| Claim | Veredicto esperado | Verificar con |
|-------|-------------------|---------------|
| "2x/semana frecuencia óptima" | ⚠️ Parcial (vs 3x en principiantes) | Schoenfeld 2016 meta |
| "Volume Landmarks de RP" | ⚠️ Orientativo, no absoluto | Basado en experiencia clinica + estudios |
| "Deload cada 4-5 semanas" | ⚠️ Depende del individuo | Bell 2023, autoregulacion |
| "DUP superior a lineal" | ⚠️ Similar en hipertrofia | Diferentes beneficios |
| "Hip thrust 143% MVIC" | ⚠️ Dato de activación aguda que no equivale automáticamente a hipertrofia | Contreras et al. |
| "Fasted cardio no superior" | ✅ Bien respaldado | Meta-análisis 2017 |
| "HIIT max 2x/semana" | ⚠️ Conservador pero razonable | Depende de recuperación |

---

## Formato de verificación individual

```
VERIFICACION: "[Afirmacion textual]"
======================================

FUENTE CITADA: [Autor, año] o [sin fuente]
TIPO DE ESTUDIO: [Meta-análisis / RCT / Observacional / etc.]
TAMANO DE MUESTRA: [n=X] o [multiple studies]
POBLACIÓN: [Quiénes fueron los sujetos]

BUSQUEDA CONFIRMATORIA:
- [Resultado 1 + URL]
- [Resultado 2 + URL]

BUSQUEDA CONTRADICTORIA:
- [Resultado 1 + URL]
- [Resultado 2 + URL]

VEREDICTO: [✅/⚠️/❌/❓/🔄]
CONFIANZA: [Alta/Media/Baja]
MATIZ: [Que se deberia agregar o modificar]
```
