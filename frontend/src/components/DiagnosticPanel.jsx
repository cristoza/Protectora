import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { MapPin, SealCheck, SealWarning, Seal } from '@phosphor-icons/react'
import { EASE, useStagger } from '../lib/motion.js'

const RISK = {
  alto: { label: 'Riesgo alto', tone: 'text-risk-high', bar: 'bg-risk-high', color: 'var(--risk-high)', msg: 'Tu imagen casi no dice quién es su autora ni que no debe usarse para entrenar IA.' },
  medio: { label: 'Riesgo medio', tone: 'text-risk-mid', bar: 'bg-risk-mid', color: 'var(--risk-mid)', msg: 'Tu imagen tiene algunas señales de autoría, pero faltan declaraciones importantes.' },
  bajo: { label: 'Riesgo bajo', tone: 'text-risk-low', bar: 'bg-risk-low', color: 'var(--risk-low)', msg: 'Tu imagen declara autoría o exclusión de IA. Son solicitudes, no barreras técnicas.' },
}

const CATEGORY = {
  exclusion: 'Exclusión de IA',
  author: 'Autoría',
  copyright: 'Copyright',
  privacy: 'Ubicación',
  info: 'Dato técnico',
}

const ORDER = ['exclusion', 'author', 'copyright', 'privacy', 'info']

// Medidor circular: el arco y el número suben juntos desde 0 hasta la puntuación.
function Gauge({ score, color }) {
  const reduce = useReducedMotion()
  const value = useMotionValue(reduce ? score : 0)
  const shown = useTransform(value, (v) => Math.round(v))
  const length = useTransform(value, (v) => v / 100)
  useEffect(() => {
    if (reduce) {
      value.set(score)
      return
    }
    const controls = animate(value, score, { duration: 1.4, ease: EASE })
    return () => controls.stop()
  }, [score, reduce, value])
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--raised)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          style={{ pathLength: length, filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="num text-5xl font-semibold tracking-tighter" style={{ color }}>{shown}</motion.span>
        <span className="text-xs text-muted">de 100</span>
      </div>
    </div>
  )
}

function Stat({ label, value, ok, item }) {
  const tone = ok === undefined ? '' : ok ? 'text-risk-low' : 'text-risk-high'
  return (
    <motion.div {...item} className="card p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num mt-1 text-2xl font-semibold tracking-tight ${tone}`}>{value}</dd>
    </motion.div>
  )
}

