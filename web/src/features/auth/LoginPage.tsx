import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toApiError } from '@/lib/api'
import { Alert, Button, Checkbox, Field } from '@/ui'
import { AuthLayout, AuthSwitchLink } from './AuthLayout'
import { safeNext } from './guards'
import { useSession } from './session'
import { checkEmail, firstInvalid, type FieldErrors } from './validation'

type Key = 'email' | 'password'
const ORDER: Key[] = ['email', 'password']

export function LoginPage() {
  const login = useSession((s) => s.login)
  const notice = useSession((s) => s.notice)
  const clearNotice = useSession((s) => s.clearNotice)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')

  const [values, setValues] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FieldErrors<Key>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const inputs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) }
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formError) alertRef.current?.focus()
  }, [formError])

  const update = (key: Key) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const found: FieldErrors<Key> = {
      email: checkEmail(values.email),
      password: values.password ? undefined : 'Saisissez votre mot de passe.',
    }
    setErrors(found)
    const first = firstInvalid(ORDER, found)
    if (first) {
      inputs[first].current?.focus()
      return
    }

    setSubmitting(true)
    setFormError(null)
    clearNotice()
    try {
      await login(values.email.trim(), values.password, remember)
      navigate(safeNext(next), { replace: true })
    } catch (err) {
      const apiError = toApiError(err)
      setErrors(apiError.fields as FieldErrors<Key>)
      setFormError(apiError.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="login" title="Connexion" intro="Accédez à vos rapports, à la Galaxy et au Copilot."
      footer={<>Pas encore de compte ? <AuthSwitchLink to="/register">Créer un compte</AuthSwitchLink></>}>
      <SocialSignIn />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 short:gap-4">
        {notice && !formError && <Alert tone="warn">{notice}</Alert>}
        {formError && <Alert ref={alertRef} tone="danger">{formError}</Alert>}

        <Field ref={inputs.email} id="login-email" label="E-mail" type="email" autoComplete="username"
          placeholder="prenom@club.fr" value={values.email} onChange={update('email')} error={errors.email} />
        <Field ref={inputs.password} id="login-password" label="Mot de passe" type="password" autoComplete="current-password"
          labelAction={<Link to="/forgot-password" className="sh-link font-normal">Mot de passe oublié ?</Link>}
          value={values.password} onChange={update('password')} error={errors.password} />
        <Checkbox id="login-remember" label="Rester connecté sur cet appareil" checked={remember}
          onChange={(e) => setRemember(e.target.checked)} />

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Connexion en cours…' : 'Se connecter'}
        </Button>
      </form>
    </AuthLayout>
  )
}

type Provider = 'Google' | 'Apple'

/**
 * "Continuer avec Google / Apple", then a divider before the e-mail form.
 * The API has no Google or Apple sign-in yet (it needs OAuth client ids and a backend
 * callback), so a click says so instead of pretending to work.
 */
function SocialSignIn() {
  const [pending, setPending] = useState<Provider | null>(null)
  const button = 'inline-flex h-12 short:h-10 items-center justify-center gap-2.5 rounded-lg border border-line/25 bg-raised font-semibold transition hover:border-line/45 active:scale-[0.98]'
  return (
    <div className="mb-6 short:mb-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={button} onClick={() => setPending('Google')}>
          <GoogleMark /> Google
        </button>
        <button type="button" className={button} onClick={() => setPending('Apple')}>
          <AppleMark /> Apple
        </button>
      </div>
      {pending && (
        <Alert tone="info" className="mt-3">
          La connexion avec {pending} n’est pas encore disponible. Utilisez votre e-mail pour l’instant.
        </Alert>
      )}
      <div className="mt-6 flex items-center gap-4 text-sm text-muted short:mt-4">
        <span aria-hidden="true" className="h-px flex-1 bg-line/15" />
        ou avec votre e-mail
        <span aria-hidden="true" className="h-px flex-1 bg-line/15" />
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.81-.94 2.15-1.64 3.25-1.68.03.13.06.28.06.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8-1.29-1.82-2.32-4.63-2.32-7.28 0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.67.95 3.6.95.86 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z" />
    </svg>
  )
}

/** The API has no e-mail reset yet: say so plainly instead of pretending to send one. */
export function ForgotPasswordPage() {
  return (
    <AuthLayout mode="forgot" title="Mot de passe oublié"
      intro="La réinitialisation par e-mail n’est pas encore disponible.">
      <div className="flex flex-col gap-6">
        <Alert tone="info">
          Contactez l’administrateur de la plateforme : il peut vérifier votre compte et vous aider à le récupérer.
        </Alert>
        <Link to="/login" className="sh-link self-start">Revenir à la connexion</Link>
      </div>
    </AuthLayout>
  )
}
