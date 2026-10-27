"""Protección tipo Glaze/Mist y marca de agua, con métricas para compararlas.

La protección es un ataque adversario al codificador (VAE) de Stable Diffusion, el
mismo que atacan Glaze, Mist y PhotoGuard: se busca, con descenso de gradiente
proyectado (PGD), un cambio de píxeles acotado (L-infinito <= epsilon) que acerque
lo que "ve" el modelo a un patrón objetivo. Glaze además usa un objetivo de estilo
y una restricción perceptual (LPIPS); aquí se simplifica a un patrón fijo y a un
límite por píxel.

Las métricas miden lo mismo para ambos métodos:
- Similitud para una persona: SSIM (y PSNR) entre la imagen protegida y la original.
- Similitud para el modelo: SSIM entre lo que el VAE reconstruye de la protegida y lo
  que reconstruye de la original. También tras recomprimir en JPEG, como haría una
  plataforma. Una buena protección cambia mucho más lo segundo que lo primero.
"""
from __future__ import annotations

import base64
import io
import threading
import time

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps

from core.image_stressor import ImageStressor
from core.watermark import draw_watermark

VAE_ID = "stabilityai/sd-vae-ft-mse"
WORK_SIDE = 512  # lado mayor con el que trabaja el modelo; más grande agota la memoria en MPS
MAX_OUT_SIDE = 2048  # lado mayor de las imágenes que se devuelven
STRENGTHS = {"baja": 4, "media": 8, "alta": 16}  # epsilon en niveles de 0..255
STEPS = 30
JPEG_QUALITY = 75

_lock = threading.Lock()  # un solo uso del modelo a la vez
_vae = None
_device = "mps" if torch.backends.mps.is_available() else "cpu"


def _model():
    global _vae
    if _vae is None:
        from diffusers import AutoencoderKL

        _vae = AutoencoderKL.from_pretrained(VAE_ID).to(_device).eval().requires_grad_(False)
    return _vae


def _encode(x: torch.Tensor) -> torch.Tensor:
    return _model().encode(x * 2 - 1).latent_dist.mean


def _decode(z: torch.Tensor) -> torch.Tensor:
    return ((_model().decode(z).sample + 1) / 2).clamp(0, 1)


def _to_tensor(img: Image.Image) -> torch.Tensor:
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(_device)


def _to_image(x: torch.Tensor) -> Image.Image:
    arr = (x.squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy() * 255).round().astype(np.uint8)
    return Image.fromarray(arr)


def _fit(img: Image.Image, side: int, multiple: int = 1) -> Image.Image:
    ratio = min(1.0, side / max(img.size))
    w = max(multiple, round(img.width * ratio / multiple) * multiple)
    h = max(multiple, round(img.height * ratio / multiple) * multiple)
    return img if (w, h) == img.size else img.resize((w, h), Image.LANCZOS)


def _jpeg(img: Image.Image) -> Image.Image:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=JPEG_QUALITY)
    out = Image.open(io.BytesIO(buf.getvalue()))
    out.load()
    return out


def _data_url(img: Image.Image, fmt: str) -> str:
    buf = io.BytesIO()
    img.save(buf, fmt, **({"quality": 85} if fmt == "JPEG" else {"optimize": True}))
    return f"data:image/{fmt.lower()};base64,{base64.b64encode(buf.getvalue()).decode()}"