function C2paCard({ c }) {
  if (!c || !c.present) {
    return (
      <div className="card flex items-start gap-3 p-5">
        <Seal size={24} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">Credenciales de contenido (C2PA)</h3>
          <p className="mt-1 max-w-[60ch] text-sm text-muted">
            Este archivo no trae una firma digital de procedencia. Eso es lo habitual: la mayoría de imágenes no la tienen.
            Si la tuviera, serviría como prueba técnica de quién la creó y con qué herramienta.
          </p>
        </div>
      </div>
    )
  }
  const Icon = c.valid ? SealCheck : SealWarning
  const tone = c.valid ? 'text-risk-low' : 'text-risk-high'
  return (
    <div className="card flex items-start gap-3 p-5">
      <Icon size={24} weight="fill" className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
      <div>
        <h3 className="font-semibold">Credenciales de contenido (C2PA)</h3>
        <p className={`mt-1 font-medium ${tone}`}>
          {c.valid ? 'Firma de procedencia válida' : 'Hay una firma de procedencia, pero no se pudo verificar'}
        </p>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          {c.valid
            ? 'El archivo conserva una firma criptográfica y no se ha modificado desde que se firmó.'
            : 'La firma está dañada o el archivo cambió después de firmarse, así que no sirve como prueba.'}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {c.issuer && <li>Firmada por: <span className="text-ink">{c.issuer}</span></li>}
          {c.generator && <li>Creada con: <span className="text-ink">{c.generator}</span></li>}
          {c.ai_generated && <li className="text-risk-mid">El manifiesto indica que fue generada con IA.</li>}
          {!c.valid && c.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </div>
    </div>
  )
}

function actions(r) {
  const out = []
  if (!r.has_author) out.push('Escribe tu nombre en el campo de autor (EXIF Artist o IPTC By-line).')
  if (!r.has_copyright) out.push('Añade un aviso de copyright con tu nombre y el año.')
  if (r.exclusion_tags.length === 0) out.push('Declara que no autorizas el entrenamiento de IA (por ejemplo, la etiqueta noai en XMP).')
  if (r.has_gps) out.push('Elimina los datos de ubicación GPS antes de publicar.')
  return out
}

export default function DiagnosticPanel({ result: r }) {
  const risk = RISK[r.risk_level]
  const yn = (b) => (b ? 'Sí' : 'No')
  const sorted = [...r.findings].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category))
  const key = sorted.filter((f) => f.category !== 'info')
  const technical = sorted.filter((f) => f.category === 'info')
  const todo = actions(r)
  const { list, item } = useStagger(0.08)
  const reduce = useReducedMotion()

  return (
    <motion.div key={`${r.filename}-${r.vulnerability_score}`} className="mt-8 space-y-8" aria-live="polite" {...list}>
      <motion.div {...item} className="card relative overflow-hidden p-6 sm:p-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: risk.color }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Gauge score={r.vulnerability_score} color={risk.color} />
          <div className="min-w-0">
            <p className="text-sm text-muted">Vulnerabilidad de <span className="break-all text-ink">{r.filename}</span></p>
            <p className={`mt-1 inline-flex items-center gap-2 text-2xl font-semibold tracking-tight ${risk.tone}`}>
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${risk.bar}`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${risk.bar}`} />
              </span>
              {risk.label}
            </p>
            <p className="mt-3 max-w-[60ch] text-ink/90">{risk.msg}</p>
            <p className="mt-1 max-w-[60ch] text-sm text-muted">
              100 significa que no hay ninguna señal de autoría o protección. Cada señal encontrada resta puntos.
            </p>
          </div>
        </div>
        {r.score_breakdown.length > 0 && (
          <ul className="relative mt-6 space-y-1.5 border-t border-line/70 pt-5 text-sm text-muted">
            {r.score_breakdown.map((b, i) => (
              <motion.li
                key={b.reason}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.4, ease: EASE }}
              >
                <span className="num mr-2 inline-block w-8 font-mono text-ink">{b.points}</span>
                {b.reason}
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>

      <motion.dl {...list} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat item={item} label="Campos encontrados" value={r.stats.total_fields} />
        <Stat item={item} label="Autoría declarada" value={yn(r.has_author)} ok={r.has_author} />
        <Stat item={item} label="Copyright declarado" value={yn(r.has_copyright)} ok={r.has_copyright} />
        <Stat item={item} label="Etiqueta contra IA" value={yn(r.exclusion_tags.length > 0)} ok={r.exclusion_tags.length > 0} />
      </motion.dl>

      <motion.div {...item}>
        <C2paCard c={r.c2pa} />
      </motion.div>

      {r.has_gps && (
        <motion.p {...item} className="flex items-start gap-3 rounded-ctl border border-risk-mid/50 bg-risk-mid/5 p-4 text-sm">
          <MapPin size={20} weight="fill" className="mt-0.5 shrink-0 text-risk-mid" aria-hidden="true" />
          <span>Esta imagen incluye datos de ubicación. Quien la descargue podría saber dónde se tomó.</span>
        </motion.p>
      )}

      {todo.length > 0 && (
        <motion.div {...item}>
          <h3 className="text-lg font-semibold">Qué puedes mejorar</h3>
          <ul className="mt-3 max-w-[60ch] list-disc space-y-2 pl-5 text-muted marker:text-accent">
            {todo.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </motion.div>
      )}

      <motion.div {...item}>
        <h3 className="text-lg font-semibold">Lo que dice tu archivo</h3>
        <p className="mt-1 text-sm text-muted num">
          {r.format}, {r.dimensions.width} x {r.dimensions.height} px
        </p>
        {key.length === 0 ? (
          <p className="mt-3 text-muted">No hay metadatos de autoría, copyright ni exclusión. El archivo no dice nada sobre quién lo hizo.</p>
        ) : (
          <FindingsTable rows={key} className="mt-3" />
        )}
        {technical.length > 0 && (
          <details className="group mt-4">
            <summary className="cursor-pointer text-sm font-medium text-accent">
              Ver {technical.length} {technical.length === 1 ? 'dato técnico' : 'datos técnicos'}
            </summary>
            <FindingsTable rows={technical} className="mt-3" />
          </details>
        )}
      </motion.div>
    </motion.div>
  )
}

function FindingsTable({ rows, className = '' }) {
  return (
    <div className={`card overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th scope="col" className="p-3 font-medium">Tipo</th>
            <th scope="col" className="p-3 font-medium">Campo</th>
            <th scope="col" className="p-3 font-medium">Valor</th>
            <th scope="col" className="p-3 font-medium">Origen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => (
            <tr key={`${f.source}-${f.key}-${i}`} className="border-t border-line align-top transition-colors duration-150 hover:bg-raised/60">
              <td className="whitespace-nowrap p-3">{CATEGORY[f.category] || CATEGORY.info}</td>
              <td className="p-3 font-mono text-xs">{f.key}</td>
              <td className="max-w-xs break-words p-3">{f.value}</td>
              <td className="p-3 text-muted">{f.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
