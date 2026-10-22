// components/ui/ConfirmSheet.tsx — confirmação com espaço para EXPLICAR a
// consequência antes da decisão. Monta um Modal: abra a partir de uma tela,
// nunca de dentro de outro sheet.
import { View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { GUTTER, SPACE } from '@/lib/constants'

export function ConfirmSheet({
  visible, title, message, confirmLabel, cancelLabel = 'Cancelar', destructive = false, loading = false, onConfirm, onClose,
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
  return (
    <Sheet visible={visible} onClose={onClose} hideClose>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: SPACE.lg, gap: SPACE.sm }}>
        <Text variant="heading">{title}</Text>
        <Text variant="body" tone="secondary" style={{ marginBottom: SPACE.lg }}>{message}</Text>
        <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} />
        <Button label={cancelLabel} variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  )
}
