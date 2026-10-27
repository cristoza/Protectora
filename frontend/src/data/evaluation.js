// Textos de la evaluación de usabilidad: consentimiento informado y escala SUS.

// Versión en español validada de la System Usability Scale (Brooke, 1996):
// Sevilla-Gonzalez, M. D. R., Moreno Loaeza, L., Lazaro-Carrera, L. S., et al. (2020).
// Spanish Version of the System Usability Scale for the Assessment of Electronic Tools:
// Development and Validation. JMIR Human Factors, 7(4), e21161. https://doi.org/10.2196/21161
// (CC BY 4.0). Los ítems finales están en su Apéndice 2.
//
// PENDIENTE: el texto de abajo es un borrador de trabajo. Sustitúyelo por la redacción literal
// del Apéndice 2 y pon `verified: true`. Mientras sea false no debe aplicarse con participantes.
export const SUS = {
  verified: false,
  citation:
    'Sevilla-Gonzalez et al. (2020). Spanish Version of the System Usability Scale for the Assessment of Electronic Tools. JMIR Human Factors, 7(4), e21161.',
  items: [
    'Creo que me gustaría usar esta herramienta con frecuencia.',
    'Encontré la herramienta innecesariamente compleja.',
    'Pensé que la herramienta era fácil de usar.',
    'Creo que necesitaría el apoyo de una persona con conocimientos técnicos para poder usar esta herramienta.',
    'Encontré que las distintas funciones de la herramienta estaban bien integradas.',
    'Pensé que había demasiada inconsistencia en la herramienta.',
    'Imagino que la mayoría de las personas aprendería a usar esta herramienta muy rápidamente.',
    'Encontré la herramienta muy complicada de usar.',
    'Me sentí con mucha confianza al usar la herramienta.',
    'Necesité aprender muchas cosas antes de poder empezar a usar la herramienta.',
  ],
  scale: [
    { value: 1, label: 'Totalmente en desacuerdo' },
    { value: 2, label: 'En desacuerdo' },
    { value: 3, label: 'Ni de acuerdo ni en desacuerdo' },
    { value: 4, label: 'De acuerdo' },
    { value: 5, label: 'Totalmente de acuerdo' },
  ],
}

// Contacto de la persona responsable del estudio. Se muestra en el consentimiento si no es null.
export const CONTACT = null

export const CONSENT = [
  'Esta evaluación forma parte de un proyecto de grado sobre la protección de imágenes frente al entrenamiento de modelos de IA. Queremos saber qué tan fácil de usar es Escudo Visual y qué tan bien explica sus conceptos.',
  'Responderás 10 afirmaciones sobre la facilidad de uso y unas preguntas cortas de comprensión. Toma unos 5 minutos.',
  'Tu participación es voluntaria y puedes salir en cualquier momento sin enviar nada.',
  'Es anónima: no pedimos tu nombre ni tu correo. Al enviar se guardan solo un código aleatorio generado en tu navegador, la fecha, tus respuestas y tu puntuación. No se guardan imágenes, tu IP ni tu navegador.',
  'Los resultados se usarán solo de forma agregada en la investigación.',
]
