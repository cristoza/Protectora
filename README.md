# Escudo Visual

Proyecto de grado que audita los metadatos de una imagen (EXIF, XMP, IPTC, texto PNG y C2PA) para estimar qué tan expuesta está al *scraping* y al entrenamiento de modelos de IA, y guía al usuario paso a paso para protegerla.

La aplicación organiza la protección en cuatro capas:

1. **Autoría en los metadatos**: autor y copyright en EXIF/XMP/IPTC.
2. **Señales de exclusión de IA**: etiquetas `noai`, `noimageai`, IPTC `DataMining` y TDMRep `tdm:reservation`.
3. **Perturbación visual**: un "cloak" tipo Glaze sobre el VAE de Stable Diffusion, comparado con una marca de agua visible.
4. **Dónde y cómo publicas**: el Asistente de Publicación Segura genera recomendaciones a partir de la auditoría del archivo.

El flujo empieza con un mapa de capas y termina con un resumen del estado de cada una.

---

## Tabla de contenido

- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [API](#api)
- [Cálculo del puntaje de riesgo](#cálculo-del-puntaje-de-riesgo)
- [Corpus de validación](#corpus-de-validación)
- [Evaluación de usabilidad y comprensión](#evaluación-de-usabilidad-y-comprensión)
- [Frontend](#frontend)
- [Privacidad](#privacidad)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Solución de problemas](#solución-de-problemas)

---

## Arquitectura

Monorepo con dos aplicaciones independientes:

```
Proyecto_grado/
├── backend/                  # API en FastAPI (Python 3.9)
│   ├── main.py               # Endpoints, validación y manejo de archivos temporales
│   ├── requirements.txt
│   └── core/
│       ├── metadata_reader.py   # Lectura de metadatos, categorías, puntaje y C2PA
│       ├── metadata_writer.py   # Escritura de autoría y etiquetas de exclusión
│       ├── publication_advisor.py  # Asistente de Publicación Segura (evalúa publication_rules.json)
│       ├── publication_rules.json  # Reglas de recomendación, editables sin tocar código
│       ├── evaluations.py       # Evaluaciones SUS y de comprensión en SQLite
│       ├── sus.py               # Puntuación SUS (Brooke, 1996)
│       ├── image_protector.py   # Cloak adversarial (PGD sobre el VAE) y marca de agua
│       ├── image_stressor.py    # Redimensionado y recompresión JPEG
│       ├── resistance_suite.py  # Suite de resistencia: qué protecciones sobreviven a cada transformación
│       └── watermark.py         # Dibujo y máscara de la marca visible (sin PyTorch)
├── backend/scripts/          # Corpus de validación (build_corpus, run_validation) y firmante C2PA de prueba
├── backend/results/          # CSV de resultados (solo se versionan los example_*.csv)
└── frontend/                 # React 19 + Vite + Tailwind 4 (JS/JSX)
    ├── vite.config.js        # Proxy de /api hacia el backend
    └── src/
        ├── App.jsx           # Estado global y navegación entre pasos
        ├── data/layers.js    # Fuente única de verdad: pasos, textos y estados
        ├── lib/motion.js     # Utilidades de animación
        └── components/       # Componentes y vistas de cada paso (steps/)
```

| Capa | Tecnologías |
|------|-------------|
| Backend | FastAPI, Uvicorn, Pillow, piexif, c2pa-python 0.8, PyTorch, diffusers, NumPy, pytest |
| Frontend | React 19, Vite, Tailwind CSS 4, motion, Phosphor Icons, Geist, oxlint |

---

## Requisitos

- Python 3.9 (el entorno virtual del proyecto usa 3.9.6).
- Node.js 20 o superior y npm.
- Solo con `ENABLE_LIVE_CLOAK=1` o para regenerar los ejemplos: conexión a internet la primera vez, porque el modelo `stabilityai/sd-vae-ft-mse` se descarga a la caché de Hugging Face.
- Recomendado: Mac con Apple Silicon (el modelo usa MPS si está disponible) o una máquina con suficiente RAM para PyTorch.

---

## Instalación y ejecución

Los dos servidores deben estar corriendo al mismo tiempo.

### Backend

```bash
cd backend
python3 -m venv .venv          # solo si no existe
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

El puerto debe ser **8000**, porque el proxy de Vite apunta ahí. Para verificar que funciona:

```bash
curl http://127.0.0.1:8000/api/health
```

### Corpus de validación

El motor de auditoría y la suite de resistencia se validan sobre un corpus de cuatro grupos. Usa solo imágenes propias o con licencia libre. El corpus, los resultados y los certificados no se versionan.

```bash
cd backend
source .venv/bin/activate
python -m scripts.build_corpus ruta/a/mis_imagenes --out corpus --author "Nombre"
python -m scripts.run_validation --corpus corpus --out results
```

`build_corpus` normaliza cada imagen a JPEG (calidad 95, sin metadatos), porque IPTC-IIM solo se lee de forma fiable en JPEG, y genera:

| Grupo | Contenido |
|-------|-----------|
| `01_sin_metadatos` | Píxeles limpios, sin metadatos |
| `02_metadatos` | Autoría y copyright en EXIF y XMP (`metadata_writer`) y en IPTC (segmento APP13) |
| `03_noai` | Lo mismo con `ai_opt_out=True` |
| `04_c2pa` | Píxeles limpios con un manifiesto C2PA firmado con un certificado de prueba |

Los archivos se llaman `img001.jpg`, `img002.jpg`, ...; `corpus/sources.csv` relaciona cada id con el original. El certificado de prueba se genera solo la primera vez en `scripts/certs/`; ese README explica cómo crearlo con `openssl` y por qué `valid` no implica que el firmante sea de confianza.

`run_validation` escribe `results/audit_corpus.csv` (una fila por imagen, con `matches_expected` según lo que se escribió en su grupo) y `results/stress_results.csv` (una fila por imagen y transformación, con los cuatro indicadores). Termina con código 1 si alguna auditoría no coincide con lo esperado e imprime el rango de correlaciones de la marca para revisar el umbral.

`results/example_audit_corpus.csv` y `results/example_stress_results.csv` son un ejemplo con tres ilustraciones sintéticas generadas por el proyecto (12/12 auditorías coinciden; correlación mínima de la marca 0,81 y control máximo 0,004).

## Evaluación de usabilidad y comprensión

La interfaz incluye una evaluación anónima, accesible desde el resumen y desde el pie de página: consentimiento informado, la escala SUS (10 ítems de 1 a 5), un cuestionario de comprensión y una pantalla de agradecimiento.

- **Escala SUS**: `frontend/src/data/evaluation.js`. Se usa la versión en español validada por Sevilla-Gonzalez et al. (2020), *JMIR Human Factors* 7(4):e21161, [doi:10.2196/21161](https://doi.org/10.2196/21161), CC BY 4.0. **Pendiente**: el archivo trae un borrador con `verified: false` y la interfaz muestra un aviso hasta que se copie la redacción literal del Apéndice 2 del artículo y se cambie a `true`.
- **Comprensión**: `frontend/src/data/comprehension.json`. Cada pregunta tiene `id`, `question`, `options` y `correct`. Se puede editar sin tocar código.
- **Puntuación SUS** (`backend/core/sus.py`, Brooke, 1996): los ítems impares aportan `respuesta − 1` y los pares `5 − respuesta`; la suma se multiplica por 2,5 (de 0 a 100).
- **Anonimato**: el código de participante (`XXXX-XXXX`) se genera en el navegador con `crypto.getRandomValues`. El backend guarda en `backend/data/evaluations.sqlite` solo el código, la fecha sin hora, las respuestas SUS, su puntuación y las respuestas de comprensión (opción elegida y si es correcta). Rechaza cualquier otro campo. No guarda imágenes, nombres, IP ni navegador. La carpeta `backend/data/` no se versiona.

### `POST /api/evaluations`

```json
{"participant_code": "K7QX-M2PA", "sus": [4, 2, 4, 2, 4, 2, 4, 2, 4, 2],
 "comprehension": {"noai": {"answer": "b", "correct": true}}}
```

Responde `201` con `{participant_code, sus_score}`, `409` si el código ya envió una evaluación y `422` si algún campo no es válido.

### `GET /api/evaluations/export`

Devuelve un CSV con una fila por participante y una fila final de medias. Está desactivado salvo que se defina `EVAL_EXPORT_TOKEN`, y exige ese valor en la cabecera `Authorization`; si no, responde `403`.

```bash
EVAL_EXPORT_TOKEN=un-token-largo uvicorn main:app --port 8000
curl -H "Authorization: Bearer un-token-largo" http://127.0.0.1:8000/api/evaluations/export -o evaluaciones.csv
```

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve la versión de producción localmente |
| `npm run lint` | Ejecuta oxlint (configuración en `.oxlintrc.json`) |

---

## API

Todos los endpoints que reciben imágenes esperan `multipart/form-data` con el archivo en el campo `file`.

- Extensiones permitidas: `.jpg`, `.jpeg`, `.png`, `.webp`, `.tif`, `.tiff`.
- Tamaño máximo: 25 MB.
- Los mensajes de error se devuelven en español en el campo `detail`. Los errores de validación de FastAPI llegan como una lista en `detail`, no como texto.
- CORS solo permite los orígenes de `localhost:5173`.

### `GET /api/health`

Comprueba que el backend esté activo. Devuelve `{"status": "ok", "live_cloak": false}`; `live_cloak` indica si `/api/protect` está activado.

### `POST /api/audit`

Analiza los metadatos de la imagen y devuelve el diagnóstico.

```bash
curl -F "file=@foto.jpg" http://127.0.0.1:8000/api/audit
```

La respuesta incluye los hallazgos por fuente (EXIF, XMP, IPTC, texto PNG) con su categoría (`author`, `copyright`, `exclusion`, `privacy`, `info`), las banderas `has_*`, las etiquetas de exclusión encontradas, el puntaje, el nivel de riesgo y la información C2PA (`present`, `valid`, `issuer`, `generator`, `ai_generated`, `errors`).

### `POST /api/write-metadata`

Firma la imagen con información de autoría sin modificar los píxeles.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `author` | texto, obligatorio | Nombre del autor |
| `copyright` | texto, opcional | Por defecto `© <año> <autor>` |
| `ai_opt_out` | booleano | Agrega `noai`/`noimageai`, IPTC `plus:DataMining` (`DMI-PROHIBITED-AIMLTRAINING`) y TDMRep `tdm:reservation` |
| `strip_gps` | booleano | Elimina la ubicación GPS |

Escribe EXIF `Artist`/`Copyright` y reemplaza el paquete XMP (`dc:creator`, `dc:rights`, `xmpRights`). En JPEG solo reescribe los segmentos APP1, sin recomprimir. PNG y TIFF son sin pérdida y WebP se guarda con `lossless=True`, así que un cloak aplicado antes se conserva. Devuelve `{filename, image, audit}`: la imagen como data URL y la auditoría del archivo ya firmado.

### `POST /api/stress-test`

Simula el tratamiento que hacen las plataformas al subir una imagen: redimensionado Lanczos y recompresión JPEG sin metadatos. Devuelve `image/jpeg`.

| Campo | Rango |
|-------|-------|
| `quality` | 1 a 95 |
| `scale` | 0.1 a 1.0 |
| `passes` | 1 a 5 |

### `POST /api/stress-suite`

Aplica a la imagen las transformaciones habituales de la web y registra, para cada una, si sobreviven los metadatos (EXIF, XMP, IPTC), las credenciales C2PA, las señales noai y la marca defensiva.

```bash
curl -F "file=@foto.jpg" -F "watermark_text=© Autor" http://127.0.0.1:8000/api/stress-suite
```

| Campo | Por defecto | Rango |
|-------|-------------|-------|
| `jpeg_qualities` | `50,75` | 1 a 3 valores entre 1 y 95, separados por comas |
| `resample_side` | `1080` | 64 a 8192 px (lado mayor) |
| `crop_pct` | `5` | 1 a 40 % de cada borde |
| `screen_width`, `screen_height` | `1920`, `1080` | 320 a 3840, 240 a 2160 |
| `watermark_text` | vacío | hasta 40 caracteres; vacío = no se mide la marca |
| `watermark_opacity` | `35` | 5 a 90 |

Transformaciones: compresión JPEG (una fila por calidad), remuestreo al lado mayor, recorte de bordes, cambio de formato a PNG, JPEG (calidad 90) y WebP (con pérdida, calidad 80), y reducción a la resolución de pantalla seguida de una captura simulada (PNG sin metadatos). La captura es una aproximación: no reproduce el escalado del sistema operativo, la gestión de color ni la interfaz alrededor. Las transformaciones que no son de compresión se guardan en el formato original (TIFF pasa a PNG) con calidad 95.

Las transformaciones conservan lo que Pillow puede copiar (EXIF, XMP y perfil ICC): miden el mejor caso. Pillow no escribe IPTC-IIM ni manifiestos C2PA, así que esos no sobreviven a ninguna recodificación.

Cada fila trae `metadata`, `c2pa`, `noai` y `watermark`, cada uno con `status` igual a `sobrevive`, `no sobrevive` o `no aplica` (el original no tenía esa protección). `baseline` describe el original y `watermark_threshold` el umbral usado.

#### Detección de la marca defensiva

La suite dibuja la marca de `core/watermark.py` sobre una copia de los píxeles, aplica la misma transformación a la copia marcada, a una copia sin marca (control negativo) y a la máscara de la marca, y calcula la correlación de Pearson entre el detalle fino (paso alto, desenfoque gaussiano de radio 4) de la luminancia y el de la máscara. La máscara es la marca a opacidad completa sobre gris medio, así el relleno claro y el contorno oscuro cuentan con su signo, sea cual sea el fondo.

La marca cuenta como detectable si la correlación es **0,10 o más** (`WATERMARK_THRESHOLD`). Calibración con cinco imágenes sintéticas de 2400×1600 (ruido blanco, degradado, formas, texto y negro) en las ocho transformaciones:

| | Mínimo marcado (35 %) | Mínimo marcado (10 %) | Máximo del control sin marca |
|-|-----------------------|-----------------------|------------------------------|
| Correlación | 0,17 (ruido blanco) | 0,05 (ruido blanco) | 0,003 |

El umbral queda unas 40 veces por encima del control y por debajo del peor caso con la opacidad por defecto. Con opacidades muy bajas sobre imágenes con mucho detalle, la marca puede salir como no detectable aunque se intuya a simple vista. El umbral se recalibrará con el corpus de validación.

### `POST /api/protect`

**Desactivado por defecto.** La tesis establece que las comparaciones del Módulo 1 usan ejemplos precalculados, sin ejecutar redes neuronales en tiempo real. Sin `ENABLE_LIVE_CLOAK=1` responde `503` y el backend ni siquiera carga PyTorch. Para activarlo:

```bash
ENABLE_LIVE_CLOAK=1 uvicorn main:app --reload --port 8000
```

Genera el cloak adversarial y una marca de agua visible, y los compara con las mismas métricas. Tarda entre 25 y 60 segundos.

| Campo | Valores |
|-------|---------|
| `strength` | `baja`, `media`, `alta` (épsilon L-inf 4, 8 o 16 sobre 255) |
| `watermark_text` | texto de la marca de agua |
| `watermark_opacity` | 5 a 90 |

Funcionamiento del cloak:

- Ataque PGD de 30 pasos sobre el codificador del VAE `stabilityai/sd-vae-ft-mse`, que empuja la representación latente hacia un patrón fijo.
- Se calcula a 512 px y se escala sobre la imagen original (máximo 2048 px).
- Se mide el SSIM "para una persona" (imagen protegida contra original) y "para el modelo" (reconstrucción del VAE de la protegida contra la de la original), también después de una compresión JPEG 75.
- Un candado a nivel de módulo serializa el uso del modelo, por lo que las peticiones se atienden de una en una.

Las imágenes se devuelven como data URLs (PNG para las descargas).

---

### `POST /api/publication-advice`

Audita la imagen y devuelve las recomendaciones del Asistente de Publicación Segura, ordenadas de más a menos importantes.

```json
{"filename": "foto.jpg", "format": "JPEG", "jpeg_quality": 95, "lossy": true,
 "recommendations": [{"id": "sin_autor", "severity": "alta", "title": "...", "detail": "...",
                      "action": {"label": "Firmar en la capa 1", "step": "metadatos"}}]}
```

Las reglas están en `backend/core/publication_rules.json`. Cada una tiene `id`, `severity` (`alta`, `media`, `info`), `when` (`"always"` o una lista de condiciones `{field, op, value}` que deben cumplirse todas), `title`, `detail` y, opcionalmente, `action` con el paso del frontend al que lleva. `field` es una ruta sobre el reporte de `/api/audit` más `jpeg_quality` (estimada) y `lossy`. Operadores: `eq`, `ne`, `gte`, `lte`, `in`, `empty`, `not_empty`.

| Regla | Cuándo aplica |
|-------|---------------|
| `sin_autor`, `sin_copyright` | No hay autoría o copyright: sugiere firmar con `write-metadata` |
| `sin_noai` | No hay etiquetas de exclusión: ofrece la exclusión de IA |
| `gps` | Hay datos GPS: sugiere `strip_gps` |
| `sin_c2pa` / `c2pa_invalida` | No hay C2PA (la procedencia no puede verificarse) o la firma no es válida |
| `perdida_alta` | JPEG con calidad estimada de 90 o más: sugiere guardar una copia sin pérdida para editar |
| `terminos`, `reauditar` | Siempre: leer los términos de la plataforma y auditar la versión publicada |

En el frontend, el archivo vigente (el subido en la capa 1 o su última versión firmada) se analiza cada vez que cambia. La capa 4 está lista cuando la persona marca todas las recomendaciones.

## Cálculo del puntaje de riesgo

El puntaje mide la **exposición**: un valor más alto significa una imagen **más vulnerable**. Parte de 100 y resta penalizaciones por cada protección encontrada:

| Protección encontrada | Resta |
|-----------------------|-------|
| Información de autoría | 25 |
| Aviso de copyright | 25 |
| Etiquetas de exclusión de IA | 40 |
| Derechos declarados también en XMP/IPTC | 10 |

| Puntaje | Nivel de riesgo |
|---------|-----------------|
| 70 o más | `alto` |
| 35 a 69 | `medio` |
| Menos de 35 | `bajo` |

Las etiquetas de exclusión se detectan con `EXCLUSION_PATTERN` (`noai`, `noimageai`, `do not train`, `tdm:reservation`, `dataminingprohibited`, `dmi-prohibited*`), tanto en los hallazgos como en el XMP sin procesar. La información C2PA se reporta pero no afecta el puntaje.

---

## Frontend

El frontend es un flujo guiado con siete pasos definidos en `src/data/layers.js`:

| Paso | Contenido | Cómo se verifica |
|------|-----------|------------------|
| Mapa de capas | Introducción a las cuatro capas | No aplica |
| Conceptos clave (Módulo 1) | Alfabetización: scraping, noai, perturbación adversarial, cloaking frente a envenenamiento, marcas de agua, C2PA y compresión, con el comparador de ejemplos precalculados | No aplica |
| Autoría en los metadatos | Auditoría (`AuditDropzone`, `DiagnosticPanel`) y firma (`MetadataSigner`) | Con datos reales de la auditoría |
| Señales de exclusión de IA | Etiquetas de exclusión detectadas | Con datos reales de la auditoría |
| Perturbación visual | `ProtectionLab` (cloak contra marca de agua) y `StressSimulator` | Cloak generado o casilla de herramienta externa |
| Dónde y cómo publicas | Asistente de Publicación Segura: recomendaciones generadas desde la auditoría | La persona marca cada recomendación como hecha |
| Resumen | Estado de cada capa | No aplica |

Cada capa tiene un estado `done`, `missing` o `pending`, calculado por `getStatus()`. `LayerRail`, en la cabecera fija, permite saltar a cualquier capa. `App.jsx` guarda todo el estado compartido (paso actual, auditoría, imagen perturbada, casillas y datos de firma).

Al firmar una imagen, la auditoría de toda la aplicación pasa a ser la del archivo firmado. La firma está disponible en la capa 1 (sobre el archivo subido) y debajo de los resultados de `ProtectionLab` (sobre el PNG con cloak).

### Ejemplos precalculados (Módulo 1)

`frontend/public/examples/` contiene los resultados reales del sistema sobre una ilustración sintética (paisaje de montañas) dibujada por `backend/scripts/generate_examples.py`, por lo que no hay imágenes de terceros. Se generan una vez, sin conexión una vez descargado el VAE:

```bash
cd backend && source .venv/bin/activate
python -m scripts.generate_examples      # escribe en ../frontend/public/examples
```

| Archivo | Contenido |
|---------|-----------|
| `original.png` | Ilustración sintética de 1200×800 px |
| `cloak.png` | Perturbación de intensidad media (épsilon 8/255, 30 pasos) |
| `watermark.png` | Marca "© Escudo Visual" al 35 % |
| `stressed.jpg` | La versión con perturbación reducida al 50 % y recomprimida en JPEG 60 |
| `*_model.jpg`, `*_diff.jpg` | Reconstrucción del VAE y diferencia ×8 |
| `manifest.json` | Métricas con la misma forma que la respuesta de `/api/protect` |

`CompareSlider` (paso de conceptos) y `ProtectionLab` (capa 3) leen solo estos archivos locales. `ProtectionLab` consulta `/api/health` y únicamente ofrece subir una imagen y calcular la perturbación si `live_cloak` es `true`. Con los ejemplos precalculados la capa 3 se marca como lista solo con la casilla de herramienta externa.

### Estilos

- Tailwind v4 con tokens de color como variables CSS en `src/index.css` (`bg-bg`, `text-muted`, `bg-accent`, ...).
- Clases compartidas: `.card`, `.hero-panel`, `.btn-*`, `.marker`, `.spotlight`.
- Tema claro únicamente, por diseño.
- Las animaciones respetan `prefers-reduced-motion`.

Para agregar o reordenar pasos, se edita `src/data/layers.js`.

---

## Privacidad

Cada endpoint escribe la imagen en un archivo temporal y lo **borra siempre** al terminar, incluso si ocurre un error (bloque `finally`). El servidor no guarda ninguna imagen. Esta garantía se anuncia en el pie de página de la interfaz, así que cualquier cambio en el backend debe mantenerla.

---

## Limitaciones conocidas

- El lector XMP usa expresiones regulares, no un parser XML completo.
- `c2pa-python` está fijado en `<0.9` porque la 0.9 exige Python 3.10. La API 0.8 requiere el adaptador `_FileStream`.
- Los ejemplos precalculados salen de una sola ilustración sintética de colores planos. En imágenes así la perturbación se nota más que en fotografías con textura.
- La marca de agua que se ve en la vista previa es una aproximación con CSS; la real la dibuja el backend.
- Las recomendaciones de la capa 4 salen de datos reales, pero marcarlas como hechas es una declaración de la persona: lo que haga fuera de la app no se verifica.
- La calidad JPEG se estima invirtiendo la escala de las tablas de cuantización del IJG. Es exacta para archivos de libjpeg y aproximada para programas con tablas propias. No se estima para WebP.
- Los metadatos no impiden técnicamente el uso de la imagen: muchas plataformas los eliminan al subirla y no todos los *scrapers* respetan las etiquetas de exclusión.
- El proyecto no tiene pruebas automatizadas.

---

## Solución de problemas

| Síntoma | Causa probable |
|---------|----------------|
| `Failed to fetch` en la interfaz | El backend no está corriendo |
| `ECONNREFUSED 127.0.0.1:8000` en el log de Vite | El backend no está corriendo o no usa el puerto 8000 |
| Error de CORS | El frontend no se sirve desde `localhost:5173` |
| `/api/protect` tarda mucho la primera vez | Se está descargando el modelo VAE |
| Las subidas fallan sin el servidor de Vite | `AuditDropzone` usa la ruta relativa `/api/audit`, que necesita el proxy de Vite o un despliegue en el mismo origen |
