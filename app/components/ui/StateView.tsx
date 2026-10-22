// components/ui/StateView.tsx — carregando, erro e vazio, com a mesma cara em
// todo o app.
import type { ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { IconContext } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { SPACE, ICON_WEIGHT } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function LoadingView({ label }: { label?: string }) {
  const s = useStyles()
  const c = useColors()
  return (
    <View style={s.center}>
      <ActivityIndicator color={c.text} />
      {label ? <Text variant="caption" tone="secondary" align="center">{label}</Text> : null}
    </View>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const s = useStyles()
  return (
    <View style={s.center}>
      <Text variant="heading" align="center">Não deu para carregar</Text>
      <Text variant="body" tone="secondary" align="center">{message}</Text>
      {onRetry ? <Button label="Tentar de novo" variant="secondary" size="md" onPress={onRetry} style={{ marginTop: SPACE.lg }} /> : null}
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
  const c = useColors()
  return (
    <View style={s.empty}>
      {icon ? (
        <View style={s.iconWrap}>
          <IconContext.Provider value={{ color: c.text, size: 26, weight: ICON_WEIGHT }}>{icon}</IconContext.Provider>
        </View>
      ) : null}
      <Text variant="heading" align="center">{title}</Text>
      <Text variant="body" tone="secondary" align="center">{message}</Text>
      {action ? <View style={s.action}>{action}</View> : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xxl, gap: SPACE.sm, minHeight: 280 },
  empty: { alignItems: 'center', paddingVertical: SPACE.xxl, paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: c.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.sm,
  },
  action: { marginTop: SPACE.lg, alignSelf: 'stretch' },
}))
