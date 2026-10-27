import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CheckCircle, Copyright, Eye, HandPointing, MapPinLine, ProhibitInset, ShareNetwork, Tag, UserCircle } from '@phosphor-icons/react'
import { LAYER_STEPS } from '../../data/layers.js'
import { EASE, spotlight, useStagger } from '../../lib/motion.js'

const LAYER_ICON = { 1: UserCircle, 2: ProhibitInset, 3: Eye, 4: ShareNetwork }

const CHIPS = [
  { icon: UserCircle, label: 'Autor', tone: 'text-risk-low', pos: 'left-[-1.5rem] top-10', delay: 0.9 },
  { icon: Copyright, label: 'Copyright', tone: 'text-risk-low', pos: 'right-[-1.75rem] top-24', delay: 1.1 },
  { icon: Tag, label: 'noai', tone: 'text-accent', pos: 'left-[-2rem] bottom-16', delay: 1.3, mono: true },
  { icon: MapPinLine, label: 'GPS expuesto', tone: 'text-risk-mid', pos: 'right-[-1rem] bottom-6', delay: 1.5 },
]

// Ilustración: una foto que se escanea mientras aparecen los metadatos que se leen de ella.
function ScanMockup() {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto w-full max-w-[19rem]" aria-hidden="true">
      <motion.div
        className="relative overflow-hidden rounded-[1.25rem] bg-white p-2.5 shadow-[0_30px_60px_-20px_rgb(10_20_80/0.6)]"
        initial={reduce ? false : { opacity: 0, y: 30, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
      >
        <svg viewBox="0 0 280 210" className="block w-full rounded-[0.9rem]">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb36b" />
              <stop offset="0.55" stopColor="#ff7a8a" />
              <stop offset="1" stopColor="#7a5cff" />
            </linearGradient>
          </defs>
          <rect width="280" height="210" fill="url(#sky)" />
          <circle cx="196" cy="78" r="30" fill="#fff4c2" />
          <path d="M0 150 L70 92 L120 135 L170 88 L280 160 V210 H0 Z" fill="#3b2a8c" />
          <path d="M0 175 L60 140 L130 178 L200 132 L280 180 V210 H0 Z" fill="#1d1450" />
        </svg>
        {!reduce && (
          <motion.div
            className="absolute inset-x-2.5 top-2.5 h-14 bg-gradient-to-b from-transparent via-highlight/70 to-transparent mix-blend-screen"
            animate={{ y: [0, 150, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className="flex items-center justify-between px-1.5 pb-0.5 pt-2.5 text-xs">
          <span className="font-mono text-ink/70">atardecer.jpg</span>
          <span className="num rounded-full bg-risk-low/10 px-2 py-0.5 font-semibold text-risk-low">Riesgo bajo</span>
        </div>
      </motion.div>

      {CHIPS.map(({ icon: Icon, label, tone, pos, delay, mono }, i) => (
        <motion.div
          key={label}
          className={`absolute ${pos} flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-[0_12px_28px_-10px_rgb(10_20_80/0.55)]`}
          initial={reduce ? false : { opacity: 0, scale: 0.6, y: 10 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { delay, duration: 0.3 },
            scale: { delay, type: 'spring', stiffness: 300, damping: 15 },
            y: { delay: delay + 0.4, duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <Icon size={15} weight="fill" className={tone} />
          <span className={mono ? 'font-mono' : ''}>{label}</span>
        </motion.div>
      ))}
    </div>
  )
}

export default function OverviewStep({ onStart, onSelect }) {
  const { list, item } = useStagger(0.08)
  return (
    <motion.section aria-labelledby="step-title" {...list}>
      <motion.div {...item} className="hero-panel grid items-center gap-12 px-6 py-12 sm:px-12 sm:py-16 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-highlight" aria-hidden="true" />
            Tu imagen no se guarda en el servidor
          </p>
          <h2
            id="step-title"
            tabIndex={-1}
            className="mt-6 max-w-[14ch] text-5xl font-bold leading-[0.98] tracking-tighter outline-none sm:text-7xl"
          >
            Protege tu imagen en <span className="text-highlight">cuatro capas</span>
          </h2>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/85">
            Ninguna capa basta sola. Esta guía las recorre en orden y puedes volver a cualquiera cuando quieras.
          </p>
          <button type="button" className="btn btn-light group mt-9 px-7 py-4 text-base font-semibold" onClick={onStart}>
            Empezar por la capa 1
            <ArrowRight size={18} weight="bold" aria-hidden="true" className="text-accent transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
        <div className="relative px-9">
          <ScanMockup />
        </div>
      </motion.div>

      <motion.div {...item} className="mt-16 flex flex-wrap items-end justify-between gap-4">
        <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Las <span className="marker">cuatro capas</span>
        </h3>
        <p className="max-w-[40ch] text-muted">Elige cualquiera para ir directo, o sigue el orden desde la capa 1.</p>
      </motion.div>

      <motion.ol {...list} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LAYER_STEPS.map((s) => {
          const verified = s.layer <= 2
          const Icon = LAYER_ICON[s.layer]
          return (
            <motion.li key={s.id} {...item}>
              <motion.button
                type="button"
                onClick={() => onSelect(s.layer)}
                onPointerMove={spotlight}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="card spotlight group flex h-full w-full flex-col p-6 text-left"
              >
                <span className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-ctl bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_10px_20px_-8px_var(--accent)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon size={24} weight="fill" aria-hidden="true" />
                  </span>
                  <span className="num text-4xl font-bold tracking-tighter text-line transition-colors duration-300 group-hover:text-accent/25">
                    0{s.layer}
                  </span>
                </span>
                <span className="mt-6 block text-lg font-bold leading-snug tracking-tight">{s.title}</span>
                <span className="mt-2 block flex-1 text-sm leading-relaxed text-muted">{s.lead}</span>
                <span className={`mt-5 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold ${verified ? 'bg-risk-low/10 text-risk-low' : 'bg-raised text-muted'}`}>
                  {verified ? <CheckCircle size={14} weight="fill" aria-hidden="true" /> : <HandPointing size={14} aria-hidden="true" />}
                  {verified ? 'Se comprueba en tu archivo' : 'Guía, no se comprueba aquí'}
                </span>
              </motion.button>
            </motion.li>
          )
        })}
      </motion.ol>
    </motion.section>
  )
}
