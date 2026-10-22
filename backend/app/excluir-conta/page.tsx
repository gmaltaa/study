import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { SiteFooter } from '@/app/site-footer'

export const metadata: Metadata = { title: 'Excluir conta' }

// Página pública exigida pelo Google Play: como excluir a conta e os dados.
export default function ExcluirConta() {
  return (
    <main>
      <h1>Excluir sua conta</h1>
      <h2>Pelo app</h2>
      <ol>
        <li>Abra o {SITE.name} e entre na sua conta.</li>
        <li>Toque em <strong>Perfil</strong>.</li>
        <li>Toque em <strong>Excluir conta</strong> e confirme.</li>
      </ol>
      <h2>Sem acesso ao app</h2>
      <p>Mande um e-mail para <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> a partir do endereço da sua conta, pedindo a exclusão.</p>
      <h2>O que é apagado</h2>
      <p>Tudo: conta, temas, trilhas, aulas, respostas, progresso e tokens de notificação. A exclusão é definitiva e não pode ser desfeita.</p>
      <SiteFooter />
    </main>
  )
}
