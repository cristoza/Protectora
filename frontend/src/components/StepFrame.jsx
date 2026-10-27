import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowRight } from '@phosphor-icons/react'
import { LAYER_STEPS } from '../data/layers.js'
import { EASE, useStagger } from '../lib/motion.js'

// Cabecera común de cada capa: banner de color con el número de capa, título, bajada
// y el bloque "viene de / lleva a" que la conecta con sus vecinas. Todo entra en cascada.
export default function StepFrame({ step, children }) {
  const { list, item } = useStagger()
  const reduce = useReducedMotion()
  return (
    <motion.section aria-labelledby="step-title" {...list}>
      <motion.div {...item} className="hero-panel px-6 py-10 sm:px-10 sm:py-12">
        {step.layer && (
          <motion.span
            aria-hidden="true"
            className="num pointer-events-none absolute -right-4 -top-10 select-none text-[13rem] font-bold leading-none tracking-tighter text-white/10 sm:text-[17rem]"
            initial={reduce ? false : { opacity: 0, y: 40, rotate: 8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          >
            {step.layer}
          </motion.span>
        )}
        <div className="relative">
          {step.layer && (
            <div className="flex items-center gap-3">
              <p className="num rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ring-white/25 backdrop-blur">
                Capa {step.layer} de {LAYER_STEPS.length}
              </p>
              <span className="flex gap-1" aria-hidden="true">
                {LAYER_STEPS.map((s) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-500 ${s.layer === step.layer ? 'w-7 bg-highlight' : s.layer < step.layer ? 'w-2.5 bg-white/80' : 'w-2.5 bg-white/25'}`}
                  />
                ))}
              </span>
            </div>
          )}
          <h2
            id="step-title"
            tabIndex={-1}
            className="mt-5 max-w-[20ch] text-4xl font-bold leading-[1.02] tracking-tighter outline-none sm:text-6xl"
          >
            {step.title}
          </h2>
          {step.lead && <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-white/85">{step.lead}</p>}

          {step.receives && (
            <dl className="mt-8 grid items-stretch gap-3 text-sm sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-ctl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Viene de</dt>
                <dd className="mt-1.5 text-white">{step.receives}</dd>
              </div>
              <div className="flex items-center justify-center text-highlight" aria-hidden="true">
                <ArrowRight size={20} weight="bold" className="hidden sm:block" />
                <ArrowDown size={20} weight="bold" className="sm:hidden" />
              </div>
              <div className="rounded-ctl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Lleva a</dt>
                <dd className="mt-1.5 text-white">{step.passes}</dd>
              </div>
            </dl>
          )}
        </div>
      </motion.div>

      <motion.div {...item} className="mt-12">
        {children}
      </motion.div>
    </motion.section>
  )
}
