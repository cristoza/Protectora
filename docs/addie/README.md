# Diseño instruccional de Escudo Visual con el modelo ADDIE

Esta carpeta documenta cómo se aplica el modelo ADDIE (Analysis, Design, Development, Implementation, Evaluation) al componente educativo de Escudo Visual. ADDIE se usa aquí **solo como metodología de diseño instruccional**: organiza el análisis de necesidades, los objetivos de aprendizaje, los recursos, su integración en la sección Aprendizaje y la evaluación del aprendizaje. El desarrollo del software sigue organizado con Scrum (ver [04_implementacion.md](04_implementacion.md#relación-con-scrum)).

ADDIE **no** se traduce en cinco pasos nuevos de navegación. La aplicación conserva sus tres secciones (Aprendizaje, Laboratorio, Proyectos) y los siete pasos del recorrido definidos en `frontend/src/data/layers.js`.

## Estado de esta documentación

- Versión inicial, elaborada a partir de la inspección del repositorio el 2026-11-05 (rama de trabajo con cambios sin confirmar sobre el commit `76bc6a9`).
- No se modificó código, endpoints, bases de datos ni los instrumentos existentes (`evaluation.js`, `comprehension.json`).
- Los instrumentos de `instrumentos/` son **propuestas iniciales pendientes de validación académica** (revisión por la tutoría y por personas expertas, prueba piloto y análisis de ítems). No deben aplicarse con participantes hasta completar esa validación.
- No se han realizado entrevistas, encuestas ni estudios con usuarios. Todo lo que en estos documentos se refiere a necesidades o perfiles de las personas usuarias es **hipótesis**, marcada como tal, salvo lo que se deriva directamente del código.

## Convenciones

- **[Verificado en código]**: afirmación comprobada en el repositorio, con referencia al archivo.
- **[Hipótesis]**: supuesto razonable que debe validarse con investigación.
- **[Propuesta]**: decisión de diseño aún no implementada.
- **[Pendiente]**: tarea identificada que requiere trabajo futuro.

## Índice

| Archivo | Fase | Contenido |
|---------|------|-----------|
| [01_analisis.md](01_analisis.md) | Análisis | Diagnóstico educativo actual, público, necesidades, limitaciones, contradicciones entre documentación y código, conocimientos iniciales a evaluar |
| [02_diseno.md](02_diseno.md) | Diseño | 22 objetivos de aprendizaje en 9 áreas, contribución de cada uno de los siete pasos |
| [matriz_alineacion.md](matriz_alineacion.md) | Diseño | Matriz objetivos, contenidos, actividades y evaluaciones |
| [03_desarrollo.md](03_desarrollo.md) | Desarrollo | Inventario de recursos existentes, mejoras y recursos nuevos |
| [04_implementacion.md](04_implementacion.md) | Implementación | Integración en Aprendizaje, reutilización de componentes, relación con Scrum |
| [05_evaluacion.md](05_evaluacion.md) | Evaluación | Sistema de evaluación en tres dimensiones, indicadores, criterios, comparación pre y post, riesgos |
| [instrumentos/diagnostico_inicial.json](instrumentos/diagnostico_inicial.json) | Evaluación | Forma A: 18 ítems de conocimiento, autoeficacia y perfil opcional |
| [instrumentos/evaluacion_final.json](instrumentos/evaluacion_final.json) | Evaluación | Forma B paralela: 18 ítems y autoeficacia |
| [instrumentos/escenarios_practicos.json](instrumentos/escenarios_practicos.json) | Evaluación | 6 escenarios de aplicación con rúbrica |

## Principios de rigor que atraviesan todo el diseño

Ningún recurso, objetivo ni instrumento debe afirmar o dar a entender que:

1. Los metadatos impiden técnicamente el scraping.
2. Las etiquetas `noai`, `noimageai`, IPTC Data Mining o TDMRep garantizan la exclusión del entrenamiento.
3. C2PA garantiza por sí mismo la autenticidad de una obra.
4. Una perturbación adversarial da inmunidad frente a cualquier modelo.
5. El puntaje de `/api/audit` es una probabilidad de que la imagen sea extraída o usada para entrenar.

El puntaje (`backend/core/metadata_reader.py`, `_score`) es un **índice de señales declaradas**: parte de 100 y resta puntos por autoría (25), copyright (25), exclusión (40) y derechos en XMP/IPTC (10). Este diseño no propone cambiarlo; propone enseñar a interpretarlo (objetivo MET-4).

## Referencias metodológicas

- Branch, R. M. (2009). *Instructional Design: The ADDIE Approach*. Springer.
- Biggs, J. (1996). Enhancing teaching through constructive alignment. *Higher Education*, 32, 347-364.
- Anderson, L. W., y Krathwohl, D. R. (Eds.) (2001). *A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives*. Longman.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. En *Usability Evaluation in Industry*. Taylor & Francis.
- Hake, R. R. (1998). Interactive-engagement versus traditional methods. *American Journal of Physics*, 66(1), 64-74.

Las referencias técnicas de cada mecanismo están en [03_desarrollo.md](03_desarrollo.md#referencias-técnicas-para-revisar-los-contenidos). Conviene que la autora o el autor del proyecto contraste cada cita con su fuente antes de incluirla en la memoria.
