import { SITE } from '@/lib/site'
import { SiteFooter } from '@/app/site-footer'

export default function Home() {
  return (
    <main>
      <section className="hero">
        <h1>{SITE.name}</h1>
        <p>{SITE.tagline}</p>
      </section>
      <ol className="steps">
        <li>Crie um tema, como &ldquo;História do Brasil&rdquo; ou &ldquo;Python&rdquo;, e diga seu objetivo.</li>
        <li>Conte quanto tempo você tem por dia e em quais dias quer estudar.</li>
        <li>A IA monta a trilha do básico ao avançado e encaixa as aulas na sua rotina.</li>
        <li>Todo dia, abra o app e veja o que estudar: aula curta e exercícios com explicação.</li>
      </ol>
      <SiteFooter />
    </main>
  )
}
