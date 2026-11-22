import { Link } from 'react-router-dom'
import { hasRole, useSession } from '@/features/auth/session'
import type { User } from '@/features/auth/types'
import { Badge, RoleBadge, cx } from '@/ui'

/** "/" — presentation for visitors, a starting point for logged-in users. */
export function HomePage() {
  const user = useSession((s) => s.user)
  return user ? <Dashboard user={user} /> : <Landing />
}

const FEATURES = [
  { title: 'Player Galaxy', text: 'Chaque joueur est une étoile, placée selon son profil de jeu. Les joueurs proches se ressemblent.', bar: 'bg-info' },
  { title: 'Fair Value & signaux', text: 'Une juste valeur estimée pour chaque joueur, comparée au prix du marché et expliquée variable par variable.', bar: 'bg-accent' },
  { title: 'Scout Copilot', text: 'Un assistant hébergé chez nous qui cherche dans les rapports des scouts et cite ses sources.', bar: 'bg-warn' },
] as const

function Landing() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 py-6 sm:py-12">
      <section className="max-w-3xl">
        <p className="sh-label text-accent">Plateforme de scouting</p>
        <h1 className="mt-3 text-5xl font-bold leading-[0.95] sm:text-6xl">Le marché des transferts, lu comme une bourse.</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Les scouts saisissent leurs observations depuis le stade, les recruteurs explorent les joueurs et nos modèles révèlent les talents sous-évalués.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register" className="inline-flex h-11 items-center rounded-lg bg-action px-5 font-semibold text-white hover:brightness-110">
            Créer un compte
          </Link>
          <Link to="/login" className="inline-flex h-11 items-center rounded-lg border border-line/25 px-5 font-semibold hover:border-line/45">
            Se connecter
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Fonctionnalités">
        {FEATURES.map((f) => (
          <article key={f.title} className="sh-card p-5">
            <span className={cx('block h-1 w-10 rounded-full', f.bar)} aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">{f.title}</h2>
            <p className="mt-2 text-muted">{f.text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

interface Shortcut {
  to: string
  title: string
  text: string
  ready: boolean
}

function shortcutsFor(user: User): Shortcut[] {
  const list: Shortcut[] = [
    { to: '/datasets', title: 'Datasets', text: 'Fichiers importés, score de qualité et graphiques.', ready: true },
    { to: '/players', title: 'Joueurs', text: 'Recherche, fiche avec radar, comparaison.', ready: false },
    { to: '/galaxy', title: 'Player Galaxy', text: 'La carte des profils de jeu.', ready: false },
    { to: '/copilot', title: 'Scout Copilot', text: 'Posez une question sur les joueurs et les rapports.', ready: false },
  ]
  if (hasRole(user, 'ADMIN')) list.unshift({ to: '/admin/users', title: 'Utilisateurs', text: 'Gérer les comptes et les rôles.', ready: true })
  return list
}

function Dashboard({ user }: { user: User }) {
  const firstName = user.fullName?.split(' ')[0]
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sh-label">Tableau de bord</p>
          <h1 className="mt-1 text-4xl font-bold">Bonjour{firstName ? `, ${firstName}` : ''}</h1>
        </div>
        <RoleBadge role={user.role} />
      </header>

      {user.role === 'SCOUT' && (
        <p className="sh-card p-4 text-muted">
          Les rapports de scouting se saisissent depuis l’application mobile (photo + GPS). Ils apparaîtront ici et dans le Copilot.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Raccourcis">
        {shortcutsFor(user).map((s) => (
          <Link key={s.to} to={s.to}
            className="sh-card group flex flex-col gap-2 p-5 transition hover:border-accent/50">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-bold group-hover:text-accent">{s.title}</h2>
              {!s.ready && <Badge>Bientôt</Badge>}
            </div>
            <p className="text-muted">{s.text}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
