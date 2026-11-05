# Fase D: Desarrollo

Esta fase identifica los recursos educativos existentes, cómo aprovecharlos y qué falta. El criterio es **no duplicar las herramientas técnicas**: Laboratorio, auditoría, firma, cloak, simulador y suite ya existen y son el soporte de la práctica. Lo que falta son, sobre todo, textos, casos, imágenes de práctica, retroalimentación e instrumentos.

## 1. Inventario de recursos existentes

| Tipo | Recurso | Archivo | Aprendizaje | Uso propuesto | Estado |
|------|---------|---------|-------------|---------------|--------|
| Texto explicativo | 7 tarjetas del Módulo 1 | `frontend/src/data/literacy.js` | Conceptual | Núcleo de contenidos del paso `aprende` | Reutilizar; mejorar `c2pa`; añadir `entrenamiento` |
| Texto explicativo | `lead`, `receives`, `passes` de cada paso | `frontend/src/data/layers.js` | Conceptual | Ciclo de vida de la imagen (SCR-2) | Reutilizar |
| Ilustración | `ScanMockup` del mapa | `components/steps/OverviewStep.jsx` | Conceptual | Organizador previo | Reutilizar |
| Comparación visual | `CompareSlider` + `public/examples/` | `components/CompareSlider.jsx` | Demostrativo | PER-1, MAR-1, COM-1 | Reutilizar |
| Simulación | `ProtectionLab` (vivo o precalculado) | `components/ProtectionLab.jsx` | Demostrativo y práctico | PER-1, PER-3, MAR-2 | Reutilizar; matizar la comparación con Glaze (fuera de esta etapa) |
| Simulación | `StressSimulator` | `components/StressSimulator.jsx` | Práctico | PER-3, COM-2 | Reutilizar |
| Simulación | `ResistanceTable` (`/api/stress-suite`) | `components/ResistanceTable.jsx` | Práctico | COM-1, COM-2 | Reutilizar |
| Ejercicio práctico | Auditoría y firma | `AuditDropzone`, `DiagnosticPanel`, `MetadataSigner` | Práctico | MET-1 a MET-4, EXC-2, C2P-2 | Reutilizar |
| Ejercicio práctico | Asistente de publicación | `PublishStep.jsx`, `publication_rules.json` | Práctico | PUB-1, PUB-3 | Reutilizar |
| Retroalimentación | Estado de capas y resumen | `getStatus()`, `SummaryStep.jsx` | Reflexivo | PUB-2 | Ampliar con resumen por objetivos |
| Retroalimentación | Desglose del puntaje | `DiagnosticPanel` (`score_breakdown`) | Práctico | MET-4 | Reutilizar |
| Preguntas de comprensión | 6 ítems | `frontend/src/data/comprehension.json` | Evaluación | Se conservan sin cambios; se mapean a objetivos | Conservar |
| Instrumento de usabilidad | SUS | `frontend/src/data/evaluation.js`, `backend/core/sus.py` | Evaluación | Usabilidad | Pendiente de verificar la redacción literal |
| Caso de estudio | No existe | | | | Crear |

## 2. Recursos que requieren mejora

### 2.1 Tarjeta `c2pa` de `literacy.js` [Pendiente]

El texto "desaparece en cuanto la imagen se recomprime" es correcto para el manifiesto incrustado en el archivo, que es lo que lee la app. Conviene precisarlo para no generalizar, y añadir que la validez depende de confiar en quien firma y que no prueba que la escena sea verdadera. Propuesta de redacción (a revisar):

> Sirve para demostrar origen, no para impedir copias ni para probar que lo que muestra la imagen sea cierto. Si el registro va dentro del archivo, suele perderse al recomprimirlo.

### 2.2 Nota de interpretación del puntaje [Pendiente]

`DiagnosticPanel` ya explica que 100 significa ninguna señal. Falta una frase que diga explícitamente que **no es una probabilidad** de que la imagen se recopile o se use para entrenar. No se propone cambiar `_score` ni los umbrales de `risk_level`.

### 2.3 Comparación con Glaze en `ProtectionLab` [Pendiente]

El texto "hace como Glaze" puede dar a entender equivalencia. La técnica de la app es un ataque PGD sobre el codificador VAE de Stable Diffusion hacia un patrón fijo, y su eficacia se mide contra ese mismo VAE (caja blanca). Conviene decir "del mismo tipo que Glaze" y añadir que la medición no indica eficacia frente a otros modelos.

### 2.4 Retroalimentación de la evaluación [Pendiente]

Hoy, tras enviar, no se explica ninguna respuesta. Los instrumentos nuevos incluyen un campo `feedback` por ítem para mostrarlo al final. Para las seis preguntas existentes se puede añadir la explicación en la interfaz sin cambiar el JSON (o en una versión nueva del instrumento, decisión de la tutoría).

### 2.5 Mapa de capas y resumen [Pendiente]

