"""Conexión a PostgreSQL para las cuentas opcionales (usuarios, sesiones, progreso, proyectos e imágenes guardadas).

El uso anónimo de la app no toca la base de datos: si Postgres no está disponible, solo fallan
los endpoints de cuenta (503). El esquema se crea la primera vez que se conecta.
"""
from __future__ import annotations

import os

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///escudo_visual")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash BYTEA PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS progress (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects (user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS images (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section TEXT NOT NULL CHECK (section IN ('aprendizaje', 'laboratorio')),
    kind TEXT NOT NULL CHECK (kind IN ('original', 'firmada', 'perturbacion', 'marca_agua')),
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    stored_name TEXT NOT NULL,
    audit JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS images_user_idx ON images (user_id, created_at DESC);
-- Imágenes del Laboratorio guardadas en un proyecto: se borran con él.
ALTER TABLE images ADD COLUMN IF NOT EXISTS project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS images_project_idx ON images (project_id);
"""

_ready_for = None


def connect() -> psycopg.Connection:
    """Abre una conexión (filas como dict) y crea el esquema si aún no se hizo para esta URL.

    Úsala con `with db.connect() as conn:`, que confirma la transacción y cierra al salir.
    """
    global _ready_for
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    if _ready_for != DATABASE_URL:
        with conn.transaction():
            conn.execute(SCHEMA)
        _ready_for = DATABASE_URL
    return conn
