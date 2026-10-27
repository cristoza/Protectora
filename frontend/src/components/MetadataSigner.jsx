import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CircleNotch, DownloadSimple, PenNib } from '@phosphor-icons/react'
import CheckCard from './CheckCard.jsx'
import { EASE } from '../lib/motion.js'

const YEAR = new Date().getFullYear()

const RISK_TONE = { alto: 'text-risk-high', medio: 'text-risk-mid', bajo: 'text-risk-low' }

const errorText = (data, status) =>
  status === 404
    ? 'El servidor no tiene la función de firma. Reinicia el backend para que cargue el código nuevo.'
    : typeof data.detail === 'string'
    ? data.detail
    : Array.isArray(data.detail)
      ? 'Revisa los datos: el nombre es obligatorio y el texto no puede ser tan largo.'
      : `El servidor respondió con un error (${status}).`

// Escribe autoría, copyright y exclusión de IA en el archivo (POST /api/write-metadata).
// El backend audita el archivo escrito, así que el resultado que se muestra está verificado.
export default function MetadataSigner({ file, filename, identity, setIdentity, beforeScore, onSigned, title, intro }) {
  const reduce = useReducedMotion()
  const ctrlRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => () => ctrlRef.current?.abort(), [])
  // Si cambia la imagen de origen, el resultado anterior ya no corresponde.
  const signed = result?.file === file ? result.data : null
  const author = identity.author.trim()
  const set = (patch) => setIdentity({ ...identity, ...patch })

  const sign = async (e) => {
    e.preventDefault()
    if (!author) {
      setError('Escribe el nombre de la autora o el autor.')
      return
    }
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file, filename)
      body.append('author', author)
      body.append('copyright', identity.copyright.trim())
      body.append('ai_opt_out', identity.aiOptOut)
      body.append('strip_gps', identity.stripGps)
      const res = await fetch('/api/write-metadata', { method: 'POST', body, signal: ctrl.signal })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(errorText(data, res.status))
      setResult({ file, data })
      // El archivo firmado pasa a ser el vigente: el asistente de publicación lo analiza a él.
      const blob = await (await fetch(data.image)).blob()
      onSigned?.(data.audit, new File([blob], data.filename, { type: blob.type }))
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(
        err.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
          : err.message,
      )
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false)
    }
  }

  const after = signed?.audit

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-4 border-b border-line/70 bg-gradient-to-r from-accent/8 to-accent-2/8 p-5 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_10px_20px_-8px_var(--accent)]">
          <PenNib size={22} weight="fill" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <p className="mt-1 max-w-[62ch] text-sm text-muted">{intro}</p>
        </div>
      </div>

      <form onSubmit={sign} className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <fieldset disabled={loading} className="grid content-start gap-4">
          <legend className="sr-only">Tus datos</legend>
          <div>
            <label htmlFor="sign-author" className="text-sm font-semibold">Autora o autor</label>
            <input
              id="sign-author" type="text" maxLength={80} required value={identity.author}
              onChange={(e) => set({ author: e.target.value })}
              placeholder="Tu nombre o nombre artístico"
              className="mt-1.5 w-full rounded-ctl border-2 border-line bg-white px-4 py-2.5 font-medium transition-colors focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="sign-copy" className="text-sm font-semibold">Aviso de copyright</label>
            <input
              id="sign-copy" type="text" maxLength={160} value={identity.copyright}
              onChange={(e) => set({ copyright: e.target.value })}
              placeholder={`© ${YEAR} ${author || 'Tu nombre'}`}
              className="mt-1.5 w-full rounded-ctl border-2 border-line bg-white px-4 py-2.5 font-medium transition-colors focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">Si lo dejas vacío se usa el texto de ejemplo.</p>
          </div>
        </fieldset>

        <fieldset disabled={loading} className="grid content-start gap-3">
          <legend className="sr-only">Opciones</legend>
          <CheckCard
            checked={identity.aiOptOut}
            onChange={(v) => set({ aiOptOut: v })}
            title="Declarar que no autorizo el entrenamiento de IA"
            hint="Palabras clave noai y noimageai, el campo Data Mining de IPTC y la reserva TDMRep."
          />
          <CheckCard
            checked={identity.stripGps}
            onChange={(v) => set({ stripGps: v })}
            title="Quitar la ubicación GPS"
            hint="Recomendado antes de publicar."
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
          <button type="submit" className="btn btn-primary group px-6 py-3.5 text-base font-semibold" disabled={loading}>
            {loading ? (
              <CircleNotch size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <PenNib size={20} weight="fill" aria-hidden="true" className="transition-transform duration-300 group-hover:-rotate-12" />
            )}
            {loading ? 'Firmando' : signed ? 'Volver a firmar' : 'Firmar imagen'}
          </button>
          <p className="max-w-[52ch] text-xs text-muted">
            Los píxeles no cambian. Se reemplaza el bloque XMP que tuviera el archivo y el resto de metadatos se conserva.
          </p>
        </div>
      </form>

      {error && (
        <p role="alert" className="mx-5 mb-5 rounded-ctl border border-risk-high/40 bg-risk-high/5 p-4 text-sm text-risk-high sm:mx-6">
          {error}
        </p>
      )}

      {after && (
        <motion.div
          key={signed.image.length}
          className="border-t border-line/70 bg-raised/40 p-5 sm:p-6"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-4">
              {beforeScore != null && (
                <>
                  <div className="text-center">
                    <p className="num text-4xl font-bold tracking-tighter text-muted line-through decoration-2">{beforeScore}</p>
                    <p className="text-xs text-muted">Antes</p>
                  </div>
                  <motion.span
                    initial={reduce ? false : { x: -8, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-accent"
                  >
                    <ArrowRight size={26} weight="bold" aria-hidden="true" />
                  </motion.span>
                </>
              )}
              <motion.div
                className="text-center"
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 14 }}
              >
                <p className={`num text-5xl font-bold tracking-tighter ${RISK_TONE[after.risk_level]}`}>{after.vulnerability_score}</p>
                <p className="text-xs text-muted">Ahora, de 100</p>
              </motion.div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Comprobado en el archivo firmado</p>
              <p className="mt-1 text-sm text-muted">
                {after.has_author ? 'Autoría' : 'Sin autoría'}, {after.has_copyright ? 'copyright' : 'sin copyright'}
                {after.exclusion_tags.length ? `, ${after.exclusion_tags.length} señales de exclusión` : ', sin señales de exclusión'}
                {after.has_gps ? ' y con GPS.' : ' y sin GPS.'}
              </p>
              {after.exclusion_tags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {after.exclusion_tags.map((t) => (
                    <li key={t} className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-xs text-accent">{t}</li>
                  ))}
                </ul>
              )}
            </div>
            <a href={signed.image} download={signed.filename} className="btn btn-primary">
              <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Descargar {signed.filename}
            </a>
          </div>
        </motion.div>
      )}
    </div>
  )
}
