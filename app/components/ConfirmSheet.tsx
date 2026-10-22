// components/ConfirmSheet.tsx — confirmação em bottom sheet, com espaço para
// EXPLICAR a consequência antes de a pessoa decidir.
//
// Monta um Modal (via BottomSheet): não usar de dentro de outro Modal. A partir
// de outro sheet, feche o de fora primeiro.
import { View } from 'react-native'
import { Text } from '@/components/Text'
import { BottomSheet } from '@/components/BottomSheet'
import { Button } from '@/components/Button'
import { FONTS, GUTTER } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export function ConfirmSheet({
  visible, title, message, confirmLabel, cancelLabel = 'Cancelar', destructive = false, loading = false,
  onConfirm, onClose,
}: {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const s = useStyles()
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.body}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.message}>{message}</Text>
        <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} />
        <Button label={cancelLabel} variant="ghost" onPress={onClose} style={{ marginTop: 4 }} />
      </View>
    </BottomSheet>
  )
}

const useStyles = makeThemedStyles((c) => ({
  body: { paddingHorizontal: GUTTER, paddingBottom: 16, gap: 8 },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: c.gray900 },
  message: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray600, lineHeight: 22, marginBottom: 12 },
}))
