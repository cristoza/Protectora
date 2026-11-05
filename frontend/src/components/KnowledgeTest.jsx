import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, CheckCircle, PaperPlaneTilt, Warning, XCircle } from '@phosphor-icons/react'
import { EASE } from '../lib/motion.js'
import { KNOWLEDGE_CONSENT, PHASE_TEXT } from '../data/knowledge.js'
import { areaResults } from '../data/addie.js'
import { stepById } from '../data/layers.js'
import Choice from './Choice.jsx'

const STAGES = ['consent', 'questions', 'confidence', 'result']

function connectionError(e) {
  return e.message === 'Failed to fetch'
    ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
    : e.message
}

function AreaBars({ areas }) {
  return (
    <ul className="space-y-3">
      {areas.map((a) => (
        <li key={a.code}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{a.name}</span>
            <span className="num text-muted">{a.correct} de {a.total}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
            <div className={`h-full rounded-full ${a.correct === a.total ? 'bg-risk-low' : 'bg-risk-mid'}`} style={{ width: `${(a.correct / a.total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Diagnóstico inicial o evaluación final de conocimientos (docs/addie/05_evaluacion.md). Las preguntas
// llegan sin claves y el backend corrige; el diagnóstico solo indica qué temas reforzar, la final explica cada respuesta.
// `previous` es el resultado ya enviado en esta pestaña: se muestra en lugar de volver a responder.
export default function KnowledgeTest({ phase, code, previous, onExit, onDone, goTo }) {
  const reduce = useReducedMotion()
  const text = PHASE_TEXT[phase]
  const [instrument, setInstrument] = useState(null)
  const [stage, setStage] = useState(previous ? 'result' : 'consent')
  const [answers, setAnswers] = useState({})
  const [efficacy, setEfficacy] = useState({})
  const [profile, setProfile] = useState({})
  const [result, setResult] = useState(previous)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/knowledge/${phase}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el cuestionario.'))))
      .then(setInstrument)
      .catch((e) => e.name !== 'AbortError' && setError(connectionError(e)))
    return () => ctrl.abort()
  }, [phase])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('knowledge-title')?.focus({ preventScroll: true })
  }, [stage, reduce])

  const questions = instrument?.questions ?? []
  const items = instrument?.self_efficacy.items ?? []
  const questionsDone = questions.length > 0 && questions.every((q) => answers[q.id])
  const efficacyDone = items.length > 0 && items.every((i) => efficacy[i.id])

  const toggleMulti = (id, option) => {
    const current = profile[id] ?? []
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
    setProfile({ ...profile, [id]: next })
  }

  const submit = async () => {
    setSending(true)
    setError(null)
    // El perfil es opcional: solo se envían las preguntas contestadas.
    const chosenProfile = Object.fromEntries(Object.entries(profile).filter(([, v]) => (Array.isArray(v) ? v.length : v)))
    try {
      const res = await fetch(`/api/knowledge/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_code: code, answers, self_efficacy: efficacy, profile: chosenProfile }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudieron guardar las respuestas.')
      setResult(data)
      onDone(data)
      setStage('result')
    } catch (e) {
      setError(connectionError(e))
    }
    setSending(false)
  }

  const step = STAGES.indexOf(stage)
  const areas = result ? areaResults(result.by_objective) : []
  const optionText = (q, id) => q.options.find((o) => o.id === id)?.text

  return (
    <motion.section
      aria-labelledby="knowledge-title"
      key={stage}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="max-w-3xl"
    >
      <p className="num text-sm text-muted">{text.eyebrow} · {Math.min(step + 1, 3)} de 3</p>
      <h2 id="knowledge-title" tabIndex={-1} className="mt-1 text-3xl font-bold tracking-tight outline-none sm:text-4xl">
        {stage === 'result' ? 'Tus resultados' : text.title}
      </h2>

      {instrument && !instrument.validated && stage !== 'result' && (
        <p role="note" className="mt-4 flex items-start gap-2 rounded-ctl border border-risk-mid/40 bg-risk-mid/5 p-3 text-sm">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-risk-mid" aria-hidden="true" />
          Versión de prueba: las preguntas aún no se han validado académicamente. No la uses con participantes de la investigación.
        </p>
      )}

      {stage === 'consent' && (
        <div className="card mt-6 p-6">
          <p className="leading-relaxed text-ink/85">{text.lead}</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            {KNOWLEDGE_CONSENT.map((p) => <li key={p}>{p}</li>)}
          </ul>
          {error && <p role="alert" className="mt-4 text-sm text-risk-high">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" disabled={!instrument} onClick={() => setStage('questions')}>
              {instrument ? 'Empezar' : 'Cargando'} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-quiet" onClick={onExit}>Ahora no</button>
          </div>
        </div>
      )}

      {stage === 'questions' && (
        <>
          <p className="mt-3 max-w-[60ch] text-muted">{instrument.instructions}</p>
          <ol className="mt-6 space-y-5">
            {questions.map((q, i) => (
              <li key={q.id} className="card p-5">
                <fieldset>
                  <legend className="font-medium">
                    <span className="num mr-2 text-muted">{i + 1}.</span>{q.question}
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((o) => (
                      <Choice key={o.id} name={`k-${q.id}`} value={o.id} checked={answers[q.id] === o.id}
                        onChange={() => setAnswers({ ...answers, [q.id]: o.id })}>
                        {o.text}
                      </Choice>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          <p className="num mt-4 text-sm text-muted" aria-live="polite">
            {Object.keys(answers).length} de {questions.length} respondidas
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn btn-quiet" onClick={() => setStage('consent')}>
              <ArrowLeft size={16} aria-hidden="true" /> Atrás
            </button>
            <button type="button" className="btn btn-primary" disabled={!questionsDone} onClick={() => setStage('confidence')}>
              Continuar <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {stage === 'confidence' && (
        <>
          <p className="mt-3 max-w-[60ch] text-muted">¿Qué tan de acuerdo estás con cada afirmación sobre lo que sabes hacer?</p>
          <ol className="mt-6 space-y-5">
            {items.map((item, i) => (
              <li key={item.id} className="card p-5">
                <fieldset>
                  <legend className="font-medium">
                    <span className="num mr-2 text-muted">{i + 1}.</span>{item.text}
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-5">
                    {instrument.self_efficacy.scale.map((s) => (
                      <Choice key={s.value} name={`ae-${item.id}`} value={s.value} checked={efficacy[item.id] === s.value}
                        onChange={() => setEfficacy({ ...efficacy, [item.id]: s.value })}>
                        <span className="num font-semibold">{s.value}</span> <span className="text-muted">{s.label}</span>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          {instrument.profile.length > 0 && (
            <>
              <h3 className="mt-10 text-xl font-semibold">Sobre tu práctica (opcional)</h3>
              <p className="mt-1 max-w-[60ch] text-sm text-muted">Puedes dejarlas en blanco. Sirven para comparar grupos amplios, nunca personas.</p>
              <ol className="mt-4 space-y-5">
                {instrument.profile.map((p) => (
                  <li key={p.id} className="card p-5">
                    <fieldset>
                      <legend className="font-medium">{p.question}</legend>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {p.options.map((o) => (
                          <Choice key={o.id} name={`p-${p.id}`} value={o.id} type={p.multiple ? 'checkbox' : 'radio'}
                            checked={p.multiple ? (profile[p.id] ?? []).includes(o.id) : profile[p.id] === o.id}
                            onChange={() => (p.multiple ? toggleMulti(p.id, o.id) : setProfile({ ...profile, [p.id]: o.id }))}>
                            {o.text}
                          </Choice>
                        ))}
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ol>
            </>
          )}

          {error && <p role="alert" className="mt-4 text-sm text-risk-high">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-quiet" onClick={() => setStage('questions')}>
              <ArrowLeft size={16} aria-hidden="true" /> Atrás
            </button>
            <button type="button" className="btn btn-primary" disabled={!efficacyDone || sending} onClick={submit}>
              <PaperPlaneTilt size={16} aria-hidden="true" /> {sending ? 'Enviando' : 'Enviar respuestas'}
            </button>
          </div>
        </>
      )}

      {stage === 'result' && result && (
        <>
          {phase === 'diagnostico' ? (
            <div className="card mt-6 p-6">
              <p className="leading-relaxed text-ink/85">
                Gracias. No hay nota: esto sirve para que sepas por dónde empezar. Al final del recorrido podrás hacer la
                evaluación final y comparar.
              </p>
              {areas.some((a) => a.correct < a.total) && (
                <>
                  <h3 className="mt-6 font-semibold">Temas para reforzar</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {areas.filter((a) => a.correct < a.total).map((a) => (
                      <li key={a.code}>
                        <button type="button" className="btn btn-outline group w-full justify-between whitespace-normal text-left" onClick={() => goTo(a.step)}>
                          {a.name}
                          <span className="text-xs text-muted">{stepById(a.step).short}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {areas.some((a) => a.correct === a.total) && (
                <p className="mt-6 text-sm text-muted">
                  <span className="font-medium text-ink">Ya dominas:</span>{' '}
                  {areas.filter((a) => a.correct === a.total).map((a) => a.name).join(', ')}.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="hero-panel mt-6 flex flex-wrap items-end gap-x-10 gap-y-4 px-6 py-8 sm:px-8">
                <div className="relative">
                  <p className="text-sm text-white/75">Respuestas correctas</p>
                  <p className="num text-5xl font-bold tracking-tighter">{result.correct}<span className="text-2xl text-white/70"> de {result.total}</span></p>
                </div>
                {result.comparison && (
                  <div className="relative">
                    <p className="text-sm text-white/75">Antes y después</p>
                    <p className="num text-3xl font-bold tracking-tight">
                      {result.comparison.pre_score} % <ArrowRight size={22} className="inline" aria-hidden="true" /><span className="sr-only">a</span> {result.comparison.post_score} %
                    </p>
                    {result.comparison.gain !== null && (
                      <p className="num mt-1 text-sm text-white/80">Ganancia normalizada: {result.comparison.gain}</p>
                    )}
                  </div>
                )}
              </div>
              {!result.comparison && (
                <p className="mt-3 text-sm text-muted">No hiciste el diagnóstico en esta pestaña, así que no hay comparación con tu punto de partida.</p>
              )}
              <div className="card mt-6 p-6">
                <h3 className="font-semibold">Por temas</h3>
                <div className="mt-4"><AreaBars areas={areas} /></div>
              </div>
              <h3 className="mt-10 text-xl font-semibold">Revisa cada pregunta</h3>
              <ol className="mt-4 space-y-4">
                {result.results.map((r, i) => {
                  const q = questions.find((x) => x.id === r.id)
                  if (!q) return null
                  return (
                    <li key={r.id} className={`card p-5 ${r.correct ? '' : 'border-risk-mid/40'}`}>
                      <p className="flex items-start gap-2 font-medium">
                        {r.correct
                          ? <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-risk-low" aria-label="Correcta" />
                          : <XCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-risk-mid" aria-label="Incorrecta" />}
                        <span><span className="num mr-1.5 text-muted">{i + 1}.</span>{q.question}</span>
                      </p>
                      <p className="mt-2 text-sm"><span className="text-muted">Tu respuesta:</span> {optionText(q, r.answer)}</p>
                      {!r.correct && <p className="mt-1 text-sm"><span className="text-muted">Correcta:</span> {optionText(q, r.correct_option)}</p>}
                      <p className="mt-3 text-sm leading-relaxed text-ink/85">{r.feedback}</p>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
          <p className="mt-6 text-sm text-muted">
            Tu código de participante es <span className="num marker font-semibold text-ink">{code}</span>. No está ligado a tu
            identidad. Si quieres retirar tus respuestas, comparte este código con la persona responsable del estudio.
          </p>
          <button type="button" className="btn btn-outline mt-6" onClick={onExit}>Volver a la guía</button>
        </>
      )}
    </motion.section>
  )
}
