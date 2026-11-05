import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Cuenta opcional. Sin sesión la app funciona igual y no guarda nada en el servidor.
export const AccountContext = createContext({ user: null, project: null, imagesVersion: 0, imagesChanged: () => {} })
// Sección en la que se usa un componente: decide dónde se clasifica lo que se guarda.
export const SectionContext = createContext('aprendizaje')

export const useAccount = () => useContext(AccountContext)
export const useSection = () => useContext(SectionContext)

// Mensaje de error legible: FastAPI devuelve `detail` como texto o, si falla la validación, como lista.
export function errorText(data, status) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) return 'Revisa los datos: hay un campo con un valor no válido.'
  return `El servidor respondió con un error (${status}).`
}

export const networkText = (e) =>
  e.message === 'Failed to fetch'
    ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
    : e.message

async function call(url, options) {
  const res = await fetch(url, options)
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorText(data, res.status))
  return data
}

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function useAccountState() {
  const [user, setUser] = useState(null)
  // Proyecto abierto en el Laboratorio ({ id, name }): su trabajo se guarda en él y las imágenes del Laboratorio van a él.
  const [project, setProject] = useState(null)
  // Sube cada vez que se guarda o borra una imagen, para que la galería se recargue.
  const [imagesVersion, setImagesVersion] = useState(0)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
  }, [])

  const login = useCallback(async (username, password) => setUser((await call('/api/auth/login', json('POST', { username, password }))).user), [])
  const register = useCallback(async (username, password) => setUser((await call('/api/auth/register', json('POST', { username, password }))).user), [])
  const logout = useCallback(async () => {
    await call('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setProject(null)
  }, [])
  const deleteAccount = useCallback(async () => {
    await call('/api/auth/me', { method: 'DELETE' })
    setUser(null)
    setProject(null)
  }, [])
  const imagesChanged = useCallback(() => setImagesVersion((v) => v + 1), [])

  return { user, project, setProject, login, register, logout, deleteAccount, imagesVersion, imagesChanged }
}

// Valores iniciales de los ajustes (los mismos que validan Progress y LabState en el backend).
export const DEFAULT_IDENTITY = { author: '', copyright: '', aiOptOut: true, stripGps: true }
export const DEFAULT_PROTECTION = { strength: 'media', watermarkText: '© Autor', watermarkOpacity: 35 }
export const DEFAULT_STRESS = { quality: 60, scalePct: 50, passes: 1 }

export const saveProgress = (state) => call('/api/progress', json('PUT', state))
export const loadProgress = () => call('/api/progress').then((d) => d.progress)

export const listProjects = () => call('/api/projects').then((d) => d.projects)
export const getProject = (id) => call(`/api/projects/${id}`)
export const createProject = (name, state) => call('/api/projects', json('POST', { name, state }))
export const updateProject = (id, patch) => call(`/api/projects/${id}`, json('PATCH', patch))
export const deleteProject = (id) => call(`/api/projects/${id}`, { method: 'DELETE' })

// Descarga una imagen guardada como File, para seguir trabajando con ella.
export async function imageAsFile(image) {
  const res = await fetch(`/api/images/${image.id}/file`)
  if (!res.ok) throw new Error(`No se pudo recuperar ${image.filename}.`)
  return new File([await res.blob()], image.filename, { type: image.mime })
}

export async function saveImage({ source, filename, kind, section, projectId }) {
  // `source` es un File/Blob o una data URL devuelta por el backend.
  const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source
  const body = new FormData()
  body.append('file', blob, filename)
  body.append('section', section)
  body.append('kind', kind)
  if (projectId) body.append('project_id', projectId)
  return call('/api/images', { method: 'POST', body })
}

// Tipo de cada imagen guardada, como se muestra.
export const KIND = {
  original: 'Original',
  firmada: 'Firmada',
  perturbacion: 'Con perturbación',
  marca_agua: 'Con marca de agua',
}

export const listImages = (section) => call(`/api/images${section ? `?section=${section}` : ''}`).then((d) => d.images)
export const deleteImage = (id) => call(`/api/images/${id}`, { method: 'DELETE' })