- Mapa: añadir el ciclo de vida de la imagen (recopilación, filtrado, entrenamiento o ajuste, publicación) y qué capa actúa en cada momento (SCR-2).
- Resumen: añadir "Qué aprendiste" por objetivos cuando la persona haya hecho la evaluación final, sin guardar nada fuera de la sesión.

## 3. Recursos que deben crearse

| # | Recurso | Tipo | Objetivos | Notas |
|---|---------|------|-----------|-------|
| N1 | Tarjeta `entrenamiento` | Texto explicativo | ENT-1, ENT-2 | Cómo aprende un generador, sin tecnicismos; ajuste fino con pocas obras para imitar un estilo; mención de la memorización documentada. Formato idéntico a las tarjetas de `literacy.js` |
| N2 | Diagrama del ciclo de vida de la imagen | Ilustración | SCR-2, PUB-2 | SVG estático, sin red, con los tokens de `index.css` |
| N3 | Imágenes de práctica sintéticas | Ejemplos | MET-1, MET-3, C2P-2, COM-2 | Generadas por un script del proyecto (como `generate_examples.py`) para no depender de imágenes de terceros ni obligar a subir obra propia: una con GPS y sin autor, una firmada, una con C2PA válido (certificado de prueba de `scripts/c2pa_test_signer.py`) y una modificada después de firmar |
| N4 | Retroalimentación por ítem | Retroalimentación | Todos | Incluida en `feedback` de los instrumentos propuestos |
| N5 | Casos de estudio | Caso | MET, PER, MAR, C2P, COM, PUB | Base de los escenarios de `instrumentos/escenarios_practicos.json` |
| N6 | Diagnóstico inicial y evaluación final | Instrumento | 16 objetivos | `instrumentos/diagnostico_inicial.json`, `instrumentos/evaluacion_final.json` |
| N7 | Escenarios prácticos con rúbrica | Instrumento | 12 objetivos | `instrumentos/escenarios_practicos.json` |
| N8 | Guía para la persona facilitadora | Documento | Evaluación | Protocolo de sesión: consentimiento, orden, tiempos, cómo registrar la rúbrica sin datos personales |

## 4. Combinación de los tres tipos de aprendizaje

| Tipo | Qué es en Escudo Visual | Recursos |
|------|-------------------------|----------|
| Conceptual | Saber qué es cada mecanismo y su límite | Tarjetas de `literacy.js` (más N1), mapa de capas, diagrama N2 |
| Demostrativo | Ver el efecto sin riesgo ni espera | `CompareSlider`, ejemplo precalculado de `ProtectionLab`, `stressed.jpg` |
| Práctico | Hacerlo con un archivo y comprobarlo | Auditoría, firma, `ProtectionLab` en vivo, `StressSimulator`, `ResistanceTable`, `PublishStep`, imágenes de práctica N3 |

Cada área del diseño debe pasar por los tres tipos. La tabla de [matriz_alineacion.md](matriz_alineacion.md) muestra que las áreas ENT y PUB-3 solo tienen contenido conceptual; es una limitación aceptada, porque una práctica de entrenamiento de modelos queda fuera del alcance de la herramienta.

## 5. Criterios de calidad para todo recurso nuevo o mejorado

1. Cumple los cinco principios de rigor de [README.md](README.md).
2. Español claro, en vocabulario de diseño, sin rayas largas (convención de la interfaz).
3. Funciona sin conexión externa y sin el cloak en vivo.
4. No pide ni guarda datos personales ni imágenes.
5. Accesible: texto alternativo, contraste con los tokens existentes, respeta `prefers-reduced-motion`.
6. Revisado por la tutoría o por una persona experta antes de usarse con participantes.

## Referencias técnicas para revisar los contenidos

Conviene contrastar cada referencia con su fuente antes de citarla en la memoria.

- Schuhmann, C., et al. (2022). LAION-5B: An open large-scale dataset for training next generation image-text models. *NeurIPS Datasets and Benchmarks*.
- Carlini, N., et al. (2023). Extracting training data from diffusion models. *USENIX Security Symposium*.
- Shan, S., et al. (2023). Glaze: Protecting artists from style mimicry by text-to-image models. *USENIX Security Symposium*.
- Shan, S., et al. (2024). Nightshade: Prompt-specific poisoning attacks on text-to-image generative models. *IEEE Symposium on Security and Privacy*.
- Liang, C., et al. (2023). Adversarial example does good: Preventing painting imitation from diffusion models via adversarial examples (Mist). *ICML*.
- Hönig, R., Rando, J., Carlini, N., y Tramèr, F. (2025). Adversarial perturbations cannot reliably protect artists from generative AI. *ICLR*.
- C2PA. *Content Credentials: C2PA Technical Specification*. https://c2pa.org/specifications/
- W3C TDM Reservation Protocol Community Group. *TDMRep*. https://www.w3.org/community/tdmrep/
- IPTC. *IPTC Photo Metadata Standard* (propiedad Data Mining). https://iptc.org/standards/photo-metadata/
