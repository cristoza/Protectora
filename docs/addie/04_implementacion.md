# Fase I: Implementación

Diseño de cómo integrar los recursos en la sección Aprendizaje. **Nada de lo descrito aquí está implementado**: es la propuesta para etapas posteriores. Se respetan estas condiciones:

- Se conservan las tres secciones (Aprendizaje, Laboratorio, Proyectos) y los siete pasos de `layers.js`.
- ADDIE no aparece como navegación: la persona usuaria no ve "Análisis, Diseño...".
- Las cuentas siguen siendo opcionales; nada de la evaluación depende de iniciar sesión ni se vincula con una cuenta.
- Las evaluaciones siguen siendo anónimas.

## 1. Recorrido educativo sobre la navegación existente

| Momento instruccional | Dónde se integra | Cómo | Obligatorio |
|-----------------------|------------------|------|-------------|
| Diagnóstico inicial | Paso 1, `mapa` | Tarjeta o botón secundario "Antes de empezar: ¿qué sabes ya?" que abre el flujo de evaluación en modo diagnóstico | No |
| Presentación de contenidos | Paso 2, `aprende` | Tarjetas de `literacy.js` más la tarjeta nueva `entrenamiento`; diagrama del ciclo de vida | No (como hoy) |
| Demostraciones | Pasos 2 y 5 | `CompareSlider` y ejemplo precalculado de `ProtectionLab`, sin cambios | No |
| Actividades prácticas | Pasos 3 a 6 | Breve consigna "Pruébalo" junto a cada herramienta existente; opción de usar imágenes de práctica en lugar de la obra propia | No |
| Evaluación final | Paso 7, `resumen` (y pie de página, como hoy) | El flujo actual de `EvaluationFlow` ampliado: forma B, escenarios (si la sesión está facilitada), SUS | No |
| Retroalimentación | Final de la evaluación | Explicación de cada ítem (`feedback`) y objetivos logrados, solo en pantalla | No |
| Resumen de aprendizaje | Paso 7 | Sección "Qué aprendiste" por áreas, junto al estado de las capas | No |

Todo es opcional para no convertir la guía en un examen. La navegación libre con `LayerRail` se mantiene.

## 2. Reutilización y adaptación

| Funcionalidad | Archivo | Decisión | Adaptación necesaria |
|---------------|---------|----------|----------------------|
| Pasos y estados | `data/layers.js`, `getStatus()` | Reutilizar sin cambios | Ninguna. El aprendizaje no se mezcla con el estado de las capas |
| Tarjetas de conceptos | `data/literacy.js`, `LiteracyStep.jsx` | Reutilizar | Añadir una entrada `entrenamiento` (el componente ya itera la lista; el icono debe existir en `ICONS`) |
| Comparador | `CompareSlider.jsx` | Reutilizar sin cambios | Ninguna |
| Auditoría, firma, cloak, simulador, suite, asistente | `AuditDropzone`, `MetadataSigner`, `ProtectionLab`, `StressSimulator`, `ResistanceTable`, `PublishStep` | Reutilizar sin cambios funcionales | Consignas de actividad junto a cada uno; nada se duplica |
| Flujo de evaluación | `EvaluationFlow.jsx` | Adaptar | Aceptar un modo (`diagnostico` o `final`), cargar el instrumento correspondiente, mostrar `feedback` al terminar y conservar el mismo código anónimo entre ambos modos |
| Formato de preguntas | `comprehension.json` | Reutilizar el formato | Los instrumentos nuevos usan el mismo esquema (`id`, `question`, `options`, `correct`) con campos extra (`objective`, `feedback`) |
| Almacenamiento | `backend/core/evaluations.py`, `POST /api/evaluations` | Adaptar en etapa posterior | Ver sección 3 |
| SUS | `data/evaluation.js`, `core/sus.py` | Reutilizar | Sustituir el texto por el literal del Apéndice 2 de Sevilla-Gonzalez et al. (2020) y poner `verified: true` |
| Resumen | `SummaryStep.jsx` | Adaptar | Sección "Qué aprendiste" con los resultados en memoria del navegador |
| Laboratorio y Proyectos | `LabView.jsx`, `ProjectsView.jsx` | Sin cambios | El Laboratorio sigue siendo el espacio de práctica libre; no se evalúa |
| Cuentas | `core/accounts.py`, `lib/account.js` | Sin cambios | Las evaluaciones no se guardan en la cuenta ni en `/api/progress` |

## 3. Evaluación de conocimientos implementada (2026-11-05)

Se implementó la medición de conocimientos antes y después del recorrido:

