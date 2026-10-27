import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowsHorizontal, Brain, DownloadSimple, Drop, Eye, ImageSquare, ShieldCheck, Sparkle, Stamp, Trophy, UploadSimple, X } from '@phosphor-icons/react'
import { EASE, SPRING } from '../lib/motion.js'
import MetadataSigner from './MetadataSigner.jsx'

const STRENGTHS = [
  { id: 'baja', label: 'Baja', hint: 'Casi invisible', bars: 1 },
  { id: 'media', label: 'Media', hint: 'Equilibrio', bars: 2 },
  { id: 'alta', label: 'Alta', hint: 'Más efecto, más visible', bars: 3 },
]

const VARIANTS = [
  { id: 'cloak', label: 'Perturbación', icon: Sparkle },
  { id: 'watermark', label: 'Marca de agua', icon: Stamp },
]

const VIEWS = [
  { id: 'person', label: 'Lo que ve una persona', icon: Eye },
  { id: 'model', label: 'Lo que reconstruye el modelo', icon: Brain },
]

const pct = (n) => `${Math.round(n * 100)} %`

// Anillo de parecido (SSIM): el arco crece hasta el valor al aparecer.
function Ring({ value, label, color, size = 92 }) {
  const reduce = useReducedMotion()
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--raised)" strokeWidth="9" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: v }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
          />
        </svg>
        <span className="num absolute inset-0 flex items-center justify-center text-xl font-bold tracking-tight">{pct(value)}</span>
      </div>
      <span className="max-w-[11ch] text-xs font-medium leading-tight text-muted">{label}</span>
    </div>
  )
}

// Marcador de una técnica: parecido para persona, modelo y modelo tras JPEG.
function ScoreCard({ variant, data, subtitle, best, download }) {
  const reduce = useReducedMotion()
  const Icon = variant.icon
  return (
    <motion.article
      className={`card relative flex flex-col p-6 ${best ? 'ring-2 ring-accent' : ''}`}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {best && (
        <motion.span
          className="absolute -top-3 right-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-2 px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_18px_-8px_var(--accent)]"
          initial={reduce ? false : { scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.9 }}
        >
          <Trophy size={13} weight="fill" aria-hidden="true" /> Más confunde al modelo
        </motion.span>
      )}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-ctl bg-gradient-to-br from-accent to-accent-2 text-white">
          <Icon size={22} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="text-lg font-bold tracking-tight">{variant.label}</h4>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        <Ring value={data.human_similarity} label="Parecido para una persona" color="var(--risk-low)" />
        <Ring value={data.model_similarity} label="Parecido para el modelo" color="var(--accent)" />
        <Ring value={data.model_similarity_jpeg} label="Modelo tras JPEG" color="var(--accent-2)" />
      </div>
      <p className="num mt-4 text-center text-xs text-muted">PSNR {data.psnr.toFixed(1)} dB</p>
      <a href={data.image} download={download} className="btn btn-outline mt-5 bg-white">
        <DownloadSimple size={16} aria-hidden="true" /> Descargar PNG
      </a>
    </motion.article>
  )
}

