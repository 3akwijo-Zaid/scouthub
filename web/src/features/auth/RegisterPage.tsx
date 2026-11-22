import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toApiError } from '@/lib/api'
import { Alert, Badge, Button, Field, ROLE_LABELS, RoleBadge, cx } from '@/ui'
import { AuthLayout, AuthSwitchLink, ONBOARDING_STEPS } from './AuthLayout'
import { safeNext } from './guards'
import { useSession } from './session'
import type { Role } from './types'
import { PASSWORD_MAX, PASSWORD_MIN, checkEmail, checkNewPassword, firstInvalid, type FieldErrors } from './validation'

/**
 * Sign-up wizard, all on /register:
 *   0 · Votre compte  — e-mail + password (checked locally)
 *   1 · Votre profil  — name + main activity, then the account is created (POST /auth/register)
 *   2 · Bienvenue     — logged in; role explained and where to start, based on the chosen activity
 */
type Mission = Extract<Role, 'SCOUT' | 'RECRUITER' | 'ANALYST'>

const MISSIONS: { value: Mission; title: string; text: string }[] = [
  { value: 'SCOUT', title: 'Repérer sur le terrain', text: 'Observer des matchs et rédiger des rapports depuis le stade.' },
  { value: 'RECRUITER', title: 'Recruter des joueurs', text: 'Suivre des cibles, comparer des profils, estimer leur juste valeur.' },
  { value: 'ANALYST', title: 'Analyser des données', text: 'Importer des datasets, construire des tableaux de bord.' },
]

type AccountKey = 'email' | 'password' | 'confirm'
type ProfileKey = 'fullName' | 'mission'

