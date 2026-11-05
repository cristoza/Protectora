import { useState } from 'react'

// Sin 0/O ni 1/I/L, para que el código se pueda dictar sin confusiones.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const KEY = 'ev_participant'

// Código anónimo generado en el navegador: no se deriva de ningún dato de la persona.
function anonymousCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

// El mismo código une el diagnóstico, la evaluación final y la escala SUS de una persona. Vive solo en
// sessionStorage (esta pestaña, hasta cerrarla): no es una cookie ni se relaciona con la cuenta.
export function useParticipantCode() {
  const [code] = useState(() => {
    try {
      const saved = sessionStorage.getItem(KEY)
      if (saved) return saved
    } catch { /* almacenamiento bloqueado: se usa un código solo en memoria */ }
    const fresh = anonymousCode()
    try {
      sessionStorage.setItem(KEY, fresh)
    } catch { /* idem */ }
    return fresh
  })
  return code
}
