// components/ui/PageHeader.tsx — título grande de tela (serifa) e uma linha de
// contexto embaixo. Abre as telas de formulário, login e criação.
import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '@/components/ui/Text'
import { SPACE } from '@/lib/constants'

export function PageHeader({ title, subtitle, children, style }: {
  title: string
  subtitle?: string | null
  /** Algo acima do título (progresso dos passos, capa). */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ gap: SPACE.sm, paddingTop: SPACE.lg, marginBottom: SPACE.xl }, style]}>
      {children ? <View style={{ marginBottom: SPACE.lg }}>{children}</View> : null}
      <Text variant="title" accessibilityRole="header">{title}</Text>
      {subtitle ? <Text variant="body" tone="secondary">{subtitle}</Text> : null}
    </View>
  )
}
