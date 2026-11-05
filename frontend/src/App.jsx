import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpenText, Flask, FolderSimple } from '@phosphor-icons/react'
import { EASE, SPRING } from './lib/motion.js'
import usePublicationAdvice from './lib/usePublicationAdvice.js'
import useLabProject from './lib/useLabProject.js'
import {
  AccountContext, DEFAULT_IDENTITY, DEFAULT_PROTECTION, DEFAULT_STRESS, SectionContext, loadProgress, saveProgress, useAccountState,
} from './lib/account.js'
import AccountMenu from './components/AccountMenu.jsx'
import LabView from './components/LabView.jsx'
import ProjectsView from './components/ProjectsView.jsx'
import MyImages from './components/MyImages.jsx'
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
import PedagogyView from './components/PedagogyView.jsx'
import KnowledgeTest from './components/KnowledgeTest.jsx'
import { useParticipantCode } from './lib/participant.js'

const SECTIONS = [
  { id: 'aprendizaje', label: 'Aprendizaje', icon: BookOpenText },
  { id: 'laboratorio', label: 'Laboratorio', icon: Flask },
  { id: 'proyectos', label: 'Proyectos', icon: FolderSimple },
]

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
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY)
  // Ajustes del laboratorio de perturbación y del simulador de estrés de la capa 3.
  const [protection, setProtection] = useState(DEFAULT_PROTECTION)
  const [stress, setStress] = useState(DEFAULT_STRESS)
  const [checks, setChecks] = useState({})
  // Archivo vigente: el subido en la capa 1 o su última versión firmada.
  const [current, setCurrent] = useState(null)
  const publication = usePublicationAdvice(current)
  // Vistas aparte del recorrido por capas: 'evaluacion' (usabilidad), 'pedagogia' (diseño ADDIE),
  // 'diagnostico' y 'final' (evaluación de conocimientos).
  const [aside, setAside] = useState(null)
  // Código anónimo de esta pestaña y resultados de conocimientos ya enviados; nada de esto se guarda en la cuenta.
  const participantCode = useParticipantCode()
  const [knowledge, setKnowledge] = useState({})
  const mounted = useRef(false)
  // Aprendizaje es el recorrido guiado; Laboratorio, las herramientas sueltas; Proyectos, el trabajo guardado del Laboratorio.
  const [section, setSection] = useState('aprendizaje')
  const account = useAccountState()
  const lab = useLabProject(account)
  const [accountOpen, setAccountOpen] = useState(false)
  // Sesión (objeto de usuario, nuevo en cada inicio) cuyo progreso ya se cargó: hasta entonces no se guarda,
  // para no pisar lo guardado con el estado vacío.
  const [progressFor, setProgressFor] = useState(null)
  const user = account.user

  const state = { audit, perturbed, cloaked, checks, advice: publication.advice }
  const step = STEPS[index]
  const onSigned = (signedAudit, file) => {
    setAudit(signedAudit)
    if (file) setCurrent(file)
  }
  const goTo = (target) => {
    setAside(null)
    setSection('aprendizaje')
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
  }, [index, section, reduce])

  // Con sesión, se retoma el recorrido guardado. El archivo no se guarda aquí: solo su auditoría.
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    loadProgress()
      .then((p) => {
        if (cancelled || !p) return
        setIndex(Math.min(p.index, STEPS.length - 1))
        setPerturbed(p.perturbed)
        setCloaked(p.cloaked)
        setChecks(p.checks)
        setIdentity(p.identity)
        setProtection(p.protection ?? DEFAULT_PROTECTION)
        setStress(p.stress ?? DEFAULT_STRESS)
        setAudit(p.audit)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProgressFor(user) })
    return () => { cancelled = true }
  }, [user])

  // Cada cambio del recorrido se guarda un segundo después, solo con sesión.
  useEffect(() => {
    if (!user || progressFor !== user) return undefined
    const timer = setTimeout(() => {
      saveProgress({ index, perturbed, cloaked, checks, identity, protection, stress, audit }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [user, progressFor, index, perturbed, cloaked, checks, identity, protection, stress, audit])

  const views = {
    mapa: <OverviewStep onStart={() => goTo(1)} onSelect={goTo} onDiagnostic={() => setAside('diagnostico')} diagnosticDone={Boolean(knowledge.diagnostico)} />,
    aprende: <LiteracyStep goTo={goTo} />,
    metadatos: (
      <MetadataStep
        audit={audit}
        source={source}
        onResult={(data, file) => { setAudit(data); setSource({ file, audit: data }); setCurrent(file) }}
        onSigned={onSigned}
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
        onSigned={onSigned}
        identity={identity}
        setIdentity={setIdentity}
        protection={protection}
        setProtection={setProtection}
        stress={stress}
        setStress={setStress}
      />
    ),
    publicacion: <PublishStep publication={publication} checks={checks} setChecks={setChecks} goTo={goTo} />,
    resumen: (
      <>
        <SummaryStep state={state} goTo={goTo} onEvaluate={() => setAside('evaluacion')} onPedagogy={() => setAside('pedagogia')}
          knowledge={knowledge} onKnowledge={() => setAside('final')} />
        <div className="mt-10 max-w-4xl">
          <MyImages onLogin={() => setAccountOpen(true)} />
        </div>
      </>
    ),
  }

  const prev = STEPS[index - 1]
  const next = STEPS[index + 1]

  const learning = section === 'aprendizaje'

  return (
    <AccountContext value={account}>
    <SectionContext value={section}>
    <div className="min-h-[100dvh]">
      <div className="grain" aria-hidden="true" />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
          <button type="button" onClick={() => goTo(0)} className="group flex items-center gap-2.5 rounded-ctl">
            <BrandMark progress={index / (STEPS.length - 1)} />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">Escudo Visual</span>
          </button>
          <nav aria-label="Secciones" className="flex gap-1 rounded-full bg-raised p-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-current={section === s.id ? 'page' : undefined}
                onClick={() => { setAside(null); setSection(s.id) }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  section === s.id ? 'bg-white text-ink shadow' : 'text-muted hover:text-ink'
                }`}
              >
                <s.icon size={16} weight={section === s.id ? 'fill' : 'regular'} aria-hidden="true" /> {s.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
          {learning && (
          <p className="num hidden items-center gap-1 text-sm text-muted md:flex">
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
          )}
          <AccountMenu account={account} open={accountOpen} setOpen={setAccountOpen} />
          </div>
        </div>
        {learning && (
          <>
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
          </>
        )}
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 lg:pt-12">
        <main id="contenido" className="min-w-0">
          {aside === 'evaluacion' ? (
            <EvaluationFlow code={participantCode} onExit={() => setAside(null)} />
          ) : aside === 'diagnostico' || aside === 'final' ? (
            <KnowledgeTest
              key={aside}
              phase={aside}
              code={participantCode}
              previous={knowledge[aside] ?? null}
              onDone={(result) => setKnowledge((k) => ({ ...k, [aside]: result }))}
              onExit={() => setAside(null)}
              goTo={goTo}
            />
          ) : aside === 'pedagogia' ? (
            <PedagogyView onExit={() => setAside(null)} />
          ) : section === 'laboratorio' ? (
            <LabView lab={lab} onProjects={() => setSection('proyectos')} onLogin={() => setAccountOpen(true)} />
          ) : section === 'proyectos' ? (
            <ProjectsView lab={lab} onGoLab={() => setSection('laboratorio')} onLogin={() => setAccountOpen(true)} />
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
          Sin cuenta, tu imagen se analiza en un archivo temporal que se elimina al terminar. Con cuenta, solo se guarda lo
          que eliges guardar (con un proyecto abierto en el Laboratorio, también la imagen que subes), y puedes borrarlo cuando quieras.
        </p>
        <p className="mx-auto mt-3 flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 text-sm">
          {aside !== 'evaluacion' && (
            <button type="button" className="font-medium text-accent underline underline-offset-4" onClick={() => setAside('evaluacion')}>
              Participar en la evaluación de usabilidad
            </button>
          )}
          {aside !== 'pedagogia' && (
            <button type="button" className="font-medium text-accent underline underline-offset-4" onClick={() => setAside('pedagogia')}>
              Diseño pedagógico (modelo ADDIE)
            </button>
          )}
        </p>
      </footer>
    </div>
    </SectionContext>
    </AccountContext>
  )
}
