import { Link } from 'react-router-dom'
import { Badge } from '@/ui'

/** Placeholder for a planned feature, so the navigation is complete from Sprint 1. */
export function ComingSoonPage({ title, text, sprint }: { title: string; text: string; sprint: string }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <Badge>{sprint}</Badge>
      <h1 className="mt-4 text-5xl font-bold">{title}</h1>
      <p className="mt-3 text-muted">{text}</p>
      <Link to="/" className="mt-8 inline-block text-accent hover:underline">Retour au tableau de bord</Link>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="sh-label">Erreur 404</p>
      <h1 className="mt-2 text-5xl font-bold">Page introuvable</h1>
      <p className="mt-3 text-muted">Ce lien ne mène nulle part. Il a peut-être été déplacé.</p>
      <Link to="/" className="mt-8 inline-block text-accent hover:underline">Retour à l’accueil</Link>
    </div>
  )
}
