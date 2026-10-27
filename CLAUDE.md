# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Escudo Visual": a thesis project (UI and API messages are in Spanish) that audits an uploaded image's metadata (EXIF/XMP/IPTC/PNG text) to estimate how exposed it is to AI scraping. It is a monorepo of two independent apps with no root-level tooling and no git repo yet: `backend/` (FastAPI) and `frontend/` (React 19 + Vite + Tailwind 4, plain JS/JSX, no TypeScript). There are no tests configured.

## Commands

Backend (run from `backend/`; a `.venv` already exists there):
- `source .venv/bin/activate && pip install -r requirements.txt`
- `uvicorn main:app --reload --port 8000`. The port must be 8000 because the Vite proxy targets it.
- `curl http://127.0.0.1:8000/api/health` checks that the backend is up.

Frontend (run from `frontend/`):
- `npm run dev` serves on :5173 and proxies `/api` to `http://127.0.0.1:8000` (see `vite.config.js`)
- `npm run build`
- `npm run lint` (oxlint, config in `.oxlintrc.json`)

## Architecture

- `POST /api/audit` (`backend/main.py`) validates the extension (`ALLOWED_EXT`) and the size (25 MB, `MAX_BYTES`). It writes the upload to a temp file, runs `MetadataReader(path, filename).analyze()`, returns `AuditResult.to_dict()`, and always deletes the temp file in `finally`. That deletion is a deliberate privacy guarantee that the frontend footer advertises, so keep it intact. CORS only allows the localhost:5173 origins.
- `backend/core/metadata_reader.py` holds all the analysis logic:
  - Four readers (`_read_exif`, `_read_xmp`, `_read_iptc`, `_read_text_chunks`) each produce `Finding(source, key, value, category)`. The XMP reader parses with regexes, not an XML parser.
  - `_categorize` assigns a category (`author|copyright|exclusion|privacy|info`) from keyword hints. The score and the `has_*` flags are all derived from these categories.
  - `find_exclusion_tags` scans for AI opt-out directives (`noai`, `noimageai`, `tdm-reservation`, ...) in findings and in the raw XMP.
  - `_score` starts at 100 (fully exposed) and subtracts the `PENALTY_*` constants for protections found. A higher score therefore means MORE vulnerable. `risk_level` is `alto` at 70 or above, `medio` at 35 or above, and `bajo` below that. The frontend consumes the `to_dict()` shape, so changing it means updating `DiagnosticPanel.jsx`.
