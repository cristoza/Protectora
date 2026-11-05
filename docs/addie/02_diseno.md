# Fase D: Diseño

## 1. Meta educativa general

Al terminar el recorrido de Aprendizaje, la persona creadora puede **explicar qué hace y qué no hace cada mecanismo de protección, aplicarlo a sus propias imágenes con las herramientas de Escudo Visual y comprobar qué sobrevive a la publicación**, para tomar decisiones informadas sin sobrestimar ninguna capa.

## 2. Criterios de redacción de los objetivos

- Verbos observables de la taxonomía revisada de Bloom (Anderson y Krathwohl, 2001). Se indica el nivel cognitivo de cada objetivo.
- Alineación constructiva (Biggs, 1996): cada objetivo tiene contenido, actividad y evaluación que lo cubren (ver [matriz_alineacion.md](matriz_alineacion.md)).
- Cada objetivo incluye su límite: qué **no** consigue el mecanismo.
- Los criterios de cumplimiento son **provisionales** y se calibrarán en la prueba piloto.

Códigos de evaluación: `Dnn` = ítem del diagnóstico inicial (forma A); `Fnn` = ítem paralelo de la evaluación final (forma B); `En` = escenario práctico; `comp:<id>` = pregunta existente de `comprehension.json`, que no se modifica.

## 3. Objetivos de aprendizaje

### Área SCR. Comprensión del scraping

**SCR-1. Explicar qué es el scraping de imágenes y qué condición lo hace posible.**
- Nivel: Comprender.
- Capacidad esperada: describe que programas automáticos descargan en masa imágenes accesibles públicamente, sin pedir permiso, y que esas colecciones se usan para entrenar modelos.
- Contenido: tarjeta `scraping` de `literacy.js`.
- Actividad: lectura de la tarjeta; reflexión guiada sobre qué canales propios son accesibles sin iniciar sesión [Propuesta].
- Evaluación: D01 / F01.
- Criterio: responde correctamente el ítem en la evaluación final.

**SCR-2. Situar cada capa en el momento del ciclo de vida de la imagen en el que actúa.**
- Nivel: Comprender (clasificar).
- Capacidad esperada: distingue recopilación, filtrado o curaduría, entrenamiento o ajuste y publicación, y relaciona cada capa con su momento: las señales de exclusión dependen de que quien recopila o filtra las consulte; la perturbación actúa cuando un modelo procesa la imagen; la publicación decide qué queda expuesto.
- Contenido: mapa de capas (`OverviewStep`), textos `receives` y `passes` de `layers.js`; diagrama del ciclo de vida [Propuesta, ver 03_desarrollo.md].
- Actividad: ordenar momentos y asociar capas [Propuesta].
- Evaluación: D18 / F18.
- Criterio: responde correctamente el ítem en la evaluación final.

### Área ENT. Funcionamiento general del entrenamiento de IA

**ENT-1. Describir a nivel general cómo aprende un generador de imágenes.**
- Nivel: Comprender.
- Capacidad esperada: explica que el modelo ajusta sus parámetros a partir de regularidades de grandes colecciones de imágenes con texto asociado, sin presentarlo como un archivo de copias ni como búsqueda en internet al generar. Reconoce que se ha documentado memorización de algunas imágenes de entrenamiento.
- Contenido: **no existe** [Pendiente: tarjeta nueva, ver 03_desarrollo.md].
- Actividad: lectura breve con analogía en vocabulario de diseño.
- Evaluación: D02 / F02.
- Criterio: responde correctamente el ítem en la evaluación final.

**ENT-2. Distinguir el entrenamiento de un modelo general del ajuste fino para imitar un estilo concreto.**
- Nivel: Comprender.
- Capacidad esperada: reconoce que con pocas obras de una persona se puede ajustar un modelo para imitar su estilo, y que ese es el riesgo principal frente al que se diseñan herramientas de cloaking.
- Contenido: **no existe** [Pendiente]; se relaciona con la tarjeta `cloaking`.
- Actividad: caso breve de imitación de estilo.
- Evaluación: D03 / F03.
- Criterio: responde correctamente el ítem en la evaluación final.

### Área MET. Metadatos y autoría

