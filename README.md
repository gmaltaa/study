# Estudos (nome provisório)

App de estudos com IA: a pessoa diz o tema e quanto tempo tem, e a IA monta a trilha do básico ao avançado, encaixada na rotina, com aulas e exercícios para cada dia.

- `app/` — app iOS e Android (Expo SDK 56, expo-router).
- `backend/` — API e site (Next.js 16), banco no Supabase, jobs no Inngest.
- [PLANO-MVP.md](PLANO-MVP.md) — decisões de produto, arquitetura, modelo de dados e fluxo da IA.

## Primeira configuração

### 1. Supabase

1. Crie um projeto.
2. Rode a migration `backend/supabase/migrations/20261021000000_init.sql` (SQL editor ou `supabase db push`).
3. Authentication:
   - **E-mail:** ligue "Confirm email". Nos templates "Confirm signup" e "Reset password", use o código `{{ .Token }}` (o app pede o código de 6 dígitos, não um link).
   - **Google:** habilite, coloque os Client IDs web e iOS (o web primeiro) e ligue "Skip nonce check".
   - **Apple:** habilite e coloque o bundle id do app (`app/app.json`) em "Authorized Client IDs".

### 2. Backend

```bash
cd backend
pnpm install
cp .env.example .env.local
```

Preencha o `.env.local` (Supabase, AI Gateway). Para rodar:

```bash
pnpm dev
```

Em outro terminal, o Inngest local (gera trilhas e aulas):

```bash
pnpm inngest
```

Testes:

```bash
pnpm test
```

Teste de qualidade das trilhas (chama a IA de verdade, custa tokens):

```bash
pnpm eval
```

No deploy da Vercel, configure as mesmas variáveis e instale a integração do Inngest.

### 3. App

```bash
cd app
npm install
cp .env.example .env
```

Preencha o `.env`. Em `EXPO_PUBLIC_API_URL`, use o IP da sua máquina na rede (ex.: `http://192.168.0.10:3000`), não `localhost`.

O app usa módulos nativos (login Google e Apple), então roda em build de desenvolvimento, não no Expo Go:

```bash
npx eas init
```

```bash
npx eas build --profile development --platform android
```

Depois, com o build instalado no aparelho:

```bash
npx expo start
```

### 4. Testar dias seguidos

Em desenvolvimento, a tela Perfil tem "Simular a data de hoje": o backend passa a responder como se fosse aquela data. Serve para testar o cronograma, dias pulados e a sequência sem mexer no relógio. Em produção, essa opção não aparece e o backend a ignora.
