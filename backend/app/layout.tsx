import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SITE } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
