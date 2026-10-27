# Escudo Visual

Proyecto de grado que audita los metadatos de una imagen (EXIF, XMP, IPTC, texto PNG y C2PA) para estimar qué tan expuesta está al *scraping* y al entrenamiento de modelos de IA, y guía al usuario paso a paso para protegerla.

La aplicación organiza la protección en cuatro capas:

1. **Autoría en los metadatos**: autor y copyright en EXIF/XMP/IPTC.
2. **Señales de exclusión de IA**: etiquetas `noai`, `noimageai`, IPTC `DataMining` y TDMRep `tdm:reservation`.
3. **Perturbación visual**: un "cloak" tipo Glaze sobre el VAE de Stable Diffusion, comparado con una marca de agua visible.
4. **Dónde y cómo publicas**: lista de buenas prácticas al publicar.

El flujo empieza con un mapa de capas y termina con un resumen del estado de cada una.

---

## Tabla de contenido

- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [API](#api)
- [Cálculo del puntaje de riesgo](#cálculo-del-puntaje-de-riesgo)
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
│       ├── image_protector.py   # Cloak adversarial (PGD sobre el VAE) y marca de agua
│       └── image_stressor.py    # Redimensionado y recompresión JPEG
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
| Backend | FastAPI, Uvicorn, Pillow, piexif, c2pa-python 0.8, PyTorch, diffusers, NumPy |
| Frontend | React 19, Vite, Tailwind CSS 4, motion, Phosphor Icons, Geist, oxlint |

---

## Requisitos

- Python 3.9 (el entorno virtual del proyecto usa 3.9.6).
- Node.js 20 o superior y npm.
- Conexión a internet la primera vez que se usa `/api/protect`: el modelo `stabilityai/sd-vae-ft-mse` se descarga a la caché de Hugging Face.
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

### Frontend

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

Comprueba que el backend esté activo.

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

### `POST /api/protect`

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

El frontend es un flujo guiado con seis pasos definidos en `src/data/layers.js`:

| Paso | Contenido | Cómo se verifica |
|------|-----------|------------------|
| Mapa de capas | Introducción a las cuatro capas | No aplica |
| Autoría en los metadatos | Auditoría (`AuditDropzone`, `DiagnosticPanel`) y firma (`MetadataSigner`) | Con datos reales de la auditoría |
| Señales de exclusión de IA | Etiquetas de exclusión detectadas | Con datos reales de la auditoría |
| Perturbación visual | `ProtectionLab` (cloak contra marca de agua) y `StressSimulator` | Cloak generado o casilla de herramienta externa |
| Dónde y cómo publicas | Lista de comprobación | Declarado por el usuario |
| Resumen | Estado de cada capa | No aplica |

Cada capa tiene un estado `done`, `missing` o `pending`, calculado por `getStatus()`. `LayerRail`, en la cabecera fija, permite saltar a cualquier capa. `App.jsx` guarda todo el estado compartido (paso actual, auditoría, imagen perturbada, casillas y datos de firma).

Al firmar una imagen, la auditoría de toda la aplicación pasa a ser la del archivo firmado. La firma está disponible en la capa 1 (sobre el archivo subido) y debajo de los resultados de `ProtectionLab` (sobre el PNG con cloak).

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
- `CompareSlider` usa una foto de ejemplo de picsum.photos con un filtro de ruido SVG. Es ilustrativo, no una perturbación real, y necesita internet.
- La marca de agua que se ve en la vista previa es una aproximación con CSS; la real la dibuja el backend.
- La capa 4 depende de lo que declara el usuario y no se verifica.
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
