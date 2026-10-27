import { motion, useReducedMotion } from 'motion/react'

// Casilla declarada por la persona usuaria. El input nativo sigue ahí (oculto visualmente)
// para teclado y lectores de pantalla; el cuadro y la marca solo son la parte visual.
export default function CheckCard({ checked, onChange, title, hint }) {
  const reduce = useReducedMotion()
  return (
    <label
      className={`card group flex cursor-pointer items-start gap-4 p-4 transition-colors duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        checked ? 'border-accent/50 bg-accent/5' : 'hover:border-line'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <motion.span
        aria-hidden="true"
        animate={reduce ? undefined : { scale: checked ? [1, 0.85, 1.08, 1] : 1 }}
        transition={{ duration: 0.35 }}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200 ${
          checked ? 'border-accent bg-accent' : 'border-line bg-surface group-hover:border-accent/60'
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <motion.path
            d="M3 8.5 L6.5 12 L13 4.5"
            stroke="var(--accent-ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
      <span>
        <span className={`block ${hint ? 'font-medium' : ''} transition-colors duration-200 ${checked ? 'text-ink' : 'text-ink/90'}`}>{title}</span>
        {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  )
}
