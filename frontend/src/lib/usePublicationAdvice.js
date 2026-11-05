import { useEffect, useState } from 'react'

// Recomendaciones del Asistente de Publicación Segura para el archivo vigente (el subido o su
// versión firmada). Se recalculan cada vez que cambia el archivo.
export default function usePublicationAdvice(file) {
  // El resultado guarda a qué archivo corresponde: si no es el vigente, todavía se está calculando.
  const [result, setResult] = useState({ file: null, advice: null, error: null })

  useEffect(() => {
    if (!file) return undefined
    const ctrl = new AbortController()
    const body = new FormData()
    body.append('file', file, file.name)
    fetch('/api/publication-advice', { method: 'POST', body, signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `El servidor respondió con un error (${res.status}).`)
        setResult({ file, advice: data, error: null })
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        const error = e.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Comprueba que el backend esté en marcha en el puerto 8000.'
          : e.message
        setResult({ file, advice: null, error })
      })
    return () => ctrl.abort()
  }, [file])

  const current = file && result.file === file
  return {
    advice: current ? result.advice : null,
    error: current ? result.error : null,
    loading: Boolean(file) && !current,
  }
}
