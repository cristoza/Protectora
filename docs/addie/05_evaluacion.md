# Fase E: Evaluación

## 1. Tres dimensiones, tres tipos de instrumento

| Dimensión | Pregunta | Instrumento | Estado |
|-----------|----------|-------------|--------|
| Conocimiento adquirido | ¿Qué sabe la persona antes y después del recorrido? | Diagnóstico inicial (forma A) y evaluación final (forma B), 18 ítems paralelos | Propuesta pendiente de validación |
| Capacidad de aplicar | ¿Puede usar las herramientas y tomar decisiones correctas en casos realistas? | Escenarios prácticos E1 a E6 con rúbrica | Propuesta pendiente de validación |
| Usabilidad | ¿Qué tan fácil es usar la plataforma? | SUS (10 ítems) | Implementada; **redacción no verificada** (`verified: false`) |

Complementos: autoeficacia percibida (5 ítems ad hoc, antes y después) y las 6 preguntas existentes de `comprehension.json`, que se conservan sin cambios.

## 2. SUS no mide aprendizaje

La SUS (Brooke, 1996) mide la **usabilidad percibida** del sistema. Una puntuación alta no indica que la persona haya aprendido, y una baja no indica que no lo haya hecho. Por eso:

- SUS se reporta y analiza por separado de los resultados de conocimiento y aplicación.
- No se combinan en un índice único.
- Sí puede explorarse su relación (por ejemplo, correlación entre SUS y ganancia), interpretándola como asociación, no como causa.

### Estado de la implementación actual [Verificado en código]

- `backend/core/sus.py` implementa correctamente la puntuación de Brooke: ítems impares `respuesta - 1`, pares `5 - respuesta`, suma por 2,5. Cubierto por `tests/test_sus.py`.
- `frontend/src/data/evaluation.js` cita la versión en español validada de Sevilla-Gonzalez et al. (2020), *JMIR Human Factors* 7(4), e21161, pero el texto de los ítems es un **borrador de trabajo**, con `verified: false`. `EvaluationFlow` muestra el aviso "No la uses con participantes".
- Esta documentación **no** considera validada la escala. Antes de cualquier aplicación hay que copiar la redacción literal del Apéndice 2 del artículo, comprobar el orden y la polaridad de los ítems (los impares deben seguir siendo positivos para que `sus.py` puntúe bien) y cambiar a `verified: true`.

### Interpretación de SUS

- Referencia habitual: media de alrededor de 68 en estudios agregados (Sauro, 2011).
- Escala de adjetivos de Bangor, Kortum y Miller (2009) como apoyo descriptivo.
- Con muestras pequeñas se reportan mediana, rango intercuartílico y media con intervalo de confianza, sin sobreinterpretar.

## 3. Evaluación diagnóstica inicial

- **Instrumento:** [instrumentos/diagnostico_inicial.json](instrumentos/diagnostico_inicial.json).
- **Contenido:** 18 ítems de opción múltiple (D01 a D18) asociados a 16 objetivos; 5 ítems de autoeficacia; 3 preguntas de perfil opcionales y categóricas.
- **Uso formativo:** al terminar se muestran solo las áreas a reforzar, sin calificación, para no desmotivar.
- **Uso investigador:** línea base para la comparación pre y post y contraste de las hipótesis H1 a H5 de [01_analisis.md](01_analisis.md).

## 4. Evaluación final

- **Instrumento:** [instrumentos/evaluacion_final.json](instrumentos/evaluacion_final.json).
- **Contenido:** 18 ítems paralelos (F01 a F18): mismo objetivo, mismo nivel cognitivo, distinta situación o redacción, para reducir el efecto de memoria de la forma A. Los mismos 5 ítems de autoeficacia.
- **Retroalimentación:** explicación de cada ítem al terminar.
- **Preguntas existentes:** las 6 de `comprehension.json` pueden aplicarse junto a la forma B mientras la tutoría decide si se integran o se sustituyen. Se mapean a objetivos en [matriz_alineacion.md](matriz_alineacion.md).

## 5. Escenarios prácticos

- **Instrumento:** [instrumentos/escenarios_practicos.json](instrumentos/escenarios_practicos.json).
- Seis casos (E1 a E6) con contexto, tarea, herramienta de la app, evidencia observable y rúbrica de tres niveles: `logrado` (2), `parcial` (1), `no_logrado` (0).
- Se aplican preferentemente en sesión facilitada, con las imágenes de práctica sintéticas (recurso N3), para no exigir que la persona suba obra propia.
- La rúbrica la registra la persona facilitadora con el código anónimo. No se guarda texto libre, imágenes ni grabaciones en la app.

## 6. Indicadores de aprendizaje

