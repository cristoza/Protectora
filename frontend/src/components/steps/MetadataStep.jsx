import StepFrame from '../StepFrame.jsx'
import AuditDropzone from '../AuditDropzone.jsx'
import DiagnosticPanel from '../DiagnosticPanel.jsx'
import MetadataSigner from '../MetadataSigner.jsx'
import SaveImageButton from '../SaveImageButton.jsx'
import { stepById } from '../../data/layers.js'

export default function MetadataStep({ audit, source, onResult, onSigned, identity, setIdentity }) {
  return (
    <StepFrame step={stepById('metadatos')}>
      <AuditDropzone onResult={onResult} hasResult={Boolean(audit)} />
      {source && <SaveImageButton source={source.file} filename={source.file.name} kind="original" className="mt-3 max-w-xs" />}
      {audit && <DiagnosticPanel result={audit} />}
      {source && (
        <div className="mt-12">
          <MetadataSigner
            file={source.file}
            filename={source.file.name}
            identity={identity}
            setIdentity={setIdentity}
            beforeScore={source.audit.vulnerability_score}
            onSigned={onSigned}
            title="Firma tu imagen"
            intro="Escribimos tu autoría, el copyright y, si quieres, las señales de exclusión de IA (capa 2) en el archivo. Después lo auditamos de nuevo para comprobarlo."
          />
        </div>
      )}
    </StepFrame>
  )
}
