// /embed/youtube/:id — página que o app abre dentro da aula para tocar um vídeo.
//
// O app não monta o iframe sozinho: um player do YouTube carregado de HTML
// local, sem endereço de origem, é recusado pelo YouTube ("erro 153"). Servida
// daqui, a página tem um domínio de verdade e o player funciona. O vídeo toca
// no player oficial, como as regras do YouTube exigem.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export default async function YouTubeEmbed({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ autoplay?: string }>
}) {
  const { id } = await params
  const { autoplay } = await searchParams
  if (!VIDEO_ID.test(id)) notFound()
  const query = new URLSearchParams({ playsinline: '1', rel: '0', ...(autoplay === '1' ? { autoplay: '1' } : {}) })
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?${query}`}
        title="Vídeo da aula"
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  )
}
