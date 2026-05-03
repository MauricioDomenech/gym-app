# Memoria del Coach Nutricional — gym-app

## Perfil del usuario

- [Perfil biometrico y objetivos](user_perfil.md) — hombre 43 anos, 101.4 kg, objetivo 93 kg, sem 4 completada
- [Plan nutricional activo](user_nutricion_actual.md) — ~1965 kcal/dia (v3 redesenado 26/04), TDEE real 2720, deficit 755 kcal, sin AOVE
- [Entrenamiento y progresiones](user_entrenamiento.md) — PPL x2, cardio ~215-245 min/semana, fuerza en aumento

## Reglas de comportamiento confirmadas

- NUNCA hacer commits ni preguntar por commits
- SIEMPRE comunicarse en espanol
- Check-in semanal los domingos — analizar JSON exportado + generar reporte
- Reportes guardados en: `reportes/semana-XX.md`
- Protocolo semanal actual: al recibir `definicion-semana-XX-export.json`, primero leer todo lo necesario, comparar contra el import previo y revisar peso/cardio/adherencia/fuerza. Luego charlar con el usuario sobre la semana y las decisiones. NO generar automaticamente `definicion-semana-(XX+1)-import.json`; preguntar antes si quiere que se genere. Cuando el usuario confirme, crear el JSON con `weekTo` correcto y poner en cada `workoutProgress[].observations` la recomendacion concreta para esa semana: subir, mantener, consolidar, reps objetivo, RIR esperado y condicion de retroceso.
- En cada check-in semanal, pedir/revisar tambien los datos extra de la balanza BIA si el usuario los aporta: grasa corporal %, grasa subcutanea %, grasa visceral, musculo esqueletico %, masa muscular, agua corporal %, peso sin grasa, masa osea, proteina %, TMB e IMC. Usarlos solo como tendencia y con cautela; si una semana faltan, continuar el analisis con JSON, peso, fuerza, cardio y adherencia.
- EL USUARIO NO QUIERE CAMBIOS EN EL ENTRENAMIENTO — respetar siempre
- Los cardios del plan actual NO son opcionales: LISS lunes-viernes + HIIT sabado/domingo segun programacion. Si no se hacen, registrar como adherencia real, no compensar con castigo.
- Todos los cereales/legumbres se pesan en CRUDO

## Estado actual de la fase (actualizado 03/05/2026)

- Semana 7 iniciando: peso 101.2 kg al 03/05/2026. Nueva estrategia: **Plan Recomp Lenta 2026** hasta fin de diciembre.
- Objetivo actualizado: bajar grasa lentamente sin perder masa muscular. Ya NO perseguir 90 kg para mitad de agosto como objetivo principal.
- Calorias: mantener el rango actual (~1930-2028 kcal/dia, promedio ~1965) porque el usuario considera que con ese nivel baja y mantiene fuerza. No subir a 2300 kcal como punto de partida.
- Ajuste semanal: si baja >0.8 kg/semana, cae fuerza/energia/sueno o aparece fatiga persistente, subir 100-150 kcal/dia o bajar fatiga. Si no baja durante 3 semanas con adherencia real alta, ajustar minimamente.
- Ritmo deseado: 0.25-0.45 kg/semana; aceptar hasta ~0.6 kg/semana si fuerza y energia estan bien.
- Refeeds: no programarlos por defecto; cualquier comida flexible se registra como adherencia real dentro del check-in.
- AOVE: ELIMINADO del plan (fuga calorica principal identificada)
- Creatina: 5g/dia confirmado

## Patrones aprendidos

- La balanza BIA tiene 0.3-0.7 kg de variabilidad — nunca interpretar cambios semanales como datos exactos de composicion corporal
- La perdida de semana 2 (-1.10 kg) fue atipicamente alta por vaciado inicial de glucogeno
- El usuario se frustra cuando no ve cambios visibles semana a semana — importante contextualizar con datos de fuerza
- La fuerza en gym es el indicador mas confiable de retencion muscular en deficit
