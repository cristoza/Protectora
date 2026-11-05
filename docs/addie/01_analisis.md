# Fase A: Análisis

## 1. Diagnóstico de la situación educativa actual

### 1.1 Qué existe hoy [Verificado en código]

| Elemento | Dónde | Función educativa actual |
|----------|-------|--------------------------|
| Recorrido de siete pasos | `frontend/src/data/layers.js` (`STEPS`) | Secuencia: mapa, conceptos clave, cuatro capas, resumen. Cada capa declara qué recibe (`receives`) y qué entrega (`passes`) |
| Estado de cada capa | `getStatus()` en `layers.js` | Capas 1 y 2 se verifican con la auditoría real; capas 3 y 4 son declaradas por la persona (casillas) o, en la capa 3, por haber generado un cloak en vivo |
| Módulo 1 "Conceptos clave" | `frontend/src/data/literacy.js`, `LiteracyStep.jsx` | Siete tarjetas (scraping, noai, perturbación adversarial, cloaking frente a envenenamiento, marcas de agua, C2PA, compresión). Cada una con `body`, `takeaway` ("En corto") y, en cuatro casos, un enlace `goTo` al paso donde se practica |
| Demostración visual | `CompareSlider.jsx`, `frontend/public/examples/` | Comparador original contra perturbación, marca de agua y versión "tras publicar", con ejemplos precalculados de una ilustración sintética |
| Auditoría y firma | `AuditDropzone`, `DiagnosticPanel`, `MetadataSigner` (paso `metadatos`) | Práctica con el archivo propio: puntaje antes y después de firmar, desglose de penalizaciones, tarjeta C2PA |
| Señales de exclusión | `ExclusionStep.jsx` | Lista de cinco directivas reconocidas, marcando cuáles trae el archivo |
| Perturbación y resistencia | `ProtectionLab`, `StressSimulator`, `ResistanceTable` (paso `perturbacion`) | Cloak contra marca de agua con SSIM persona y modelo, simulador de compresión, suite de resistencia con cuatro indicadores |
| Publicación | `PublishStep.jsx`, `backend/core/publication_rules.json` | Recomendaciones generadas desde la auditoría, marcadas como hechas por la persona |
| Resumen | `SummaryStep.jsx` | Estado de las cuatro capas y acceso a la evaluación |
| Evaluación | `EvaluationFlow.jsx`, `data/evaluation.js`, `data/comprehension.json`, `backend/core/evaluations.py`, `backend/core/sus.py` | Consentimiento, SUS (10 ítems), seis preguntas de comprensión, almacenamiento anónimo en SQLite y exportación CSV con token |

### 1.2 Fortalezas

- **Aprendizaje situado en el archivo propio.** Las capas 1 y 2 trabajan con datos reales del archivo de la persona y muestran el efecto de firmar (puntaje antes y después).
- **Honestidad sobre límites ya presente en los textos.** Por ejemplo: "Son una petición, no un candado" (`literacy.js`), "Ningún conjunto de capas garantiza que una imagen no se use" (`SummaryStep.jsx`), "Guía, no se comprueba aquí" para las capas 3 y 4 (`OverviewStep.jsx`).
- **Demostración sin red.** `CompareSlider` y el ejemplo precalculado de `ProtectionLab` funcionan sin llamadas externas.
- **Separación de lo verificado y lo declarado** en `getStatus()` y en el resumen.
- **Privacidad por diseño** en las evaluaciones (código aleatorio, sin IP, Pydantic con `extra="forbid"`).

### 1.3 Carencias educativas detectadas

1. **No hay objetivos de aprendizaje explícitos.** Los contenidos existen, pero no está escrito qué debe saber o poder hacer la persona al terminar, ni cómo se comprueba.
2. **No hay evaluación diagnóstica inicial.** La única medición es posterior (`EvaluationFlow`), por lo que no se puede estimar ganancia de aprendizaje.
3. **El cuestionario de comprensión es corto y desigual.** Seis ítems (`comprehension.json`), de tres opciones, que cubren noai, plataformas, puntaje, perturbación, C2PA y compresión. No cubre scraping, entrenamiento, metadatos de autoría, GPS, marcas de agua (como propósito) ni estrategia de publicación. El propio archivo dice "Borrador para revisar con la tutoría".
4. **No se mide la capacidad de aplicar.** No hay escenarios ni tareas evaluadas; las casillas de las capas 3 y 4 son autodeclaraciones.
5. **Sin retroalimentación formativa.** Tras enviar la evaluación solo se muestra el código; no se explica por qué una respuesta es correcta.
6. **Falta contenido sobre el entrenamiento de IA.** La tarjeta de scraping menciona que las colecciones sirven para entrenar, pero ninguna explica a nivel general cómo aprende un modelo ni la diferencia entre entrenamiento general y ajuste fino para imitar un estilo, que es el riesgo que motiva a Glaze.
7. **El puntaje puede leerse como probabilidad.** `DiagnosticPanel.jsx` lo rotula "Vulnerabilidad" y "Riesgo alto/medio/bajo". Lo matiza ("100 significa que no hay ninguna señal..."), pero no hay una actividad que enseñe a interpretarlo.
8. **La evaluación final no está ligada al recorrido.** Se puede abrir desde el pie de página en cualquier momento, sin haber pasado por los pasos. Es correcto para la usabilidad, pero complica atribuir el aprendizaje al recorrido.
9. **La escala SUS no está verificada.** `evaluation.js` tiene `verified: false` y la interfaz muestra un aviso. La redacción actual es un borrador que debe sustituirse por el texto literal del Apéndice 2 de Sevilla-Gonzalez et al. (2020). Este análisis **no** la considera validada.

