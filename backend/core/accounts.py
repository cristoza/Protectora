"""Cuentas opcionales: usuarios, sesiones, progreso del recorrido, proyectos del Laboratorio e imágenes guardadas.

Solo se guarda lo que el usuario pide guardar. Las contraseñas se derivan con PBKDF2-SHA256 (stdlib)
y de las sesiones solo se guarda el SHA-256 del token que viaja en la cookie. Los archivos de
imagen van a disco (UPLOAD_DIR/<user_id>/) y en la base de datos queda su ruta y su auditoría.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.types.json import Jsonb

from core import db

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
SESSION_DAYS = 30
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".tif": "image/tiff", ".tiff": "image/tiff"}

# Iteraciones recomendadas por OWASP para PBKDF2-SHA256. hashlib.scrypt no existe en el Python 3.9 de macOS (LibreSSL).
_ITERATIONS = 600_000


class UsernameTaken(Exception):
    pass


class ProjectNotFound(Exception):
    pass


def normalize_username(username: str) -> str:
    return username.strip().lower()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(_ITERATIONS, base64.b64encode(salt).decode(), base64.b64encode(key).decode())


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, key = stored.split("$")
        given = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(iterations))
    except ValueError:
        return False
    return hmac.compare_digest(given, base64.b64decode(key))


# Hash de relleno: con un usuario inexistente se deriva la clave igual, así el tiempo no delata qué usuarios existen.
_DUMMY_HASH = hash_password(secrets.token_hex(8))


def _public(row: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": row["id"], "username": row["username"]}


def create_user(username: str, password: str) -> Dict[str, Any]:
    try:
        with db.connect() as conn:
            row = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id, username",
                (normalize_username(username), hash_password(password)),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise UsernameTaken()
    return _public(row)


def authenticate(username: str, password: str) -> Optional[Dict[str, Any]]:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE username = %s", (normalize_username(username),)
        ).fetchone()
    if row is None:
        verify_password(password, _DUMMY_HASH)
        return None
    return _public(row) if verify_password(password, row["password_hash"]) else None


def _token_hash(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (%s, %s, %s)", (_token_hash(token), user_id, expires)
        )
    return token


def user_for_token(token: str) -> Optional[Dict[str, Any]]:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id"
            " WHERE s.token_hash = %s AND s.expires_at > now()",
            (_token_hash(token),),
        ).fetchone()
    return _public(row) if row else None


def delete_session(token: str) -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = %s", (_token_hash(token),))


def _user_dir(user_id: int) -> str:
    return os.path.join(UPLOAD_DIR, str(user_id))


def delete_user(user_id: int) -> None:
    """Borra la cuenta con sus sesiones, progreso, proyectos e imágenes (por cascade) y su carpeta de archivos."""
    with db.connect() as conn:
        conn.execute("DELETE FROM users WHERE id = %s", (user_id,))
    shutil.rmtree(_user_dir(user_id), ignore_errors=True)


def get_progress(user_id: int) -> Optional[Dict[str, Any]]:
    with db.connect() as conn:
        row = conn.execute("SELECT state FROM progress WHERE user_id = %s", (user_id,)).fetchone()
    return row["state"] if row else None


def save_progress(user_id: int, state: Dict[str, Any]) -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO progress (user_id, state) VALUES (%s, %s)"
            " ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()",
            (user_id, Jsonb(state)),
        )


def _remove_files(user_id: int, stored_names: List[str]) -> None:
    for name in stored_names:
        path = os.path.join(_user_dir(user_id), name)
        if os.path.exists(path):
            os.remove(path)


# Un proyecto guarda el trabajo del Laboratorio (firma, ajustes de perturbación y de estrés, última auditoría) y agrupa sus imágenes.
def _project_out(row: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(row)
    out["created_at"] = row["created_at"].isoformat()
    out["updated_at"] = row["updated_at"].isoformat()
    return out


def list_projects(user_id: int) -> List[Dict[str, Any]]:
    """Resumen de cada proyecto, el último modificado primero: riesgo, autor, cuántas imágenes y cuál usar de portada."""
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT p.id, p.name, p.created_at, p.updated_at, p.state->'identity'->>'author' AS author,"
            " p.state->'audit'->>'risk_level' AS risk_level, count(i.id) AS image_count,"
            " max(i.id) FILTER (WHERE i.mime <> 'image/tiff') AS cover_id"
            " FROM projects p LEFT JOIN images i ON i.project_id = p.id"
            " WHERE p.user_id = %s GROUP BY p.id ORDER BY p.updated_at DESC, p.id DESC",
            (user_id,),
        ).fetchall()
    return [_project_out(r) for r in rows]


def create_project(user_id: int, name: str, state: Dict[str, Any]) -> Dict[str, Any]:
    with db.connect() as conn:
        row = conn.execute(
            "INSERT INTO projects (user_id, name, state) VALUES (%s, %s, %s) RETURNING id, name, state, created_at, updated_at",
            (user_id, name, Jsonb(state)),
        ).fetchone()
    return {**_project_out(row), "images": []}


def get_project(user_id: int, project_id: int) -> Optional[Dict[str, Any]]:
    """El proyecto con su estado y sus imágenes, solo si pertenece al usuario."""
    with db.connect() as conn:
        row = conn.execute(
            "SELECT id, name, state, created_at, updated_at FROM projects WHERE id = %s AND user_id = %s", (project_id, user_id)
        ).fetchone()
    if row is None:
        return None
    return {**_project_out(row), "images": list_images(user_id, project_id=project_id)}


def update_project(
    user_id: int, project_id: int, name: Optional[str] = None, state: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """Cambia el nombre, el estado o ambos (lo que venga en None se conserva)."""
    with db.connect() as conn:
        row = conn.execute(
            "UPDATE projects SET name = COALESCE(%s::text, name), state = COALESCE(%s::jsonb, state), updated_at = now()"
            " WHERE id = %s AND user_id = %s RETURNING id, name, created_at, updated_at",
            (name, Jsonb(state) if state is not None else None, project_id, user_id),
        ).fetchone()
    return _project_out(row) if row else None


def delete_project(user_id: int, project_id: int) -> bool:
    """Borra el proyecto con sus imágenes y los archivos de estas."""
    with db.connect() as conn:
        images = conn.execute(
            "DELETE FROM images WHERE project_id = %s AND user_id = %s RETURNING stored_name", (project_id, user_id)
        ).fetchall()
        row = conn.execute("DELETE FROM projects WHERE id = %s AND user_id = %s RETURNING id", (project_id, user_id)).fetchone()
    if row is None:
        return False
    _remove_files(user_id, [r["stored_name"] for r in images])
    return True


_IMAGE_COLUMNS = "id, project_id, section, kind, filename, mime, size_bytes, audit, created_at"


def _image_out(row: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: row[k] for k in ("id", "project_id", "section", "kind", "filename", "mime", "size_bytes", "audit")}
    out["created_at"] = row["created_at"].isoformat()
    return out


def add_image(
    user_id: int, section: str, kind: str, filename: str, src_path: str, audit: Dict[str, Any], project_id: Optional[int] = None
) -> Dict[str, Any]:
    """Mueve `src_path` al almacén del usuario y registra la imagen. Si falla el registro, el archivo se borra.

    Con `project_id`, la imagen se guarda en ese proyecto (ProjectNotFound si no es del usuario).
    """
    ext = os.path.splitext(src_path)[1].lower()
    stored_name = uuid.uuid4().hex + ext
    os.makedirs(_user_dir(user_id), exist_ok=True)
    dest = os.path.join(_user_dir(user_id), stored_name)
    size = os.path.getsize(src_path)
    shutil.move(src_path, dest)
    try:
        with db.connect() as conn:
            row = conn.execute(
                "INSERT INTO images (user_id, project_id, section, kind, filename, mime, size_bytes, stored_name, audit)"
                " SELECT %s, %s, %s, %s, %s, %s, %s, %s, %s"
                " WHERE %s::bigint IS NULL OR EXISTS (SELECT 1 FROM projects WHERE id = %s AND user_id = %s)"
                f" RETURNING {_IMAGE_COLUMNS}",
                (user_id, project_id, section, kind, filename, MIME.get(ext, "application/octet-stream"), size, stored_name,
                 Jsonb(audit), project_id, project_id, user_id),
            ).fetchone()
            if row is None:
                raise ProjectNotFound()
    except Exception:
        os.remove(dest)
        raise
    return _image_out(row)


def list_images(user_id: int, section: Optional[str] = None, project_id: Optional[int] = None) -> List[Dict[str, Any]]:
    query = f"SELECT {_IMAGE_COLUMNS} FROM images WHERE user_id = %s"
    params: list = [user_id]
    if section:
        query += " AND section = %s"
        params.append(section)
    if project_id is not None:
        query += " AND project_id = %s"
        params.append(project_id)
    with db.connect() as conn:
        rows = conn.execute(query + " ORDER BY created_at DESC, id DESC", params).fetchall()
    return [_image_out(r) for r in rows]


def image_file(user_id: int, image_id: int) -> Optional[Dict[str, Any]]:
    """Ruta en disco, nombre y tipo de una imagen, solo si pertenece al usuario."""
    with db.connect() as conn:
        row = conn.execute(
            "SELECT filename, mime, stored_name FROM images WHERE id = %s AND user_id = %s", (image_id, user_id)
        ).fetchone()
    if row is None:
        return None
    return {"path": os.path.join(_user_dir(user_id), row["stored_name"]), "filename": row["filename"], "mime": row["mime"]}


def delete_image(user_id: int, image_id: int) -> bool:
    with db.connect() as conn:
        row = conn.execute(
            "DELETE FROM images WHERE id = %s AND user_id = %s RETURNING stored_name", (image_id, user_id)
        ).fetchone()
    if row is None:
        return False
    _remove_files(user_id, [row["stored_name"]])
    return True
