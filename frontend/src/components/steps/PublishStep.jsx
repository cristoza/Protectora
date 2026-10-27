import { motion } from 'motion/react'
import StepFrame from '../StepFrame.jsx'
import CheckCard from '../CheckCard.jsx'
import { useStagger } from '../../lib/motion.js'
import { PUBLISH_CHECKS, stepById } from '../../data/layers.js'

export default function PublishStep({ checks, setChecks, goTo }) {
  const { list, item } = useStagger(0.07)
  const done = PUBLISH_CHECKS.filter((c) => checks[c.id]).length
  return (
    <StepFrame step={stepById('publicacion')}>
      <fieldset>
        <legend className="text-lg font-semibold">Antes de subirla</legend>
        <div className="mt-3 flex max-w-xl items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised" aria-hidden="true">
            <motion.div
              className="h-full origin-left rounded-full bg-accent"
              initial={false}
              animate={{ scaleX: done / PUBLISH_CHECKS.length }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          </div>
          <p className="num text-sm text-muted" aria-live="polite">
            {done} de {PUBLISH_CHECKS.length}
          </p>
        </div>
        <motion.div {...list} className="mt-5 max-w-xl space-y-3">
          {PUBLISH_CHECKS.map((c) => (
            <motion.div key={c.id} {...item}>
              <CheckCard
                checked={Boolean(checks[c.id])}
                onChange={(v) => setChecks({ ...checks, [c.id]: v })}
                title={c.label}
              />
            </motion.div>
          ))}
        </motion.div>
      </fieldset>
      <p className="mt-8 max-w-[60ch] text-sm leading-relaxed text-muted">
        Algunas plataformas borran los metadatos al subir una imagen. La única forma de saberlo es descargarla ya publicada y auditarla en la{' '}
        <button type="button" onClick={() => goTo('metadatos')} className="font-medium text-accent underline underline-offset-4">
          capa 1
        </button>
        .
      </p>
    </StepFrame>
  )
}
