import { useEffect, useRef, useState } from 'react'
import { SignIn, SignOut, Trash, UserCircle, X } from '@phosphor-icons/react'
import { networkText } from '../lib/account.js'

// Entrar o crear cuenta (diálogo nativo) y, con sesión, cerrarla o borrar la cuenta con todos sus datos.
export default function AccountMenu({ account, open, setOpen }) {
  const { user, login, register, logout, deleteAccount } = account
  const dialogRef = useRef(null)
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => {
    setOpen(false)
    setError(null)
    setPassword('')
    setConfirmDelete(false)
  }

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      close()
    } catch (e) {
      setError(networkText(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    run(() => (mode === 'login' ? login : register)(username.trim(), password))
  }

  return (
    <>
      <button type="button" className="btn btn-quiet text-sm" onClick={() => setOpen(true)}>
        {user
          ? <><UserCircle size={20} weight="fill" className="text-accent" aria-hidden="true" /> <span className="max-w-[10ch] truncate">{user.username}</span></>
          : <><SignIn size={18} aria-hidden="true" /> Iniciar sesión</>}
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        aria-labelledby="account-title"
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-box border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="account-title" className="text-xl font-bold tracking-tight">
              {user ? `Tu cuenta: ${user.username}` : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <button type="button" className="btn btn-quiet -mr-2 -mt-1 p-2" onClick={close} aria-label="Cerrar">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {user ? (
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-muted">
                Se guardan tus proyectos del recorrido de Aprendizaje, con sus ajustes e imágenes, y las imágenes que eliges guardar. Nada más.
              </p>
              <button type="button" className="btn btn-outline bg-white" disabled={busy} onClick={() => run(logout)}>
                <SignOut size={16} aria-hidden="true" /> Cerrar sesión
              </button>
              {confirmDelete ? (
                <div className="rounded-ctl border border-risk-high/40 bg-risk-high/5 p-4 text-sm">
                  <p className="font-semibold text-risk-high">¿Borrar la cuenta?</p>
                  <p className="mt-1 text-muted">Se eliminan para siempre tus proyectos y todas tus imágenes guardadas. No se puede deshacer.</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn bg-risk-high text-white" disabled={busy} onClick={() => run(deleteAccount)}>
                      <Trash size={16} aria-hidden="true" /> Sí, borrar todo
                    </button>
                    <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-quiet text-risk-high" onClick={() => setConfirmDelete(true)}>
                  <Trash size={16} aria-hidden="true" /> Eliminar mi cuenta y mis datos
                </button>
              )}
            </div>
          ) : (
            <form className="mt-4 grid gap-4" onSubmit={submit}>
              <p className="text-sm text-muted">
                La cuenta es opcional. Sirve para guardar tus imágenes y retomar el recorrido. Solo pedimos un nombre de usuario,
                sin correo.
              </p>
              <div>
                <label htmlFor="acc-user" className="text-sm font-medium text-muted">Nombre de usuario</label>
                <input
                  id="acc-user" type="text" required minLength={3} maxLength={32} pattern={'[A-Za-z0-9_.\\-]{3,32}'}
                  autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-ctl border-2 border-line bg-white px-4 py-2.5 font-medium focus:border-accent focus:outline-none"
                />
                {mode === 'register' && <p className="mt-1 text-xs text-muted">De 3 a 32 caracteres: letras, números, punto, guion o guion bajo.</p>}
              </div>
              <div>
                <label htmlFor="acc-pass" className="text-sm font-medium text-muted">Contraseña</label>
                <input
                  id="acc-pass" type="password" required minLength={8} maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-ctl border-2 border-line bg-white px-4 py-2.5 font-medium focus:border-accent focus:outline-none"
                />
                {mode === 'register' && <p className="mt-1 text-xs text-muted">Al menos 8 caracteres. No hay recuperación por correo: guárdala bien.</p>}
              </div>
              {error && <p role="alert" className="text-sm text-risk-high">{error}</p>}
              <button type="submit" className="btn btn-primary py-3" disabled={busy}>
                {busy ? 'Un momento...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
              <p className="text-center text-sm text-muted">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  type="button" className="font-medium text-accent underline underline-offset-4"
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
                >
                  {mode === 'login' ? 'Crear una' : 'Iniciar sesión'}
                </button>
              </p>
            </form>
          )}
        </div>
      </dialog>
    </>
  )
}
