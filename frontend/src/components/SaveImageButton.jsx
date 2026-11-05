import { useState } from 'react'
import { CheckCircle, CloudArrowUp } from '@phosphor-icons/react'
import { networkText, saveImage, useAccount, useSection } from '../lib/account.js'

// Guarda una imagen en la cuenta (en Laboratorio, dentro del proyecto abierto). Sin sesión no se muestra: nada se guarda sin pedirlo.
export default function SaveImageButton({ source, filename, kind, className = '' }) {
  const { user, project, imagesChanged } = useAccount()
  const section = useSection()
  // Se recuerda qué archivo se guardó: si cambia, el botón vuelve a estar disponible.
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!user || !source) return null
  const done = saved === source

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveImage({ source, filename, kind, section, projectId: section === 'laboratorio' ? project?.id : undefined })
      setSaved(source)
      imagesChanged()
    } catch (e) {
      setError(networkText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className}>
      <button type="button" className="btn btn-outline w-full bg-white" onClick={save} disabled={saving || done}>
        {done
          ? <><CheckCircle size={16} weight="fill" className="text-risk-low" aria-hidden="true" /> Guardada en tu cuenta</>
          : <><CloudArrowUp size={16} aria-hidden="true" /> {saving ? 'Guardando...' : 'Guardar en mi cuenta'}</>}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-risk-high">{error}</p>}
    </div>
  )
}
