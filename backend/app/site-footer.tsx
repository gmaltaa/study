import Link from 'next/link'
import { SITE } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer>
      <Link href="/">{SITE.name}</Link>
      <Link href="/termos">Termos de uso</Link>
      <Link href="/privacidade">Privacidade</Link>
      <Link href="/excluir-conta">Excluir conta</Link>
      <Link href="/suporte">Suporte</Link>
    </footer>
  )
}
