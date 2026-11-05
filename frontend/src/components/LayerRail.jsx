import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { STEPS, STATUS_LABEL, getStatus } from '../data/layers.js'
import { SPRING } from '../lib/motion.js'

const BADGE = {
  done: <CheckCircle size={16} weight="fill" className="text-risk-low" aria-hidden="true" />,
  missing: <WarningCircle size={16} weight="fill" className="text-risk-mid" aria-hidden="true" />,
}

// Mapa permanente en forma de stepper horizontal. La píldora del paso activo se desliza
// entre botones y la barra inferior se llena hasta el paso actual. En móvil se desplaza.
export default function LayerRail({ current, onSelect, state }) {
  const reduce = useReducedMotion()
  const spring = reduce ? { duration: 0 } : SPRING
  return (
    <nav aria-label="Capas de protección" className="relative">
      <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 py-2 sm:mx-0 sm:justify-between sm:px-0">
        {STEPS.map((s, i) => {
          const status = getStatus(s.id, state)
          const active = i === current
          const passed = i < current
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                title={s.title}
                aria-current={active ? 'step' : undefined}
                className={`group relative flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-colors duration-200 ${
                  active ? 'text-white' : 'text-ink/70 hover:bg-white hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-accent to-accent-2 shadow-[0_8px_20px_-8px_var(--accent)]"
                    transition={spring}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`num relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300 ${
                    active ? 'bg-white text-accent' : passed ? 'bg-accent text-white' : 'bg-white text-muted ring-1 ring-line'
                  }`}
                >
                  {s.layer ?? s.badge}
                </span>
                {/* Los pasos sin capa (mapa, conceptos, resumen) solo muestran su letra si no están activos, para que quepa todo el riel. */}
                <span className={`relative whitespace-nowrap ${!s.layer && !active ? 'sr-only' : ''}`}>{s.short}</span>
                {status && BADGE[status] && (
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={status}
                      initial={reduce ? false : { scale: 0.3, opacity: 0, rotate: -30 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={reduce ? undefined : { scale: 0.3, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      className={`relative flex rounded-full ${active ? 'bg-white' : ''}`}
                    >
                      {BADGE[status]}
                    </motion.span>
                  </AnimatePresence>
                )}
                {status && <span className="sr-only">{STATUS_LABEL[status]}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
