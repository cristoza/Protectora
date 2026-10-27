import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowClockwise, ImageSquare, UploadSimple } from '@phosphor-icons/react'
import { SPRING } from '../lib/motion.js'

function Skeleton() {
  return (
    <div className="mt-6 space-y-4" aria-hidden="true">
      <div className="shimmer h-36 rounded-box bg-raised" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-20 rounded-ctl bg-raised" />)}
      </div>
      <div className="shimmer h-40 rounded-box bg-raised" />
    </div>
  )
}

export default function AuditDropzone({ onResult, hasResult }) {
  const inputRef = useRef(null)
  const lastFile = useRef(null)
  const reduce = useReducedMotion()
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [canRetry, setCanRetry] = useState(false)

  async function upload(file) {
    if (!file) return
    lastFile.current = file
    // TIFF no se puede previsualizar en el navegador.
    setPreview(file.type.startsWith('image/') && !/tiff?$/.test(file.type) ? URL.createObjectURL(file) : null)
    setCanRetry(true)
    setLoading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/audit', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `El servidor respondió con un error (${res.status}).`)
      onResult(data, file)
    } catch (e) {
      setError(
        e.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
          : e.message,
      )
    } finally {
      setLoading(false)
    }
  }

  const compact = hasResult && !loading

  return (
    <div>
      <motion.div
        layout={!reduce}
        transition={SPRING}
        animate={reduce ? undefined : { scale: dragging ? 1.015 : 1 }}
        role="button"
        tabIndex={0}
        aria-label="Elegir una imagen para auditar"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]) }}
        className={`group relative flex cursor-pointer items-center overflow-hidden rounded-box border-2 border-dashed transition-colors duration-200 ${
          compact ? 'gap-3 px-5 py-4' : 'flex-col justify-center gap-3 px-6 py-16 text-center'
        } ${dragging ? 'border-accent bg-accent/10' : 'border-line bg-surface/70 hover:border-accent/60 hover:bg-surface'}`}
      >
        {!compact && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_60%)] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-ctl bg-accent/10 text-accent ${compact ? 'h-10 w-10' : 'h-20 w-20'}`}>
          <AnimatePresence mode="wait" initial={false}>
            {loading && preview ? (
              <motion.img
                key="preview"
                src={preview}
                alt=""
                className="h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              />
            ) : (
              <motion.span
                key={dragging ? 'drop' : 'idle'}
                initial={reduce ? false : { y: 10, opacity: 0 }}
                animate={reduce ? { y: 0, opacity: 1 } : { y: compact || loading ? 0 : [0, -4, 0], opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={compact || loading ? SPRING : { y: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
                className="flex"
              >
                {dragging ? <ImageSquare size={compact ? 20 : 34} weight="duotone" aria-hidden="true" /> : <UploadSimple size={compact ? 20 : 34} aria-hidden="true" />}
              </motion.span>
            )}
          </AnimatePresence>
          {loading && !reduce && (
            <span aria-hidden="true" className="absolute inset-0">
              <span className="scan-line block h-full w-full bg-gradient-to-b from-transparent via-accent/50 to-transparent" />
            </span>
          )}
        </span>
        <div className="relative">
          <p className={compact ? 'text-sm font-medium' : 'text-xl font-semibold tracking-tight'}>
            {loading ? 'Analizando tu imagen' : dragging ? 'Suéltala aquí' : compact ? 'Auditar otra imagen' : 'Arrastra tu imagen o haz clic para elegirla'}
            {loading && <span className="ml-0.5 inline-block animate-pulse" aria-hidden="true">...</span>}
          </p>
          {!compact && <p className="mt-1.5 text-sm text-muted">JPG, PNG, WebP o TIFF, hasta 25 MB</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,image/*"
          onChange={(e) => { upload(e.target.files[0]); e.target.value = '' }}
        />
      </motion.div>

      <p className="mt-3 text-sm text-muted">
        La imagen se guarda un instante en un archivo temporal del servidor y se borra en cuanto termina el análisis.
      </p>

      {error && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }}
          transition={{ duration: 0.4 }}
          role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-ctl border border-risk-high/50 bg-risk-high/5 p-4 text-sm">
          <p className="text-risk-high">{error}</p>
          {canRetry && (
            <button type="button" className="btn btn-outline" onClick={() => upload(lastFile.current)}>
              <ArrowClockwise size={16} aria-hidden="true" /> Reintentar
            </button>
          )}
        </motion.div>
      )}

      {loading && <Skeleton />}
    </div>
  )
}
