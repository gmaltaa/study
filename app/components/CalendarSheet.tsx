// components/CalendarSheet.tsx — escolher uma data num calendário, em bottom sheet.
import { useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { CaretLeft, CaretRight } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { BottomSheet } from '@/components/BottomSheet'
import { FONTS, GUTTER } from '@/lib/constants'
import { toISODate } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'

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
  const c = useColors()
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
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < 42) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  const toStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={s.body}>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => shift(-1)} hitSlop={12}><CaretLeft size={22} color={c.gray900} weight="bold" /></TouchableOpacity>
          <Text style={s.month}>{MONTHS[month]} de {year}</Text>
          <TouchableOpacity onPress={() => shift(1)} hitSlop={12}><CaretRight size={22} color={c.gray900} weight="bold" /></TouchableOpacity>
        </View>
        <View style={s.row}>
          {WEEK.map((d, i) => <Text key={i} style={s.weekDay}>{d}</Text>)}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((day, di) => {
              if (!day) return <View key={di} style={s.cell} />
              const str = toStr(day)
              const off = !!minDate && str < minDate
              const sel = selected === str && !off
              return (
                <TouchableOpacity key={di} style={[s.cell, sel && s.cellSel]} onPress={() => setSelected(str)} disabled={off} activeOpacity={0.7}>
                  <Text style={[s.day, str === today && !sel && s.dayToday, sel && s.daySel, off && s.dayOff]}>{day}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
        <View style={s.actions}>
          <Button label="Cancelar" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button label="Confirmar" onPress={() => onConfirm(selected)} disabled={!!minDate && selected < minDate} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  )
}

const useStyles = makeThemedStyles((c) => ({
  body: { paddingHorizontal: GUTTER },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  month: { fontFamily: FONTS.semiBold, fontSize: 16, color: c.gray900 },
  row: { flexDirection: 'row', marginBottom: 2 },
  weekDay: { flex: 1, textAlign: 'center', fontFamily: FONTS.semiBold, fontSize: 12, color: c.gray500, paddingVertical: 6 },
  cell: { flex: 1, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 21 },
  cellSel: { backgroundColor: c.primary },
  day: { fontFamily: FONTS.regular, fontSize: 16, color: c.gray900 },
  dayToday: { fontFamily: FONTS.bold, color: c.primary },
  daySel: { fontFamily: FONTS.bold, color: c.onPrimary },
  dayOff: { color: c.gray300 },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 16, marginTop: 8 },
}))
