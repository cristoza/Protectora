import StepFrame from '../StepFrame.jsx'
import ProtectionLab from '../ProtectionLab.jsx'
import StressSimulator from '../StressSimulator.jsx'
import ResistanceTable from '../ResistanceTable.jsx'
import { SealCheck } from '@phosphor-icons/react'
import CheckCard from '../CheckCard.jsx'
import { stepById } from '../../data/layers.js'

export default function PerturbationStep({ perturbed, setPerturbed, cloaked, onProtected, onSigned, identity, setIdentity }) {
  return (
    <StepFrame step={stepById('perturbacion')}>
      <p className="max-w-[60ch] text-muted">
        Para una persona la obra se ve casi igual. Para un modelo, lo que aprende de ella puede quedar distorsionado.
        No es una garantía: su eficacia cambia con la herramienta y con los modelos que intenten entrenar.
      </p>
      <div className="mt-10">
        <ProtectionLab onProtected={onProtected} onSigned={onSigned} identity={identity} setIdentity={setIdentity} />
      </div>
      <div className="mt-10">
        <StressSimulator />
      </div>
      <div className="mt-10">
        <ResistanceTable />
      </div>
      <div className="mt-8 grid max-w-xl gap-3">
        {cloaked && (
          <p className="flex items-start gap-3 rounded-ctl border border-risk-low/40 bg-risk-low/5 p-4 text-sm">
            <SealCheck size={22} weight="fill" className="shrink-0 text-risk-low" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Capa lista: generaste aquí una versión con perturbación.</span>
              <span className="text-muted">Publica esa versión, firmada, en lugar del original.</span>
            </span>
          </p>
        )}
        <CheckCard
          checked={perturbed}
          onChange={setPerturbed}
          title={cloaked ? 'También apliqué otra herramienta (Glaze, Nightshade...)' : 'Ya apliqué una herramienta de perturbación a mi imagen'}
          hint="Lo que hagas fuera de esta app no se puede verificar desde aquí. Lo marcas tú para llevar tu resumen."
        />
      </div>
    </StepFrame>
  )
}
