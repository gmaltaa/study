// components/LessonBlocks.tsx — desenha o conteúdo da aula, bloco a bloco.
// O formato dos blocos é o que o backend grava (lib/ai/schemas.ts → Block).
import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { Lightbulb, Warning, Star } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
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
    <View style={s.wrap}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'media': {
            const node = renderMedia?.(b.ref)
            return node ? <View key={i} style={s.media}>{node}</View> : null
          }
          case 'heading':
            return <Text key={i} style={s.heading}>{b.text}</Text>
          case 'paragraph':
            return <Text key={i} style={s.paragraph}>{b.text}</Text>
          case 'quote':
            return <View key={i} style={s.quote}><Text style={s.quoteText}>{b.text}</Text></View>
          case 'list':
            return (
              <View key={i} style={s.list}>
                {b.items.map((item, j) => (
                  <View key={j} style={s.listRow}>
                    <View style={s.bullet} />
                    <Text style={s.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )
          case 'key_points':
            return (
              <View key={i} style={[s.box, s.keyBox]}>
                <View style={s.boxHeader}>
                  <Star size={18} color={c.primary} weight="fill" />
                  <Text style={[s.boxTitle, { color: c.primarySoftText }]}>{b.title ?? 'Para lembrar'}</Text>
                </View>
                {b.items.map((item, j) => (
                  <View key={j} style={s.listRow}>
                    <View style={[s.bullet, { backgroundColor: c.primary }]} />
                    <Text style={s.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )
          case 'example':
            return (
              <View key={i} style={[s.box, s.exampleBox]}>
                <View style={s.boxHeader}>
                  <Lightbulb size={18} color={c.blue} weight="fill" />
                  <Text style={[s.boxTitle, { color: c.blue }]}>{b.title ?? 'Exemplo'}</Text>
                </View>
                <Text style={s.boxText}>{b.text}</Text>
              </View>
            )
          case 'callout':
            return (
              <View key={i} style={[s.box, s.calloutBox]}>
                <View style={s.boxHeader}>
                  <Warning size={18} color={c.yellow} weight="fill" />
                  <Text style={[s.boxTitle, { color: c.yellow }]}>{b.title ?? 'Atenção'}</Text>
                </View>
                <Text style={s.boxText}>{b.text}</Text>
              </View>
            )
          case 'code':
            return (
              <ScrollView key={i} horizontal style={s.code} contentContainerStyle={{ padding: 14 }} showsHorizontalScrollIndicator={false}>
                <Text style={s.codeText}>{b.text}</Text>
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
  wrap: { gap: 14 },
  media: { marginVertical: 6 },
  heading: { fontFamily: FONTS.extraBold, fontSize: 20, color: c.gray900, marginTop: 10, lineHeight: 26 },
  paragraph: { fontFamily: FONTS.regular, fontSize: 17, color: c.gray700, lineHeight: 27 },
  quote: { borderLeftWidth: 3, borderLeftColor: c.primary, paddingLeft: 14, paddingVertical: 2 },
  quoteText: { fontFamily: FONTS.medium, fontSize: 17, color: c.gray600, lineHeight: 26, fontStyle: 'italic' },
  list: { gap: 8 },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.gray500, marginTop: 11 },
  listText: { flex: 1, fontFamily: FONTS.regular, fontSize: 17, color: c.gray700, lineHeight: 26 },
  box: { borderRadius: 16, padding: 16, gap: 8 },
  keyBox: { backgroundColor: c.primarySoft },
  exampleBox: { backgroundColor: c.blueLight },
  calloutBox: { backgroundColor: c.yellowLight },
  boxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boxTitle: { fontFamily: FONTS.bold, fontSize: 15 },
  boxText: { fontFamily: FONTS.regular, fontSize: 16, color: c.gray700, lineHeight: 25 },
  code: { backgroundColor: c.navy, borderRadius: 12 },
  codeText: { fontFamily: 'monospace', fontSize: 14, color: c.staticWhite, lineHeight: 21 },
}))
