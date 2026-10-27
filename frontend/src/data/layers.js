// Fuente única de la guía: orden de los pasos, qué recibe y qué entrega cada capa,
// y cómo se calcula el estado de cada una a partir del estado de la app.

export const STEPS = [
  {
    id: 'mapa',
    title: 'Mapa de capas',
    short: 'Visión general',
  },
  {
    id: 'metadatos',
    layer: 1,
    title: 'Autoría en los metadatos',
    short: 'Quién la hizo',
    lead: 'Cada archivo puede llevar escrito su autor y su copyright. Aquí revisamos qué dice el tuyo.',
    receives: 'Tu archivo original, tal como sale de tu cámara o programa.',
    passes: 'La lista de campos encontrados, que la capa 2 usa para buscar señales de exclusión.',
  },
  {
    id: 'exclusion',
    layer: 2,
    title: 'Señales de exclusión de IA',
    short: 'Qué pides que no se haga',
    lead: 'Hay etiquetas que piden que la imagen no se use para entrenar modelos. Comprobamos si tu archivo las trae.',
    receives: 'Los campos y el XMP que leyó la capa 1.',
    passes: 'Una imagen que declara su postura. La capa 3 se ocupa de lo que las etiquetas no pueden impedir.',
  },
  {
    id: 'perturbacion',
    layer: 3,
    title: 'Perturbación visual',
    short: 'Cambios en los píxeles',
    lead: 'Herramientas como Glaze y Nightshade alteran los píxeles para dificultar que un modelo aprenda de la imagen.',
    receives: 'La imagen con sus metadatos ya revisados.',
    passes: 'La versión protegida que realmente vas a publicar, lista para la capa 4.',
  },
  {
    id: 'publicacion',
    layer: 4,
    title: 'Dónde y cómo publicas',
    short: 'El último eslabón',
    lead: 'Aun con buenas capas, la plataforma donde subes la imagen puede borrar tus metadatos o fijar sus propias reglas.',
    receives: 'La versión protegida de la capa 3 con los metadatos de las capas 1 y 2.',
    passes: 'Una imagen publicada. Conviene auditarla de nuevo para confirmar qué sobrevivió.',
  },
  {
    id: 'resumen',
    title: 'Resumen',
    short: 'Estado de tus capas',
  },
]

export const LAYER_STEPS = STEPS.filter((s) => s.layer)

export const PUBLISH_CHECKS = [
  { id: 'terms', label: 'Leí qué dice la plataforma sobre el uso de imágenes para entrenar IA' },
  { id: 'gps', label: 'Publico una copia sin datos de ubicación (GPS)' },
  { id: 'original', label: 'Conservo el archivo original sin modificar' },
  { id: 'recheck', label: 'Descargaré mi imagen publicada y la auditaré otra vez' },
]

// 'done' | 'missing' | 'pending' | null
export function getStatus(id, { audit, perturbed, cloaked, checks }) {
  switch (id) {
    case 'metadatos':
      if (!audit) return 'pending'
      return audit.has_author && audit.has_copyright ? 'done' : 'missing'
    case 'exclusion':
      if (!audit) return 'pending'
      return audit.exclusion_tags.length > 0 ? 'done' : 'missing'
    case 'perturbacion':
      // Lista si se generó aquí una versión protegida o si la persona declara haber usado otra herramienta.
      return perturbed || cloaked ? 'done' : 'pending'
    case 'publicacion':
      return PUBLISH_CHECKS.every((c) => checks[c.id]) ? 'done' : 'pending'
    default:
      return null
  }
}

export const STATUS_LABEL = { done: 'Lista', missing: 'Falta algo', pending: 'Por revisar' }
