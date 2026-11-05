// Opción de respuesta con aspecto de tarjeta (radio por defecto, checkbox para respuestas múltiples).
// La comparten la escala SUS y las pruebas de conocimientos.
export default function Choice({ name, value, checked, onChange, children, type = 'radio' }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-ctl border p-3 text-sm transition-colors ${checked ? 'border-accent bg-accent/5' : 'border-line bg-white hover:border-accent/50'}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="mt-0.5 accent-[var(--accent)]" />
      <span>{children}</span>
    </label>
  )
}