**MET-1. Identificar dónde se declara la autoría en un archivo e interpretar los campos que muestra la auditoría.**
- Nivel: Recordar y comprender.
- Capacidad esperada: nombra EXIF, XMP, IPTC y texto PNG; lee en `DiagnosticPanel` qué campos de autoría y copyright tiene su archivo.
- Contenido: paso `metadatos` (`AuditDropzone`, `DiagnosticPanel`).
- Actividad: auditar una imagen propia o de práctica.
- Evaluación: D04 / F04; escenario E1.
- Criterio: ítem correcto y, en E1, localiza correctamente si hay autor y copyright.

**MET-2. Firmar una imagen con autoría y copyright y comprobar el resultado.**
- Nivel: Aplicar.
- Capacidad esperada: usa `MetadataSigner` y verifica con la nueva auditoría que la autoría quedó escrita, sin que cambien los píxeles.
- Contenido: paso `metadatos` (`MetadataSigner`, puntaje antes y después).
- Actividad: firmar y reauditar.
- Evaluación: escenario E1 (rúbrica).
- Criterio: nivel "logrado" en el criterio de firma de E1.

**MET-3. Reconocer el riesgo de privacidad de la ubicación GPS y eliminarla antes de publicar.**
- Nivel: Aplicar.
- Capacidad esperada: detecta el GPS en la auditoría y usa la opción `strip_gps` al firmar.
- Contenido: `DiagnosticPanel` (categoría `privacy`), regla `gps` de `publication_rules.json`.
- Actividad: auditar una imagen de práctica con GPS y firmarla sin él.
- Evaluación: D06 / F06; escenario E1.
- Criterio: ítem correcto y GPS ausente en la reauditoría de E1.

**MET-4. Interpretar el puntaje de Escudo Visual como índice de señales declaradas y explicar el límite de los metadatos.**
- Nivel: Comprender (interpretar).
- Capacidad esperada: explica que el puntaje resume qué señales trae el archivo (autoría, copyright, exclusión, XMP/IPTC) y que no es una probabilidad de ser extraída o usada; explica que los metadatos informan pero no bloquean la descarga.
- Contenido: `DiagnosticPanel` (desglose `score_breakdown`); nota explicativa del puntaje [Propuesta].
- Actividad: predecir el puntaje antes de firmar y contrastarlo después.
- Evaluación: D05 / F05, D07 / F07; `comp:puntaje`; escenario E5.
- Criterio: ítems correctos y nivel "logrado" en E5.

### Área EXC. Exclusión de entrenamiento

**EXC-1. Distinguir las principales señales de exclusión y explicar que son peticiones.**
- Nivel: Comprender.
- Capacidad esperada: reconoce `noai`, `noimageai`, IPTC Data Mining (`DMI-PROHIBITED-AIMLTRAINING`) y TDMRep (`tdm:reservation`); explica que dependen de que quien recopila decida respetarlas.
- Contenido: tarjeta `noai`, `ExclusionStep` (lista de directivas).
- Actividad: revisar qué directivas trae el archivo.
- Evaluación: D08 / F08, D09 / F09; `comp:noai`.
- Criterio: ambos ítems correctos.

**EXC-2. Añadir señales de exclusión a una imagen y verificar que se detectan.**
- Nivel: Aplicar.
- Capacidad esperada: firma con `ai_opt_out` y comprueba en `ExclusionStep` o en la auditoría que aparecen.
- Contenido: `MetadataSigner`, `ExclusionStep`.
- Actividad: firmar con exclusión y revisar la capa 2.
- Evaluación: escenario E1.
- Criterio: nivel "logrado" en el criterio de exclusión de E1.

### Área PER. Perturbación adversarial

**PER-1. Explicar la idea de la perturbación adversarial.**
- Nivel: Comprender.
- Capacidad esperada: explica que son cambios casi imperceptibles para una persona calculados para alterar lo que un modelo extrae de la imagen.
- Contenido: tarjeta `adversarial`, `ProtectionLab` (vistas persona y modelo, imágenes de diferencia).
- Actividad: comparar en `ProtectionLab` la vista persona y la vista modelo.
- Evaluación: D10 / F10; `comp:perturbacion`.
- Criterio: ítem correcto.

**PER-2. Distinguir cloaking de envenenamiento.**
- Nivel: Comprender (comparar).
- Capacidad esperada: el cloaking busca que el modelo no aprenda bien el estilo; el envenenamiento busca enseñarle asociaciones falsas.
- Contenido: tarjeta `cloaking`.
- Actividad: clasificar descripciones de herramientas [Propuesta].
- Evaluación: D12 / F12.
- Criterio: ítem correcto.