## 2. Público objetivo

### 2.1 Lo que se deriva del código [Verificado en código]

- La aplicación se dirige a personas que crean imágenes y las publican: el lenguaje habla de "tu obra", "tu estilo", "dónde publicas", y `literacy.js` declara textos "en vocabulario de diseño, sin tecnicismos innecesarios".
- Se asume que la persona tiene archivos propios en JPEG, PNG, WebP o TIFF (`ALLOWED_EXT` en `backend/main.py`) y sabe subirlos desde el navegador.
- La interfaz está en español.
- Las cuentas son opcionales: el recorrido completo funciona sin registrarse.

### 2.2 Perfiles hipotéticos [Hipótesis]

No hay datos de usuarios. Se proponen perfiles para orientar el diseño y la investigación posterior:

| Perfil | Rasgos supuestos | Necesidad supuesta |
|--------|------------------|--------------------|
| P1. Ilustración y arte digital | Publica en redes y portafolios; preocupación por la imitación de estilo | Entender cloaking, ajuste fino y límites de Glaze |
| P2. Fotografía | Archivos con EXIF rico, a veces con GPS; conoce parte de los metadatos | Firmar, quitar GPS, saber qué borra cada plataforma |
| P3. Diseño gráfico y comunicación | Exporta desde programas de edición; conoce formatos | Elegir formato y calidad, entender C2PA al exportar |
| P4. Creación aficionada o estudiante | Poca familiaridad técnica | Conceptos básicos, vocabulario, una ruta corta y clara |

### 2.3 Niveles de alfabetización [Hipótesis]

Se proponen tres niveles, a validar con el diagnóstico inicial:

- **Nivel 1, inicial:** sabe publicar imágenes, no conoce los metadatos ni cómo se recopilan las imágenes.
- **Nivel 2, intermedio:** conoce EXIF o las marcas de agua; ha oído hablar de Glaze o noai, sin distinguir qué protege cada uno.
- **Nivel 3, avanzado:** distingue petición, barrera técnica y procedencia; conoce transformaciones de plataforma; puede usar herramientas externas.

Hipótesis a contrastar:

- **H1.** La mayoría de participantes sobrestima la eficacia de las etiquetas noai y de la marca de agua.
- **H2.** Pocas personas saben que muchas plataformas eliminan los metadatos al subir la imagen.
- **H3.** La distinción entre cloaking y envenenamiento es poco conocida.
- **H4.** El puntaje tiende a interpretarse como probabilidad de ser usada para entrenar.
- **H5.** El nivel de alfabetización técnica previo modera la ganancia de aprendizaje.

## 3. Problemas educativos que aborda la plataforma

1. **Confusión entre petición y barrera.** Metadatos y etiquetas de exclusión declaran, no impiden.
2. **Desconocimiento del ciclo de vida de la imagen.** Lo que se escribe en el archivo puede no sobrevivir a la publicación.
3. **Expectativas desajustadas sobre las herramientas de perturbación.** Protegen frente a los modelos para los que se calcularon y pueden atenuarse con transformaciones.
4. **Falta de vocabulario común.** Scraping, TDM, C2PA, cloaking o envenenamiento son términos opacos para muchas personas creadoras.
5. **Riesgos de privacidad no relacionados con la IA.** La ubicación GPS en los metadatos.

## 4. Conocimientos previos necesarios

Requisitos mínimos para seguir el recorrido [Propuesta]:

- Manejo básico del navegador: subir un archivo, descargar el resultado.
- Saber qué es un archivo de imagen y reconocer al menos un formato (JPEG o PNG).
- Haber publicado o querer publicar imágenes en internet.

No se requieren conocimientos de programación, aprendizaje automático ni derecho.

## 5. Necesidades de aprendizaje [Hipótesis derivadas del análisis del contenido]

1. Comprender cómo se recopilan las imágenes y en qué momentos actúa cada capa.
2. Comprender a nivel general cómo aprende un generador y qué es ajustar un modelo para imitar un estilo.
3. Saber leer y escribir autoría y señales de exclusión, y comprobarlo.
4. Distinguir los mecanismos por lo que protegen y por lo que no protegen.
5. Saber comprobar qué sobrevive a la publicación.
6. Interpretar correctamente el diagnóstico de la herramienta.
7. Tomar decisiones de publicación combinando capas.

## 6. Limitaciones

### 6.1 Tecnológicas [Verificado en código]

