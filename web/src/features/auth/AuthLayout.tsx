import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo, cx } from '@/ui'
import { LoginShowcase, TacticsSketch } from './LoginShowcase'

/*
 * Auth shell — one grid, three aligned bands.
 *
 *   md and up (12 columns)                                    phones
 *   ┌──────────── brand · 7 cols ───────────┬── form · 5 ──┐   ┌──────────────┐
 *   │ logo                          (4rem)  │ back to home │   │ logo    home │
 *   ├───────────────────────────────────────┼──────────────┤   ├──────────────┤
 *   │ headline                              │  ┌ 400px ┐   │   │  form        │
 *   │ login: product preview (LoginShowcase) │  │ form  │   │   │              │
 *   │ sign-up: the wizard steps              │  └───────┘   │   ├──────────────┤
 *   ├───────────────────────────────────────┼──────────────┤   │ help line    │
 *   │ hosting note                (3.5rem)  │ help line    │   └──────────────┘
 *   └───────────────────────────────────────┴──────────────┘
 *
 * Both panes use the same row template, so the top and bottom bands line up across the split.
 */
// Height tiers (tailwind.config.js): `short:` ≤ 860px, `tiny:` ≤ 700px tall — spacing tightens so both
// pages fit the window without scrolling on laptops and in small panes.
// dvh, not vh: on phones the browser bar is accounted for, so the bottom band never hides behind it.
const BANDS = 'grid min-h-dvh grid-rows-[4rem_1fr_3.5rem] md:grid-rows-[5.5rem_1fr_3.5rem] short:grid-rows-[3.75rem_1fr_2.75rem] tiny:grid-rows-[3.25rem_1fr_2.75rem]'
const GUTTER = 'px-5 sm:px-10 xl:px-16'

type Mode = 'login' | 'register' | 'forgot'

export function AuthLayout({ mode, step = 0, title, intro, lead, footer, children }: {
  mode: Mode
  /** Sign-up wizard: index of the current onboarding step. */
  step?: number
  title: string
  intro: ReactNode
  /** Above the title, e.g. the sign-up progress. */
  lead?: ReactNode
  /** Under the form, e.g. the link to the other screen. */
  footer?: ReactNode
  children: ReactNode
}) {
  // When the wizard moves to another step, move keyboard and screen-reader focus to the new title.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    titleRef.current?.focus()
  }, [title])

  return (
    // Pinned to the window on tablets and up (when at least 600px tall): every step was measured to fit,
    // so the page never scrolls or moves. Phones and very short windows keep normal scrolling.
    <div className="grid min-h-dvh md:grid-cols-12 md:[@media(min-height:600px)]:h-dvh md:[@media(min-height:600px)]:overflow-hidden">
      <BrandPane mode={mode} step={step} />

      <main className={cx(BANDS, GUTTER, 'bg-bg md:col-span-5')}>
        {/* phones: logo + home link form the header; from md the logo lives in the brand pane */}
        <div className="flex items-center justify-between border-b border-line/10 md:border-0">
          <Link to="/" className="md:invisible" aria-label="Accueil ScoutHub"><Logo /></Link>
          <Link to="/" className="rounded-md py-2 text-sm text-muted transition-colors hover:text-fg">
            <span className="sm:hidden">Accueil</span>
            <span className="hidden sm:inline">Retour à l’accueil</span>
          </Link>
        </div>

        {/* phones: the form starts right under the header; from md it is centred in the pane */}
        <div className="flex items-start justify-center pb-10 pt-8 md:items-center md:py-8 short:pt-6 short:md:py-4">
          <div className={cx('w-full', mode === 'register' ? 'max-w-[460px]' : 'max-w-[400px]')}>
            {/* phones: the login sketch sits above the form, like an app welcome screen */}
            {mode === 'login' && (
              <div className="mb-6 flex justify-center md:hidden" aria-hidden="true">
                <TacticsSketch className="h-[min(170px,22dvh)] w-auto max-w-full" />
              </div>
            )}
            {lead && <div className="mb-8 short:mb-4">{lead}</div>}
            <h1 ref={titleRef} tabIndex={-1}
              className="text-center text-3xl font-bold focus:outline-none sm:text-4xl md:text-left lg:text-5xl short:text-3xl short:lg:text-4xl">{title}</h1>
            <p className="mt-3 text-center text-muted md:text-left short:mt-1 short:text-sm">{intro}</p>
            <div className="mt-8 short:mt-5">{children}</div>
            {footer && <p className="mt-6 text-center text-muted md:text-left short:mt-4 short:text-sm">{footer}</p>}
          </div>
        </div>

        <p className="flex items-center justify-center border-t border-line/10 text-sm text-muted md:justify-start">
          Un souci d’accès ? Contactez l’administrateur.
        </p>
      </main>
    </div>
  )
}