**PER-3. Explicar los límites de una perturbación y comprobar su resistencia.**
- Nivel: Analizar.
- Capacidad esperada: explica que protege frente a los modelos para los que se calculó, que puede atenuarse con compresión o reescalado y que la métrica de la app se calcula contra el mismo VAE que ataca.
- Contenido: tarjeta `adversarial`; `ProtectionLab` (resultados tras JPEG 75); `StressSimulator`; ejemplo `stressed.jpg`.
- Actividad: aplicar compresión en el simulador y observar el cambio.
- Evaluación: D11 / F11; escenario E4.
- Criterio: ítem correcto y nivel "logrado" en E4.

### Área MAR. Marcas de agua

**MAR-1. Distinguir marcas visibles e invisibles y explicar qué señalan y qué no impiden.**
- Nivel: Comprender.
- Capacidad esperada: la marca visible señala autoría y facilita reclamar; no impide el entrenamiento y puede borrarse con herramientas de relleno.
- Contenido: tarjeta `watermark`; `CompareSlider` (versión con marca).
- Actividad: comparar original y versión con marca.
- Evaluación: D13 / F13; `comp:compresion`.
- Criterio: ítem correcto.

**MAR-2. Comparar marca de agua y perturbación con las mismas métricas para elegir según el objetivo.**
- Nivel: Evaluar.
- Capacidad esperada: interpreta los anillos SSIM de `ProtectionLab` y justifica qué técnica conviene según se busque atribución visible o dificultar el aprendizaje del modelo.
- Contenido: `ProtectionLab` (comparación de técnicas, insignia de menor parecido para el modelo).
- Actividad: elegir técnica para un caso.
- Evaluación: escenario E4.
- Criterio: nivel "logrado" en E4.

### Área C2P. Procedencia y credenciales C2PA

**C2P-1. Explicar qué demuestra y qué no demuestra una credencial C2PA.**
- Nivel: Comprender.
- Capacidad esperada: un manifiesto válido indica que un firmante declaró origen y ediciones y que el archivo no cambió desde la firma; no prueba que el contenido sea verdadero, no impide copias y su valor depende de la confianza en el firmante.
- Contenido: tarjeta `c2pa`; `C2paCard` en `DiagnosticPanel`.
- Actividad: leer la tarjeta C2PA de la auditoría.
- Evaluación: D14 / F14; `comp:c2pa`.
- Criterio: ítem correcto.

**C2P-2. Interpretar el estado C2PA de un archivo y decidir qué hacer.**
- Nivel: Aplicar.
- Capacidad esperada: distingue ausente, presente y válido, presente y no válido; relaciona "no válido" con una modificación posterior a la firma.
- Contenido: `C2paCard`, reglas `sin_c2pa` y `c2pa_invalida`.
- Actividad: auditar una imagen de práctica con C2PA y otra modificada después de firmar [Propuesta: imágenes de práctica].
- Evaluación: escenario E3.
- Criterio: nivel "logrado" en E3.

### Área COM. Compresión y transformaciones de imágenes

**COM-1. Predecir qué protecciones sobreviven a transformaciones típicas de las plataformas.**
- Nivel: Comprender (inferir).
- Capacidad esperada: anticipa que la recompresión y el reescalado suelen eliminar metadatos, invalidar C2PA y atenuar perturbaciones, mientras una marca visible tiende a permanecer.
- Contenido: tarjeta `compression`; `CompareSlider` (tras publicar).
- Actividad: predecir antes de ejecutar la suite de resistencia [Propuesta].
- Evaluación: D15 / F15; `comp:plataformas`, `comp:compresion`.
- Criterio: ítem correcto.

**COM-2. Usar el simulador y la suite de resistencia para comprobar qué sobrevive.**
- Nivel: Aplicar.
- Capacidad esperada: ejecuta `StressSimulator` y `ResistanceTable` e interpreta `sobrevive`, `no sobrevive` y `no aplica` para cada indicador.
- Contenido: `StressSimulator`, `ResistanceTable`.
- Actividad: correr la suite sobre una imagen firmada.
- Evaluación: escenario E2.
- Criterio: nivel "logrado" en E2.

