import { useEffect, useRef, useState } from 'react'
import { CheckCircle, MinusCircle, Play, UploadSimple, XCircle } from '@phosphor-icons/react'

const COLUMNS = [
  { id: 'metadata', label: 'Metadatos' },
  { id: 'c2pa', label: 'C2PA' },
  { id: 'noai', label: 'Señales noai' },
  { id: 'watermark', label: 'Marca' },
]

const STATUS = {
  sobrevive: { icon: CheckCircle, className: 'text-risk-low', text: 'Sobrevive' },
  'no sobrevive': { icon: XCircle, className: 'text-risk-high', text: 'No sobrevive' },
  'no aplica': { icon: MinusCircle, className: 'text-muted', text: 'No aplica' },
}

function Cell({ status, detail }) {
  const s = STATUS[status] ?? STATUS['no aplica']
  const Icon = s.icon
  return (
    <td className="px-3 py-3 align-top">
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${s.className}`}>
        <Icon size={18} weight="fill" aria-hidden="true" /> {s.text}
      </span>
      {detail && <span className="num mt-0.5 block text-xs text-muted">{detail}</span>}
    </td>
  )
}

const metaDetail = (m) =>
  ['exif', 'xmp', 'iptc'].filter((k) => m[k] !== 'no aplica').map((k) => `${k.toUpperCase()} ${m[k] === 'sobrevive' ? 'sí' : 'no'}`).join(' · ')

// Suite de resistencia: qué protecciones conserva la imagen tras cada transformación habitual de la web.
export default function ResistanceTable() {
  const inputRef = useRef(null)
  const ctrlRef = useRef(null)
  const [file, setFile] = useState(null)
  const [mark, setMark] = useState('© Autor')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => () => ctrlRef.current?.abort(), [])

  const run = async () => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('watermark_text', mark.trim())
      const res = await fetch('/api/stress-suite', { method: 'POST', body, signal: ctrl.signal })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `El servidor respondió con un error (${res.status}).`)
      }
      setResult(data)
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(
        e.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
          : e.message,
      )
    }
    setLoading(false)
  }

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Suite de resistencia</h3>
      <p className="mt-1 max-w-[60ch] text-sm text-muted">
        Aplicamos a tu imagen compresión, remuestreo, recorte, cambio de formato y una captura de pantalla simulada, y
        comprobamos qué protecciones siguen ahí después de cada una. Los archivos intermedios se borran al terminar.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <button type="button" className="btn btn-outline" onClick={() => inputRef.current?.click()}>
          <UploadSimple size={16} aria-hidden="true" /> {file ? 'Cambiar imagen' : 'Elegir una imagen'}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,image/*"
          onChange={(e) => { if (e.target.files[0]) { setFile(e.target.files[0]); setResult(null) } e.target.value = '' }}
        />
        <div>
          <label htmlFor="rs-mark" className="block text-sm font-medium">Texto de la marca de prueba</label>
          <input
            id="rs-mark"
            type="text"
            maxLength={40}
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            className="mt-1 w-56 rounded-ctl border border-line bg-white px-3 py-2 text-sm"
          />
        </div>
        <button type="button" className="btn btn-primary" disabled={!file || loading} onClick={run}>
          <Play size={16} weight="fill" aria-hidden="true" /> {loading ? 'Analizando' : 'Probar'}
        </button>
      </div>
      {file && <p className="mt-2 truncate text-sm text-muted">{file.name}</p>}
      <p className="mt-2 max-w-[60ch] text-xs text-muted">
        La marca se dibuja sobre una copia de tu imagen solo para esta prueba. Déjalo vacío si no quieres medirla.
      </p>

      {error && <p role="alert" className="mt-4 text-sm text-risk-high">{error}</p>}

      {result && (
        <div className="mt-6 overflow-x-auto" aria-live="polite">
          <table className="w-full min-w-[640px] text-left">
            <caption className="sr-only">Qué protecciones sobreviven a cada transformación</caption>
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th scope="col" className="px-3 py-2 font-medium">Transformación</th>
                {COLUMNS.map((c) => <th key={c.id} scope="col" className="px-3 py-2 font-medium">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60">
                  <th scope="row" className="px-3 py-3 align-top text-sm font-medium">
                    {r.label}
                    <span className="num block text-xs font-normal text-muted">
                      {r.output.format}, {r.output.width}×{r.output.height}
                    </span>
                  </th>
                  <Cell status={r.metadata.status} detail={metaDetail(r.metadata)} />
                  <Cell status={r.c2pa.status} />
                  <Cell status={r.noai.status} />
                  <Cell status={r.watermark.status} detail={r.watermark.correlation === null ? '' : `r = ${r.watermark.correlation.toFixed(2)}`} />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 max-w-[60ch] text-xs text-muted">
            "No aplica" significa que el original no tenía esa protección. La marca cuenta como detectable si su
            correlación (r) llega a {result.watermark_threshold.toFixed(2)}. La captura de pantalla es una aproximación.
          </p>
        </div>
      )}
    </div>
  )
}
