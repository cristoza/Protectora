import { useEffect, useRef, useState } from 'react'
import { UploadSimple } from '@phosphor-icons/react'

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

function Slider({ id, label, hint, value, min, max, step, onChange, display }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium">{label}</label>
        <output htmlFor={id} className="num text-sm text-muted">{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
      />
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  )
}

// Módulo 3: reenvía la imagen al backend con compresión y reducción, como lo haría una plataforma.
export default function StressSimulator({ settings, setSettings }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [stressed, setStressed] = useState(null) // { url, size }
  // Ajustes guardados por quien usa el simulador (en Laboratorio, el proyecto abierto).
  const { quality, scalePct, passes } = settings
  const setQuality = (v) => setSettings({ ...settings, quality: v })
  const setScalePct = (v) => setSettings({ ...settings, scalePct: v })
  const setPasses = (v) => setSettings({ ...settings, passes: v })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Con cada cambio de control se espera un instante y se cancela la petición anterior.
  useEffect(() => {
    if (!file) return undefined
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const body = new FormData()
        body.append('file', file)
        body.append('quality', quality)
        body.append('scale', scalePct / 100)
        body.append('passes', passes)
        const res = await fetch('/api/stress-test', { method: 'POST', body, signal: ctrl.signal })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(typeof data.detail === 'string' ? data.detail : `El servidor respondió con un error (${res.status}).`)
        }
        const blob = await res.blob()
        setStressed((old) => {
          if (old) URL.revokeObjectURL(old.url)
          return { url: URL.createObjectURL(blob), size: blob.size }
        })
        setLoading(false)
      } catch (e) {
        if (e.name === 'AbortError') return
        setError(
          e.message === 'Failed to fetch'
            ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
            : e.message,
        )
        setLoading(false)
      }
    }, 350)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [file, quality, scalePct, passes])

  const pick = (f) => {
    if (!f) return
    setStressed(null)
    setOriginalUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(f)
    })
    setFile(f)
  }

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Simulador de estrés</h3>
      <p className="mt-1 max-w-[60ch] text-sm text-muted">
        Las plataformas recomprimen y reducen tus imágenes al publicarlas. Prueba cuánto cambia la tuya.
        La imagen se guarda un instante en un archivo temporal y se borra al devolverte el resultado.
      </p>

      <button type="button" className="btn btn-outline mt-4" onClick={() => inputRef.current?.click()}>
        <UploadSimple size={16} aria-hidden="true" /> {file ? 'Cambiar imagen' : 'Elegir una imagen'}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,image/*"
        onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }}
      />

      {file && (
        <>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Slider id="st-q" label="Calidad JPEG" value={quality} min={1} max={95} step={1} display={quality}
              hint="Más baja pesa menos y daña más los detalles." onChange={setQuality} />
            <Slider id="st-s" label="Tamaño" value={scalePct} min={10} max={100} step={5} display={`${scalePct}%`}
              hint="Porcentaje del ancho y alto original." onChange={setScalePct} />
            <Slider id="st-p" label="Recompresiones" value={passes} min={1} max={5} step={1} display={passes}
              hint="Cuántas veces se vuelve a guardar." onChange={setPasses} />
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-risk-high">{error}</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2" aria-live="polite">
            <figure>
              <img src={originalUrl} alt="Imagen original" className="w-full rounded-ctl bg-raised object-contain" />
              <figcaption className="num mt-2 text-sm text-muted">Original, {kb(file.size)}</figcaption>
            </figure>
            <figure className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {stressed ? (
                <img src={stressed.url} alt="Imagen tras la compresión y reducción" className="w-full rounded-ctl bg-raised object-contain" />
              ) : (
                <div className="aspect-[4/3] animate-pulse rounded-ctl bg-raised" aria-hidden="true" />
              )}
              <figcaption className="num mt-2 text-sm text-muted">
                {loading ? 'Procesando' : stressed ? `Degradada, ${kb(stressed.size)}` : ''}
              </figcaption>
            </figure>
          </div>
          <p className="mt-4 max-w-[60ch] text-sm text-muted">
            La copia degradada ya no trae metadatos: así los pierde la mayoría de plataformas. Si usas una herramienta de
            perturbación, compara aquí si el resultado sigue pareciéndose a lo que publicarías.
          </p>
        </>
      )}
    </div>
  )
}