export function RegisterPage() {
  const register = useSession((s) => s.register)
  const status = useSession((s) => s.status)
  const user = useSession((s) => s.user)
  const firstName = user?.fullName?.split(' ')[0]
  const welcomeTitle = firstName ? `Bienvenue, ${firstName}` : 'Bienvenue sur ScoutHub'
  const [params] = useSearchParams()
  const next = params.get('next')

  const [step, setStep] = useState(0)
  const [account, setAccount] = useState({ email: '', password: '', confirm: '' })
  const [profile, setProfile] = useState<{ fullName: string; mission: Mission | null }>({ fullName: '', mission: null })
  const [accountErrors, setAccountErrors] = useState<FieldErrors<AccountKey>>({})
  const [profileErrors, setProfileErrors] = useState<FieldErrors<ProfileKey>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Set while the account is being created: the session flips to "authenticated" before step 2 shows,
  // and that must not count as "already logged in, leave this page".
  const finishing = useRef(false)

  if (status === 'authenticated' && step < 2 && !finishing.current) {
    return <Navigate to={safeNext(next)} replace />
  }

  async function createAccount() {
    finishing.current = true
    setSubmitting(true)
    setFormError(null)
    try {
      await register({ email: account.email.trim(), password: account.password, fullName: profile.fullName.trim() || undefined })
      setStep(2)
    } catch (err) {
      finishing.current = false
      const apiError = toApiError(err)
      if (apiError.status === 409 || apiError.fields.email || apiError.fields.password) {
        // the problem is in step 1 (e-mail taken, password refused): go back there with the message on the field
        setAccountErrors({
          email: apiError.fields.email ?? (apiError.status === 409 ? apiError.message : undefined),
          password: apiError.fields.password,
        })
        setStep(0)
      } else {
        setFormError(apiError.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const progress = <OnboardingProgress step={step} />
  const footer = step < 2 ? <>Déjà inscrit ? <AuthSwitchLink to="/login">Se connecter</AuthSwitchLink></> : undefined

  if (step === 0) {
    return (
      <AuthLayout mode="register" step={0} title="Créer un compte" intro="Commencez par vos identifiants de connexion."
        lead={progress} footer={footer}>
        <AccountStep values={account} errors={accountErrors}
          onChange={(key, value) => {
            setAccount((v) => ({ ...v, [key]: value }))
            if (accountErrors[key]) setAccountErrors((e) => ({ ...e, [key]: undefined }))
          }}
          onErrors={setAccountErrors}
          onNext={() => setStep(1)} />
      </AuthLayout>
    )
  }

  if (step === 1) {
    return (
      <AuthLayout mode="register" step={1} title="Votre profil" intro="Pour adapter votre accueil. Votre rôle est attribué par un administrateur."
        lead={progress} footer={footer}>
        <ProfileStep values={profile} errors={profileErrors} formError={formError} submitting={submitting}
          onChange={(patch) => {
            setProfile((v) => ({ ...v, ...patch }))
            setProfileErrors({})
          }}
          onErrors={setProfileErrors}
          onBack={() => setStep(0)}
          onSubmit={createAccount} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout mode="register" step={2} title={welcomeTitle} intro="Votre compte est créé et vous êtes connecté." lead={progress}>
      <WelcomeStep mission={profile.mission ?? 'SCOUT'} next={next} />
    </AuthLayout>
  )
}

// ── step 0 ───────────────────────────────────────────────────────────────

function AccountStep({ values, errors, onChange, onErrors, onNext }: {
  values: Record<AccountKey, string>
  errors: FieldErrors<AccountKey>
  onChange: (key: AccountKey, value: string) => void
  onErrors: (errors: FieldErrors<AccountKey>) => void
  onNext: () => void
}) {
  const inputs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null), confirm: useRef<HTMLInputElement>(null) }
  const longEnough = values.password.length >= PASSWORD_MIN

  // coming back from step 1 with a server error (e.g. e-mail taken): put the cursor on that field
  useEffect(() => {
    const first = firstInvalid<AccountKey>(['email', 'password', 'confirm'], errors)
    if (first) inputs[first].current?.focus()
    // only when the step mounts
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const found: FieldErrors<AccountKey> = {
      email: checkEmail(values.email),
      password: checkNewPassword(values.password),
      confirm: !values.confirm
        ? 'Saisissez à nouveau le mot de passe.'
        : values.confirm !== values.password ? 'Les deux mots de passe ne correspondent pas.' : undefined,
    }
    onErrors(found)
    const first = firstInvalid<AccountKey>(['email', 'password', 'confirm'], found)
    if (first) inputs[first].current?.focus()
    else onNext()
  }

  const set = (key: AccountKey) => (e: ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value)

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 short:gap-3.5">
      <Field ref={inputs.email} id="register-email" label="E-mail" type="email" autoComplete="email" maxLength={255}
        placeholder="prenom@club.fr" value={values.email} onChange={set('email')} error={errors.email} />
      <div className="grid gap-5 sm:grid-cols-2 short:gap-3.5">
        <Field ref={inputs.password} id="register-password" label="Mot de passe" type="password" autoComplete="new-password"
          maxLength={PASSWORD_MAX} value={values.password} onChange={set('password')} error={errors.password}
          hint={
            <span className={cx('inline-flex items-center gap-1.5 transition-colors', longEnough && 'text-accent')}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {longEnough ? <path d="M3.5 8.5l3 3 6-7" /> : <circle cx="8" cy="8" r="5.5" />}
              </svg>
              Au moins {PASSWORD_MIN} caractères
            </span>
          } />
        <Field ref={inputs.confirm} id="register-confirm" label="Confirmation" type="password" autoComplete="new-password"
          maxLength={PASSWORD_MAX} value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
      </div>
      <Button type="submit" size="lg" className="mt-1 w-full">Continuer</Button>
    </form>
  )
}

// ── step 1 ───────────────────────────────────────────────────────────────

function ProfileStep({ values, errors, formError, submitting, onChange, onErrors, onBack, onSubmit }: {
  values: { fullName: string; mission: Mission | null }
  errors: FieldErrors<ProfileKey>
  formError: string | null
  submitting: boolean
  onChange: (patch: Partial<{ fullName: string; mission: Mission }>) => void
  onErrors: (errors: FieldErrors<ProfileKey>) => void
  onBack: () => void
  onSubmit: () => void
}) {
  const firstMission = useRef<HTMLInputElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formError) alertRef.current?.focus()
  }, [formError])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!values.mission) {
      onErrors({ mission: 'Choisissez ce que vous ferez surtout.' })
      firstMission.current?.focus()
      return
    }
    onSubmit()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 short:gap-3.5">
      {formError && <Alert ref={alertRef} tone="danger">{formError}</Alert>}
      <Field id="register-name" label="Nom complet" autoComplete="name" maxLength={150} placeholder="Prénom Nom"
        value={values.fullName} onChange={(e) => onChange({ fullName: e.target.value })}
        labelAction={<span className="text-xs text-muted">Facultatif</span>} />

      <fieldset aria-describedby={errors.mission ? 'mission-error' : undefined}>
        <legend className="text-sm font-semibold">Ce que vous ferez surtout</legend>
        <div className="mt-2 grid gap-2.5 short:mt-1.5 short:gap-1.5">
          {MISSIONS.map((m, i) => (
            <label key={m.value} className="block cursor-pointer">
              <input ref={i === 0 ? firstMission : undefined} type="radio" name="mission" value={m.value}
                checked={values.mission === m.value} onChange={() => onChange({ mission: m.value })} className="peer sr-only" />
              <span className={cx(
                'grid grid-cols-[1.25rem_1fr] gap-3 rounded-lg border bg-raised/60 px-4 py-3 short:py-1.5 transition-colors',
                'peer-checked:border-accent peer-checked:bg-accent/[0.07] hover:border-line/40',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                errors.mission ? 'border-danger/60' : 'border-line/15',
              )}>
                <span aria-hidden="true" className={cx(
                  'mt-0.5 grid h-5 w-5 place-items-center rounded-full border',
                  values.mission === m.value ? 'border-accent' : 'border-line/40',
                )}>
                  {values.mission === m.value && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </span>
                <span>
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-muted short:text-xs tiny:hidden">{m.text}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.mission && <p id="mission-error" className="mt-2 text-xs text-danger">{errors.mission}</p>}
      </fieldset>

      <div className="mt-1 grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="secondary" size="lg" onClick={onBack} disabled={submitting}>Retour</Button>
        <Button type="submit" size="lg" loading={submitting}>
          {submitting ? 'Création du compte…' : 'Créer mon compte'}
        </Button>
      </div>
    </form>
  )
}

// ── step 2 ───────────────────────────────────────────────────────────────

const START: Record<Mission, { title: string; text: string; to?: string }[]> = {
  SCOUT: [
    { title: 'Datasets', text: 'Parcourez les fichiers importés par les analystes.', to: '/datasets' },
    { title: 'Application mobile', text: 'Rédigez vos rapports au stade, avec photo et position.' },
    { title: 'Player Galaxy', text: 'Repérez les joueurs au profil proche de vos cibles.' },
  ],
  RECRUITER: [
    { title: 'Datasets', text: 'Parcourez les données disponibles sur les joueurs.', to: '/datasets' },
    { title: 'Joueurs', text: 'Recherche, fiche avec radar, comparaison et juste valeur.' },
    { title: 'Scout Copilot', text: 'Demandez une shortlist argumentée à partir des rapports.' },
  ],
  ANALYST: [
    { title: 'Datasets', text: 'Parcourez les datasets ; l’import s’ouvre avec le rôle Analyste.', to: '/datasets' },
    { title: 'Joueurs', text: 'Fiches et statistiques par 90 minutes.' },
    { title: 'Player Galaxy', text: 'La carte des profils de jeu calculée par nos modèles.' },
  ],
}

function WelcomeStep({ mission, next }: { mission: Mission; next: string | null }) {
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const role = user?.role ?? 'SCOUT'
  const missionTitle = MISSIONS.find((m) => m.value === mission)?.title.toLowerCase()

  return (
      <div className="flex flex-col gap-6 short:gap-4 tiny:gap-3">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line/15 bg-surface px-4 py-3 short:py-2">
          <span className="text-sm text-muted">Votre rôle</span>
          <RoleBadge role={role} />
        </div>

        {mission !== role && (
          <Alert tone="info">
            Pour {missionTitle}, demandez le rôle {ROLE_LABELS[mission]} à l’administrateur. Le changement est immédiat.
          </Alert>
        )}

        <section aria-labelledby="start-title">
          <h2 id="start-title" className="font-sans text-sm font-semibold">Par où commencer</h2>
          <ul className="mt-3 divide-y divide-line/10 rounded-lg border border-line/15">
            {START[mission].map((item) => (
              <li key={item.title} className="flex items-start justify-between gap-4 px-4 py-3 short:py-2">
                <div>
                  {item.to
                    ? <Link to={item.to} className="sh-link">{item.title}</Link>
                    : <span className="font-medium">{item.title}</span>}
                  <p className="text-sm text-muted tiny:hidden">{item.text}</p>
                </div>
                {!item.to && <Badge className="mt-0.5 shrink-0">Bientôt</Badge>}
              </li>
            ))}
          </ul>
        </section>

        <Button size="lg" className="w-full" onClick={() => navigate(safeNext(next), { replace: true })}>
          Accéder au tableau de bord
        </Button>
      </div>
  )
}

/** "Étape n sur 3 : titre" with a bar per step; reads from the same list as the brand pane. */
function OnboardingProgress({ step }: { step: number }) {
  const total = ONBOARDING_STEPS.length
  return (
    <div>
      <p className="text-sm text-muted">
        <span className="font-semibold text-fg">Étape {step + 1} sur {total}</span> : {ONBOARDING_STEPS[step].title.toLowerCase()}
      </p>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}
        role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}
        aria-valuetext={`Étape ${step + 1} sur ${total} : ${ONBOARDING_STEPS[step].title}`}>
        {ONBOARDING_STEPS.map((s, i) => (
          <span key={s.title} className={cx('h-1.5 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-line/20')} />
        ))}
      </div>
    </div>
  )
}
