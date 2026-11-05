// Textos de la evaluación de conocimientos. Las preguntas no están aquí: las sirve el backend desde
// docs/addie/instrumentos/ sin las respuestas correctas (GET /api/knowledge/{phase}).

export const PHASE_TEXT = {
  diagnostico: {
    eyebrow: 'Diagnóstico inicial',
    title: '¿Qué sabes ya?',
    lead: 'Unas preguntas cortas antes de empezar, para ver de dónde partes. No tienen nota y al final verás qué temas conviene reforzar.',
  },
  final: {
    eyebrow: 'Evaluación final',
    title: 'Comprueba lo que aprendiste',
    lead: 'Preguntas parecidas a las del diagnóstico, en otras situaciones. Al terminar verás la explicación de cada una y, si hiciste el diagnóstico, cuánto avanzaste.',
  },
}

export const KNOWLEDGE_CONSENT = [
  'Es voluntaria y puedes salir en cualquier momento sin enviar nada. Toma unos 8 minutos.',
  'Es anónima: se guarda un código aleatorio generado en tu navegador, la fecha, tus respuestas y tu valoración de lo que sabes hacer. No se guardan nombres, correos, imágenes, tu IP ni tu navegador, y no se relaciona con tu cuenta.',
  'El mismo código une el diagnóstico y la evaluación final mientras no cierres esta pestaña, para poder comparar antes y después.',
  'Los resultados se usarán solo de forma agregada en la investigación.',
]
