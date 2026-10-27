import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { EASE, SPRING } from './lib/motion.js'
import BrandMark from './components/BrandMark.jsx'
import { STEPS } from './data/layers.js'
import LayerRail from './components/LayerRail.jsx'
import OverviewStep from './components/steps/OverviewStep.jsx'
import LiteracyStep from './components/steps/LiteracyStep.jsx'
import MetadataStep from './components/steps/MetadataStep.jsx'
import ExclusionStep from './components/steps/ExclusionStep.jsx'
import PerturbationStep from './components/steps/PerturbationStep.jsx'
import PublishStep from './components/steps/PublishStep.jsx'
import SummaryStep from './components/steps/SummaryStep.jsx'
import EvaluationFlow from './components/EvaluationFlow.jsx'

export default function App() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [audit, setAudit] = useState(null)
  const [perturbed, setPerturbed] = useState(false)
  // Imagen subida en la capa 1 y su auditoría original (antes de firmarla).
  const [source, setSource] = useState(null)
  // Se generó una versión con perturbación en el laboratorio de la capa 3.
  const [cloaked, setCloaked] = useState(false)
  // Datos de firma compartidos entre la capa 1 y la versión protegida de la capa 3.
  const [identity, setIdentity] = useState({ author: '', copyright: '', aiOptOut: true, stripGps: true })
  const [checks, setChecks] = useState({})
  // La evaluación de usabilidad es una vista aparte del recorrido por capas.
  const [evaluating, setEvaluating] = useState(false)
  const mounted = useRef(false)

  const state = { audit, perturbed, cloaked, checks }
  const step = STEPS[index]
  const goTo = (target) => {
    setEvaluating(false)
    const i = typeof target === 'number' ? target : STEPS.findIndex((s) => s.id === target)
    setDir(i >= index ? 1 : -1)
    setIndex(i)
  }

  // Al cambiar de paso: volver arriba y mover el foco al título, para teclado y lectores de pantalla.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('step-title')?.focus({ preventScroll: true })
  }, [index, reduce])

  const views = {
    mapa: <OverviewStep onStart={() => goTo(1)} onSelect={goTo} />,
    aprende: <LiteracyStep goTo={goTo} />,
    metadatos: (
      <MetadataStep
        audit={audit}
        source={source}
        onResult={(data, file) => { setAudit(data); setSource({ file, audit: data }) }}
        onSigned={setAudit}
        identity={identity}
        setIdentity={setIdentity}
      />
    ),
    exclusion: <ExclusionStep audit={audit} goTo={goTo} />,
    perturbacion: (
      <PerturbationStep
        perturbed={perturbed}
        setPerturbed={setPerturbed}
        cloaked={cloaked}
        onProtected={() => setCloaked(true)}
        onSigned={setAudit}
        identity={identity}
        setIdentity={setIdentity}
      />
    ),
    publicacion: <PublishStep checks={checks} setChecks={setChecks} goTo={goTo} />,
    resumen: <SummaryStep state={state} goTo={goTo} onEvaluate={() => setEvaluating(true)} />,
  }

  const prev = STEPS[index - 1]
  const next = STEPS[index + 1]

  return (
    <div className="min-h-[100dvh]">
      <div className="grain" aria-hidden="true" />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <button type="button" onClick={() => goTo(0)} className="group flex items-center gap-2.5 rounded-ctl">
            <BrandMark progress={index / (STEPS.length - 1)} />
            <span className="text-lg font-semibold tracking-tight">Escudo Visual</span>
          </button>
          <p className="num flex items-center gap-1 text-sm text-muted">
            Paso
            <span className="relative inline-flex h-5 w-4 justify-center overflow-hidden font-medium text-ink">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.span
                  key={index}
                  custom={dir}
                  initial={reduce ? false : { y: dir * 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? undefined : { y: dir * -16, opacity: 0 }}
                  transition={SPRING}
                >
                  {index + 1}
                </motion.span>
              </AnimatePresence>
            </span>
            de {STEPS.length}
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <LayerRail current={index} onSelect={goTo} state={state} />
        </div>
        <div className="h-[3px] bg-line/60" aria-hidden="true">
          <motion.div
            className="h-full origin-left bg-gradient-to-r from-accent via-accent-2 to-highlight"
            initial={false}
            animate={{ scaleX: (index + 1) / STEPS.length }}
            transition={reduce ? { duration: 0 } : SPRING}
          />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 lg:pt-12">
        <main id="contenido" className="min-w-0">
          {evaluating ? (
            <EvaluationFlow onExit={() => setEvaluating(false)} />
          ) : (
          <>
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step.id}
              custom={dir}
              initial={reduce ? false : { opacity: 0, x: dir * 32, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={reduce ? undefined : { opacity: 0, x: dir * -24, filter: 'blur(6px)', transition: { duration: 0.18 } }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              {views[step.id]}
            </motion.div>
          </AnimatePresence>

          <div className="mt-14 flex items-center justify-between gap-3 border-t border-line pt-6">
            {prev ? (
              <button type="button" className="btn btn-quiet group" onClick={() => goTo(index - 1)}>
                <ArrowLeft size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-1" /> {prev.title}
              </button>
            ) : <span />}
            {next && (
              <button type="button" className="btn btn-primary group" onClick={() => goTo(index + 1)}>
                {next.title} <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            )}
          </div>
          </>
          )}
        </main>
      </div>

      <footer className="border-t border-line/70 bg-white/60 py-8">
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 text-sm text-muted">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-low opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
          </span>
          Tu imagen se analiza en un archivo temporal que se elimina al terminar. No se guarda en el servidor.
        </p>
        {!evaluating && (
          <p className="mx-auto mt-3 max-w-6xl px-4 text-sm">
            <button type="button" className="font-medium text-accent underline underline-offset-4" onClick={() => setEvaluating(true)}>
              Participar en la evaluación de usabilidad
            </button>
          </p>
        )}
      </footer>
    </div>
  )
}
