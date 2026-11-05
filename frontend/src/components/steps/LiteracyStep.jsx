import { motion } from 'motion/react'
import { ArrowRight, ArrowsIn, Prohibit, Robot, SealCheck, Shield, Sparkle, Stamp } from '@phosphor-icons/react'
import StepFrame from '../StepFrame.jsx'
import CompareSlider from '../CompareSlider.jsx'
import { useStagger } from '../../lib/motion.js'
import { LITERACY } from '../../data/literacy.js'
import { stepById } from '../../data/layers.js'

const ICONS = { ArrowsIn, Prohibit, Robot, SealCheck, Shield, Sparkle, Stamp }

export default function LiteracyStep({ goTo }) {
  const { list, item } = useStagger(0.06)
  return (
    <StepFrame step={stepById('aprende')}>
      <motion.ol {...list} className="grid gap-4 md:grid-cols-2">
        {LITERACY.map((c, i) => {
          const Icon = ICONS[c.icon]
          return (
            <motion.li key={c.id} {...item} className="card flex flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-accent/10 text-accent">
                  <Icon size={22} weight="duotone" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold tracking-tight">
                  <span className="num mr-1.5 text-muted">{i + 1}.</span>{c.title}
                </h3>
              </div>
              <p className="mt-3 leading-relaxed text-ink/85">{c.body}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                <span className="marker font-medium text-ink">En corto:</span> {c.takeaway}
              </p>
              {c.goTo && (
                <button type="button" className="btn btn-quiet group mt-auto self-start px-0 pt-4" onClick={() => goTo(c.goTo)}>
                  Ponerlo en práctica en «{stepById(c.goTo).title}»
                  <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              )}
            </motion.li>
          )
        })}
      </motion.ol>

      <div className="mt-12">
        <h3 className="text-2xl font-bold tracking-tight">Compáralo tú</h3>
        <p className="mt-2 max-w-[60ch] text-muted">
          La misma ilustración con perturbación, con marca de agua y después de pasar por una plataforma. Arrastra el divisor.
        </p>
        <div className="mt-5">
          <CompareSlider />
        </div>
      </div>
    </StepFrame>
  )
}
