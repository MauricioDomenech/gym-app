---
name: verificar-evidencia
description: Protocolo de verificacion de evidencia cientifica para afirmaciones de fitness y nutricion. Usa cuando necesites validar un claim especifico, verificar un estudio citado, o evaluar la calidad de la evidencia detras de una recomendacion.
---

# Verificacion de Evidencia Cientifica

## Protocolo de verificacion en 6 pasos

### Paso 1: Aislar la afirmacion
Convierte la recomendacion en una afirmacion falsificable:
- ❌ "La creatina es buena"
- ✅ "La creatina monohidrato a 3-5g/dia aumenta la fuerza maxima un 5-10% segun meta-analisis"

### Paso 2: Identificar la fuente original
- ¿Se cita un estudio especifico? → Buscarlo en PubMed
- ¿Se cita un autor? → Buscar sus publicaciones reales
- ¿No hay fuente? → BANDERA ROJA — marcar como "sin evidencia citada"

### Paso 3: Evaluar la calidad del estudio

| Criterio | Pregunta clave | Bandera roja si... |
|----------|---------------|---------------------|
| Tipo de estudio | ¿Es un RCT, observacional, o in vitro? | Se presenta un observacional como causal |
| Tamano de muestra | ¿Cuantos participantes? | n < 20 |
| Poblacion | ¿Quienes fueron los sujetos? | Ratas, atletas de elite, o solo hombres cuando se aplica a todos |
| Duracion | ¿Cuanto duro el estudio? | < 4 semanas para hipertrofia/composicion corporal |
| Grupo control | ¿Hubo grupo placebo/control? | Sin control ni cegamiento |
| Conflicto de interes | ¿Quien financio el estudio? | Financiado por el fabricante del producto evaluado |
| Reproducibilidad | ¿Otros estudios encontraron lo mismo? | Resultado de un solo estudio no replicado |
| Fecha | ¿Cuando se publico? | Pre-2015 sin replicacion reciente |

### Paso 4: Busqueda adversarial (WebSearch)

Ejecutar MINIMO 3 busquedas:

1. **Busca confirmatoria**: "[claim] evidence" o "[claim] meta-analysis"
2. **Busca contradictoria**: "[claim] debunked" o "[claim] no evidence" o "[claim] criticism"
3. **Busca de actualizacion**: "[claim] 2024 2025 2026 review"

#### Fuentes confiables (priorizar)
| Fuente | URL | Tipo |
|--------|-----|------|
| PubMed | pubmed.ncbi.nlm.nih.gov | Estudios primarios |
| PMC (full text) | ncbi.nlm.nih.gov/pmc | Texto completo gratuito |
| Examine.com | examine.com | Revisiones de suplementos |
| ISSN | jissn.biomedcentral.com | Position stands nutricion deportiva |
| Stronger by Science | strongerbyscience.com | Analisis de evidencia |
| Cochrane | cochranelibrary.com | Meta-analisis de alta calidad |
| ACSM | acsm.org | Guias de ejercicio |
| Mayo Clinic | mayoclinic.org | Informacion medica |

#### Fuentes NO confiables (evitar)
- Blogs de fitness sin referencias
- Videos de YouTube sin citas
- Sitios web de venta de suplementos
- Redes sociales (Instagram, TikTok)
- Articulos de periodicos generales (sensacionalismo)

### Paso 5: Triangulacion

Para que una afirmacion se considere **bien respaldada**, necesita:
- [ ] Al menos 2 estudios independientes que la apoyen
- [ ] Al menos 1 meta-analisis o revision sistematica
- [ ] Que la poblacion estudiada sea relevante (no ratas, no atletas de elite si el usuario es principiante)
- [ ] Que el efecto sea clinicamente significativo (no solo estadisticamente)
- [ ] Que no haya evidencia contradictoria de calidad igual o superior

### Paso 6: Emitir veredicto

| Veredicto | Criterio | Ejemplo |
|-----------|----------|---------|
| ✅ VERIFICADO | Evidencia solida Nivel 1-2, sin contradicciones | "Creatina 3-5g/dia aumenta fuerza" |
| ⚠️ PARCIAL | Evidencia existe pero con matices importantes | "El 12-3-30 quema grasa" (si, pero no mas que otro LISS equivalente) |
| ❌ INCORRECTO | La evidencia no respalda o contradice | "Los BCAAs son necesarios con proteina adecuada" |
| ❓ INSUFICIENTE | No hay suficiente evidencia de calidad | "Myo-reps son superiores a series tradicionales para hipertrofia" |
| 🔄 DESACTUALIZADO | Era correcto pero nueva evidencia lo actualiza | "Ventana anabolica de 30 minutos" |

---

## Checklist rapido para claims comunes

### Nutricion
| Claim | Veredicto esperado | Verificar con |
|-------|-------------------|---------------|
| "Deficit 250-500 kcal optimo para recomposicion" | ✅ Bien respaldado | ISSN 2017, Helms 2014 |
| "Proteina 1.8-2.4 g/kg para recomposicion" | ✅ Bien respaldado | Helms 2014, Jager 2017 |
| "Ventana anabolica 4-6h" | ⚠️ Parcial (matizar) | Schoenfeld & Aragon 2013 |
| "Cafeina +3-4% rendimiento" | ✅ Bien respaldado | ISSN Position Stand Caffeine |
| "BCAAs innecesarios" | ✅ Correcto si proteina >1.6g/kg | Jackman 2017, Dieter 2016 |
| "Comer de noche engorda" | ❌ Mito | Balance calorico total importa |
| "Ayuno 16:8 superior para grasa" | ❌ No superior per se | Adherencia > metodo |

### Entrenamiento
| Claim | Veredicto esperado | Verificar con |
|-------|-------------------|---------------|
| "2x/semana frecuencia optima" | ⚠️ Parcial (vs 3x en principiantes) | Schoenfeld 2016 meta |
| "Volume Landmarks de RP" | ⚠️ Orientativo, no absoluto | Basado en experiencia clinica + estudios |
| "Deload cada 4-5 semanas" | ⚠️ Depende del individuo | Bell 2023, autoregulacion |
| "DUP superior a lineal" | ⚠️ Similar en hipertrofia | Diferentes beneficios |
| "Hip thrust 143% MVIC" | ✅ Verificable | Contreras et al. |
| "Fasted cardio no superior" | ✅ Bien respaldado | Meta-analisis 2017 |
| "HIIT max 2x/semana" | ⚠️ Conservador pero razonable | Depende de recuperacion |

---

## Formato de verificacion individual

```
VERIFICACION: "[Afirmacion textual]"
======================================

FUENTE CITADA: [Autor, año] o [sin fuente]
TIPO DE ESTUDIO: [Meta-analisis / RCT / Observacional / etc.]
TAMANO DE MUESTRA: [n=X] o [multiple studies]
POBLACION: [Quienes fueron los sujetos]

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