- **Cloak en vivo opcional.** `/api/protect` solo funciona con `ENABLE_LIVE_CLOAK=1`, PyTorch y el VAE descargado; tarda unos 25 a 60 s. Sin él, la capa 3 muestra el ejemplo precalculado y no permite generar una versión propia. Cualquier actividad práctica de la capa 3 debe funcionar en ambos modos.
- **El cloak se mide contra el mismo VAE que ataca.** El SSIM "para el modelo" usa la reconstrucción de `stabilityai/sd-vae-ft-mse`, el mismo codificador sobre el que se optimiza la perturbación. Es una medida de caja blanca: no indica eficacia frente a otros modelos.
- **Ejemplos sintéticos de colores planos.** `README.md` (Limitaciones) advierte que la perturbación se nota más en esa ilustración que en fotografías con textura.
- **Recomendaciones y casillas no verificables** fuera de la app (capas 3 y 4).
- **Lector XMP por expresiones regulares** y C2PA limitado a `c2pa-python<0.9`.
- **Cuentas dependen de PostgreSQL**; sin él la app sigue funcionando sin guardar nada.
- **Frontend sin pruebas automatizadas.**

### 6.2 Pedagógicas

- Recorrido autodirigido sin acompañamiento docente: la retroalimentación debe estar en la propia interfaz.
- Las evaluaciones son anónimas y no se vinculan con las cuentas: la comparación pre y post requiere un mecanismo anónimo de enlace (ver [05_evaluacion.md](05_evaluacion.md)).
- El tamaño de muestra previsible en un proyecto de grado es pequeño, lo que limita el análisis estadístico.
- La eficacia real de las protecciones cambia con el tiempo (nuevos modelos, nuevas políticas de plataformas): los contenidos necesitan revisión periódica.

## 7. Contradicciones y diferencias entre documentación y código

Se documentan antes de tomar decisiones. Ninguna se ha corregido en esta etapa.

| # | Documentación | Código | Efecto en el diseño |
|---|---------------|--------|---------------------|
| 1 | El encargo indica que el desarrollo se organiza con Scrum | El repositorio no contiene artefactos de Scrum (backlog, sprints). El historial de commits usa "Fase 1" a "Fase 6" | La relación con Scrum se plantea como propuesta, sin suponer sprints pasados |
| 2 | `README.md` (Evaluación): se guarda "opción elegida y si es correcta" | El campo `correct` lo calcula el navegador (`EvaluationFlow.jsx`) y el backend lo acepta sin recalcularlo (`ComprehensionAnswer` en `backend/main.py`) | La puntuación de comprensión depende del cliente. Para fines de investigación conviene recalcularla en el servidor [Pendiente] |
| 3 | `CLAUDE.md` y `README.md` llaman al paso "Conceptos clave" | `layers.js` lo titula "Cómo se usan tus imágenes" (`short: 'Conceptos clave'`) | Solo nomenclatura. En estos documentos se usa "Conceptos clave (paso `aprende`)" |
| 4 | `README.md` habla de "puntaje de riesgo" y "exposición" | `DiagnosticPanel.jsx` lo muestra como "Vulnerabilidad" con niveles "Riesgo alto/medio/bajo" | Riesgo de leerlo como probabilidad. Se aborda con el objetivo MET-4, sin cambiar el algoritmo |
| 5 | `literacy.js` (C2PA): "desaparece en cuanto la imagen se recomprime" | La afirmación es correcta para manifiestos incrustados, que es lo que lee `read_c2pa()`. La especificación C2PA contempla además manifiestos externos y vinculación flexible | Precisión de contenido a revisar [Pendiente, ver 03_desarrollo.md] |
| 6 | `ProtectionLab.jsx`: "La perturbación hace como Glaze" | El cloak es un PGD sobre el VAE de SD hacia un patrón fijo (`core/image_protector.py`). Glaze usa un objetivo de transferencia de estilo y otras restricciones perceptuales | Presentarlo como "inspirado en" o "del mismo tipo que", no como equivalente [Pendiente, texto de UI fuera del alcance de esta etapa] |
| 7 | `README.md` (Frontend): Proyectos "solo con sesión" | La pestaña siempre se ve; el contenido pide iniciar sesión (`ProjectsView.jsx`) | Sin efecto educativo |

## 8. Conocimientos iniciales a evaluar

El diagnóstico inicial ([instrumentos/diagnostico_inicial.json](instrumentos/diagnostico_inicial.json)) mide:

1. **Conocimiento conceptual** en las nueve áreas de [02_diseno.md](02_diseno.md), con 18 ítems de opción múltiple asociados a objetivos.
2. **Autoeficacia percibida** con cinco afirmaciones de 1 a 5 (escala ad hoc, no validada, repetida en la evaluación final).
3. **Prácticas previas**, opcionales y categóricas: disciplina, frecuencia de publicación, herramientas usadas. Sin edad, ubicación ni ningún dato identificable.

Los resultados permitirán contrastar las hipótesis H1 a H5 y ajustar los contenidos.