1. **Enlace anónimo.** `frontend/src/lib/participant.js` genera el código en el navegador y lo guarda solo en `sessionStorage`: lo comparten el diagnóstico, la evaluación final y la escala SUS mientras la pestaña siga abierta. No es una cookie ni se relaciona con la cuenta.
2. **Almacenamiento.** Tabla nueva `knowledge_tests` en la misma SQLite anónima (`backend/data/evaluations.sqlite`), con `UNIQUE (participant_code, phase)`, `instrument_version` y fecha sin hora. La tabla `evaluations` no cambia.
3. **Corrección en el servidor.** `backend/core/knowledge.py` lee los instrumentos de `docs/addie/instrumentos/`; `GET /api/knowledge/{diagnostico|final}` entrega las preguntas sin claves y `POST` corrige, guarda y responde. El diagnóstico devuelve solo el resumen por objetivo (para no enseñar claves antes del recorrido); la final añade la explicación de cada ítem y, si hay diagnóstico con el mismo código, la comparación con la ganancia normalizada.
4. **Exportación.** `GET /api/knowledge/export` (mismo token `EVAL_EXPORT_TOKEN`): una fila por prueba, acierto por ítem, autoeficacia, perfil y ganancia en las finales emparejadas.
5. **Interfaz.** `KnowledgeTest.jsx`: tarjeta opcional en el paso Mapa (diagnóstico) y en el Resumen (evaluación final y "Qué aprendiste" por áreas). Muestra un aviso de versión de prueba mientras el instrumento tenga `"validated": false`.
6. **Pruebas.** `backend/tests/test_knowledge.py`.

Sigue pendiente:

- **Escenarios.** Se aplican en sesión facilitada y la rúbrica se registra fuera de la app con el código de participante; nunca texto libre ni imágenes.
- **Validación académica** de los instrumentos y piloto. Al cambiar un instrumento ya aplicado, sube su `version`.
- **Corrección en servidor de `comprehension.json`**: el cuestionario anterior de `EvaluationFlow` sigue calculando `correct` en el navegador.

## 4. Modalidades de aplicación

- **Autónoma:** la persona recorre Aprendizaje a su ritmo; puede hacer diagnóstico y final. Mide conocimiento y usabilidad; los escenarios quedan como autoevaluación sin registro.
- **Facilitada (para la investigación):** sesión con consentimiento, diagnóstico, recorrido, escenarios observados con rúbrica, evaluación final y SUS. Permite medir las tres dimensiones.

En ambas, el cloak en vivo es opcional; todas las actividades tienen versión con el ejemplo precalculado.

## Relación con Scrum

ADDIE no sustituye a Scrum. Scrum organiza el desarrollo del producto; ADDIE organiza el diseño instruccional, cuyos productos entran al Product Backlog como cualquier otro trabajo.

### Situación observada [Verificado en el repositorio]

El repositorio no contiene artefactos de Scrum. El historial muestra siete commits: una versión inicial y seis "Fases" (suite de resistencia, corpus de validación, evaluación SUS y de comprensión, Módulo 1 con ejemplos precalculados, Asistente de Publicación Segura, pruebas y documentación), además de cambios sin confirmar sobre cuentas, Laboratorio y Proyectos. No se supone ninguna correspondencia entre esas fases y sprints concretos.

### Integración propuesta

- **ADDIE iterativo dentro de cada sprint.** Cada sprint que toque el componente educativo recorre un microciclo: analizar (qué objetivo se atiende y con qué evidencia), diseñar (actividad y evaluación), desarrollar (contenido o instrumento), implementar (integrarlo en la app) y evaluar (revisión experta o piloto).
- **Historias de usuario educativas** en el Product Backlog, con el objetivo de aprendizaje como criterio de aceptación. Ejemplo: "Como creadora quiero entender cómo aprende un generador para decidir si me afecta (ENT-1). Aceptación: tarjeta publicada, ítems D02 y F02 revisados por la tutoría."
- **Definición de Terminado ampliada** para elementos educativos: objetivo referenciado en la matriz; cumple los cinco principios de rigor; texto revisado; funciona sin el cloak en vivo y sin red externa; no recoge datos personales; accesible.
- **Sprint Review** con evidencia educativa cuando la haya (resultados de revisión experta o piloto), no solo demostración de funcionalidad.
- **Responsabilidades.** La persona Product Owner (autoría del proyecto con la tutoría) prioriza los objetivos; el diseño instruccional y la validación académica de instrumentos se asignan explícitamente como tareas del sprint.

### Entregables educativos por iteración (propuesta)

La duración y numeración de los sprints son las que defina el equipo. El orden respeta las dependencias.

| Iteración | Fase ADDIE predominante | Entregables educativos | Dependencias técnicas |
|-----------|-------------------------|------------------------|-----------------------|
| 1 | Análisis | Protocolo de investigación de necesidades (entrevista o encuesta breve) y su aprobación ética; verificación del texto literal de SUS; revisión experta de objetivos y de esta documentación | Ninguna |
| 2 | Diseño y desarrollo | Tarjeta `entrenamiento`, mejora de la tarjeta `c2pa`, nota del puntaje, diagrama del ciclo de vida, textos de retroalimentación | Cambios en `literacy.js` y en textos de componentes |
| 3 | Desarrollo | Instrumentos validados por la tutoría (formas A y B, escenarios); imágenes de práctica sintéticas | Script de generación de imágenes de práctica |
| 4 | Implementación | Modo diagnóstico y final en `EvaluationFlow`, enlace anónimo, almacenamiento por fase, corrección en servidor, resumen "Qué aprendiste" | Cambios de esquema y endpoint con pruebas |
| 5 | Evaluación | Prueba piloto, análisis de ítems, informe de resultados y lista de revisiones | Exportación CSV ampliada |
| 6 | Evaluación y revisión | Ajustes de contenidos e instrumentos según el piloto; aplicación definitiva | Las que resulten del piloto |
