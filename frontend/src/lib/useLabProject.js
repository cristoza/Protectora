import { useEffect, useState } from 'react'
import {
  DEFAULT_IDENTITY, DEFAULT_PROTECTION, DEFAULT_STRESS, createProject, deleteProject, getProject, imageAsFile, saveImage,
  updateProject,
} from './account.js'

// Estado del Laboratorio y su proyecto abierto. Vive en App para que no se pierda al cambiar de sección.
// Con un proyecto abierto, su trabajo (firma, ajustes, última auditoría) se guarda solo y la imagen subida va a él.
export default function useLabProject({ project, setProject, imagesChanged }) {
  // Imagen auditada: { file, audit, imageId } (imageId cuando ya está guardada en el proyecto).
  const [source, setSource] = useState(null)
  const [audit, setAudit] = useState(null)
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY)
  const [protection, setProtection] = useState(DEFAULT_PROTECTION)
  const [stress, setStress] = useState(DEFAULT_STRESS)

  const snapshot = { identity, protection, stress, audit }

  const apply = (s) => {
    setIdentity(s.identity ?? DEFAULT_IDENTITY)
    setProtection(s.protection ?? DEFAULT_PROTECTION)
    setStress(s.stress ?? DEFAULT_STRESS)
    setAudit(s.audit ?? null)
  }

  // Abre un proyecto: sus ajustes y, si se guardó, su imagen original más reciente para seguir trabajando.
  const open = async (id) => {
    const p = await getProject(id)
    // Las imágenes llegan de la más reciente a la más antigua.
    const original = p.images.find((i) => i.kind === 'original')
    const file = original ? await imageAsFile(original).catch(() => null) : null
    apply(p.state)
    setSource(file ? { file, audit: original.audit, imageId: original.id } : null)
    setProject({ id: p.id, name: p.name })
  }

  // Crea un proyecto con lo que hay ahora en el Laboratorio (y su imagen) o vacío, y lo deja abierto.
  const create = async (name, keepCurrent) => {
    const p = await createProject(name, keepCurrent ? snapshot : {})
    if (keepCurrent && source) {
      const img = await saveImage({ source: source.file, filename: source.file.name, kind: 'original', section: 'laboratorio', projectId: p.id })
      setSource({ ...source, imageId: img.id })
      imagesChanged()
    }
    if (!keepCurrent) {
      apply(p.state)
      setSource(null)
    }
    setProject({ id: p.id, name: p.name })
  }

  const remove = async (id) => {
    await deleteProject(id)
    if (project?.id === id) {
      setProject(null)
      setSource((s) => (s ? { ...s, imageId: undefined } : s))
    }
    imagesChanged()
  }

  const rename = async (id, name) => {
    const p = await updateProject(id, { name })
    if (project?.id === id) setProject({ id, name: p.name })
  }

  const close = () => {
    setProject(null)
    setSource((s) => (s ? { ...s, imageId: undefined } : s))
  }

  // Cada cambio se guarda en el proyecto abierto un segundo después.
  const snapshotJson = JSON.stringify(snapshot)
  useEffect(() => {
    if (!project) return undefined
    const timer = setTimeout(() => {
      updateProject(project.id, { state: JSON.parse(snapshotJson) }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [project, snapshotJson])

  const onUpload = (data, file) => {
    setAudit(data)
    setSource({ file, audit: data })
    if (!project) return
    saveImage({ source: file, filename: file.name, kind: 'original', section: 'laboratorio', projectId: project.id })
      .then((img) => {
        setSource((s) => (s?.file === file ? { ...s, imageId: img.id } : s))
        imagesChanged()
      })
      // Si falla, queda el botón "Guardar en mi cuenta" junto a la imagen.
      .catch(() => {})
  }

  return {
    project, source, audit, setAudit, identity, setIdentity, protection, setProtection, stress, setStress,
    hasWork: Boolean(source || audit),
    open, create, remove, rename, close, onUpload,
  }
}
