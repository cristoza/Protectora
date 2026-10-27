import { useId, useRef } from 'react'
import { ArrowsLeftRight } from '@phosphor-icons/react'

// Foto de ejemplo con un filtro de ruido y desplazamiento que imita, de forma
// ilustrativa, el aspecto de una perturbación. No es el resultado de Glaze ni de Nightshade.
const PHOTO = 'https://picsum.photos/seed/escudo-visual-montana/1280/720'

export default function CompareSlider() {
  const id = useId().replace(/:/g, '')
  const box = useRef(null)

  // La posición se escribe en una variable CSS: arrastrar no re-renderiza React.
  const move = (v) => box.current?.style.setProperty('--pos', `${v}%`)

  return (
    <div>
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0" result="c" />
          <feBlend in="SourceGraphic" in2="c" mode="overlay" result="b" />
          <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="1" seed="3" result="w" />
          <feDisplacementMap in="b" in2="w" scale="6" />
        </filter>
      </svg>

      <div
        ref={box}
        style={{ '--pos': '50%' }}
        className="relative aspect-video w-full select-none overflow-hidden rounded-box border border-line bg-raised"
      >
        <img src={PHOTO} alt="Paisaje de montaña usado como imagen de ejemplo" className="absolute inset-0 h-full w-full object-cover" style={{ filter: `url(#${id})` }} />
        <img
          src={PHOTO}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: 'inset(0 calc(100% - var(--pos)) 0 0)' }}
        />
        <span className="absolute left-3 top-3 rounded-ctl bg-bg/85 px-3 py-1 text-xs font-medium">Original</span>
        <span className="absolute right-3 top-3 rounded-ctl bg-bg/85 px-3 py-1 text-xs font-medium">Con perturbación</span>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-ink" style={{ left: 'var(--pos)' }}>
          <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-bg">
            <ArrowsLeftRight size={18} aria-hidden="true" />
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          defaultValue="50"
          onInput={(e) => move(e.target.value)}
          aria-label="Comparar la imagen original con la perturbada"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        Imagen de ejemplo con un efecto ilustrativo. El resultado real depende de la herramienta y de su intensidad.
      </p>
    </div>
  )
}
