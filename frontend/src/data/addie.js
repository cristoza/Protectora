// Diseño instruccional con el modelo ADDIE. Resume docs/addie/ para mostrarlo en la interfaz:
// la vista "Diseño pedagógico" y el bloque "Qué aprenderás" de cada paso leen de aquí.
// Si cambian los objetivos, actualiza también docs/addie/02_diseno.md y matriz_alineacion.md.

export const AREAS = {
  SCR: 'Comprensión del scraping',
  ENT: 'Cómo se entrena una IA',
  MET: 'Metadatos y autoría',
  EXC: 'Exclusión de entrenamiento',
  PER: 'Perturbación adversarial',
  MAR: 'Marcas de agua',
  C2P: 'Procedencia y credenciales C2PA',
  COM: 'Compresión y transformaciones',
  PUB: 'Publicación segura',
}

// steps: ids de layers.js donde se trabaja el objetivo. evaluation: ítems del diagnóstico (D),
// de la evaluación final (F) y escenarios prácticos (E) de docs/addie/instrumentos/.
// content: false cuando el contenido todavía no existe en la app.
export const OBJECTIVES = [
  { id: 'SCR-1', area: 'SCR', bloom: 'Comprender', text: 'Explicar qué es el scraping de imágenes y qué lo hace posible.', steps: ['aprende'], evaluation: ['D01', 'F01'] },
  { id: 'SCR-2', area: 'SCR', bloom: 'Comprender', text: 'Situar cada capa en el momento en que actúa: recopilación, entrenamiento o publicación.', steps: ['mapa', 'aprende'], evaluation: ['D18', 'F18'] },
  { id: 'ENT-1', area: 'ENT', bloom: 'Comprender', text: 'Describir a grandes rasgos cómo aprende un generador de imágenes.', steps: ['aprende'], evaluation: ['D02', 'F02'], content: false },
  { id: 'ENT-2', area: 'ENT', bloom: 'Comprender', text: 'Distinguir el entrenamiento general del ajuste de un modelo para imitar un estilo.', steps: ['aprende'], evaluation: ['D03', 'F03'], content: false },
  { id: 'MET-1', area: 'MET', bloom: 'Comprender', text: 'Identificar dónde declara un archivo su autoría e interpretar la auditoría.', steps: ['metadatos'], evaluation: ['D04', 'F04', 'E1'] },
  { id: 'MET-2', area: 'MET', bloom: 'Aplicar', text: 'Firmar una imagen con autoría y copyright y comprobar el resultado.', steps: ['metadatos'], evaluation: ['E1'] },
  { id: 'MET-3', area: 'MET', bloom: 'Aplicar', text: 'Reconocer el riesgo de la ubicación GPS y quitarla antes de publicar.', steps: ['metadatos', 'publicacion'], evaluation: ['D06', 'F06', 'E1'] },
  { id: 'MET-4', area: 'MET', bloom: 'Comprender', text: 'Leer el puntaje como un resumen de señales declaradas, no como una probabilidad.', steps: ['metadatos'], evaluation: ['D05', 'F05', 'D07', 'F07', 'E5'] },
  { id: 'EXC-1', area: 'EXC', bloom: 'Comprender', text: 'Distinguir las señales de exclusión y explicar que son peticiones, no barreras.', steps: ['aprende', 'exclusion'], evaluation: ['D08', 'F08', 'D09', 'F09'] },
  { id: 'EXC-2', area: 'EXC', bloom: 'Aplicar', text: 'Añadir señales de exclusión a una imagen y comprobar que se detectan.', steps: ['metadatos', 'exclusion'], evaluation: ['E1'] },
  { id: 'PER-1', area: 'PER', bloom: 'Comprender', text: 'Explicar la idea de una perturbación adversarial.', steps: ['aprende', 'perturbacion'], evaluation: ['D10', 'F10'] },
  { id: 'PER-2', area: 'PER', bloom: 'Comprender', text: 'Distinguir el cloaking del envenenamiento.', steps: ['aprende'], evaluation: ['D12', 'F12'] },
  { id: 'PER-3', area: 'PER', bloom: 'Analizar', text: 'Explicar los límites de una perturbación y comprobar cuánto resiste.', steps: ['perturbacion'], evaluation: ['D11', 'F11', 'E4'] },
  { id: 'MAR-1', area: 'MAR', bloom: 'Comprender', text: 'Explicar qué señala una marca de agua y qué no impide.', steps: ['aprende'], evaluation: ['D13', 'F13'] },
  { id: 'MAR-2', area: 'MAR', bloom: 'Evaluar', text: 'Comparar marca de agua y perturbación con las mismas medidas para elegir según el objetivo.', steps: ['perturbacion'], evaluation: ['E4'] },
  { id: 'C2P-1', area: 'C2P', bloom: 'Comprender', text: 'Explicar qué demuestra una credencial C2PA y qué no demuestra.', steps: ['aprende', 'metadatos'], evaluation: ['D14', 'F14'] },
  { id: 'C2P-2', area: 'C2P', bloom: 'Aplicar', text: 'Interpretar el estado C2PA de un archivo y decidir qué hacer.', steps: ['metadatos', 'publicacion'], evaluation: ['E3'] },
  { id: 'COM-1', area: 'COM', bloom: 'Comprender', text: 'Anticipar qué protecciones sobreviven a la compresión y el recorte de las plataformas.', steps: ['aprende', 'perturbacion', 'publicacion'], evaluation: ['D15', 'F15'] },
  { id: 'COM-2', area: 'COM', bloom: 'Aplicar', text: 'Usar el simulador y la suite de resistencia para comprobar qué sobrevive.', steps: ['perturbacion'], evaluation: ['E2'] },
  { id: 'PUB-1', area: 'PUB', bloom: 'Aplicar', text: 'Preparar una lista previa a publicar y planificar una nueva auditoría después.', steps: ['publicacion'], evaluation: ['D16', 'F16', 'E6'] },
  { id: 'PUB-2', area: 'PUB', bloom: 'Evaluar', text: 'Justificar por qué combinar capas, sin tomar la combinación como garantía.', steps: ['mapa', 'resumen'], evaluation: ['D17', 'F17', 'E6'] },
  { id: 'PUB-3', area: 'PUB', bloom: 'Comprender', text: 'Reconocer que los términos de la plataforma deciden qué puede hacer con lo que subes.', steps: ['publicacion'], evaluation: ['E6'] },
]

