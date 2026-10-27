import { motion } from 'motion/react'
import { ArrowRight, Info, Warning, WarningOctagon } from '@phosphor-icons/react'
import StepFrame from '../StepFrame.jsx'
import CheckCard from '../CheckCard.jsx'
import { useStagger } from '../../lib/motion.js'
import { stepById } from '../../data/layers.js'

const SEVERITY = {
  alta: { label: 'Importante', icon: WarningOctagon, className: 'text-risk-high' },
  media: { label: 'Recomendado', icon: Warning, className: 'text-risk-mid' },
  info: { label: 'Para tener en cuenta', icon: Info, className: 'text-muted' },
}

// Asistente de Publicación Segura: las recomendaciones salen del reporte de auditoría del archivo
// vigente (reglas en backend/core/publication_rules.json). La persona las marca como hechas.
export default function PublishStep({ publication, checks, setChecks, goTo }) {
  const { list, item } = useStagger(0.07)
  const { advice, loading, error } = publication
  const recs = advice?.recommendations ?? []
  const done = recs.filter((r) => checks[r.id]).length

  return (
    <StepFrame step={stepById('publicacion')}>
      {!advice && !loading && !error && (
        <div className="card max-w-xl p-6">
          <p className="font-semibold">Primero sube tu imagen en la capa 1</p>
          <p className="mt-1 text-sm text-muted">
            El asistente revisa tu archivo y te dice qué conviene hacer antes de publicarlo.
          </p>
          <button type="button" className="btn btn-outline mt-4" onClick={() => goTo('metadatos')}>
            Ir a la capa 1 <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {loading && <p className="text-muted" aria-live="polite">Revisando tu archivo...</p>}
      {error && <p role="alert" className="text-sm text-risk-high">{error}</p>}

      {advice && (
        <fieldset>
          <legend className="text-lg font-semibold">Antes de subir «{advice.filename}»</legend>
          <div className="mt-3 flex max-w-xl items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised" aria-hidden="true">
              <motion.div
                className="h-full origin-left rounded-full bg-accent"
                initial={false}
                animate={{ scaleX: recs.length ? done / recs.length : 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              />
            </div>
            <p className="num text-sm text-muted" aria-live="polite">
              {done} de {recs.length}
            </p>
          </div>
          <motion.ul {...list} className="mt-5 max-w-2xl space-y-3">
            {recs.map((r) => {
              const sev = SEVERITY[r.severity] ?? SEVERITY.info
              const Icon = sev.icon
              return (
                <motion.li key={r.id} {...item}>
                  <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${sev.className}`}>
                    <Icon size={14} weight="fill" aria-hidden="true" /> {sev.label}
                  </p>
                  <CheckCard
                    checked={Boolean(checks[r.id])}
                    onChange={(v) => setChecks({ ...checks, [r.id]: v })}
                    title={r.title}
                    hint={r.detail}
                  />
                  {r.action && (
                    <button type="button" className="btn btn-quiet group mt-1 px-0 py-2 text-accent" onClick={() => goTo(r.action.step)}>
                      {r.action.label}
                      <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  )}
                </motion.li>
              )
            })}
          </motion.ul>
          <p className="mt-6 max-w-[60ch] text-sm text-muted">
            Las recomendaciones salen de la auditoría de tu archivo{advice.jpeg_quality ? ` (JPEG de calidad aproximada ${advice.jpeg_quality})` : ''}.
            Si lo firmas, se recalculan. Marcarlas como hechas es tu declaración: lo que hagas fuera de la app no se puede comprobar desde aquí.
          </p>
        </fieldset>
      )}
    </StepFrame>
  )
}