| Indicador | Cálculo | Dimensión |
|-----------|---------|-----------|
| I1. Puntaje de conocimiento | % de aciertos en la forma A y en la forma B (18 ítems) | Conocimiento |
| I2. Ganancia normalizada individual | `g = (post - pre) / (100 - pre)`, con puntajes en % (Hake, 1998). Indefinida si `pre = 100` | Conocimiento |
| I3. Logro por objetivo | % de participantes que aciertan todos los ítems de un objetivo en la forma B | Conocimiento |
| I4. Cambio por ítem | Proporción de aciertos pre y post por ítem; patrones error a acierto y acierto a error | Conocimiento |
| I5. Puntaje de aplicación | Suma de la rúbrica de los escenarios aplicados, en % del máximo | Aplicación |
| I6. Logro por escenario | % de participantes con `logrado` en cada criterio | Aplicación |
| I7. Cambio de autoeficacia | Diferencia de la media de los 5 ítems post menos pre | Percepción |
| I8. Calibración | Relación entre autoeficacia y aciertos (detecta sobreconfianza, H1) | Percepción |
| I9. SUS | Puntuación 0 a 100 por participante; mediana del grupo | Usabilidad |

## 7. Criterios de interpretación [Provisionales, a calibrar en el piloto]

- **Objetivo logrado (individual):** todos sus ítems correctos en la forma B y, si tiene escenario, nivel `logrado` en el criterio correspondiente.
- **Objetivo logrado (grupo):** al menos el 70 % de participantes lo logra. Por debajo del 50 %, el contenido o el ítem se revisan.
- **Ganancia normalizada media:** como orientación descriptiva, Hake (1998) usó g < 0,3 baja, 0,3 a 0,7 media, > 0,7 alta. Se emplea solo como referencia, no como estándar para este contexto.
- **Ítem problemático en el piloto:** dificultad (proporción de aciertos) por encima de 0,90 en el pre (no discrimina) o por debajo de 0,20 en el post; discriminación ítem-total baja; o comentarios que muestren ambigüedad.
- **Aplicación:** puntaje de escenarios igual o superior al 70 % del máximo como objetivo de diseño.

Todos estos umbrales son decisiones de diseño, no valores validados. Deben justificarse con la tutoría y revisarse tras el piloto.

## 8. Comparación de resultados

- **Diseño:** pre y post en un solo grupo (sin grupo control). Permite describir el cambio, no atribuirlo con certeza al recorrido (maduración, efecto de la prueba, sesgo de selección). Debe declararse como limitación.
- **Pruebas estadísticas sugeridas** (muestras pequeñas, datos no normales):
  - Puntaje total pre y post: prueba de rangos con signo de Wilcoxon; tamaño del efecto r.
  - Cada ítem (acierto o error emparejado): prueba de McNemar, con corrección por comparaciones múltiples o tratada como exploratoria.
  - Autoeficacia: Wilcoxon.
  - Relación SUS y ganancia: correlación de Spearman, exploratoria.
- **Comparación por perfil** (disciplina, experiencia previa): solo descriptiva, y solo si cada grupo tiene suficientes personas para no permitir reidentificación.
- **Confiabilidad:** KR-20 de las formas A y B en el piloto; acuerdo entre evaluadores en la rúbrica si hay más de una persona facilitadora (kappa de Cohen).

## 9. Privacidad y ética

Se mantiene el carácter anónimo actual y se extiende a los instrumentos nuevos:

- Mismo código aleatorio generado en el navegador para diagnóstico y final, mostrado a la persona; sin cookies de seguimiento ni vínculo con la cuenta.
- Solo se guardan respuestas cerradas, puntajes, fecha sin hora y versión del instrumento. Nada de nombres, correos, IP, navegador ni imágenes.
- Las preguntas de perfil son opcionales, con categorías amplias y "Prefiero no decirlo".
- Consentimiento informado antes del diagnóstico, con el texto actualizado para explicar que hay dos momentos de evaluación.
- Retirada de datos mediante el código, como indica hoy la pantalla de agradecimiento.
- La investigación con participantes requiere la aprobación ética que corresponda en la institución.

## 10. Mejora continua

Ciclo después de cada aplicación:

1. Exportar resultados (CSV con token).
2. Calcular indicadores I1 a I9 y el análisis de ítems.
3. Identificar objetivos no logrados e ítems problemáticos.
4. Decidir si el problema es del contenido, de la actividad o del ítem (la matriz de alineación permite rastrearlo).
5. Registrar los cambios con una nueva versión del instrumento.
6. Llevar los cambios al Product Backlog como historias educativas.

## 11. Riesgos de la evaluación

| Riesgo | Mitigación |
|--------|------------|
| Aplicar SUS no verificada | Mantener `verified: false` y el aviso hasta sustituir el texto |
| Corrección calculada en el cliente | Recalcular en el servidor antes de recoger datos de investigación |
| Efecto de memoria entre pre y post | Formas paralelas; no mostrar la retroalimentación del diagnóstico ítem a ítem |
| Ítems con una opción obviamente correcta | Análisis de distractores en el piloto; revisión experta |
| Muestra pequeña | Análisis no paramétricos, tamaños de efecto, interpretación prudente |
| Reidentificación por perfil | Categorías amplias, perfil opcional, sin cruces con grupos pequeños |
| Evaluación final hecha sin pasar por el recorrido | Registrar si existe diagnóstico previo para el mismo código; analizar solo pares completos |
| Confundir usabilidad con aprendizaje | Reportes separados (sección 2) |
