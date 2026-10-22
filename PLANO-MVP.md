# Plano do MVP: app de estudos com IA [nome a definir]

Atualizado em 21/10/2026. Descreve as decisões de produto e de arquitetura e o que já está implementado. Como rodar o projeto está no [README](README.md).

> "Diga o que quer aprender e quanto tempo tem. A gente monta o caminho do zero ao avançado e te diz o que estudar hoje."

---

## 1. Decisões

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Prazo ou ritmo? | Os dois. Com prazo, a trilha é dimensionada para caber nele. Sem prazo, a pessoa escolhe a profundidade (visão geral, base sólida, aprofundado) e o app calcula o término. |
| 2 | "Tempo diário" é do dia ou da sessão? | Do dia inteiro, dividido igualmente entre as sessões. |
| 3 | Conteúdo gerado todo de uma vez? | Não. A estrutura (módulos e aulas) sai inteira na criação; o texto e os exercícios de cada aula são gerados 1 a 2 dias antes, ou na hora se a pessoa adiantar. |
| 4 | Editar a trilha? | Prévia com "Começar" ou "Pedir um ajuste" em texto livre; a IA refaz. |
| 5 | Tipos de exercício | Múltipla escolha e verdadeiro ou falso, com explicação em todas as alternativas. |
| 6 | Diferenciais no MVP | Explicação do porquê, replanejamento automático, lembretes e sequência de dias. Revisão de precisão por um segundo modelo nos temas factuais, e "Reportar erro" em toda aula. |
| 7 | Offline | Não. Online, com cache das telas já abertas. |
| 8 | Usar sem conta | **Mudou:** a conta é criada antes do onboarding. O login com Google nativo do Supabase não vincula uma sessão anônima a uma conta Google sem perder os dados do visitante. Conta primeiro evita esse risco no MVP. |
| 9 | Cobrança | Grátis com limites (3 temas ativos, 6 trilhas e 40 aulas geradas por dia). Sem RevenueCat por enquanto. |
| 10 | Contas | Projetos novos de Supabase, Vercel, EAS, Firebase e GitHub. |
| 11 | Repositório | Um só, com `app/` e `backend/`. |
| 12 | IA | Vercel AI Gateway; modelo por etapa, configurável por variável de ambiente. |
| 13 | Web | Só iOS e Android por enquanto. A API já é separada do app, então uma versão web pode consumir a mesma API depois. |
| 14 | SDK do Facebook | Fora. |

---

## 2. Arquitetura

### A IA não monta o cronograma

A IA gera a **estrutura** (módulos e aulas, com a duração de cada aula) e o **conteúdo** de cada aula. Quem encaixa as aulas nos dias é uma função pura, `buildSchedule` (`backend/lib/schedule.ts`), coberta por testes:

- nenhuma sessão passa da duração da sessão, então nenhum dia passa do tempo informado;
- a ordem das aulas nunca muda;
- só os dias escolhidos recebem sessão.

### O futuro é calculado, o passado é registrado

- **Futuro:** `buildSchedule(aulas restantes, disponibilidade, hoje)`, calculado a cada leitura.
- **Hoje:** na primeira abertura do dia, as sessões de hoje são gravadas em `study_sessions` e não mudam mais no dia.
- **Passado:** sessões concluídas ou perdidas (`missed`).

Faltar um dia não acumula: a aula não feita continua sendo a próxima e cai na próxima sessão. Com prazo, quando o término calculado passa dele, o app avisa.

### Stack

| Camada | Escolha |
|---|---|
| App | Expo SDK 56, expo-router com rotas tipadas, TanStack Query |
| API | Next.js 16 (rotas em `backend/app/api`), na Vercel |
| Banco e login | Supabase: Postgres com RLS, Auth (e-mail com código, Google, Apple) |
| IA | AI SDK 6 + Vercel AI Gateway, saída estruturada validada por zod |
| Segundo plano | Inngest: geração da trilha, das aulas, pré-geração e lembretes |
| Push | Expo Push |
| Analytics | PostHog (opcional) |
| Testes | vitest no backend |

Convenção: tabelas, colunas, funções e rotas da API em inglês; textos de tela, comentários e documentos em português.

---

## 3. Modelo de dados

Migration: `backend/supabase/migrations/20261021000000_init.sql`.

```
auth.users
└─ profiles                 fuso, sequência de dias, onboarding
└─ subjects (Tema)          título, objetivo, nível, profundidade, estilo, estado
   ├─ availabilities        versionada: vale a mais recente
   ├─ learning_paths        versionada: uma ativa por tema
   │  └─ modules
   │     └─ lessons         conteúdo em blocos, gerado sob demanda
   │        └─ exercises    alternativas com explicação
   ├─ study_sessions        só hoje e o passado
   │  └─ session_items
   ├─ lesson_progress       já com os campos da revisão espaçada
   └─ exercise_attempts
generation_jobs             toda chamada de IA: tokens, latência, erro
content_reports             "Reportar erro"
push_tokens
```

Toda tabela tem `user_id` e RLS de uma linha. O conteúdo gerado (trilhas, módulos, aulas, exercícios) só é escrito pelo backend com a service role; o usuário só lê.

---

## 4. Fluxo de geração