export const objectivesForStep = (stepId) => OBJECTIVES.filter((o) => o.steps.includes(stepId))

// Agrupa por área el `by_objective` que devuelve POST /api/knowledge/{phase}. `step` es el paso del recorrido
// donde se trabaja el área, para enlazar los temas que conviene reforzar.
export function areaResults(byObjective) {
  return Object.entries(AREAS)
    .map(([code, name]) => {
      const scored = Object.entries(byObjective).filter(([id]) => id.startsWith(`${code}-`)).map(([, v]) => v)
      const steps = OBJECTIVES.filter((o) => o.area === code).flatMap((o) => o.steps)
      return {
        code,
        name,
        correct: scored.reduce((n, v) => n + v.correct, 0),
        total: scored.reduce((n, v) => n + v.total, 0),
        step: steps.find((s) => s !== 'mapa' && s !== 'resumen') ?? steps[0],
      }
    })
    .filter((a) => a.total > 0)
}

// Función de cada paso del recorrido dentro de la secuencia instruccional.
export const STEP_ROLES = {
  mapa: { role: 'Organizador previo: presenta las cuatro capas y activa lo que ya sabes.', kind: ['Conceptual'] },
  aprende: { role: 'Presentación de conceptos y demostración con ejemplos precalculados.', kind: ['Conceptual', 'Demostrativo'] },
  metadatos: { role: 'Práctica guiada con tu archivo: auditar, firmar y volver a auditar.', kind: ['Práctico'] },
  exclusion: { role: 'Comprobación de la práctica anterior y consolidación del concepto.', kind: ['Práctico', 'Conceptual'] },
  perturbacion: { role: 'Demostración y experimentación con la técnica, sus medidas y su resistencia.', kind: ['Demostrativo', 'Práctico'] },
  publicacion: { role: 'Transferencia: decisiones de publicación sobre tu archivo actual.', kind: ['Práctico'] },
  resumen: { role: 'Síntesis, reflexión sobre el estado de cada capa y acceso a la evaluación.', kind: ['Reflexivo'] },
}

