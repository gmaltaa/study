// lib/site.ts — nome e contato do produto no site. O nome ainda é provisório:
// trocar aqui troca em todas as páginas.
export const SITE = {
  name: 'Estudos',
  tagline: 'Diga o que quer aprender e quanto tempo tem. A gente monta o caminho do zero ao avançado e te diz o que estudar hoje.',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'suporte@seudominio.com.br',
} as const
