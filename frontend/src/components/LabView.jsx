import { CloudCheck, Flask, FolderSimple, FolderSimplePlus } from '@phosphor-icons/react'
import AuditDropzone from './AuditDropzone.jsx'
import DiagnosticPanel from './DiagnosticPanel.jsx'
import MetadataSigner from './MetadataSigner.jsx'
import ProtectionLab from './ProtectionLab.jsx'
import StressSimulator from './StressSimulator.jsx'
import ResistanceTable from './ResistanceTable.jsx'
import MyImages from './MyImages.jsx'
import SaveImageButton from './SaveImageButton.jsx'
import { useAccount } from '../lib/account.js'

// Barra del proyecto abierto: dónde se guarda lo que se hace aquí.
function ProjectBar({ lab, onProjects, onLogin }) {
  const { user } = useAccount()
  const base = 'mt-6 flex flex-wrap items-center justify-between gap-3 rounded-box border px-5 py-4'
  if (!user) {
    return (
      <div className={`${base} border-line bg-white`}>
        <p className="text-sm text-muted">Con una cuenta puedes guardar tu trabajo en proyectos y retomarlo cuando quieras.</p>
        <button type="button" className="btn btn-outline bg-white text-sm" onClick={onLogin}>Iniciar sesión</button>
      </div>
    )
  }
  if (!lab.project) {
    return (
      <div className={`${base} border-dashed border-line bg-white`}>
        <p className="flex items-center gap-2 text-sm text-muted">
          <FolderSimple size={20} aria-hidden="true" /> Sin proyecto abierto: lo que hagas aquí no se guarda.
        </p>
        <button type="button" className="btn btn-primary text-sm" onClick={onProjects}>
          <FolderSimplePlus size={16} aria-hidden="true" /> {lab.hasWork ? 'Guardar como proyecto' : 'Abrir o crear un proyecto'}
        </button>
      </div>
    )
  }
  return (
    <div className={`${base} border-accent/30 bg-accent/5`}>
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <CloudCheck size={20} weight="fill" className="shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0">
          Proyecto <span className="font-semibold">{lab.project.name}</span>
          <span className="text-muted">: la firma, los ajustes y la imagen que subes se guardan solos.</span>
        </span>
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline bg-white text-sm" onClick={onProjects}>Mis proyectos</button>
        <button type="button" className="btn btn-quiet text-sm" onClick={lab.close}>Cerrar proyecto</button>
      </div>
    </div>
  )
}

// Laboratorio: las mismas herramientas del recorrido, sin pasos ni orden. Su estado vive en App (useLabProject).
export default function LabView({ lab, onProjects, onLogin }) {
  const { source, audit } = lab

  return (
    <section aria-labelledby="step-title">
      <div className="hero-panel px-6 py-10 sm:px-10 sm:py-12">
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ctl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <Flask size={26} weight="fill" aria-hidden="true" />
          </span>
          <div>
            <h2 id="step-title" tabIndex={-1} className="text-4xl font-bold tracking-tighter outline-none sm:text-5xl">Laboratorio</h2>
            <p className="mt-3 max-w-[60ch] text-white/85">
              Usa las herramientas libremente: audita, firma, aplica la perturbación y pon a prueba tus imágenes. Con un proyecto
              abierto, tu trabajo queda guardado para retomarlo después.
            </p>
          </div>
        </div>
      </div>

      <ProjectBar lab={lab} onProjects={onProjects} onLogin={onLogin} />

      <div className="mt-12">
        <h3 className="text-2xl font-bold tracking-tight">Auditar y firmar</h3>
        <div className="mt-5">
          <AuditDropzone onResult={lab.onUpload} hasResult={Boolean(audit)} />
          {/* Con un proyecto abierto, la imagen subida ya se guardó en él (source.imageId). */}
          {source && !source.imageId && <SaveImageButton source={source.file} filename={source.file.name} kind="original" className="mt-3 max-w-xs" />}
          {audit && <DiagnosticPanel result={audit} />}
          {source && (
            <div className="mt-12">
              <MetadataSigner
                file={source.file}
                filename={source.file.name}
                identity={lab.identity}
                setIdentity={lab.setIdentity}
                beforeScore={source.audit.vulnerability_score}
                onSigned={(signedAudit) => lab.setAudit(signedAudit)}
                title="Firma tu imagen"
                intro="Escribimos tu autoría, el copyright y, si quieres, las señales de exclusión de IA en el archivo. Después lo auditamos de nuevo para comprobarlo."
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <ProtectionLab
          identity={lab.identity} setIdentity={lab.setIdentity} protection={lab.protection} setProtection={lab.setProtection}
        />
      </div>
      <div className="mt-10">
        <StressSimulator settings={lab.stress} setSettings={lab.setStress} />
      </div>
      <div className="mt-10">
        <ResistanceTable />
      </div>

      <div className="mt-12">
        <MyImages onLogin={onLogin} />
      </div>
    </section>
  )
}
