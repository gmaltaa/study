// components/LessonBlocks.tsx — desenha o conteúdo da aula, bloco a bloco.
// O formato dos blocos é o que o backend grava (lib/ai/schemas.ts → Block).
// Texto corrido em serifa, como num livro; caixas de apoio em sans.
import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { CheckIcon, LightbulbIcon, WarningIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { Block } from '@/lib/types'


export function LessonBlocks({ blocks, renderMedia }: {
  blocks: Block[]
  /** Desenha o vídeo ou a imagem de um bloco `media` (ver Lesson.media). */
  renderMedia?: (ref: string) => ReactNode
}) {
  const s = useStyles()
  const c = useColors()
  return (
    <View style={{ gap: SPACE.lg }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'media': {
            const node = renderMedia?.(b.ref)
            return node ? <View key={i} style={{ marginVertical: SPACE.sm }}>{node}</View> : null
          }
          case 'heading':
            return <Text key={i} variant="heading" style={{ marginTop: SPACE.md }}>{b.text}</Text>
          case 'paragraph':
            return <Text key={i} variant="reading">{b.text}</Text>
          case 'quote':
            return <View key={i} style={s.quote}><Text variant="quote" tone="secondary">{b.text}</Text></View>
          case 'list':
            return (
              <View key={i} style={{ gap: SPACE.sm }}>
                {b.items.map((item, j) => (
                  <View key={j} style={s.bulletRow}>
                    <View style={s.bullet} />
                    <Text variant="reading" style={{ flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>
            )
          case 'key_points':
            return (
              <Card key={i} variant="muted" style={{ gap: SPACE.md }}>
                <Text variant="eyebrow">{b.title ?? 'Para lembrar'}</Text>
                {b.items.map((item, j) => (
                  <View key={j} style={s.checkRow}>
                    <CheckIcon size={16} color={c.text} style={{ marginTop: 3 }} />
                    <Text variant="body" style={{ flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </Card>
            )
          case 'example':
            return (
              <Card key={i} style={{ gap: SPACE.sm }}>
                <View style={s.boxHeader}>
                  <LightbulbIcon size={18} color={c.text} />
                  <Text variant="labelStrong">{b.title ?? 'Exemplo'}</Text>
                </View>
                <Text variant="body" tone="secondary">{b.text}</Text>
              </Card>
            )
          case 'callout':
            return (
              <View key={i} style={s.callout}>
                <View style={s.boxHeader}>
                  <WarningIcon size={18} color={c.warning} />
                  <Text variant="labelStrong" tone="warning">{b.title ?? 'Atenção'}</Text>
                </View>
                <Text variant="body">{b.text}</Text>
              </View>
            )
          case 'code':
            return (
              <ScrollView key={i} horizontal style={s.code} contentContainerStyle={{ padding: SPACE.lg }} showsHorizontalScrollIndicator={false}>
                <Text variant="code">{b.text}</Text>
              </ScrollView>
            )
          default:
            return null
        }
      })}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  quote: { borderLeftWidth: 2, borderLeftColor: c.text, paddingLeft: SPACE.lg, paddingVertical: SPACE.xs },
  bulletRow: { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.textSecondary, marginTop: 12 },
  checkRow: { flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start' },
  boxHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  callout: { backgroundColor: c.warningSoft, borderRadius: RADIUS.xl, padding: SPACE.lg, gap: SPACE.sm },
  code: { backgroundColor: c.surfaceMuted, borderRadius: RADIUS.lg },
}))
