// Módulo 1: alfabetización algorítmica. Textos breves, en vocabulario de diseño, sin tecnicismos
// innecesarios. Cada sección enlaza con el paso de la guía donde se pone en práctica.

export const LITERACY = [
  {
    id: 'scraping',
    icon: 'Robot',
    title: 'Qué es el web scraping',
    body: 'Son programas que recorren la web y descargan imágenes en masa, sin pedir permiso a nadie. Con esas colecciones, a veces de miles de millones de imágenes, se entrenan los generadores de imágenes.',
    takeaway: 'Si tu obra está publicada y se puede ver sin iniciar sesión, puede acabar en una de esas colecciones.',
  },
  {
    id: 'noai',
    icon: 'Prohibit',
    title: 'Directivas noai',
    body: 'Son etiquetas que se escriben dentro del archivo o en la página web, como "noai", "noimageai", el campo Data Mining de IPTC o TDMRep. Dicen: no uses esta imagen para entrenar IA.',
    takeaway: 'Son una petición, no un candado. Funcionan si quien descarga la imagen decide respetarlas.',
    goTo: 'exclusion',
  },
  {
    id: 'adversarial',
    icon: 'Sparkle',
    title: 'Perturbación adversarial',
    body: 'Consiste en cambiar los píxeles muy poco, casi sin que una persona lo note, pero de una forma calculada para que un modelo "vea" otra cosa. Es lo que hacen herramientas como Glaze o Mist.',
    takeaway: 'Protege frente a los modelos para los que se calculó. Un modelo distinto o un filtro fuerte pueden reducir su efecto.',
    goTo: 'perturbacion',
  },
  {
    id: 'cloaking',
    icon: 'Shield',
    title: 'Cloaking frente a envenenamiento',
    body: 'El cloaking (como Glaze) esconde tu estilo: el modelo aprende algo distinto de lo que tú dibujas. El envenenamiento (como Nightshade) va más allá: enseña al modelo asociaciones falsas, por ejemplo que un perro es un gato, para dañar lo que aprende.',
    takeaway: 'El primero defiende tu obra. El segundo busca además que entrenar sin permiso salga caro.',
  },
  {
    id: 'watermark',
    icon: 'Stamp',
    title: 'Marcas de agua',
    body: 'Una marca visible, como tu nombre repetido sobre la imagen, deja claro de quién es y es fácil de reclamar. Una marca invisible se esconde en los píxeles y solo la lee un programa.',
    takeaway: 'Un modelo puede aprender tu imagen con marca y todo, y las herramientas de relleno pueden borrarla. Señala autoría, no impide el entrenamiento.',
  },
  {
    id: 'c2pa',
    icon: 'SealCheck',
    title: 'Credenciales C2PA',
    body: 'C2PA es un estándar para adjuntar al archivo un registro firmado de quién creó la imagen y qué ediciones tuvo. Si alguien cambia un solo píxel, la firma deja de ser válida.',
    takeaway: 'Sirve para demostrar origen, no para impedir copias. Y desaparece en cuanto la imagen se recomprime.',
  },
  {
    id: 'compression',
    icon: 'ArrowsIn',
    title: 'Compresión y recorte',
    body: 'Al publicar, las plataformas suelen reducir el tamaño de la imagen y volver a guardarla en JPEG para que pese menos. En ese proceso muchas borran los metadatos y suavizan los detalles finos.',
    takeaway: 'Lo que escribes en los metadatos puede no llegar a internet. Comprueba siempre la versión publicada.',
    goTo: 'publicacion',
  },
]
