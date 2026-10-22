// components/ui/SectionHeader.tsx — cabeçalho de seção: título em serifa
// itálica ("Para hoje", "Aprender"), descrição opcional e uma ação à direita.
import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '@/components/ui/Text'
import { SPACE } from '@/lib/constants'

export function SectionHeader({ title, description, action, style }: {
  title: string
  description?: string | null
  action?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ marginTop: SPACE.xxl, marginBottom: SPACE.md, gap: SPACE.xs }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <Text variant="eyebrow" style={{ flex: 1 }}>{title}</Text>
        {action}
      </View>
      {description ? <Text variant="body" tone="secondary">{description}</Text> : null}
    </View>
  )
}