```
Criar tema → (1) perfil do tema       modelo rápido, síncrono: recusa tema perigoso,
                                       marca a sensibilidade factual, escolhe o emoji
           → (2) orçamento de tempo    código: com prazo, o tempo até ele; sem prazo, a profundidade
           → (3a) módulos              modelo forte, Inngest
           → (3b) aulas por módulo     modelo forte, um passo por módulo, em paralelo
           → (3c) validação            código: soma ≤ orçamento, aula ≤ sessão
Prévia     → começar | pedir ajuste (volta ao 3a com o pedido)
Começar    → (4) cronograma            código puro
           → (5) conteúdo da aula      modelo médio, pré-gerado para os próximos 2 dias de estudo
           → (6) validação             código: 1 correta por questão, embaralha as alternativas
           → (7) revisão de precisão   só em temas factuais; reescreve o que for apontado
```

Cada etapa grava `model` e `prompt_version` no que gera. As versões ficam em `backend/lib/ai/models.ts`.

---

## 5. O que está pronto

**Backend**
- Schema completo com RLS.
- API: perfil, Hoje, temas (criar, listar, detalhe, pausar, arquivar, excluir), trilha (aprovar, ajustar, tentar de novo), disponibilidade, aula extra, aula, resposta de exercício, concluir aula, reportar erro, push.
- Jobs do Inngest: gerar trilha, gerar aula com revisão de precisão, pré-geração a cada 2 horas, lembretes a cada 15 minutos.
- Cotas diárias de geração e limite de temas ativos.
- Páginas públicas: início, termos, privacidade, excluir conta, suporte (rascunhos para revisão jurídica).
- 32 testes de unidade (cronograma, sequência de dias, validação da saída da IA) e o teste de qualidade com 10 temas (`pnpm eval`, chama a IA de verdade).

**App**
- Boas-vindas com apresentação em 3 telas, cadastro e login (e-mail com código, Google, Apple), recuperação de senha.
- Onboarding: nome → primeiro tema (o que aprender, nível) → disponibilidade (dias, tempo, sessões, prazo, lembrete) → profundidade e estilo → trilha sendo montada → prévia → começar.
- Hoje: sessões do dia de todos os temas, sequência de dias, temas aguardando revisão, próximos dias, adiantar aula.
- Temas: lista com progresso; detalhe com progresso, término previsto, aviso de prazo, próximas sessões, trilha por módulo, disponibilidade, pausar, arquivar, excluir.
- Aula: conteúdo em blocos, exercícios um a um com a explicação de cada alternativa, conclusão com acertos e sequência, reportar erro.
- Perfil: nome, aparência clara/escura, notificações, links legais, sair, excluir conta. Em desenvolvimento, simular a data de hoje para testar o replanejamento.

---

## 5b. Conteúdo externo nas aulas

Cada aula traz conteúdo real de fora, ligado ao assunto dela. Nada é copiado: o vídeo toca no player do YouTube, o podcast toca do endereço do próprio programa, a imagem aparece com o crédito da licença.

| Tipo | Fonte | Papel |
|---|---|---|
| Vídeo principal | YouTube (Data API v3) | No meio do texto; **conta no tempo da aula** (até metade dela) e o texto encolhe para caber |
| Imagens | Wikipédia / Wikimedia Commons, só licenças livres | No meio do texto, com legenda e crédito |
| Leitura | Artigo da Wikipédia | "Para ir além" |
| Vídeo extra e podcast | YouTube e busca de podcasts da Apple | "Para ir além": opcional, fora do tempo da aula; em inglês só se não houver equivalente em português, e marcado |

Como é escolhido (`backend/lib/media/`), antes de o texto da aula ser gerado:
1. Busca nas fontes com termos tirados da própria aula (título, conceito-chave, tema). Sem IA.
2. Cache compartilhado das buscas (`media_searches`): quem estuda o mesmo assunto depois reaproveita. É o que faz a cota do YouTube (10.000 unidades por dia, 100 por busca) render; o teto diário fica em `YOUTUBE_DAILY_UNITS` e, esgotado, a aula sai sem vídeo.
3. A IA rápida escolhe entre os resultados reais, ou recusa tudo (6ª chamada de IA, `media_selection`). O código confere: id existe, tipo certo, vídeo principal em português e dentro do tempo, licença livre, nada repetido.
4. O texto da aula é gerado sabendo das mídias: posiciona cada uma (blocos `media`) e fala delas.

No app: vídeo com miniatura que abre o player do YouTube (página `/embed/youtube/:id` do backend), player de podcast, imagem com crédito, "Para ir além" no fim da aula, "Ajudou?" em cada conteúdo e a **Biblioteca do tema**, com tudo por módulo. Um job diário (`refresh-media`) reconfere os vídeos guardados e esconde o que saiu do ar.

## 6. Próximos passos

1. Criar os projetos (Supabase, Vercel, Inngest, EAS, Google Cloud, Apple) e preencher os `.env` (README).
2. Rodar `pnpm eval` com a chave do AI Gateway e escolher os modelos de cada etapa.
3. Primeiro build de desenvolvimento no EAS e teste ponta a ponta num aparelho.
4. Escolher o nome e trocar os provisórios: `APP_NAME` (`app/lib/constants.ts`), `app/app.json` (nome, slug, scheme, bundle id), `backend/lib/site.ts`, e o ícone (`app/assets`).
5. Depois do MVP: nivelamento inicial, revisão espaçada (os campos já existem em `lesson_progress`), fontes citadas nas aulas factuais, resposta aberta corrigida pela IA, assinatura, trilhas compartilhadas entre usuários.
