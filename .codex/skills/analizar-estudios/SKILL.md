---
name: analizar-estudios
description: "Evaluate scientific study quality."
---

# Analizador Critico de Estudios de Fitness y Nutricion

## 10 trampas metodologicas comunes en estudios fitness/nutricion

| # | Trampa | Como detectarla | Ejemplo |
|---|--------|----------------|---------|
| 1 | Muestra muy pequena | n < 20 sujetos | "Estudio en 12 hombres demuestra que X es superior" |
| 2 | Duracion insuficiente | < 6 semanas para hipertrofia, < 4 para composicion corporal | "4 semanas de protocolo X mejoro la masa muscular" |
| 3 | Poblacion no representativa | Solo hombres jovenes, solo atletas de elite, solo obesos | "Funciona en atletas de elite" → aplicado a principiantes |
| 4 | Estudio agudo como cronico | Respuesta de UNA sesion extrapolada a meses | "El ejercicio X activa mas el musculo" (EMG agudo ≠ hipertrofia) |
| 5 | Sin grupo control | No hay comparacion con placebo o grupo sin tratamiento | "Todos mejoraron con el suplemento" (sin grupo placebo) |
| 6 | Financiamiento conflictivo | Fabricante del producto financia el estudio | Empresa de creatina financia estudio sobre creatina |
| 7 | Cherry-picking de outcomes | Se miden 20 cosas, se reporta solo 1 positiva | "Mejoro fuerza de grip" (pero no mejoro nada mas) |
| 8 | Confundidores no controlados | Sueno, dieta, estres, adherencia no medidos | "El grupo X gano mas musculo" (pero tambien dormia mas) |
| 9 | Extrapolacion in vitro → in vivo | Resultados en celulas/tubos de ensayo aplicados a humanos | "En celulas musculares, X estimula la sintesis proteica" |
| 10 | Publication bias | Solo se publican resultados positivos | "5 estudios muestran que funciona" (20 que no muestran efecto no se publicaron) |

---

## Piramide de evidencia con ejemplos fitness

| Nivel | Tipo de estudio | Peso evidencial | Ejemplo en fitness |
|-------|----------------|-----------------|-------------------|
| **1** | Meta-analisis de RCTs | MAXIMO | Schoenfeld 2016: frecuencia 2x/semana superior |
| **2** | Revision sistematica | MUY ALTO | Cochrane review sobre suplementacion |
| **3** | RCT (n > 30, > 8 sem) | ALTO | Estudio MATADOR (Byrne 2018, n=51) |
| **4** | RCT pequeno (n < 30) | MODERADO | Muchos estudios de EMG |
| **5** | Estudio de cohorte | BAJO-MODERADO | Seguimiento de atletas durante anos |
| **6** | Caso-control | BAJO | Comparacion retrospectiva |
| **7** | Serie/reporte de caso | MUY BAJO | "Este atleta hizo X y gano Y" |
| **8** | Opinion de experto | MINIMO | "Mike Israetel dice que..." |
| **9** | Estudio animal/in vitro | NO APLICA DIRECTO | "En ratones, X aumento musculo" |

---

## Protocolo de evaluacion critica de un estudio

### Fase 1: Estructura basica

```
- [ ] Titulo y autores: ¿Reconocidos en el campo?
- [ ] Revista: ¿Peer-reviewed? ¿Factor de impacto?
- [ ] Ano: ¿Es reciente o hay evidencia mas nueva?
- [ ] Tipo: ¿RCT, observacional, revision, caso?
- [ ] DOI/PMID: ¿Es verificable?
```

### Fase 2: Metodologia

```
- [ ] Tamano de muestra: n = ___. ¿Adecuado para el claim?
      (Hipertrofia: minimo n=20/grupo. Fuerza: minimo n=15/grupo)
- [ ] Poblacion: ¿Quienes? (edad, sexo, nivel de entrenamiento)
      ¿Son comparables al usuario que recibira la recomendacion?
- [ ] Duracion: ¿Suficiente para el outcome medido?
      (Fuerza: min 4 sem. Hipertrofia: min 8 sem. Composicion: min 8 sem)
- [ ] Control: ¿Hay grupo control/placebo?
- [ ] Cegamiento: ¿Simple? ¿Doble? ¿Ninguno?
- [ ] Aleatorizacion: ¿Los grupos se asignaron al azar?
- [ ] Variables controladas: ¿Dieta, sueno, adherencia medidos?
- [ ] Conflicto de interes: ¿Quien financio? ¿Autores con afiliacion comercial?
```

