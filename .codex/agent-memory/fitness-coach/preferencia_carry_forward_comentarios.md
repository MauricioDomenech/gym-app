---
fecha: 2026-08-17
tipo: preferencia_usuario
alcance: imports_semanales_definicion
---

# Conservar comentarios al generar la semana siguiente

Cuando se genere un `definicion-semana-*-import.json` a partir del export de la
semana anterior:

1. Copiar por defecto cada comentario real contenido en `[USER_FEEDBACK]` al
   ejercicio correspondiente del nuevo import.
2. Anteponer la semana de origen, por ejemplo `SEMANA 18:`, para distinguir el
   comentario anterior de una observación nueva.
3. Mantener literalmente el texto del usuario, incluso si contiene errores de
   ortografía o no tiene tildes.
4. No crear feedback para ejercicios sin comentario ni para sesiones omitidas.
5. Mantener separado el nuevo `[COACH_PLAN]` del `[USER_FEEDBACK]` arrastrado.
6. Validar que el número de comentarios conservados coincida con el export fuente.

Esta es la conducta predeterminada para futuros imports; solo se omite si el
usuario lo pide expresamente.