- `POST /api/stress-test` (`backend/main.py`) takes `file` plus form fields `quality` (1-95), `scale` (0.1-1.0) and `passes` (1-5), runs `core/image_stressor.py` (`ImageStressor`: Lanczos resize, then JPEG recompression with no metadata) and returns `image/jpeg`. It deletes the temp file in `finally` like `/api/audit`. Validation errors from FastAPI come back as a `detail` list, not a string.
- `POST /api/protect` (`backend/main.py`) takes `file` plus form fields `strength` (`baja|media|alta`), `watermark_text` and `watermark_opacity` (5-90). It runs `core/image_protector.py` (`ImageProtector.compare`) in a threadpool and deletes the temp file in `finally`. The Glaze-like cloak is a PGD attack (L-inf epsilon 4/8/16, 30 steps) on the Stable Diffusion VAE encoder (`stabilityai/sd-vae-ft-mse`, downloaded to the Hugging Face cache on first use, run on MPS when available) toward a fixed pattern, computed at 512 px and upsampled onto the image (capped at 2048 px). It is compared with a tiled visible watermark using the same metrics: SSIM for a person (protected vs original) and SSIM for the model (VAE reconstruction of protected vs of original), also after JPEG 75. It returns base64 data URLs (PNG for downloads). A module-level lock serializes model use, and a request takes about 25-60 s.
- `POST /api/write-metadata` (`backend/main.py`) takes `file` plus form fields `author` (required), `copyright` (defaults to `© <year> <author>`), `ai_opt_out` and `strip_gps`. `core/metadata_writer.py` writes EXIF Artist/Copyright and replaces the XMP packet with `dc:creator`, `dc:rights`, `xmpRights` and, when opting out, `noai`/`noimageai` keywords, IPTC `plus:DataMining` (`DMI-PROHIBITED-AIMLTRAINING`) and TDMRep `tdm:reservation`. Pixels never change: JPEG only has its APP1 segments rewritten (no re-encode), PNG/TIFF are lossless and WebP is saved `lossless=True`, so a cloak survives signing. It audits the written file with `MetadataReader` and returns `{filename, image (data URL), audit}`, deleting both temp files in `finally`. `EXCLUSION_PATTERN` in the reader must keep matching everything the writer emits.
- C2PA: `read_c2pa()` in `metadata_reader.py` fills `to_dict()["c2pa"]` (`present`, `valid`, `issuer`, `generator`, `ai_generated`, `errors`). It does not affect the score. `c2pa-python` is pinned `<0.9` because 0.9+ needs Python 3.10 and the venv is 3.9; the 0.8 API needs a hand-written `Stream` adapter (`_FileStream`).
- Frontend (`frontend/src`) is a guided, step-by-step flow over four protection "layers" (metadata authorship, AI-exclusion tags, visual perturbation, publishing), bracketed by a map step and a summary step.
  - `data/layers.js` is the single source of truth: step order, each layer's "viene de / lleva a" text, the publish checklist, and `getStatus()`, which derives each layer's `done|missing|pending` state. Add or reorder steps there.
  - `App.jsx` owns all shared state (`index`, `audit`, `perturbed`, `checks`), renders the matching view from `components/steps/`, and moves focus to `#step-title` on each step change. `LayerRail` is the always-visible clickable map (a horizontal stepper in the sticky header), so users can jump back to any layer.
  - Layers 1 and 2 are verified against real data (the `/api/audit` or `/api/write-metadata` audit). Layer 3 is `done` when a cloak was generated in `ProtectionLab` (`cloaked`) or the user ticks the checkbox for an external tool. Layer 4 is guidance with user-declared checkboxes, so do not present it as verified.
  - `MetadataSigner` calls `/api/write-metadata`. It appears in layer 1 (signing the uploaded `source` file) and under the `ProtectionLab` results (signing the cloak PNG). Signing updates the app-wide `audit` to the signed file. The signing form values (`identity`) live in `App.jsx` and are shared by both places.
  - `AuditDropzone` posts a `FormData` field named `file` to a relative `/api/audit` URL, so it only works through the Vite proxy (or a same-origin deploy). The backend's `detail` string is shown as the error message, so backend error text is user-facing. `DiagnosticPanel` renders the `to_dict()` result.
  - `ProtectionLab` (inside the layer 3 step) calls `/api/protect` on button press, with abort. It shows SSIM rings per technique (the one with lower model similarity gets a badge), a drag slider comparing the original with the cloak or watermark in person or model view, and both difference images. The watermark overlay on the preview is a CSS approximation; the real one is drawn by the backend. It is real output, but layer 3 stays user-declared.
  - `StressSimulator` (inside the layer 3 step) calls `/api/stress-test` with debounce and abort on every slider change. `CompareSlider` uses a picsum.photos placeholder photo with an SVG noise filter. It is illustrative, not a real perturbation, and needs network access.
  - Styling: Tailwind v4 with CSS-variable tokens in `index.css` (`bg-bg`, `text-muted`, `bg-accent`, `accent-2`, `highlight`, ...). The theme is light-only by design (no dark mode). Shared component classes live there too (`.card`, `.hero-panel`, `.btn-*`, `.marker`, `.spotlight`). Use these tokens instead of raw palette colors. Fonts are Geist via `@fontsource-variable`, icons are Phosphor, and motion uses `motion/react` with shared easing/stagger helpers in `src/lib/motion.js` (honor `useReducedMotion`). UI copy is Spanish and avoids em-dashes.
- Both servers must be running for uploads to work. A `Failed to fetch` message in the UI, or `ECONNREFUSED 127.0.0.1:8000` in the Vite log, means the backend is down.
