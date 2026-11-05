import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, CheckCircle, Circle, Info } from '@phosphor-icons/react'
import { useStagger } from '../lib/motion.js'
import { STEPS } from '../data/layers.js'
import { AREAS, EVALUATION_DIMENSIONS, OBJECTIVES, PHASES, RIGOR, STEP_ROLES, objectivesForStep } from '../data/addie.js'

const STATUS = {
  hecho: { label: 'Hecho', className: 'bg-risk-low/10 text-risk-low' },
  parcial: { label: 'En curso', className: 'bg-risk-mid/10 text-risk-mid' },
  pendiente: { label: 'Pendiente', className: 'bg-raised text-muted' },
}

function Chip({ children }) {
  return <span className="num rounded-md bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">{children}</span>
}

// Diseño instruccional de la guía con el modelo ADDIE (resumen de docs/addie/). Es una vista de consulta:
// no añade pasos al recorrido ni guarda nada.
export default function PedagogyView({ onExit }) {
  const reduce = useReducedMotion()
  const { list, item } = useStagger(0.06)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('pedagogy-title')?.focus({ preventScroll: true })
  }, [reduce])

  return (
    <motion.section aria-labelledby="pedagogy-title" {...list}>
      <motion.div {...item} className="hero-panel px-6 py-10 sm:px-10 sm:py-12">
        <div className="relative">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ring-white/25 backdrop-blur">
            Diseño pedagógico
          </p>
          <h2 id="pedagogy-title" tabIndex={-1} className="mt-5 max-w-[20ch] text-4xl font-bold leading-[1.02] tracking-tighter outline-none sm:text-6xl">
            Cómo está pensada la guía
          </h2>
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-white/85">
            La parte educativa de Escudo Visual se diseña con el modelo ADDIE: Análisis, Diseño, Desarrollo, Implementación
            y Evaluación. Es el método con el que se planifica la enseñanza, no una ruta que tengas que seguir. El software se
            desarrolla aparte, con Scrum.
          </p>
          <ol className="mt-8 flex flex-wrap gap-2" aria-label="Fases del modelo ADDIE">
            {PHASES.map((p) => (
              <li key={p.id}>
                <a href={`#fase-${p.id}`} className="flex items-center gap-2 rounded-full bg-white/12 py-1.5 pl-1.5 pr-3.5 text-sm font-medium ring-1 ring-white/20 backdrop-blur hover:bg-white/20">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-highlight font-bold text-ink">{p.letter}</span>
                  {p.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>

      <motion.h3 {...item} className="mt-14 text-3xl font-bold tracking-tight">Las cinco fases</motion.h3>
      <motion.p {...item} className="mt-2 max-w-[60ch] text-muted">Qué se ha hecho en cada fase y qué falta. Nada de lo pendiente se presenta como terminado.</motion.p>
      <motion.ol {...list} className="mt-6 space-y-4">
        {PHASES.map((p) => {
          const status = STATUS[p.status]
          return (
            <motion.li key={p.id} id={`fase-${p.id}`} {...item} className="card scroll-mt-28 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-ctl bg-gradient-to-br from-accent to-accent-2 text-lg font-bold text-white">
                  {p.letter}
                </span>
                <h4 className="text-xl font-bold tracking-tight">{p.title}</h4>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
              </div>
              <p className="mt-3 max-w-[65ch] text-ink/85">{p.summary}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Hecho</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {p.done.map((d) => (
                      <li key={d} className="flex items-start gap-2">
                        <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-risk-low" aria-hidden="true" /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Pendiente</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted">
                    {p.pending.map((d) => (
                      <li key={d} className="flex items-start gap-2">
                        <Circle size={18} className="mt-px shrink-0" aria-hidden="true" /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.li>
          )
        })}
      </motion.ol>

      <motion.h3 {...item} className="mt-16 text-3xl font-bold tracking-tight">El recorrido paso a paso</motion.h3>
      <motion.p {...item} className="mt-2 max-w-[60ch] text-muted">
        Los siete pasos de Aprendizaje combinan aprendizaje conceptual, demostrativo y práctico. Cada uno trabaja unos objetivos concretos.
      </motion.p>
      <motion.ol {...list} className="mt-6 grid gap-3 md:grid-cols-2">
        {STEPS.map((s, i) => {
          const role = STEP_ROLES[s.id]
          return (
            <motion.li key={s.id} {...item} className="card flex flex-col p-5">
              <p className="num text-sm text-muted">Paso {i + 1}</p>
              <h4 className="mt-0.5 text-lg font-semibold tracking-tight">{s.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{role.role}</p>
              <p className="mt-3 flex flex-wrap gap-1.5">
                {role.kind.map((k) => (
                  <span key={k} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">{k}</span>
                ))}
              </p>
              <p className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label="Objetivos del paso">
                {objectivesForStep(s.id).map((o) => <Chip key={o.id}>{o.id}</Chip>)}
              </p>
            </motion.li>
          )
        })}
      </motion.ol>

      <motion.h3 {...item} className="mt-16 text-3xl font-bold tracking-tight">Objetivos de aprendizaje</motion.h3>
      <motion.p {...item} className="mt-2 max-w-[60ch] text-muted">
        {OBJECTIVES.length} objetivos en {Object.keys(AREAS).length} áreas. Cada uno indica su nivel cognitivo y cómo se evalúa:
        D y F son preguntas del diagnóstico inicial y de la evaluación final, E son escenarios prácticos.
      </motion.p>
      <motion.div {...list} className="mt-6 space-y-4">
        {Object.entries(AREAS).map(([code, name]) => (
          <motion.section key={code} {...item} aria-labelledby={`area-${code}`} className="card p-5">
            <h4 id={`area-${code}`} className="font-semibold tracking-tight">{name}</h4>
            <ul className="mt-3 divide-y divide-line/70">
              {OBJECTIVES.filter((o) => o.area === code).map((o) => (
                <li key={o.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[4.5rem_1fr_auto] sm:items-start sm:gap-4">
                  <span><Chip>{o.id}</Chip></span>
                  <span>
                    <span className="text-ink/90">{o.text}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Nivel: {o.bloom}{o.content === false ? ' · Contenido en preparación' : ''}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1 sm:justify-end" aria-label="Evaluación">
                    {o.evaluation.map((e) => <span key={e} className="num font-mono text-xs text-muted">{e}</span>)}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </motion.div>

      <motion.h3 {...item} className="mt-16 text-3xl font-bold tracking-tight">Cómo se evalúa</motion.h3>
      <motion.ul {...list} className="mt-6 grid gap-3 md:grid-cols-3">
        {EVALUATION_DIMENSIONS.map((d) => (
          <motion.li key={d.title} {...item} className="card flex flex-col p-5">
            <h4 className="text-lg font-semibold tracking-tight">{d.title}</h4>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/85">{d.how}</p>
            <p className="mt-4 text-xs font-medium text-risk-mid">{d.state}</p>
          </motion.li>
        ))}
      </motion.ul>
      <motion.p {...item} className="mt-4 max-w-[65ch] text-sm text-muted">
        Las evaluaciones son anónimas: no se piden nombres ni correos y no se guardan imágenes, IP ni navegador.
      </motion.p>

      <motion.div {...item} className="card mt-16 max-w-3xl p-6">
        <h3 className="text-lg font-semibold">Lo que la guía nunca promete</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {RIGOR.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <Info size={18} className="mt-px shrink-0 text-accent" aria-hidden="true" /> {r}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.p {...item} className="mt-8 max-w-[65ch] text-sm text-muted">
        La documentación completa, con la matriz de alineación y los instrumentos propuestos, está en la carpeta docs/addie del
        proyecto. Los instrumentos están pendientes de validación académica.
      </motion.p>
      <motion.div {...item}>
        <button type="button" className="btn btn-outline mt-6" onClick={onExit}>
          <ArrowLeft size={16} aria-hidden="true" /> Volver a la guía
        </button>
      </motion.div>
    </motion.section>
  )
}
