import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { SiteFooter } from '@/app/site-footer'

export const metadata: Metadata = { title: 'Termos de uso' }

// Rascunho: revisar com um advogado antes de publicar nas lojas.
export default function Termos() {
  return (
    <main>
      <h1>Termos de uso</h1>
      <p>Ao usar o {SITE.name}, você concorda com estes termos.</p>

      <h2>O serviço</h2>
      <p>O {SITE.name} monta trilhas de estudo, cronogramas, aulas e exercícios com inteligência artificial, a partir do tema e da disponibilidade que você informa.</p>

      <h2>Conteúdo gerado por IA</h2>
      <p>As aulas são geradas automaticamente e revisadas por processos automáticos, mas podem conter erros. Use o botão &ldquo;Reportar erro&rdquo; quando encontrar um. Em temas de saúde, direito e finanças, o conteúdo é educativo e não substitui a orientação de um profissional.</p>

      <h2>Uso permitido</h2>
      <p>Não use o app para gerar conteúdo ilegal, perigoso ou que viole direitos de terceiros. Temas desse tipo são recusados.</p>

      <h2>Limites do plano grátis</h2>
      <p>O plano grátis tem limite de temas ativos e de conteúdo gerado por dia. Os limites podem mudar, sempre com aviso no app.</p>

      <h2>Conta</h2>
      <p>Você pode excluir sua conta a qualquer momento. Podemos suspender contas que violem estes termos.</p>

      <h2>Contato</h2>
      <p><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
      <SiteFooter />
    </main>
  )
}
