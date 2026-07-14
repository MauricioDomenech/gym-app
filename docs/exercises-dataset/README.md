# Revisión de `hasaneyldrm/exercises-dataset`

Fecha de revisión: 14 de julio de 2026.

## Fuente revisada

- Repositorio: <https://github.com/hasaneyldrm/exercises-dataset>
- Clon local de trabajo: `/tmp/exercises-dataset-gym-app`
- Commit: `118e4bd6b14da6df0e36605d7169b65db18389a4`
- Fecha del commit: `2026-07-09T21:10:06+03:00`
- Plan comparado: `src/assets/data/definicion/plan_definicion.json`

## Artefactos generados

- `dataset-gifs.csv`: catálogo completo de los 1.324 GIF, con ID, nombre, grupos musculares, equipo, ruta, tamaño, miniatura, disponibilidad de instrucciones en español y atribución.
- `plan-gif-matches.csv`: cruce manual de las 69 apariciones del plan actual, contando 41 ejercicios principales y 28 alternativas.

La integración copia únicamente los 58 GIF seleccionados a `public/images/exercises/definicion/`. El clon completo permanece fuera del árbol de Git.

## Auditoría del dataset

| Comprobación | Resultado |
|---|---:|
| Registros JSON | 1.324 |
| GIF presentes | 1.324 |
| Miniaturas JPG presentes | 1.324 |
| GIF válidos de 180×180 | 1.324 |
| Rutas GIF únicas | 1.324 |
| IDs duplicados | 0 |
| Grupos de nombres duplicados | 6 |
| Instrucciones y pasos en español | 1.324 |
| Tamaño total de los GIF | 128.741.397 bytes, aproximadamente 123 MiB |

El contenido es amplio y técnicamente consistente, pero requiere curación. Hay nombres con errores o caracteres dañados, por ejemplo `cable cross-over revers fly` y `sled 45в° leg press`; también existen metadatos discutibles, como `farmers walk` clasificado con `target: quads`. Por eso el cruce del plan se hizo por movimiento, equipo, agarre y posición, no solo por similitud textual.

## Cobertura del plan actual

| Tipo | Total | Exacto | Apto con matiz | Requiere desambiguar | Sin match exacto |
|---|---:|---:|---:|---:|---:|
| Principales | 41 | 36 | 5 | 0 | 0 |
| Alternativas | 28 | 24 | 2 | 0 | 2 |
| **Total** | **69** | **60** | **7** | **0** | **2** |

- Cobertura exacta: `60/69`, un 87,0 %.
- Cobertura utilizable incluyendo matices: `67/69`, un 97,1 %.
- Esos 67 usos corresponden a 58 GIF distintos y pesan aproximadamente 5,7 MiB.
- Las dos apariciones restantes tienen un candidato aproximado, pero no un equivalente visual exacto.

### Variantes confirmadas por el usuario

Las ocho etiquetas que admitían más de una ejecución quedaron asociadas a estas variantes concretas:

- `Extensiones de triceps con mancuerna`: de pie y con ambas manos (`0430`).
- `Dominadas / Jalon al pecho (pronado)`: jalón prono al pecho (`0150`).
- `Remo con pecho apoyado (chest-supported)`: remo horizontal en máquina con pecho apoyado (`1350`).
- `Wrist curl (curl de muneca)`: sentado y con mancuernas (`0401`).
- `Curl inverso barra Z / polea`: con barra Z (`0451`).
- `Jalon al pecho (supino o neutro)`: agarre supino (`0245`).
- `Pullover (polea o mancuerna)`: en polea y con los brazos rectos (`0238`).
- `Curl inclinado / Bayesian curl`: curl inclinado con mancuernas (`0318`).

Los nombres del plan todavía conservan algunas variantes separadas por `/`; el catálogo registra cuál de ellas se realiza realmente sin modificar por ahora los identificadores del historial.

### Alternativas sin equivalente exacto

- `Pec deck unilateral`: solo hay pec deck bilateral.
- `Face pull`: no aparece en el dataset. No debe reutilizarse el GIF de `Reverse cable fly`, porque son movimientos distintos.

### Matices aceptables si se muestran claramente

- `Pallof press`: el dataset lo muestra con banda, no con polea.
- `Prensa de piernas (posicion alta)`: el GIF muestra la prensa, pero no garantiza la colocación alta de los pies.
- Los dos remos al mentón: el movimiento y el equipo coinciden, pero el ancho de agarre no está identificado.
- `Remo pecho apoyado unilateral con mancuerna`: el candidato utiliza agarre supino.
- `Glute bridge en suelo con mancuerna`: el patrón coincide, pero el GIF es sin carga.

## Implementación en la web

Las 67 apariciones con correspondencia exacta o aceptable apuntan ahora a GIF existentes bajo `public/images/exercises/definicion/`. Los 58 archivos distintos pesan aproximadamente 5,7 MiB y se cargan únicamente al abrir el modal del ejercicio.

`Pec deck unilateral` y `Face pull` quedan sin botón de demostración porque el dataset no contiene una ejecución exacta. El componente oculta el botón cuando `imagen` está vacío, evitando tanto enlaces rotos como movimientos visualmente incorrectos.

## Licencia y atribución

El código, la estructura del dataset y las instrucciones están bajo MIT, pero los medios no. `LICENSE` y `NOTICE.md` indican que los GIF y JPG pertenecen a Gym visual, que clonar el repositorio no concede una licencia de reutilización y que debe conservarse la atribución `© Gym visual — https://gymvisual.com/`.

El usuario confirmó el 14 de julio de 2026 que recibió autorización para usar estos medios en el sitio. La atribución a Gym visual se conserva en el pie del modal.

Referencia: <https://gymvisual.com/content/3-terms-and-conditions-of-use>

## Estado de integración

1. Autorización de uso confirmada por el usuario.
2. Las ocho variantes ambiguas quedaron resueltas según la ejecución real.
3. Se copiaron solo 58 GIF, no los 1.324 del dataset completo.
4. Las 67 apariciones compatibles del plan apuntan a un archivo existente.
5. El GIF se carga únicamente al abrir el modal y muestra la atribución correspondiente.
6. Las dos variantes sin equivalencia exacta permanecen sin demostración visual.

## Otras mejoras aprovechables

- Usar `equipment`, `target`, `body_part` y `secondary_muscles` para filtrar alternativas, manteniendo una lista curada en lugar de reemplazos automáticos.
- Ofrecer filtros del tipo “misma función, equipo disponible” para encontrar sustitutos cuando una máquina está ocupada.
- Incorporar el esquema JSON para validar IDs y metadatos importados.
- Separar en el modelo `thumbnail`, `gif`, `instructions` y `attribution`; el campo genérico `imagen` ya queda corto para este uso.
- Mantener los comentarios específicos del plan como fuente principal de técnica y usar las instrucciones del dataset como ayuda visual secundaria, no como autoridad automática.