/** Link to the other auth screen that keeps ?next=, so the user still lands where they were going. */
export function AuthSwitchLink({ to, children, className = 'sh-link' }: {
  to: '/login' | '/register'
  children: ReactNode
  className?: string
}) {
  const [params] = useSearchParams()
  const next = params.get('next')
  return <Link to={next ? `${to}?next=${encodeURIComponent(next)}` : to} className={className}>{children}</Link>
}

function BrandPane({ mode, step }: { mode: Mode; step: number }) {
  return (
    // sticky: when the form scrolls on a short screen, the brand pane stays in place
    <aside className={cx(BANDS, GUTTER, 'hidden border-r border-line/10 bg-surface md:sticky md:top-0 md:col-span-7 md:grid md:h-dvh md:min-h-0')}>
      <div className="flex items-center">
        <Link to="/" aria-label="Accueil ScoutHub" className="rounded-lg"><Logo size="lg" /></Link>
      </div>

      {mode === 'register' ? <OnboardingPanel step={step} /> : <LoginShowcase />}

      <p className="flex items-center border-t border-line/10 text-sm text-muted">
        Modèles et Copilot hébergés chez nous, sans IA externe.
      </p>
    </aside>
  )
}

/** The sign-up wizard's steps, all done on /register; numbered because it is a sequence. */
export const ONBOARDING_STEPS = [
  { title: 'Votre compte', text: 'Votre e-mail et un mot de passe pour vous connecter.' },
  { title: 'Votre profil', text: 'Votre nom et ce que vous ferez surtout sur ScoutHub.' },
  { title: 'Bienvenue', text: 'Votre rôle et par où commencer.' },
] as const

/** Sign-up: same title-first structure, the wizard's steps in place of the radar; follows the current step. */
function OnboardingPanel({ step }: { step: number }) {
  return (
    <div className="grid grid-rows-[auto_1fr] gap-10 py-12 short:gap-6 short:py-6">
      <div>
        <p className="font-display text-5xl font-bold leading-[1.02] xl:text-6xl short:text-4xl short:xl:text-5xl">
          <span className="block">Votre compte,</span>
          <span className="block">en trois étapes.</span>
        </p>
        <p className="mt-5 max-w-[38ch] text-lg text-muted short:mt-3 short:text-base tiny:hidden">
          Une minute pour vous inscrire, puis nous vous montrons par où commencer.
        </p>
      </div>

      <ol className="flex max-w-lg flex-col justify-center" aria-label="Étapes de l’inscription">
        {ONBOARDING_STEPS.map((item, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo'
          const last = i === ONBOARDING_STEPS.length - 1
          return (
            <li key={item.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4" aria-current={state === 'current' ? 'step' : undefined}>
              <div className="flex flex-col items-center">
                <span className={cx(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-full border font-display text-lg font-bold transition-colors',
                  state === 'current' && 'border-accent bg-accent text-accent-fg',
                  state === 'done' && 'border-accent/60 text-accent',
                  state === 'todo' && 'border-line/30 text-muted',
                )}>
                  {state === 'done' ? (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round" aria-label="terminée"><path d="M3.5 8.5l3 3 6-7" /></svg>
                  ) : i + 1}
                </span>
                {!last && <span aria-hidden="true" className={cx('my-2 w-px flex-1', i < step ? 'bg-accent/60' : 'bg-line/20')} />}
              </div>
              <div className={cx(!last && 'pb-8 short:pb-4')}>
                <p className={cx('mt-2 font-semibold', state === 'todo' ? 'text-fg/70' : 'text-fg')}>
                  {item.title}
                  {state === 'current' && <span className="ml-2 text-sm font-normal text-accent">en cours</span>}
                </p>
                <p className="mt-1 text-muted">{item.text}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
