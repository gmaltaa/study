// components/TimeSheet.tsx — escolher um horário ('HH:MM') em duas rodas.
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { BottomSheet } from '@/components/BottomSheet'
import { WheelPicker } from '@/components/WheelPicker'
import { FONTS, GUTTER } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

const HOURS = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), value: h }))
// De 15 em 15: o lembrete sai pelo cron do backend, que roda a cada 15 min.
const MINUTES = [0, 15, 30, 45].map((m) => ({ label: String(m).padStart(2, '0'), value: m }))

export function TimeSheet({ visible, value, onConfirm, onClose }: {
  visible: boolean
  value: string
  onConfirm: (time: string) => void
  onClose: () => void
}) {
  const s = useStyles()
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)

  useEffect(() => {
    if (!visible) return
    const [h, m] = value.split(':').map(Number)
    setHour(Number.isFinite(h) ? h : 8)
    setMinute(MINUTES.some((x) => x.value === m) ? m : 0)
  }, [visible, value])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Horário do lembrete">
      <View style={s.body}>
        <View style={s.wheels}>
          <View style={{ flex: 1 }}><WheelPicker items={HOURS} value={hour} onChange={setHour} /></View>
          <Text style={s.colon}>:</Text>
          <View style={{ flex: 1 }}><WheelPicker items={MINUTES} value={minute} onChange={setMinute} /></View>
        </View>
        <Button
          label="Confirmar"
          onPress={() => onConfirm(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)}
          style={{ marginTop: 16 }}
        />
      </View>
    </BottomSheet>
  )
}

const useStyles = makeThemedStyles((c) => ({
  body: { paddingHorizontal: GUTTER, paddingBottom: 8 },
  wheels: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colon: { fontFamily: FONTS.bold, fontSize: 24, color: c.gray900 },
}))
