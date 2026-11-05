# Matriz de alineación pedagógica

Relaciona cada objetivo de [02_diseno.md](02_diseno.md) con su contenido, actividad, evaluación y paso del recorrido. Leyenda de estado del recurso: **E** existe y se reutiliza, **M** existe y requiere mejora, **N** no existe y debe crearse (ver [03_desarrollo.md](03_desarrollo.md)).

Códigos de evaluación: `Dnn` diagnóstico inicial, `Fnn` evaluación final, `En` escenario práctico, `comp:<id>` pregunta existente de `comprehension.json`.

| Objetivo | Bloom | Contenido (recurso) | Estado | Actividad | Evaluación | Paso |
|----------|-------|---------------------|--------|-----------|------------|------|
| SCR-1 Explicar el scraping | Comprender | Tarjeta `scraping` (`literacy.js`) | E | Lectura y reflexión sobre canales propios | D01, F01 | aprende |
| SCR-2 Situar cada capa en el ciclo de vida | Comprender | `OverviewStep`, `receives`/`passes` de `layers.js`; diagrama del ciclo de vida | M + N | Asociar capas y momentos | D18, F18 | mapa, aprende |
| ENT-1 Cómo aprende un generador | Comprender | Tarjeta nueva `entrenamiento` | N | Lectura con analogía | D02, F02 | aprende |
| ENT-2 Entrenamiento general frente a ajuste fino | Comprender | Tarjeta nueva `entrenamiento`; tarjeta `cloaking` | N + E | Caso breve de imitación de estilo | D03, F03 | aprende |
| MET-1 Dónde se declara la autoría | Recordar, comprender | `AuditDropzone`, `DiagnosticPanel` | E | Auditar imagen propia o de práctica | D04, F04, E1 | metadatos |
| MET-2 Firmar y comprobar | Aplicar | `MetadataSigner` (puntaje antes y después) | E | Firmar y reauditar | E1 | metadatos |
| MET-3 Riesgo GPS | Aplicar | `DiagnosticPanel` (privacy), regla `gps`, opción `strip_gps` | E | Firmar sin GPS una imagen de práctica | D06, F06, E1 | metadatos, publicacion |
| MET-4 Interpretar el puntaje y el límite de los metadatos | Comprender | `DiagnosticPanel` (`score_breakdown`); nota explicativa del puntaje | M | Predecir el puntaje y contrastar | D05, F05, D07, F07, comp:puntaje, E5 | metadatos |
| EXC-1 Distinguir señales de exclusión | Comprender | Tarjeta `noai`, `ExclusionStep` | E | Revisar directivas del archivo | D08, F08, D09, F09, comp:noai | aprende, exclusion |
| EXC-2 Añadir y verificar exclusión | Aplicar | `MetadataSigner` (`ai_opt_out`), `ExclusionStep` | E | Firmar con exclusión y revisar capa 2 | E1 | metadatos, exclusion |
| PER-1 Idea de la perturbación | Comprender | Tarjeta `adversarial`, `ProtectionLab` (vistas y diferencias) | E | Comparar vista persona y vista modelo | D10, F10, comp:perturbacion | aprende, perturbacion |
| PER-2 Cloaking frente a envenenamiento | Comprender | Tarjeta `cloaking` | E | Clasificar descripciones de herramientas | D12, F12 | aprende |
| PER-3 Límites y resistencia de la perturbación | Analizar | Tarjeta `adversarial`; `ProtectionLab` (tras JPEG 75); `StressSimulator`; `stressed.jpg`; nota sobre medición de caja blanca | M | Comprimir y observar el cambio | D11, F11, E4 | perturbacion |
| MAR-1 Marcas visibles e invisibles | Comprender | Tarjeta `watermark`, `CompareSlider` | E | Comparar original y marca | D13, F13, comp:compresion | aprende |
| MAR-2 Comparar marca y perturbación | Evaluar | `ProtectionLab` (anillos SSIM, insignia) | E | Elegir técnica para un caso | E4 | perturbacion |
| C2P-1 Qué demuestra C2PA | Comprender | Tarjeta `c2pa`, `C2paCard` | M | Leer la tarjeta C2PA de la auditoría | D14, F14, comp:c2pa | aprende, metadatos |
| C2P-2 Interpretar el estado C2PA | Aplicar | `C2paCard`, reglas `sin_c2pa` y `c2pa_invalida`; imágenes de práctica con C2PA | E + N | Auditar imagen firmada y modificada | E3 | metadatos, publicacion |
| COM-1 Predecir qué sobrevive | Comprender | Tarjeta `compression`, `CompareSlider` | E | Predecir antes de ejecutar la suite | D15, F15, comp:plataformas, comp:compresion | aprende, perturbacion, publicacion |
| COM-2 Comprobar con simulador y suite | Aplicar | `StressSimulator`, `ResistanceTable` | E | Correr la suite sobre imagen firmada | E2 | perturbacion |
| PUB-1 Lista previa y reauditoría | Aplicar | `PublishStep`, reglas `reauditar` y `terminos` | E | Revisar recomendaciones del archivo | D16, F16, E6 | publicacion |
| PUB-2 Justificar la combinación de capas | Evaluar | `OverviewStep`, `SummaryStep` | M | Explicar el estado de cada capa | D17, F17, E6 | mapa, resumen |
| PUB-3 Términos de uso | Comprender | Regla `terminos` | E | Identificar qué revisar en unos términos | E6 | publicacion |

## Cobertura por instrumento

| Instrumento | Objetivos cubiertos |
|-------------|---------------------|
| Diagnóstico inicial (D01 a D18) | SCR-1, SCR-2, ENT-1, ENT-2, MET-1, MET-3, MET-4, EXC-1, PER-1, PER-2, PER-3, MAR-1, C2P-1, COM-1, PUB-1, PUB-2 |
| Evaluación final (F01 a F18) | Los mismos 16 objetivos, con ítems paralelos |
| Escenarios (E1 a E6) | MET-1, MET-2, MET-3, MET-4, EXC-2, PER-3, MAR-2, C2P-2, COM-2, PUB-1, PUB-2, PUB-3 |
| `comprehension.json` existente (6 ítems, sin cambios) | EXC-1, COM-1, MET-4, PER-1, C2P-1, MAR-1 |

Los 22 objetivos tienen al menos un instrumento. Los objetivos de nivel Aplicar o superior (MET-2, EXC-2, MAR-2, C2P-2, COM-2, PUB-3) se evalúan solo con escenarios, porque un ítem de opción múltiple no demuestra la capacidad de hacer.

## Correspondencia ítem a ítem (pre y post)

| Objetivo | Diagnóstico | Final |
|----------|-------------|-------|
| SCR-1 | D01 | F01 |
| ENT-1 | D02 | F02 |
| ENT-2 | D03 | F03 |
| MET-1 | D04 | F04 |
| MET-4 | D05 | F05 |
| MET-3 | D06 | F06 |
| MET-4 | D07 | F07 |
| EXC-1 | D08 | F08 |
| EXC-1 | D09 | F09 |
| PER-1 | D10 | F10 |
| PER-3 | D11 | F11 |
| PER-2 | D12 | F12 |
| MAR-1 | D13 | F13 |
| C2P-1 | D14 | F14 |
| COM-1 | D15 | F15 |
| PUB-1 | D16 | F16 |
| PUB-2 | D17 | F17 |
| SCR-2 | D18 | F18 |
