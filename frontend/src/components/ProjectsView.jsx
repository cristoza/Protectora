import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowLeft, ArrowRight, CalendarBlank, Check, ClockCounterClockwise, DownloadSimple, Flask, FolderOpen, FolderSimple,
  FolderSimplePlus, ImageSquare, MagnifyingGlass, PencilSimple, Trash, X,
} from '@phosphor-icons/react'
import { KIND, deleteImage, getProject, listProjects, networkText, useAccount } from '../lib/account.js'
import { useStagger } from '../lib/motion.js'

const RISK = {
  alto: 'bg-risk-high/10 text-risk-high',
  medio: 'bg-risk-mid/10 text-risk-mid',
  bajo: 'bg-risk-low/10 text-risk-low',
}
const STRENGTH = { baja: 'Baja', media: 'Media', alta: 'Alta' }

const fullDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// "hace 5 minutos", "ayer", "hace 3 días"...
function ago(iso) {
  const seconds = (new Date(iso) - Date.now()) / 1000
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'hace un momento'
}

// Grupo de fecha de un proyecto: Hoy, Ayer, Últimos 7 días o el mes ("Octubre de 2026").
function dateGroup(iso) {
  const date = new Date(iso)
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return 'Últimos 7 días'
  const month = date.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return month.charAt(0).toUpperCase() + month.slice(1)
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-full bg-raised p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${value === o.id ? 'bg-white text-ink shadow' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Cover({ imageId, className = '' }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-accent/10 via-raised to-accent-2/15 ${className}`}>
      {imageId
        ? <img src={`/api/images/${imageId}/file`} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <FolderSimple size={44} weight="duotone" className="text-accent/50" aria-hidden="true" />}
    </div>
  )
}

function ConfirmDelete({ count, busy, onConfirm, onCancel }) {
  return (
    <div className="rounded-ctl border border-risk-high/40 bg-risk-high/5 p-3 text-sm">
      <p className="text-muted">
        Se borran para siempre el proyecto y {count === 1 ? 'su imagen' : `sus ${count} imágenes`}. No se puede deshacer.
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn bg-risk-high text-sm text-white" disabled={busy} onClick={onConfirm}>
          <Trash size={14} aria-hidden="true" /> Sí, borrar
        </button>
        <button type="button" className="btn btn-quiet text-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

function ProjectCard({ project, active, dateField, item, onOpen, onDetail, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const shown = project[dateField]
  return (
    <motion.li {...item} className={`card flex flex-col overflow-hidden ${active ? 'ring-2 ring-accent' : ''}`}>
      <button type="button" onClick={onDetail} className="group relative block text-left" aria-label={`Ver ${project.name}`}>
        <Cover imageId={project.cover_id} className="aspect-[16/10] transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="num absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow backdrop-blur">
          <CalendarBlank size={12} aria-hidden="true" /> {shortDate.format(new Date(shown))}
        </span>
        {active && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink shadow">Abierto</span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-5">
        <h4 className="truncate text-lg font-bold tracking-tight" title={project.name}>{project.name}</h4>
        <p className="mt-1 text-xs text-muted">
          Creado {fullDate.format(new Date(project.created_at))} · modificado {ago(project.updated_at)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          <span className="num rounded-full bg-raised px-2.5 py-1">
            {project.image_count} {project.image_count === 1 ? 'imagen' : 'imágenes'}
          </span>
          {project.risk_level && <span className={`rounded-full px-2.5 py-1 ${RISK[project.risk_level]}`}>Riesgo {project.risk_level}</span>}
          {project.author && <span className="max-w-[16ch] truncate rounded-full bg-raised px-2.5 py-1">{project.author}</span>}
        </div>
        <div className="mt-auto pt-5">
          {confirm ? (
            <ConfirmDelete
              count={project.image_count} busy={busy} onCancel={() => setConfirm(false)}
              onConfirm={async () => { setBusy(true); try { await onDelete() } finally { setBusy(false) } }}
            />
          ) : (
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary flex-1 text-sm" onClick={onOpen}>
                <Flask size={16} aria-hidden="true" /> {active ? 'Seguir en el laboratorio' : 'Abrir en el laboratorio'}
              </button>
              <button type="button" className="btn btn-quiet p-2.5 text-risk-high" onClick={() => setConfirm(true)} aria-label={`Borrar ${project.name}`}>
                <Trash size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  )
}

function Setting({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  )
}

function ProjectDetail({ id, active, onBack, onOpen, onDelete, onRename }) {
  const { imagesVersion, imagesChanged } = useAccount()
  const [project, setProject] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProject(id)
      .then((p) => { if (!cancelled) setProject(p) })
      .catch((e) => { if (!cancelled) setError(networkText(e)) })
    return () => { cancelled = true }
  }, [id, imagesVersion])

  const act = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(networkText(e))
    } finally {
      setBusy(false)
    }
  }

  const rename = (e) => {
    e.preventDefault()
    const name = editing.trim()
    if (!name) return
    act(async () => {
      await onRename(name)
      setProject((p) => ({ ...p, name }))
      setEditing(null)
    })
  }

  if (error && !project) return <p role="alert" className="mt-8 text-sm text-risk-high">{error}</p>
  if (!project) return <p className="mt-8 text-sm text-muted">Cargando...</p>

  const { identity = {}, protection = {}, stress = {}, audit } = project.state

  return (
    <div className="mt-8">
      <button type="button" className="btn btn-quiet group -ml-3" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-1" /> Todos los proyectos
      </button>

      <div className="card mt-4 overflow-hidden">
        <div className="grid md:grid-cols-[18rem_1fr]">
          <Cover imageId={project.images.find((i) => i.mime !== 'image/tiff')?.id} className="aspect-[16/10] md:aspect-auto md:h-full" />
          <div className="p-6">
            {editing !== null ? (
              <form className="flex gap-2" onSubmit={rename}>
                <label htmlFor="rename-project" className="sr-only">Nuevo nombre</label>
                <input
                  id="rename-project" type="text" required maxLength={80} autoFocus value={editing} onChange={(e) => setEditing(e.target.value)}
                  className="min-w-0 flex-1 rounded-ctl border-2 border-line bg-white px-3 py-2 text-xl font-bold focus:border-accent focus:outline-none"
                />
                <button type="submit" className="btn btn-quiet p-2.5" disabled={busy} aria-label="Guardar el nombre"><Check size={18} aria-hidden="true" /></button>
                <button type="button" className="btn btn-quiet p-2.5" onClick={() => setEditing(null)} aria-label="Cancelar"><X size={18} aria-hidden="true" /></button>
              </form>
            ) : (
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 break-words text-3xl font-bold tracking-tight">{project.name}</h3>
                <button type="button" className="btn btn-quiet mt-1 p-2" onClick={() => setEditing(project.name)} aria-label="Renombrar el proyecto">
                  <PencilSimple size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarBlank size={15} aria-hidden="true" /> Creado {fullDate.format(new Date(project.created_at))}</span>
              <span className="inline-flex items-center gap-1.5"><ClockCounterClockwise size={15} aria-hidden="true" /> Modificado {fullDate.format(new Date(project.updated_at))}</span>
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-risk-high">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={onOpen}>
                <Flask size={16} aria-hidden="true" /> {active ? 'Seguir en el laboratorio' : 'Abrir en el laboratorio'}
              </button>
              {!confirm && (
                <button type="button" className="btn btn-quiet text-risk-high" onClick={() => setConfirm(true)}>
                  <Trash size={16} aria-hidden="true" /> Borrar proyecto
                </button>
              )}
            </div>
            {confirm && (
              <div className="mt-3 max-w-md">
                <ConfirmDelete count={project.images.length} busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => act(onDelete)} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section className="card p-5" aria-labelledby="cfg-sign">
          <h4 id="cfg-sign" className="font-bold tracking-tight">Firma</h4>
          <dl className="mt-2">
            <Setting label="Autor">{identity.author || 'Sin definir'}</Setting>
            <Setting label="Copyright">{identity.copyright || (identity.author ? 'Automático' : 'Sin definir')}</Setting>
            <Setting label="Exclusión de IA">{identity.aiOptOut ? 'Sí' : 'No'}</Setting>
            <Setting label="Quitar GPS">{identity.stripGps ? 'Sí' : 'No'}</Setting>
          </dl>
        </section>
        <section className="card p-5" aria-labelledby="cfg-protect">
          <h4 id="cfg-protect" className="font-bold tracking-tight">Perturbación</h4>
          <dl className="mt-2">
            <Setting label="Intensidad">{STRENGTH[protection.strength] || 'Media'}</Setting>
            <Setting label="Texto de la marca">{protection.watermarkText || '© Autor'}</Setting>
            <Setting label="Opacidad de la marca"><span className="num">{protection.watermarkOpacity ?? 35} %</span></Setting>
          </dl>
        </section>
        <section className="card p-5" aria-labelledby="cfg-stress">
          <h4 id="cfg-stress" className="font-bold tracking-tight">Prueba de estrés</h4>
          <dl className="mt-2">
            <Setting label="Calidad JPEG"><span className="num">{stress.quality ?? 60}</span></Setting>
            <Setting label="Escala"><span className="num">{stress.scalePct ?? 50} %</span></Setting>
            <Setting label="Pasadas"><span className="num">{stress.passes ?? 1}</span></Setting>
            <Setting label="Última auditoría">
              {audit ? <span className="num">{audit.vulnerability_score}/100, riesgo {audit.risk_level}</span> : 'Ninguna'}
            </Setting>
          </dl>
        </section>
      </div>

      <section className="mt-10" aria-labelledby="project-images">
        <h4 id="project-images" className="text-xl font-bold tracking-tight">
          Imágenes <span className="num text-base font-medium text-muted">({project.images.length})</span>
        </h4>
        {project.images.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Este proyecto aún no tiene imágenes. Ábrelo en el laboratorio y sube una, o usa “Guardar en mi cuenta” junto a cada resultado.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {project.images.map((img) => {
              const url = `/api/images/${img.id}/file`
              return (
                <li key={img.id} className="overflow-hidden rounded-box border border-line bg-white">
                  <div className="flex aspect-[4/3] items-center justify-center bg-raised">
                    {img.mime === 'image/tiff'
                      ? <ImageSquare size={36} className="text-muted" aria-hidden="true" />
                      : <img src={url} alt={img.filename} loading="lazy" className="h-full w-full object-contain" />}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{KIND[img.kind]}</p>
                    <p className="mt-1 truncate font-medium" title={img.filename}>{img.filename}</p>
                    <p className="num mt-1 text-xs text-muted">
                      {fullDate.format(new Date(img.created_at))} · exposición {img.audit.vulnerability_score}/100
                    </p>
                    <div className="mt-3 flex gap-2">
                      <a href={url} download={img.filename} className="btn btn-outline flex-1 bg-white text-sm">
                        <DownloadSimple size={14} aria-hidden="true" /> Descargar
                      </a>
                      <button
                        type="button" className="btn btn-quiet p-2.5 text-risk-high" disabled={busy}
                        onClick={() => act(async () => { await deleteImage(img.id); imagesChanged() })}
                        aria-label={`Borrar ${img.filename}`}
                      >
                        <Trash size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

// Página de proyectos del Laboratorio: agrupados por fecha, con búsqueda, detalle, apertura y borrado.
export default function ProjectsView({ lab, onGoLab, onLogin }) {
  const { list, item } = useStagger(0.05)
  const { user, imagesVersion } = useAccount()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [dateField, setDateField] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    listProjects()
      .then((l) => { if (!cancelled) { setProjects(l); setError(null) } })
      .catch((e) => { if (!cancelled) setError(networkText(e)) })
    return () => { cancelled = true }
  }, [user, imagesVersion, lab.project])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = (projects || [])
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q))
      .sort((a, b) => (order === 'desc' ? -1 : 1) * (new Date(a[dateField]) - new Date(b[dateField])))
    // La lista ya está ordenada por fecha, así que cada grupo queda contiguo.
    const out = []
    for (const p of sorted) {
      const label = dateGroup(p[dateField])
      if (out.at(-1)?.label !== label) out.push({ label, items: [] })
      out.at(-1).items.push(p)
    }
    return out
  }, [projects, query, dateField, order])

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(networkText(e))
    } finally {
      setBusy(false)
    }
  }

  const openInLab = (id) => run(async () => {
    if (lab.project?.id !== id) await lab.open(id)
    onGoLab()
  })

  const create = (keepCurrent) => run(async () => {
    await lab.create(name.trim() || `Proyecto del ${shortDate.format(new Date())}`, keepCurrent)
    setName('')
    onGoLab()
  })

  const remove = async (id) => {
    await lab.remove(id)
    setSelected(null)
  }

  const imageTotal = (projects || []).reduce((n, p) => n + p.image_count, 0)
  const last = (projects || []).reduce((a, p) => (!a || p.updated_at > a.updated_at ? p : a), null)

  return (
    <section aria-labelledby="step-title">
      <div className="hero-panel px-6 py-10 sm:px-10 sm:py-12">
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ctl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <FolderSimple size={26} weight="fill" aria-hidden="true" />
            </span>
            <div>
              <h2 id="step-title" tabIndex={-1} className="text-4xl font-bold tracking-tighter outline-none sm:text-5xl">Proyectos</h2>
              <p className="mt-3 max-w-[58ch] text-white/85">
                Cada proyecto guarda tu trabajo en el Laboratorio: las imágenes, la firma y los ajustes de perturbación y de
                estrés tal como los dejaste.
              </p>
            </div>
          </div>
          {user && projects && (
            <dl className="num flex gap-6 text-white">
              <div><dt className="text-xs uppercase tracking-[0.14em] text-white/70">Proyectos</dt><dd className="text-3xl font-bold">{projects.length}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.14em] text-white/70">Imágenes</dt><dd className="text-3xl font-bold">{imageTotal}</dd></div>
              {last && <div><dt className="text-xs uppercase tracking-[0.14em] text-white/70">Última edición</dt><dd className="mt-2 text-sm font-semibold">{ago(last.updated_at)}</dd></div>}
            </dl>
          )}
        </div>
      </div>

      {!user ? (
        <div className="card mt-8 flex flex-col items-center gap-3 p-10 text-center">
          <FolderSimple size={48} weight="duotone" className="text-accent" aria-hidden="true" />
          <p className="max-w-[48ch] text-muted">Los proyectos se guardan en tu cuenta. Sin cuenta, nada se guarda.</p>
          <button type="button" className="btn btn-primary" onClick={onLogin}>Iniciar sesión o crear cuenta</button>
        </div>
      ) : selected ? (
        <ProjectDetail
          key={selected}
          id={selected}
          active={lab.project?.id === selected}
          onBack={() => setSelected(null)}
          onOpen={() => openInLab(selected)}
          onDelete={() => remove(selected)}
          onRename={(n) => lab.rename(selected, n)}
        />
      ) : (
        <>
          <form
            className="card mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
            onSubmit={(e) => { e.preventDefault(); create(false) }}
          >
            <div className="flex-1">
              <label htmlFor="project-name" className="text-sm font-medium text-muted">Nuevo proyecto</label>
              <input
                id="project-name" type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Por ejemplo, Retratos para Instagram"
                className="mt-1.5 w-full rounded-ctl border-2 border-line bg-white px-4 py-2.5 font-medium focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {lab.hasWork && !lab.project && (
                <button type="button" className="btn btn-outline bg-white" disabled={busy} onClick={() => create(true)}>
                  <Flask size={16} aria-hidden="true" /> Guardar el laboratorio actual
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <FolderSimplePlus size={16} aria-hidden="true" /> Crear y abrir
              </button>
            </div>
          </form>

          {lab.project && (
            <p className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-ctl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              <span><FolderOpen size={16} weight="fill" className="mr-1.5 inline text-accent" aria-hidden="true" />Abierto en el laboratorio: <span className="font-semibold">{lab.project.name}</span></span>
              <button type="button" className="font-medium text-accent underline underline-offset-4" onClick={onGoLab}>
                Ir al laboratorio <ArrowRight size={14} className="inline" aria-hidden="true" />
              </button>
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[14rem] flex-1">
              <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <label htmlFor="project-search" className="sr-only">Buscar proyectos</label>
              <input
                id="project-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o autor"
                className="w-full rounded-full border-2 border-line bg-white py-2 pl-10 pr-4 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
            <Segmented
              label="Fecha" value={dateField} onChange={setDateField}
              options={[{ id: 'created_at', label: 'Fecha de creación' }, { id: 'updated_at', label: 'Última modificación' }]}
            />
            <Segmented
              label="Orden" value={order} onChange={setOrder}
              options={[{ id: 'desc', label: 'Recientes' }, { id: 'asc', label: 'Antiguos' }]}
            />
          </div>

          {error && <p role="alert" className="mt-6 text-sm text-risk-high">{error}</p>}

          {projects === null ? (
            !error && <p className="mt-8 text-sm text-muted">Cargando...</p>
          ) : projects.length === 0 ? (
            <div className="card mt-8 flex flex-col items-center gap-3 border-dashed p-12 text-center">
              <FolderSimplePlus size={48} weight="duotone" className="text-accent" aria-hidden="true" />
              <p className="text-lg font-bold tracking-tight">Todavía no tienes proyectos</p>
              <p className="max-w-[48ch] text-sm text-muted">Crea uno arriba y ábrelo en el laboratorio: lo que hagas allí se guardará solo.</p>
            </div>
          ) : groups.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Ningún proyecto coincide con “{query}”.</p>
          ) : (
            groups.map((g) => (
              <section key={`${dateField}-${order}-${g.label}`} className="mt-10" aria-label={g.label}>
                <h3 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                  {g.label} <span className="num rounded-full bg-raised px-2 py-0.5 text-xs">{g.items.length}</span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </h3>
                <motion.ul {...list} className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      active={lab.project?.id === p.id}
                      dateField={dateField}
                      item={item}
                      onOpen={() => openInLab(p.id)}
                      onDetail={() => setSelected(p.id)}
                      onDelete={() => run(() => remove(p.id))}
                    />
                  ))}
                </motion.ul>
              </section>
            ))
          )}
        </>
      )}
    </section>
  )
}