def _target(width: int, height: int) -> torch.Tensor:
    """Patrón de alto contraste hacia el que se empuja la representación del modelo."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    r = 0.5 + 0.5 * np.sin((x + y) / 6.0)
    g = 0.5 + 0.5 * np.sin(np.hypot(x - width / 2, y - height / 2) / 5.0)
    b = 0.5 + 0.5 * np.sin((x - y) / 9.0)
    arr = np.stack([r, g, b])
    return torch.from_numpy(arr).unsqueeze(0).to(_device)


def _ssim(a: torch.Tensor, b: torch.Tensor) -> float:
    """SSIM sobre luminancia con ventana gaussiana de 11 px (Wang et al., 2004)."""
    weights = torch.tensor([0.299, 0.587, 0.114], device=a.device).view(1, 3, 1, 1)
    a, b = (a * weights).sum(1, keepdim=True), (b * weights).sum(1, keepdim=True)
    g = torch.exp(-((torch.arange(11, device=a.device) - 5.0) ** 2) / (2 * 1.5**2))
    g = g / g.sum()
    win = (g[:, None] * g[None, :]).view(1, 1, 11, 11)
    blur = lambda t: F.conv2d(t, win)  # noqa: E731
    mu_a, mu_b = blur(a), blur(b)
    var_a = blur(a * a) - mu_a**2
    var_b = blur(b * b) - mu_b**2
    cov = blur(a * b) - mu_a * mu_b
    c1, c2 = 0.01**2, 0.03**2
    s = ((2 * mu_a * mu_b + c1) * (2 * cov + c2)) / ((mu_a**2 + mu_b**2 + c1) * (var_a + var_b + c2))
    return float(s.mean())


def _psnr(a: torch.Tensor, b: torch.Tensor) -> float:
    mse = float(F.mse_loss(a, b))
    return 99.0 if mse == 0 else float(10 * np.log10(1.0 / mse))


class ImageProtector:
    def __init__(self, path: str):
        with Image.open(path) as img:
            img.load()
            img = ImageOps.exif_transpose(img)
        # Sin metadatos y sin transparencia, igual que el simulador de estrés.
        self.original = _fit(ImageStressor._flatten(img), MAX_OUT_SIDE)

    def cloak(self, strength: str) -> Image.Image:
        """Calcula la perturbación a resolución de trabajo y la aplica a la imagen completa."""
        eps = STRENGTHS[strength] / 255
        alpha = 2.5 * eps / STEPS
        x0 = _to_tensor(_fit(self.original, WORK_SIDE, multiple=8))
        z_target = _encode(_target(x0.shape[3], x0.shape[2]))

        delta = torch.zeros_like(x0, requires_grad=True)
        for _ in range(STEPS):
            loss = F.mse_loss(_encode(x0 + delta), z_target)
            (grad,) = torch.autograd.grad(loss, delta)
            with torch.no_grad():
                delta -= alpha * grad.sign()
                delta.clamp_(-eps, eps)
                delta.copy_((x0 + delta).clamp(0, 1) - x0)

        full = _to_tensor(self.original)
        up = F.interpolate(delta.detach(), size=full.shape[2:], mode="bicubic", align_corners=False)
        return _to_image(full + up.clamp(-eps, eps))

    def watermark(self, text: str, opacity: int) -> Image.Image:
        """Texto repetido en diagonal sobre toda la imagen. `opacity` va de 0 a 100."""
        return draw_watermark(self.original, text, opacity)

    def compare(self, strength: str, text: str, opacity: int) -> dict:
        """Aplica ambos métodos y los mide con las mismas métricas."""
        with _lock, torch.no_grad():
            start = time.monotonic()
            work = _fit(self.original, WORK_SIDE, multiple=8)
            size = work.size
            x0 = _to_tensor(work)

            def model_view(img: Image.Image) -> torch.Tensor:
                """Lo que el VAE reconstruye de la imagen: cómo la "ve" el modelo."""
                x = img if img.size == size else img.resize(size, Image.LANCZOS)
                return _decode(_encode(_to_tensor(x)))

            r0 = model_view(work)

            def measure(img: Image.Image) -> dict:
                x = _to_tensor(img.resize(size, Image.LANCZOS))
                r = model_view(img)
                diff = ((x - x0).abs() * 8).clamp(0, 1)  # amplificada x8 para que se vea
                return {
                    "image": _data_url(img, "PNG"),
                    "model_view": _data_url(_to_image(r), "JPEG"),
                    "difference": _data_url(_to_image(diff), "JPEG"),
                    "psnr": round(_psnr(x, x0), 2),
                    "human_similarity": round(_ssim(x, x0), 4),
                    "model_similarity": round(_ssim(r, r0), 4),
                    "model_similarity_jpeg": round(_ssim(model_view(_jpeg(img)), r0), 4),
                }

            with torch.enable_grad():
                cloaked = self.cloak(strength)
            result = {
                "original": {"model_view": _data_url(_to_image(r0), "JPEG")},
                "cloak": measure(cloaked),
                "watermark": measure(self.watermark(text, opacity)),
                "settings": {
                    "strength": strength,
                    "epsilon": STRENGTHS[strength],
                    "steps": STEPS,
                    "jpeg_quality": JPEG_QUALITY,
                    "work_size": list(size),
                    "output_size": list(self.original.size),
                    "device": _device,
                },
            }
            result["settings"]["seconds"] = round(time.monotonic() - start, 1)
            return result