// status: 'hecho' | 'parcial' | 'pendiente'. Se describe lo que existe, sin presentarlo como validado.
export const PHASES = [
  {
    id: 'analisis',
    letter: 'A',
    title: 'Análisis',
    status: 'parcial',
    summary: 'Quién usa la plataforma, qué necesita aprender y qué limita la enseñanza.',
    done: [
      'Diagnóstico de los recursos educativos existentes en el código.',
      'Perfiles y niveles de alfabetización propuestos como hipótesis.',
      'Limitaciones técnicas y pedagógicas documentadas.',
    ],
    pending: ['Validar las hipótesis con entrevistas o encuestas a creadores visuales.'],
  },
  {
    id: 'diseno',
    letter: 'D',
    title: 'Diseño',
    status: 'hecho',
    summary: 'Objetivos medibles y su alineación con contenidos, actividades y evaluación.',
    done: [
      `${OBJECTIVES.length} objetivos de aprendizaje en ${Object.keys(AREAS).length} áreas.`,
      'Matriz de alineación y función de cada uno de los siete pasos.',
    ],
    pending: ['Revisión de los objetivos por la tutoría.'],
  },
  {
    id: 'desarrollo',
    letter: 'D',
    title: 'Desarrollo',
    status: 'parcial',
    summary: 'Los recursos que enseñan: textos, ejemplos, simulaciones y ejercicios.',
    done: [
      'Siete conceptos clave, comparador de ejemplos y herramientas de práctica reutilizadas.',
      'Instrumentos de evaluación propuestos: diagnóstico, evaluación final y escenarios.',
    ],
    pending: [
      'Contenido sobre cómo se entrena una IA.',
      'Imágenes de práctica y explicación de cada respuesta.',
    ],
  },
  {
    id: 'implementacion',
    letter: 'I',
    title: 'Implementación',
    status: 'parcial',
    summary: 'Cómo se integra todo en Aprendizaje sin añadir pasos nuevos.',
    done: [
      'Objetivos visibles en cada paso del recorrido.',
      'Diagnóstico inicial opcional en el mapa y evaluación final con explicación de cada respuesta en el resumen.',
      'Esta vista de diseño pedagógico.',
    ],
    pending: ['Escenarios prácticos: se aplican en sesiones facilitadas, fuera de la app.'],
  },
  {
    id: 'evaluacion',
    letter: 'E',
    title: 'Evaluación',
    status: 'parcial',
    summary: 'Medir conocimiento, capacidad de aplicar y usabilidad, por separado.',
    done: [
      'Escala SUS y cuestionario de comprensión anónimos.',
      'Diagnóstico y evaluación final corregidos en el servidor, con comparación antes y después y ganancia normalizada.',
      'Indicadores y criterios de interpretación definidos.',
    ],
    pending: [
      'Sustituir la escala SUS por su redacción validada.',
      'Validar los instrumentos y hacer una prueba piloto.',
    ],
  },
]

export const EVALUATION_DIMENSIONS = [
  { title: 'Conocimiento', how: 'Diagnóstico inicial y evaluación final con preguntas equivalentes, para comparar antes y después.', state: 'En la app, preguntas pendientes de validación' },
  { title: 'Capacidad de aplicar', how: 'Seis escenarios prácticos con rúbrica, resueltos con las herramientas de la app en una sesión facilitada.', state: 'Propuesta pendiente de validación' },
  { title: 'Usabilidad', how: 'Escala SUS de 10 ítems. Mide la facilidad de uso, no lo que se aprende.', state: 'En la app, redacción aún no verificada' },
]

export const RIGOR = [
  'Los metadatos no impiden técnicamente el scraping.',
  'Las etiquetas noai no garantizan que la imagen quede fuera del entrenamiento.',
  'C2PA no garantiza por sí solo que una obra sea auténtica.',
  'Una perturbación no da inmunidad frente a todos los modelos.',
  'El puntaje resume señales declaradas; no es la probabilidad de que la imagen se use.',
]
