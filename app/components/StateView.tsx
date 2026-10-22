// components/StateView.tsx — carregando, erro e vazio, com a mesma cara em todo o app.
import type { ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function LoadingView({ label }: { label?: string }) {
  const s = useStyles()
  const c = useColors()
  return (
    <View style={s.center}>
      <ActivityIndicator color={c.primary} size="large" />
      {label ? <Text style={s.muted}>{label}</Text> : null}
    </View>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const s = useStyles()
  return (
    <View style={s.center}>
      <Text style={s.title}>Não deu para carregar</Text>
      <Text style={s.muted}>{message}</Text>
      {onRetry ? <Button label="Tentar de novo" variant="secondary" onPress={onRetry} style={{ marginTop: 16, paddingHorizontal: 24 }} /> : null}
    </View>
  )
}

export function EmptyView({ icon, title, message, action }: {
  icon?: ReactNode
  title: string
  message: string
  action?: ReactNode
}) {
  const s = useStyles()
  return (
    <View style={s.empty}>
      {icon}
      <Text style={s.title}>{title}</Text>
      <Text style={s.muted}>{message}</Text>
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, minHeight: 280 },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 8 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: c.gray900, textAlign: 'center' },
  muted: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray600, textAlign: 'center', lineHeight: 21 },
}))
