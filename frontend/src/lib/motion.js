import { useReducedMotion } from 'motion/react'

// Movimiento compartido: misma curva y mismo escalonado en toda la guía.
export const EASE = [0.16, 1, 0.3, 1]
export const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }

// Contenedor que hace entrar a sus hijos en cascada. Con movimiento reducido no anima nada.
export function useStagger(delay = 0.06) {
  const reduce = useReducedMotion()
  if (reduce) return { list: {}, item: {} }
  return {
    list: {
      initial: 'hidden',
      animate: 'show',
      variants: { show: { transition: { staggerChildren: delay, delayChildren: 0.05 } } },
    },
    item: {
      variants: {
        hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: EASE } },
      },
    },
  }
}

// Fija --x/--y en el elemento para el borde iluminado de la clase .spotlight.
export function spotlight(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
}