### Área PUB. Estrategias de publicación segura

**PUB-1. Elaborar una lista de comprobación previa a publicar a partir del asistente y planificar la reauditoría.**
- Nivel: Aplicar.
- Capacidad esperada: usa las recomendaciones de `PublishStep` y sabe que la única forma de saber qué sobrevivió es descargar la versión publicada y auditarla.
- Contenido: `PublishStep`, reglas `reauditar` y `terminos`.
- Actividad: revisar las recomendaciones de su archivo.
- Evaluación: D16 / F16; escenario E6.
- Criterio: ítem correcto y nivel "logrado" en E6.

**PUB-2. Justificar la combinación de capas.**
- Nivel: Evaluar.
- Capacidad esperada: argumenta que cada capa cubre un riesgo distinto, que ninguna basta sola y que su combinación tampoco garantiza la exclusión.
- Contenido: mapa de capas; `SummaryStep`.
- Actividad: revisar el resumen y explicar el estado de cada capa.
- Evaluación: D17 / F17; escenario E6.
- Criterio: ítem correcto y nivel "logrado" en E6.

**PUB-3. Reconocer el papel de los términos de uso de la plataforma.**
- Nivel: Comprender.
- Capacidad esperada: explica que los términos de la plataforma regulan lo que esta puede hacer con lo publicado, aunque el archivo declare otra cosa.
- Contenido: regla `terminos` de `publication_rules.json`; tarjeta `compression`.
- Actividad: identificar qué revisar en unos términos de uso [Propuesta].
- Evaluación: escenario E6.
- Criterio: nivel "logrado" en el criterio de términos de E6.

## 4. Contribución de los siete pasos a los objetivos

Los siete pasos se conservan. La tabla indica qué función instruccional cumple cada uno y a qué objetivos contribuye.

| Paso (`id`) | Función instruccional | Tipo de aprendizaje | Objetivos |
|-------------|----------------------|---------------------|-----------|
| 1. Mapa de capas (`mapa`) | Organizador previo: presenta las cuatro capas y su relación; activa conocimientos previos. Lugar propuesto para ofrecer el diagnóstico inicial opcional | Conceptual | SCR-2, PUB-2 |
| 2. Conceptos clave (`aprende`) | Presentación de contenidos y demostración con `CompareSlider` | Conceptual y demostrativo | SCR-1, SCR-2, ENT-1, ENT-2, EXC-1, PER-1, PER-2, MAR-1, C2P-1, COM-1 |
| 3. Autoría en los metadatos (`metadatos`) | Práctica guiada con el archivo propio: auditar, firmar, reauditar | Práctico | MET-1, MET-2, MET-3, MET-4, EXC-2, C2P-2 |
| 4. Señales de exclusión (`exclusion`) | Verificación de la práctica anterior y consolidación del concepto | Práctico y conceptual | EXC-1, EXC-2 |
| 5. Perturbación visual (`perturbacion`) | Demostración y experimentación: técnica, métricas y resistencia | Demostrativo y práctico | PER-1, PER-3, MAR-2, COM-1, COM-2 |
| 6. Dónde y cómo publicas (`publicacion`) | Transferencia: decisiones de publicación sobre el archivo actual | Práctico | PUB-1, PUB-3, COM-1 |
| 7. Resumen (`resumen`) | Síntesis y metacognición; acceso a la evaluación final | Reflexivo | PUB-2 (y todos, mediante la evaluación final) |

## 5. Secuencia instruccional propuesta

La secuencia sigue los eventos de instrucción habituales (activar, presentar, demostrar, practicar, evaluar, retroalimentar, sintetizar) sobre la navegación existente:

1. **Diagnóstico inicial** (opcional, anónimo) desde el paso 1.
2. **Presentación** de contenidos en el paso 2, con la tarjeta nueva de entrenamiento.
3. **Demostraciones** en los pasos 2 y 5 con ejemplos precalculados.
4. **Actividades prácticas** en los pasos 3 a 6 sobre el archivo propio o imágenes de práctica.
5. **Evaluación final** (forma B y escenarios) desde el paso 7.
6. **Retroalimentación** explicativa por ítem al terminar.
7. **Resumen de aprendizaje** en el paso 7, por objetivos, además del estado de las capas.

El detalle de integración está en [04_implementacion.md](04_implementacion.md).
