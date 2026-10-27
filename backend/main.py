import base64
import hmac
import os
import tempfile
from typing import Annotated, Dict, List, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError

from core import evaluations
from core.image_stressor import ImageStressor
from core.metadata_reader import MetadataReader
from core.publication_advisor import advise, estimate_jpeg_quality, is_lossy
from core.metadata_writer import EXT, MIME, default_copyright, write_metadata
from core.resistance_suite import build_transforms, run_suite

MAX_BYTES = 25 * 1024 * 1024
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}

app = FastAPI(title="Auditoría anti-scraping API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _live_cloak() -> bool:
    """El cloak en tiempo real (PyTorch + VAE) solo se activa con ENABLE_LIVE_CLOAK=1.

    Por defecto la interfaz muestra ejemplos precalculados, como establece la tesis.
    """
    return os.environ.get("ENABLE_LIVE_CLOAK") == "1"


@app.get("/api/health")
def health():
    return {"status": "ok", "live_cloak": _live_cloak()}


async def _save_upload(file: UploadFile) -> str:
    """Valida y escribe la subida en un temporal. Quien llama debe borrar la ruta devuelta."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, "Formato no soportado. Usa JPG, PNG, WebP o TIFF.")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "La imagen supera el límite de 25 MB.")
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(data)
        return tmp.name


@app.post("/api/stress-test")
async def stress_test(
    file: UploadFile = File(...),
    quality: int = Form(60, ge=1, le=95),
    scale: float = Form(0.5, ge=0.1, le=1.0),
    passes: int = Form(1, ge=1, le=5),
):
    tmp_path: Optional[str] = None
    try:
        tmp_path = await _save_upload(file)
        jpeg = ImageStressor(tmp_path).apply(quality, scale, passes)
        return Response(content=jpeg, media_type="image/jpeg")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "No se pudo leer el archivo como imagen válida.")
    finally:
        # Privacidad: el temporal se borra siempre, antes de que el cliente reciba nada más.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _parse_qualities(raw: str) -> List[int]:
    try:
        values = [int(v) for v in raw.split(",") if v.strip()]
    except ValueError:
        values = []
    if not 1 <= len(values) <= 3 or any(not 1 <= v <= 95 for v in values):
        raise HTTPException(422, "Las calidades JPEG deben ser de 1 a 3 números entre 1 y 95, separados por comas.")
    return sorted(set(values))


@app.post("/api/stress-suite")
async def stress_suite(
    file: UploadFile = File(...),
    jpeg_qualities: str = Form("50,75", max_length=20),
    resample_side: int = Form(1080, ge=64, le=8192),
    crop_pct: float = Form(5, ge=1, le=40),
    screen_width: int = Form(1920, ge=320, le=3840),
    screen_height: int = Form(1080, ge=240, le=2160),
    watermark_text: str = Form("", max_length=40),
    watermark_opacity: int = Form(35, ge=5, le=90),
):
    """Aplica las transformaciones de la suite de resistencia y dice qué protecciones sobreviven a cada una."""
    transforms = build_transforms(_parse_qualities(jpeg_qualities), resample_side, crop_pct, (screen_width, screen_height))
    tmp_path: Optional[str] = None
    try:
        tmp_path = await _save_upload(file)
        return await run_in_threadpool(
            run_suite, tmp_path, file.filename or "imagen", transforms, watermark_text.strip() or None, watermark_opacity
        )
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "No se pudo leer el archivo como imagen válida.")
    finally:
        # Privacidad: la subida se borra siempre; los archivos intermedios los borra run_suite.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/protect")
async def protect(
    file: UploadFile = File(...),
    strength: str = Form("media", pattern="^(baja|media|alta)$"),
    watermark_text: str = Form("© Autor", min_length=1, max_length=40),
    watermark_opacity: int = Form(35, ge=5, le=90),
):
    if not _live_cloak():
        raise HTTPException(503, "La perturbación en tiempo real está desactivada. Inicia el backend con ENABLE_LIVE_CLOAK=1 para usarla.")
    # PyTorch tarda en cargar y no hace falta si el cloak en vivo está desactivado.
    from core.image_protector import ImageProtector

    tmp_path: Optional[str] = None
    try:
        tmp_path = await _save_upload(file)
        # El cálculo tarda decenas de segundos: fuera del bucle de eventos.
        protector = await run_in_threadpool(ImageProtector, tmp_path)
        return await run_in_threadpool(protector.compare, strength, watermark_text.strip() or "© Autor", watermark_opacity)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "No se pudo leer el archivo como imagen válida.")
    finally:
        # Privacidad: el temporal se borra siempre, como en los demás endpoints.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/write-metadata")
async def write_metadata_endpoint(
    file: UploadFile = File(...),
    author: str = Form(..., min_length=1, max_length=80),
    copyright: str = Form("", max_length=160),
    ai_opt_out: bool = Form(True),
    strip_gps: bool = Form(True),
):
    """Escribe autoría, copyright y exclusión de IA, y audita el archivo resultante."""
    author = author.strip()
    if not author:
        raise HTTPException(422, "Escribe el nombre de la autora o el autor.")
    rights = copyright.strip() or default_copyright(author)
    tmp_path: Optional[str] = None
    out_path: Optional[str] = None
    try:
        tmp_path = await _save_upload(file)
        data, fmt = await run_in_threadpool(write_metadata, tmp_path, author, rights, ai_opt_out, strip_gps)
        with tempfile.NamedTemporaryFile(delete=False, suffix=EXT[fmt]) as tmp:
            out_path = tmp.name
            tmp.write(data)
        stem = os.path.splitext(os.path.basename(file.filename or "imagen"))[0] or "imagen"
        filename = f"{stem}-firmada{EXT[fmt]}"
        # Se audita el archivo escrito, no lo que se pidió escribir: así el resultado está verificado.
        audit_result = MetadataReader(out_path, filename).analyze().to_dict()
        return {
            "filename": filename,
            "image": f"data:{MIME[fmt]};base64," + base64.b64encode(data).decode("ascii"),
            "audit": audit_result,
        }
    except ValueError as e:
        raise HTTPException(422, str(e))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "No se pudo leer el archivo como imagen válida.")
    finally:
        # Privacidad: la subida y el archivo escrito se borran siempre.
        for p in (tmp_path, out_path):
            if p and os.path.exists(p):
                os.remove(p)


@app.post("/api/publication-advice")
async def publication_advice(file: UploadFile = File(...)):
    """Audita la imagen y devuelve las recomendaciones del Asistente de Publicación Segura."""
    tmp_path: Optional[str] = None
    try:
        tmp_path = await _save_upload(file)
        audit_result = MetadataReader(tmp_path, file.filename or "imagen").analyze().to_dict()
        with open(tmp_path, "rb") as fh:
            raw = fh.read(64)
        with Image.open(tmp_path) as img:
            quality, lossy = estimate_jpeg_quality(img), is_lossy(img, raw)
        return {
            "filename": audit_result["filename"],
            "format": audit_result["format"],
            "jpeg_quality": quality,
            "lossy": lossy,
            "recommendations": advise(audit_result, quality, lossy),
        }
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "No se pudo leer el archivo como imagen válida.")
    finally:
        # Privacidad: la imagen se borra siempre, como en /api/audit.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/audit")
async def audit(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, "Formato no soportado. Usa JPG, PNG, WebP o TIFF.")

    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "La imagen supera el límite de 25 MB.")

    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp_path = tmp.name
            tmp.write(data)
        del data
        result = MetadataReader(tmp_path, file.filename or "imagen").analyze()
        return result.to_dict()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "No se pudo leer el archivo como imagen válida.")
    finally:
        # Privacidad: la imagen se elimina siempre, incluso si el análisis falla.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


SusAnswer = Annotated[int, Field(ge=1, le=5, strict=True)]
QuestionId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{1,40}$")]


class ComprehensionAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str = Field(..., pattern=r"^[A-Za-z0-9_-]{1,40}$")
    correct: bool


class Evaluation(BaseModel):
    # Campos desconocidos se rechazan: así no puede colarse un nombre ni otro dato personal.
    model_config = ConfigDict(extra="forbid")
    participant_code: str = Field(..., pattern=r"^[A-Z0-9-]{6,20}$")
    sus: List[SusAnswer] = Field(..., min_length=10, max_length=10)
    comprehension: Dict[QuestionId, ComprehensionAnswer] = Field(default_factory=dict, max_length=40)


@app.post("/api/evaluations", status_code=201)
def create_evaluation(body: Evaluation):
    """Guarda una evaluación anónima (SUS y comprensión) y devuelve la puntuación SUS."""
    comprehension = {k: v.model_dump() for k, v in body.comprehension.items()}
    try:
        score = evaluations.save(body.participant_code, body.sus, comprehension)
    except evaluations.DuplicateParticipant:
        raise HTTPException(409, "Este código de participante ya envió su evaluación.")
    return {"participant_code": body.participant_code, "sus_score": score}


@app.get("/api/evaluations/export")
def export_evaluations(authorization: str = Header("")):
    """CSV con todas las evaluaciones. Requiere `Authorization: Bearer <EVAL_EXPORT_TOKEN>`."""
    token = os.environ.get("EVAL_EXPORT_TOKEN", "")
    given = authorization[7:] if authorization.startswith("Bearer ") else ""
    if not token or not hmac.compare_digest(given.encode(), token.encode()):
        raise HTTPException(403, "No tienes permiso para exportar las evaluaciones.")
    return Response(
        content=evaluations.export_csv(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="evaluaciones.csv"'},
    )
