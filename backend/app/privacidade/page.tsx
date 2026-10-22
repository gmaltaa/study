import type { Metadata } from 'next'
import { SITE } from '@/lib/site'
import { SiteFooter } from '@/app/site-footer'

export const metadata: Metadata = { title: 'Privacidade' }

// Rascunho: revisar com um advogado antes de publicar nas lojas.
export default function Privacidade() {
  return (
    <main>
      <h1>Política de privacidade</h1>
      <p>Esta política explica quais dados o {SITE.name} coleta, por que e como você controla esses dados, conforme a Lei Geral de Proteção de Dados (LGPD).</p>

      <h2>O que coletamos</h2>
      <ul>
        <li>Dados de conta: e-mail e nome, ou os dados que o Google ou a Apple compartilham quando você entra com eles.</li>
        <li>O que você cria no app: temas, objetivos, disponibilidade, horários de lembrete.</li>
        <li>Seu uso dos estudos: aulas concluídas, respostas dos exercícios e a sequência de dias.</li>
        <li>Dados técnicos: fuso horário, token de notificação do aparelho e eventos de uso anônimos para melhorar o app.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Montar sua trilha, seu cronograma e o conteúdo das aulas.</li>
        <li>Mostrar seu progresso e enviar os lembretes que você ativar.</li>
        <li>Manter o serviço seguro e entender o que precisa melhorar.</li>
      </ul>

      <h2>Inteligência artificial</h2>
      <p>O tema, o objetivo e as preferências que você informa são enviados a provedores de modelos de IA para gerar a trilha e as aulas. Não enviamos seu e-mail nem seu nome a esses provedores.</p>

      <h2>Com quem compartilhamos</h2>
      <p>Só com os fornecedores que fazem o serviço funcionar (hospedagem, banco de dados, IA, envio de notificações e análise de uso), sob contrato. Não vendemos seus dados.</p>

      <h2>Seus direitos</h2>
      <p>Você pode acessar, corrigir e excluir seus dados. Excluir a conta, pelo app (Perfil, Excluir conta) ou pela página <a href="/excluir-conta">Excluir conta</a>, apaga todos os seus dados de forma definitiva.</p>

      <h2>Contato</h2>
      <p>Dúvidas sobre privacidade: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.</p>
      <SiteFooter />
    </main>
  )
}
