import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react'
import { EASE, useStagger } from '../../lib/motion.js'
import { LAYER_STEPS, STATUS_LABEL, getStatus } from '../../data/layers.js'

const ICON = {
  done: <CheckCircle size={22} weight="fill" className="text-risk-low" aria-hidden="true" />,
  missing: <WarningCircle size={22} weight="fill" className="text-risk-mid" aria-hidden="true" />,
  pending: <Circle size={22} className="text-muted" aria-hidden="true" />,
}

export default function SummaryStep({ state, goTo, onEvaluate }) {
  const statuses = LAYER_STEPS.map((s) => getStatus(s.id, state))
  const done = statuses.filter((s) => s === 'done').length
  const reduce = useReducedMotion()
  const { list, item } = useStagger(0.09)
  return (
    <motion.section aria-labelledby="step-title" {...list}>
      <div className="hero-panel flex flex-col gap-8 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
        <motion.div {...item} className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="12" />
            {LAYER_STEPS.map((s, i) => (
              <motion.circle
                key={s.id}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={statuses[i] === 'done' ? 'var(--highlight)' : statuses[i] === 'missing' ? '#ffb547' : 'transparent'}
                strokeWidth="12"
                pathLength={1}
                strokeDasharray="0.23 0.77"
                strokeDashoffset={-i * 0.25 - 0.01}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5, ease: EASE }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col text-white items-center justify-center">
            <span className="num text-4xl font-semibold tracking-tighter">{done}</span>
            <span className="text-xs text-white/70">de {LAYER_STEPS.length}</span>
          </div>
        </motion.div>
        <div className="relative">
          <motion.h2 {...item} id="step-title" tabIndex={-1} className="text-4xl font-bold tracking-tighter outline-none sm:text-6xl">
            Resumen de tus capas
          </motion.h2>
          <motion.p {...item} className="num mt-3 text-lg text-white/85">
            {done === LAYER_STEPS.length ? 'Todas tus capas están listas.' : `${done} de ${LAYER_STEPS.length} capas listas`}
          </motion.p>
        </div>
      </div>
      <motion.ul {...list} className="mt-10 grid max-w-2xl gap-3">
        {LAYER_STEPS.map((s, i) => (
          <motion.li key={s.id} {...item} className="card flex items-center gap-4 p-4">
            {ICON[statuses[i]]}
            <div className="min-w-0">
              <p className="font-medium">Capa {s.layer}: {s.title}</p>
              <p className="text-sm text-muted">{STATUS_LABEL[statuses[i]]}</p>
            </div>
            <button type="button" className="btn btn-quiet group ml-auto" onClick={() => goTo(s.id)}>
              Revisar
              <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </motion.li>
        ))}
      </motion.ul>
      <motion.p {...item} className="mt-8 max-w-[60ch] text-sm leading-relaxed text-muted">
        Las capas 1 y 2 salen de tu archivo. Las capas 3 y 4 las marcas tú. Ningún conjunto de capas garantiza que una imagen no se use.
      </motion.p>
      <motion.div {...item} className="card mt-8 max-w-2xl p-6">
        <h3 className="text-lg font-semibold">¿Nos ayudas a mejorar?</h3>
        <p className="mt-1 text-sm text-muted">Una evaluación anónima de 5 minutos sobre la facilidad de uso y lo que aprendiste.</p>
        <button type="button" className="btn btn-primary mt-4" onClick={onEvaluate}>
          Participar en la evaluación <ArrowRight size={16} aria-hidden="true" />
        </button>
      </motion.div>
    </motion.section>
  )
}