// Antes y después: el original a la izquierda y la versión elegida a la derecha, con un divisor arrastrable.
function CompareSlider({ before, after, beforeLabel, afterLabel }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative select-none overflow-hidden rounded-box bg-raised">
      <img src={after} alt={afterLabel} className="block w-full" draggable={false} />
      <img
        src={before}
        alt={beforeLabel}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }} aria-hidden="true">
        <div className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_12px_rgb(0_0_0/0.35)]" />
        <div className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-accent shadow-lg">
          <ArrowsHorizontal size={20} weight="bold" />
        </div>
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{afterLabel}</span>
      <input
        type="range" min={0} max={100} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Deslizar para comparar ${beforeLabel} con ${afterLabel}`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}

// Control segmentado con píldora que se desliza (un grupo de radios nativos por debajo).
function Segmented({ name, label, options, value, onChange, disabled }) {
  const reduce = useReducedMotion()
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-raised p-1">
      {options.map((o) => {
        const Icon = o.icon
        const on = value === o.id
        return (
          <label
            key={o.id}
            className={`relative flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${on ? 'text-white' : 'text-ink/70 hover:text-ink'}`}
          >
            <input type="radio" name={name} value={o.id} checked={on} onChange={() => onChange(o.id)} disabled={disabled} className="sr-only" />
            {on && (
              <motion.span
                layoutId={`seg-${name}`}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-accent to-accent-2 shadow-[0_6px_16px_-8px_var(--accent)]"
                transition={reduce ? { duration: 0 } : SPRING}
                aria-hidden="true"
              />
            )}
            {Icon && <Icon size={16} weight={on ? 'fill' : 'regular'} className="relative" aria-hidden="true" />}
            <span className="relative">{o.label}</span>
          </label>
        )
      })}
    </div>
  )
}

// Protección tipo Glaze calculada en el backend contra el VAE de Stable Diffusion,
// comparada con una marca de agua visible usando las mismas métricas.
export default function ProtectionLab({ onProtected, onSigned, identity, setIdentity }) {
  const reduce = useReducedMotion()
  const inputRef = useRef(null)
  const ctrlRef = useRef(null)
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [strength, setStrength] = useState('media')
  const [text, setText] = useState('© Autor')
  const [opacity, setOpacity] = useState(35)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [variant, setVariant] = useState('cloak')
  const [view, setView] = useState('person')
  const [cloakBlob, setCloakBlob] = useState(null)
  // null mientras se consulta; false = el backend no calcula el cloak en vivo y se muestra el ejemplo precalculado.
  const [live, setLive] = useState(null)

  useEffect(() => {
    let cancelled = false
    const showExample = async () => {
      try {
        const res = await fetch('/examples/manifest.json')
        const example = await res.json()
        if (cancelled) return
        setOriginalUrl(example.original.image)
        setResult(example)
      } catch {
        if (!cancelled) setError('No se pudo cargar el ejemplo precalculado.')
      }
    }
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => d.live_cloak === true)
      .catch(() => false)
      .then((on) => {
        if (cancelled) return
        setLive(on)
        if (!on) showExample()
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loading) return undefined
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [loading])

  useEffect(() => () => ctrlRef.current?.abort(), [])

  const pick = (f) => {
    if (!f) return
    ctrlRef.current?.abort()
    setLoading(false)
    setResult(null)
    setCloakBlob(null)
    setError(null)
    setOriginalUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(f)
    })
    setFile(f)
  }

  const run = async () => {
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    setElapsed(0)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('strength', strength)
      body.append('watermark_text', text.trim() || '© Autor')
      body.append('watermark_opacity', opacity)
      const res = await fetch('/api/protect', { method: 'POST', body, signal: ctrl.signal })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.detail === 'string' ? data.detail : `El servidor respondió con un error (${res.status}).`)
      }
      // Se guardan los ajustes de la marca con el resultado: el texto puede cambiar después.
      const data = await res.json()
      setResult({ ...data, mark: { text: text.trim() || '© Autor', opacity } })
      // La versión protegida se guarda como archivo para poder firmarla después.
      setCloakBlob(await (await fetch(data.cloak.image)).blob())
      onProtected?.()
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(
        e.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
          : e.message,
      )
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false)
    }
  }

  const cancel = () => {
    ctrlRef.current?.abort()
    setLoading(false)
  }

  const s = result?.settings
  const picked = result?.[variant]
  const pickedLabel = VARIANTS.find((v) => v.id === variant).label
  const best = result && (result.cloak.model_similarity <= result.watermark.model_similarity ? 'cloak' : 'watermark')
  const markText = text.trim() || '© Autor'

  return (
    <div className="card overflow-hidden">
      {/* Cabecera */}
      <div className="hero-panel rounded-none px-6 py-8 sm:px-8">
        <div className="relative flex flex-wrap items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ctl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <ShieldCheck size={26} weight="fill" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Laboratorio de protección</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Perturbación contra marca de agua</h3>
            <p className="mt-2 max-w-[62ch] text-white/85">
              La perturbación hace como Glaze: busca cambios de píxel pequeños que confunden al codificador de Stable Diffusion,
              el mismo que usan muchos generadores de imágenes. La marca de agua, en cambio, se ve, pero el modelo la aprende
              sin problema. Aquí ves las dos con las mismas medidas.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8">
        {live === false && (
          <p className="rounded-ctl border border-accent/25 bg-accent/5 p-4 text-sm leading-relaxed">
            <span className="font-semibold">Ejemplo precalculado.</span>{' '}
            <span className="text-muted">
              Estos resultados se calcularon una vez, sin conexión, sobre una ilustración generada por el proyecto. Aquí no se
              ejecuta ningún modelo. Para probar con tu imagen, el servidor debe iniciarse con ENABLE_LIVE_CLOAK=1.
            </span>
          </p>
        )}
        {live && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Imagen elegida, con vista previa aproximada de la marca de agua */}
          <div>
            <div
              role="button"
              tabIndex={0}
              aria-label={file ? 'Cambiar la imagen a proteger' : 'Elegir una imagen para proteger'}
              aria-disabled={loading}
              onClick={() => !loading && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (!loading && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (!loading) pick(e.dataTransfer.files[0]) }}
              className={`group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-box border-2 border-dashed transition-colors duration-200 ${
                dragging ? 'border-accent bg-accent/10' : file ? 'border-transparent bg-raised' : 'border-line bg-raised/60 hover:border-accent/60'
              }`}
            >
              {originalUrl ? (
                <>
                  <img src={originalUrl} alt="Imagen elegida" className="absolute inset-0 h-full w-full object-contain" />
                  {/* Vista previa aproximada de la marca: la real la dibuja el servidor. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 grid grid-cols-3 place-items-center overflow-hidden"
                    style={{ opacity: opacity / 100 }}
                  >
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} className="-rotate-[24deg] whitespace-nowrap text-lg font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
                        {markText}
                      </span>
                    ))}
                  </div>
                  {!loading && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <UploadSimple size={14} aria-hidden="true" /> Cambiar imagen
                    </span>
                  )}
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-ink/45 text-white backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {!reduce && (
                          <span className="absolute inset-0 overflow-hidden" aria-hidden="true">
                            <span className="scan-line block h-full w-full bg-gradient-to-b from-transparent via-highlight/40 to-transparent" />
                          </span>
                        )}
                        <span className="num relative text-5xl font-bold tracking-tighter">{elapsed} s</span>
                        <span className="relative mt-1 text-sm text-white/85">Calculando la protección</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <motion.span
                    className="flex h-16 w-16 items-center justify-center rounded-ctl bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_12px_24px_-10px_var(--accent)]"
                    animate={reduce ? undefined : { y: [0, -5, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {dragging ? <ImageSquare size={30} weight="fill" aria-hidden="true" /> : <UploadSimple size={30} weight="bold" aria-hidden="true" />}
                  </motion.span>
                  <p className="text-lg font-bold tracking-tight">{dragging ? 'Suéltala aquí' : 'Arrastra o elige una imagen'}</p>
                  <p className="text-sm text-muted">Se borra del servidor al terminar</p>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,image/*"
              onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }}
            />
            {file && <p className="mt-2 text-xs text-muted">La marca que ves encima es una vista previa aproximada. La real la dibuja el servidor.</p>}
          </div>

          {/* Ajustes */}
          <div className={`flex flex-col gap-7 transition-opacity duration-300 ${file ? '' : 'pointer-events-none opacity-45'}`} aria-disabled={!file}>
            <fieldset disabled={loading || !file}>
              <legend className="flex items-center gap-2 font-semibold">
                <Sparkle size={18} weight="fill" className="text-accent" aria-hidden="true" /> Intensidad de la perturbación
              </legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {STRENGTHS.map((o) => {
                  const on = strength === o.id
                  return (
                    <label
                      key={o.id}
                      className={`relative cursor-pointer rounded-ctl border-2 p-3 text-sm transition-all duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                        on ? 'border-accent bg-accent/5' : 'border-line bg-white hover:-translate-y-0.5 hover:border-accent/40'
                      }`}
                    >
                      <input type="radio" name="strength" value={o.id} checked={on} onChange={() => setStrength(o.id)} className="sr-only" />
                      <span className="flex items-end gap-0.5" aria-hidden="true">
                        {[1, 2, 3].map((b) => (
                          <span
                            key={b}
                            className={`w-1.5 rounded-full transition-colors duration-300 ${b <= o.bars ? (on ? 'bg-accent' : 'bg-ink/30') : 'bg-line'}`}
                            style={{ height: 6 + b * 5 }}
                          />
                        ))}
                      </span>
                      <span className="mt-2 block font-semibold">{o.label}</span>
                      <span className="block text-xs text-muted">{o.hint}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <fieldset disabled={loading || !file} className="grid gap-4">
              <legend className="flex items-center gap-2 font-semibold">
                <Stamp size={18} weight="fill" className="text-accent" aria-hidden="true" /> Marca de agua para comparar
              </legend>
              <div className="mt-3">
                <label htmlFor="wm-text" className="text-sm font-medium text-muted">Texto</label>
                <input
                  id="wm-text" type="text" maxLength={40} value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="mt-1.5 w-full rounded-ctl border-2 border-line bg-white px-4 py-2.5 font-medium transition-colors focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="wm-opacity" className="flex items-center gap-1.5 text-sm font-medium text-muted">
                    <Drop size={14} weight="fill" aria-hidden="true" /> Opacidad
                  </label>
                  <output htmlFor="wm-opacity" className="num rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent">{opacity} %</output>
                </div>
                <input
                  id="wm-opacity" type="range" min={5} max={90} step={5} value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--accent)]"
                />
              </div>
            </fieldset>

            <div aria-live="polite">
              {loading ? (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-gradient-to-r from-accent via-accent-2 to-highlight"
                      animate={reduce ? undefined : { x: ['-100%', '300%'] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="num text-sm text-muted">
                      Calculando, {elapsed} s. Suele tardar entre 30 s y 1 min; la primera vez, más.
                    </span>
                    <button type="button" className="btn btn-outline bg-white" onClick={cancel}>
                      <X size={16} aria-hidden="true" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-primary group w-full py-4 text-base font-semibold" onClick={run} disabled={!file}>
                  <ShieldCheck size={20} weight="fill" aria-hidden="true" className="transition-transform duration-300 group-hover:scale-110" />
                  {result ? 'Volver a calcular' : 'Proteger y comparar'}
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {error && (
          <motion.p
            role="alert"
            className="mt-6 rounded-ctl border border-risk-high/40 bg-risk-high/5 p-4 text-sm text-risk-high"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }}
            transition={{ duration: 0.4 }}
          >
            {error}
          </motion.p>
        )}

        {/* Resultados */}
        <AnimatePresence>
          {result && (
            <motion.div
              key={s.seconds + result.mark.text}
              className={`mt-12 border-t border-line pt-10 transition-opacity ${loading ? 'opacity-50' : ''}`}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <h4 className="text-2xl font-bold tracking-tight sm:text-3xl">
                El <span className="marker">resultado</span>
              </h4>
              <p className="mt-3 max-w-[65ch] text-lg text-ink/85">
                Con la perturbación, una persona ve la imagen un <strong>{pct(result.cloak.human_similarity)}</strong> igual,
                pero el modelo solo un <strong>{pct(result.cloak.model_similarity)}</strong>. Con la marca de agua, la persona
                la ve un <strong>{pct(result.watermark.human_similarity)}</strong> igual y el modelo
                un <strong>{pct(result.watermark.model_similarity)}</strong>.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <ScoreCard
                  variant={VARIANTS[0]} data={result.cloak} best={best === 'cloak'} download="imagen-protegida.png"
                  subtitle={`Intensidad ${s.strength}, hasta ±${s.epsilon} niveles por píxel`}
                />
                <ScoreCard
                  variant={VARIANTS[1]} data={result.watermark} best={best === 'watermark'} download="imagen-marca-de-agua.png"
                  subtitle={`"${result.mark.text}" al ${result.mark.opacity} %`}
                />
              </div>

              {/* Comparador interactivo */}
              <div className="mt-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h5 className="text-lg font-bold tracking-tight">Compara con el original</h5>
                  <Segmented name="variant" label="Versión a comparar" options={VARIANTS} value={variant} onChange={setVariant} />
                </div>
                <div className="mt-3">
                  <Segmented name="view" label="Qué mostrar" options={VIEWS} value={view} onChange={setView} />
                </div>
                <div className="mt-5">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={variant + view}
                      initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      <CompareSlider
                        before={view === 'person' ? originalUrl : result.original.model_view}
                        after={view === 'person' ? picked.image : picked.model_view}
                        beforeLabel="Original"
                        afterLabel={pickedLabel}
                      />
                    </motion.div>
                  </AnimatePresence>
                  <p className="mt-2 text-sm text-muted">
                    {view === 'person'
                      ? 'Arrastra el divisor. Para una persona, la perturbación casi no se nota.'
                      : 'Así reconstruye la imagen el codificador de Stable Diffusion. Cuanto más se aleje del original, mejor protege.'}
                  </p>
                </div>

                <h5 className="mt-10 text-lg font-bold tracking-tight">Qué píxeles cambiaron</h5>
                <p className="mt-1 text-sm text-muted">Diferencia con el original, amplificada ocho veces.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {VARIANTS.map((v) => (
                    <figure key={v.id} className="group overflow-hidden rounded-box bg-ink">
                      <img
                        src={result[v.id].difference}
                        alt={`${v.label}: píxeles modificados, amplificados ocho veces`}
                        className="block w-full transition-transform duration-500 group-hover:scale-105"
                      />
                      <figcaption className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white">
                        <v.icon size={16} weight="fill" aria-hidden="true" /> {v.label}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              {cloakBlob && (
                <div className="mt-12">
                  <MetadataSigner
                    file={cloakBlob}
                    filename="imagen-protegida.png"
                    identity={identity}
                    setIdentity={setIdentity}
                    beforeScore={100}
                    onSigned={onSigned}
                    title="Último paso: firma la versión protegida"
                    intro="La perturbación devuelve la imagen sin metadatos. Vuelve a escribir tu autoría y la exclusión de IA en la versión protegida: es la que deberías publicar."
                  />
                </div>
              )}

              <div className="mt-12 grid gap-4 md:grid-cols-2">
                <div className="rounded-box bg-accent/5 p-5 ring-1 ring-accent/15">
                  <p className="font-semibold">Cómo leerlo</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    El parecido es el índice SSIM, de 0 a 100 %. Una buena protección baja mucho el parecido para el modelo y
                    casi nada el parecido para una persona. La recompresión JPEG al {s.jpeg_quality} % imita lo que hace una red
                    social al publicar.
                  </p>
                </div>
                <div className="rounded-box bg-risk-mid/5 p-5 ring-1 ring-risk-mid/20">
                  <p className="font-semibold">Sus límites</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Es una versión simplificada de Glaze: protege frente a este codificador concreto, no frente a cualquier
                    modelo, y un recorte, un reescalado fuerte o un filtro pueden debilitarla. La marca de agua es fácil de ver
                    y de reclamar, pero también de borrar con herramientas de relleno. Descarga siempre el PNG: guardarlo como
                    JPEG con baja calidad reduce la protección.
                  </p>
                </div>
              </div>
              <p className="num mt-4 text-xs text-muted">
                Calculado en {s.seconds} s ({s.device}) con {s.steps} pasos a {s.work_size[0]}×{s.work_size[1]} px. Imagen
                devuelta a {s.output_size[0]}×{s.output_size[1]} px y sin metadatos: vuelve a añadir tu autoría (capa 1) antes de publicarla.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