### Fase 3: Resultados

```
- [ ] Significancia estadistica: p < 0.05? ¿Se reporta?
- [ ] Tamano del efecto (effect size): ¿Es clinicamente relevante?
      Cohen's d: < 0.2 trivial | 0.2-0.5 pequeno | 0.5-0.8 moderado | > 0.8 grande
      ¿Un d = 0.15 con p < 0.001 justifica cambiar de protocolo?
- [ ] Intervalos de confianza: ¿Son estrechos o muy amplios?
- [ ] Intencion de tratar: ¿Se incluyeron TODOS los sujetos o hubo drop-outs selectivos?
- [ ] Magnitud del efecto: ¿El resultado es PRACTICO?
      "Mejora de 0.3 kg de masa magra en 12 semanas" → ¿vale la pena?
```

### Fase 4: Interpretacion

```
- [ ] ¿La conclusion se ajusta a los datos mostrados?
      (A veces los autores exageran en la discusion)
- [ ] ¿Se generalizan resultados a poblaciones no estudiadas?
- [ ] ¿Se reconocen las limitaciones?
- [ ] ¿Los resultados han sido replicados por otros grupos independientes?
- [ ] ¿Hay meta-analisis que incluyan este estudio? ¿Que dicen?
```

---

## Casos especificos: EMG y activacion muscular

Los estudios EMG son MUY citados en fitness pero tienen limitaciones importantes:

| Limitacion | Explicacion |
|-----------|-------------|
| Medicion aguda | EMG mide activacion en 1 sesion, NO predice hipertrofia a largo plazo |
| Colocacion de electrodos | Varia entre estudios → resultados no siempre comparables |
| Normalizacion (MVIC) | Diferentes metodos de normalizacion = diferentes numeros |
| Muestras pequenas | Tipicamente n = 8-15 |
| Solo musculos superficiales | No mide musculos profundos |
| No mide tension mecanica | Tension mecanica (no solo activacion) es el driver principal de hipertrofia |

**Conclusion**: "98% activacion EMG" es informativo pero NO definitivo. Un ejercicio con menor EMG puede producir igual o mejor hipertrofia si genera mas tension mecanica o mayor rango de estiramiento.

---

## Revistas predatorias comunes en fitness (evitar como fuente)

| Senal de alerta | Descripcion |
|-----------------|-------------|
| Sin peer review real | Publican todo si pagas |
| Nombres similares a revistas prestigiosas | "Journal of Nutrition and Exercise" vs "Journal of the ISSN" |
| Sin factor de impacto | No aparecen en Web of Science o Scopus |
| Solicitan articulos por email no solicitado | "Estimado investigador, le invitamos a publicar..." |
| Revision en < 2 semanas | Revision real toma 2-6 meses |

### Revistas CONFIABLES en fitness/nutricion
- Journal of the International Society of Sports Nutrition (JISSN)
- Medicine & Science in Sports & Exercise (MSSE)
- British Journal of Sports Medicine (BJSM)
- International Journal of Sport Nutrition and Exercise Metabolism
- Sports Medicine
- Strength & Conditioning Journal
- Journal of Strength and Conditioning Research (JSCR)
- Nutrients
- Frontiers in Nutrition / Physiology (con precaucion — standard variable)

---

## Formato de evaluacion

```
EVALUACION CRITICA DE ESTUDIO
==============================

Estudio: [Titulo completo]
Autores: [Primer autor et al.]
Revista: [Nombre] | Ano: [XXXX] | DOI: [link]

ESTRUCTURA: [Adecuada / Debil / Insuficiente]
- Tipo: [RCT/Observacional/etc.] | n = [X] | Duracion: [X semanas]
- Poblacion: [descripcion]
- Control: [Si/No] | Cegamiento: [Simple/Doble/No]

METODOLOGIA: [Solida / Aceptable / Debil]
- Variables controladas: [Si/Parcial/No]
- Conflicto interes: [Si/No/No declarado]

RESULTADOS: [Clinicamente relevantes / Estadisticamente significativos pero triviales / No significativos]
- p = [valor] | d = [valor] | IC 95%: [rango]

VEREDICTO: [Usar con confianza / Usar con matices / Evidencia debil / Descartar]
RAZON: [explicacion en 1-2 frases]
```

## Fuentes
- CONSORT 2025 Statement (Nature Medicine)
- PRISMA 2020 Checklist
- PERSiST Guidance for Exercise/Sport (PMC 2022)
- SIFT Method (UChicago Library)
- Cochrane Handbook for Systematic Reviews
