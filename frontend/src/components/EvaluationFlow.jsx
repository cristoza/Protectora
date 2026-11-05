import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, CheckCircle, PaperPlaneTilt, Warning } from '@phosphor-icons/react'
import { EASE } from '../lib/motion.js'
import { CONSENT, CONTACT, SUS } from '../data/evaluation.js'
import comprehension from '../data/comprehension.json'
import Choice from './Choice.jsx'

const STAGES = ['consent', 'sus', 'comprehension', 'thanks']

// `code` es el código anónimo de la sesión (lib/participant.js), compartido con la evaluación de conocimientos.
export default function EvaluationFlow({ code, onExit }) {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState('consent')
  const [sus, setSus] = useState(Array(SUS.items.length).fill(null))
  const [answers, setAnswers] = useState({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('eval-title')?.focus({ preventScroll: true })
  }, [stage, reduce])

  const questions = comprehension.questions
  const susDone = sus.every((v) => v !== null)
  const compDone = questions.every((q) => answers[q.id])

  const submit = async () => {
    setSending(true)
    setError(null)
    const payload = {
      participant_code: code,
      sus,
      comprehension: Object.fromEntries(questions.map((q) => [q.id, { answer: answers[q.id], correct: answers[q.id] === q.correct }])),
    }
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudieron guardar las respuestas. Revisa que todas estén contestadas.')
      }
      setStage('thanks')
    } catch (e) {
      setError(
        e.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
          : e.message,
      )
    }
    setSending(false)
  }

  const step = STAGES.indexOf(stage)
  const titles = {
    consent: 'Antes de empezar',
    sus: 'Facilidad de uso',
    comprehension: 'Lo que aprendiste',
    thanks: 'Gracias por participar',
  }

  return (
    <motion.section
      aria-labelledby="eval-title"
      key={stage}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="max-w-3xl"
    >
      <p className="num text-sm text-muted">Evaluación · {Math.min(step + 1, 3)} de 3</p>
      <h2 id="eval-title" tabIndex={-1} className="mt-1 text-3xl font-bold tracking-tight outline-none sm:text-4xl">
        {titles[stage]}
      </h2>

      {!SUS.verified && stage !== 'thanks' && (
        <p role="note" className="mt-4 flex items-start gap-2 rounded-ctl border border-risk-mid/40 bg-risk-mid/5 p-3 text-sm">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-risk-mid" aria-hidden="true" />
          Versión de prueba: el texto de la escala SUS aún no se ha sustituido por la versión validada. No la uses con participantes.
        </p>
      )}

      {stage === 'consent' && (
        <div className="card mt-6 p-6">
          <h3 className="text-lg font-semibold">Consentimiento informado</h3>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
            {CONSENT.map((p) => <li key={p}>{p}</li>)}
            {CONTACT && <li>Si tienes preguntas sobre el estudio, escribe a {CONTACT}.</li>}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => setStage('sus')}>
              Acepto participar <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-quiet" onClick={onExit}>No quiero participar</button>
          </div>
        </div>
      )}

      {stage === 'sus' && (
        <>
          <p className="mt-3 max-w-[60ch] text-muted">
            Indica qué tan de acuerdo estás con cada afirmación sobre Escudo Visual. Responde con tu primera impresión.
          </p>
          <ol className="mt-6 space-y-5">
            {SUS.items.map((text, i) => (
              <li key={text} className="card p-5">
                <fieldset>
                  <legend className="font-medium">
                    <span className="num mr-2 text-muted">{i + 1}.</span>{text}
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-5">
                    {SUS.scale.map((s) => (
                      <Choice
                        key={s.value}
                        name={`sus-${i}`}
                        value={s.value}
                        checked={sus[i] === s.value}
                        onChange={() => setSus(sus.map((v, j) => (j === i ? s.value : v)))}
                      >
                        <span className="num font-semibold">{s.value}</span> <span className="text-muted">{s.label}</span>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">Escala: {SUS.citation}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-quiet" onClick={() => setStage('consent')}>
              <ArrowLeft size={16} aria-hidden="true" /> Atrás
            </button>
            <button type="button" className="btn btn-primary" disabled={!susDone} onClick={() => setStage('comprehension')}>
              Continuar <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {stage === 'comprehension' && (
        <>
          <p className="mt-3 max-w-[60ch] text-muted">Elige la respuesta que te parezca correcta. No hay penalización por equivocarte.</p>
          <ol className="mt-6 space-y-5">
            {questions.map((q, i) => (
              <li key={q.id} className="card p-5">
                <fieldset>
                  <legend className="font-medium">
                    <span className="num mr-2 text-muted">{i + 1}.</span>{q.question}
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((o) => (
                      <Choice
                        key={o.id}
                        name={`q-${q.id}`}
                        value={o.id}
                        checked={answers[q.id] === o.id}
                        onChange={() => setAnswers({ ...answers, [q.id]: o.id })}
                      >
                        {o.text}
                      </Choice>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          {error && <p role="alert" className="mt-4 text-sm text-risk-high">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-quiet" onClick={() => setStage('sus')}>
              <ArrowLeft size={16} aria-hidden="true" /> Atrás
            </button>
            <button type="button" className="btn btn-primary" disabled={!compDone || sending} onClick={submit}>
              <PaperPlaneTilt size={16} aria-hidden="true" /> {sending ? 'Enviando' : 'Enviar respuestas'}
            </button>
          </div>
        </>
      )}

      {stage === 'thanks' && (
        <div className="card mt-6 p-6">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle size={22} weight="fill" className="text-risk-low" aria-hidden="true" /> Tus respuestas se guardaron.
          </p>
          <p className="mt-3 text-sm text-muted">
            Tu código de participante es <span className="num marker font-semibold text-ink">{code}</span>. No está ligado a tu
            identidad. Si más adelante quieres retirar tus respuestas, comparte este código con la persona responsable del estudio.
          </p>
          <button type="button" className="btn btn-outline mt-6" onClick={onExit}>Volver a la guía</button>
        </div>
      )}
    </motion.section>
  )
}
