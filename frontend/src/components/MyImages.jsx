import { useEffect, useState } from 'react'
import { DownloadSimple, ImageSquare, Trash } from '@phosphor-icons/react'
import { KIND, deleteImage, listImages, networkText, useAccount } from '../lib/account.js'

const FILTERS = [
  { id: '', label: 'Todas' },
  { id: 'aprendizaje', label: 'Aprendizaje' },
  { id: 'laboratorio', label: 'Laboratorio' },
]

const RISK = { alto: 'text-risk-high', medio: 'text-risk-mid', bajo: 'text-risk-low' }

// Galería de las imágenes guardadas en la cuenta, con filtro por sección.
export default function MyImages({ onLogin }) {
  const { user, imagesVersion, imagesChanged } = useAccount()
  const [filter, setFilter] = useState('')
  const [images, setImages] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    listImages(filter)
      .then((list) => { if (!cancelled) { setImages(list); setError(null) } })
      .catch((e) => { if (!cancelled) setError(networkText(e)) })
    return () => { cancelled = true }
  }, [user, filter, imagesVersion])

  const remove = async (id) => {
    try {
      await deleteImage(id)
      imagesChanged()
    } catch (e) {
      setError(networkText(e))
    }
  }

  return (
    <section className="card p-6" aria-labelledby="my-images-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="my-images-title" className="text-lg font-bold tracking-tight">Mis imágenes</h3>
        {user && (
          <div role="group" aria-label="Filtrar por sección" className="flex gap-1 rounded-full bg-raised p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === f.id ? 'bg-white text-ink shadow' : 'text-muted hover:text-ink'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!user ? (
        <p className="mt-3 text-sm text-muted">
          Sin cuenta no se guarda nada.{' '}
          <button type="button" className="font-medium text-accent underline underline-offset-4" onClick={onLogin}>
            Inicia sesión o crea una cuenta
          </button>{' '}
          para guardar tus imágenes y retomar el recorrido donde lo dejaste.
        </p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-risk-high">{error}</p>
      ) : images === null ? (
        <p className="mt-3 text-sm text-muted">Cargando...</p>
      ) : images.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Todavía no guardaste imágenes aquí. Usa “Guardar en mi cuenta” junto a cada resultado.</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => {
            const url = `/api/images/${img.id}/file`
            return (
              <li key={img.id} className="overflow-hidden rounded-box border border-line bg-white">
                <div className="flex aspect-[4/3] items-center justify-center bg-raised">
                  {img.mime === 'image/tiff'
                    ? <ImageSquare size={40} className="text-muted" aria-hidden="true" />
                    : <img src={url} alt={img.filename} loading="lazy" className="h-full w-full object-contain" />}
                </div>
                <div className="p-4">
                  <p className="truncate font-medium" title={img.filename}>{img.filename}</p>
                  <p className="mt-1 text-xs text-muted">
                    {KIND[img.kind]} · {img.section === 'aprendizaje' ? 'Aprendizaje' : 'Laboratorio'} ·{' '}
                    {new Date(img.created_at).toLocaleDateString('es')}
                  </p>
                  <p className={`num mt-1 text-xs font-semibold ${RISK[img.audit.risk_level] || 'text-muted'}`}>
                    Exposición {img.audit.vulnerability_score}/100, riesgo {img.audit.risk_level}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <a href={url} download={img.filename} className="btn btn-outline flex-1 bg-white text-sm">
                      <DownloadSimple size={14} aria-hidden="true" /> Descargar
                    </a>
                    <button type="button" className="btn btn-quiet text-sm text-risk-high" onClick={() => remove(img.id)} aria-label={`Borrar ${img.filename}`}>
                      <Trash size={14} aria-hidden="true" /> Borrar
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
