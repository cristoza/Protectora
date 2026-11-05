import { CheckCircle, MinusCircle } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import StepFrame from '../StepFrame.jsx'
import { useStagger } from '../../lib/motion.js'
import { stepById } from '../../data/layers.js'

// Mismas directivas que reconoce el backend (EXCLUSION_PATTERN).
const DIRECTIVES = [
  { tag: 'noai', text: 'Pide que la imagen no se use para entrenar modelos de IA.' },
  { tag: 'noimageai', text: 'Lo mismo, pero específico para modelos de imagen.' },
  { tag: 'tdm-reservation', text: 'Reserva los derechos de minería de textos y datos.' },
  { tag: 'dataminingprohibited', text: 'Declara prohibida la minería de datos sobre el archivo.' },
  { tag: 'dmi-prohibited-aimltraining', text: 'Campo Data Mining del estándar IPTC: prohíbe entrenar IA o aprendizaje automático.' },
]

export default function ExclusionStep({ audit, goTo }) {
  const found = audit?.exclusion_tags ?? []
  const { list, item } = useStagger(0.07)
  const has = (tag) => found.some((f) => f.replace(/[\s_-]/g, '') === tag.replace(/[\s_-]/g, ''))

  return (
    <StepFrame step={stepById('exclusion')}>
      {!audit ? (
        <div className="card max-w-xl border-dashed p-8">
          <p className="text-lg font-medium">Aún no hay una imagen auditada</p>
          <p className="mt-2 text-muted">Esta capa lee lo que encontró la capa 1. Audita una imagen para ver qué etiquetas trae.</p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => goTo('metadatos')}>
            Ir a la capa 1
          </button>
        </div>
      ) : (
        <>
          <p className={`max-w-[60ch] text-lg ${found.length ? 'text-risk-low' : 'text-risk-mid'}`}>
            {found.length
              ? `${audit.filename} declara ${found.length} ${found.length === 1 ? 'etiqueta' : 'etiquetas'}: ${found.join(', ')}.`
              : `${audit.filename} no trae ninguna etiqueta de exclusión.`}
          </p>
          <motion.ul {...list} className="mt-6 grid gap-3 sm:grid-cols-2">
            {DIRECTIVES.map((d) => {
              const on = has(d.tag)
              return (
                <motion.li key={d.tag} {...item} className={`card flex gap-3 p-4 ${on ? 'border-risk-low/40' : ''}`}>
                  {on ? (
                    <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-risk-low" aria-hidden="true" />
                  ) : (
                    <MinusCircle size={22} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-mono text-sm">{d.tag}</p>
                    <p className="mt-1 text-sm text-muted">{d.text}</p>
                    <p className="sr-only">{on ? 'Presente' : 'No encontrada'}</p>
                  </div>
                </motion.li>
              )
            })}
          </motion.ul>
        </>
      )}
      {audit && found.length === 0 && (
        <button type="button" className="btn btn-primary mt-6" onClick={() => goTo('metadatos')}>
          Añadirlas al firmar tu imagen en la capa 1
        </button>
      )}
      <p className="mt-8 max-w-[60ch] text-sm leading-relaxed text-muted">
        Estas etiquetas son una petición. Solo las respetan quienes quieren hacerlo, por eso existe la capa 3.
      </p>
    </StepFrame>
  )
}
