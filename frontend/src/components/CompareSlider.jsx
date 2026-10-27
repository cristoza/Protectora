import { useRef, useState } from 'react'
import { ArrowsLeftRight } from '@phosphor-icons/react'

// Ejemplos precalculados por backend/scripts/generate_examples.py sobre una ilustración sintética.
// Son resultados reales del sistema, servidos como archivos locales: no se ejecuta ningún modelo.
const VERSIONS = [
  { id: 'cloak', label: 'Con perturbación', src: '/examples/cloak.png', note: 'Perturbación de intensidad media: cambios de hasta 8 niveles por píxel.' },
  { id: 'watermark', label: 'Con marca de agua', src: '/examples/watermark.png', note: 'Marca de agua visible repetida en diagonal, al 35 % de opacidad.' },
  { id: 'stressed', label: 'Tras publicar', src: '/examples/stressed.jpg', note: 'La versión con perturbación tras reducirla a la mitad y recomprimirla en JPEG al 60 %, como haría una plataforma.' },
]

export default function CompareSlider() {
  const box = useRef(null)
  const [version, setVersion] = useState(VERSIONS[0])

  // La posición se escribe en una variable CSS: arrastrar no re-renderiza React.
  const move = (v) => box.current?.style.setProperty('--pos', `${v}%`)

  return (
    <div>
      <div role="radiogroup" aria-label="Versión a comparar con el original" className="mb-3 inline-flex flex-wrap gap-1 rounded-full bg-raised p-1">
        {VERSIONS.map((v) => (
          <label
            key={v.id}
            className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${version.id === v.id ? 'bg-ink text-bg' : 'text-ink/70 hover:text-ink'}`}
          >
            <input type="radio" name="example-version" value={v.id} checked={version.id === v.id} onChange={() => setVersion(v)} className="sr-only" />
            {v.label}
          </label>
        ))}
      </div>

      <div
        ref={box}
        style={{ '--pos': '50%' }}
        className="relative aspect-[3/2] w-full select-none overflow-hidden rounded-box border border-line bg-raised"
      >
        <img src={version.src} alt={`Ilustración de ejemplo: ${version.label.toLowerCase()}`} className="absolute inset-0 h-full w-full object-cover" />
        <img
          src="/examples/original.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: 'inset(0 calc(100% - var(--pos)) 0 0)' }}
        />
        <span className="absolute left-3 top-3 rounded-ctl bg-bg/85 px-3 py-1 text-xs font-medium">Original</span>
        <span className="absolute right-3 top-3 rounded-ctl bg-bg/85 px-3 py-1 text-xs font-medium">{version.label}</span>
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
          aria-label={`Comparar la imagen original con la versión ${version.label.toLowerCase()}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        {version.note} Ejemplo precalculado sobre una ilustración generada por el proyecto.
      </p>
    </div>
  )
}
