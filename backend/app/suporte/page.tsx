import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { SiteFooter } from '@/app/site-footer'

export const metadata: Metadata = { title: 'Suporte' }

export default function Suporte() {
  return (
    <main>
      <h1>Suporte</h1>
      <p>Precisa de ajuda com o {SITE.name}? Escreva para <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> e conte o que aconteceu.</p>
      <h2>Encontrou um erro numa aula?</h2>
      <p>No fim de cada aula, toque em &ldquo;Reportar erro&rdquo;. O aviso chega direto para a equipe, junto com a aula.</p>
      <SiteFooter />
    </main>
  )
}
