// components/CalendarSheet.tsx — escolher uma data num calendário, em sheet.
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { CaretLeftIcon, CaretRightIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Sheet } from '@/components/ui/Sheet'
import { GUTTER, HAIRLINE, SPACE } from '@/lib/constants'
import { toISODate } from '@/lib/format'
import { makeThemedStyles } from '@/lib/theme'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function CalendarSheet({ visible, title, value, minDate, onConfirm, onClose }: {
  visible: boolean
  title?: string
  value: string
  /** Antes dele, o dia aparece apagado e não responde ao toque. */
  minDate?: string
  onConfirm: (date: string) => void
  onClose: () => void
}) {
  const s = useStyles()
  const [year, setYear] = useState(0)
  const [month, setMonth] = useState(0)
  const [selected, setSelected] = useState(value)

  useEffect(() => {
    if (!visible) return
    const [y, m] = value.split('-').map(Number)
    setYear(y)
    setMonth(m - 1)
    setSelected(value)
  }, [visible, value])

  const today = toISODate(new Date())
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  const toStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={s.nav}>
          <IconButton onPress={() => shift(-1)} accessibilityLabel="Mês anterior"><CaretLeftIcon /></IconButton>
          <Text variant="subheading">{MONTHS[month]} {year}</Text>
          <IconButton onPress={() => shift(1)} accessibilityLabel="Próximo mês"><CaretRightIcon /></IconButton>
        </View>
        <View style={s.row}>
          {WEEK.map((d, i) => <Text key={i} variant="micro" tone="tertiary" align="center" style={s.weekDay}>{d}</Text>)}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((day, di) => {
              if (!day) return <View key={di} style={s.cell} />
              const str = toStr(day)
              const off = !!minDate && str < minDate
              const sel = selected === str && !off
              return (
                <Pressable
                  key={di}
                  style={s.cell}
                  onPress={() => setSelected(str)}
                  disabled={off}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel, disabled: off }}
                  accessibilityLabel={`${day} de ${MONTHS[month]}`}
                >
                  <View style={[s.day, sel && s.daySel, str === today && !sel && s.dayToday]}>
                    <Text variant="label" tone={sel ? 'onPrimary' : off ? 'tertiary' : 'primary'}>{day}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}
        <Button
          label="Confirmar"
          onPress={() => onConfirm(selected)}
          disabled={!!minDate && selected < minDate}
          style={{ marginTop: SPACE.lg }}
        />
      </View>
    </Sheet>
  )
}

const useStyles = makeThemedStyles((c) => ({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  row: { flexDirection: 'row' },
  weekDay: { flex: 1, paddingVertical: SPACE.sm },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: c.primary },
  dayToday: { borderWidth: HAIRLINE, borderColor: c.borderStrong },
}))
