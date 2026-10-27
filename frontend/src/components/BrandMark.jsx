import { motion, useReducedMotion } from 'motion/react'
import { SPRING } from '../lib/motion.js'

const SHIELD = 'M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z'

// Escudo de la marca: su contorno se va trazando a medida que avanza la guía.
export default function BrandMark({ progress = 0, size = 28 }) {
  const reduce = useReducedMotion()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <path d={SHIELD} className="fill-accent/10 stroke-line" strokeWidth="2" strokeLinejoin="round" />
      <motion.path
        d={SHIELD}
        className="stroke-accent"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: Math.max(0.12, progress) }}
        transition={reduce ? { duration: 0 } : SPRING}
      />
      <motion.circle
        cx="16"
        cy="15.5"
        r="3.2"
        className="fill-accent"
        animate={reduce ? undefined : { scale: [1, 1.18, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '50%', originY: '50%' }}
      />
    </svg>
  )
}
