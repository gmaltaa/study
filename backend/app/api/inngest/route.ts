import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { functions } from '@/lib/inngest/functions'

// Gerar uma trilha leva até ~2 min; cada passo do Inngest é uma chamada a esta
// rota, então o teto da função precisa cobrir o passo mais longo.
export const maxDuration = 300

export const { GET, POST, PUT } = serve({ client: inngest, functions })
