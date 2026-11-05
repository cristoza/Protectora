import { CaretDown, Target } from '@phosphor-icons/react'
import { objectivesForStep } from '../data/addie.js'

// Objetivos de aprendizaje del paso (docs/addie/02_diseno.md), plegados para no tapar la actividad.
export default function StepObjectives({ stepId, className = '' }) {
  const objectives = objectivesForStep(stepId)
  if (!objectives.length) return null
  return (
    <details className={`card group max-w-3xl p-0 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-box p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl bg-accent/10 text-accent">
          <Target size={20} weight="duotone" aria-hidden="true" />
        </span>
        <span className="font-semibold">Qué aprenderás en este paso</span>
        <span className="num text-sm text-muted">{objectives.length} {objectives.length === 1 ? 'objetivo' : 'objetivos'}</span>
        <CaretDown size={16} aria-hidden="true" className="ml-auto text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <ul className="space-y-3 border-t border-line/70 px-4 pb-4 pt-3">
        {objectives.map((o) => (
          <li key={o.id} className="flex items-start gap-3 text-sm">
            <span className="num mt-0.5 shrink-0 rounded-md bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">{o.id}</span>
            <span>
              <span className="text-ink/90">{o.text}</span>
              <span className="mt-0.5 block text-xs text-muted">
                Nivel: {o.bloom}{o.content === false ? ' · Contenido en preparación' : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
