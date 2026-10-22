// components/AvailabilityForm.tsx — dias, tempo por dia, sessões, prazo e
// lembrete. O mesmo formulário cria o tema e edita a disponibilidade depois.
import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Bell, CalendarBlank } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Chip, ChipGroup } from '@/components/Chip'
import { Toggle } from '@/components/Toggle'
import { CalendarSheet } from '@/components/CalendarSheet'
import { TimeSheet } from '@/components/TimeSheet'
import { FONTS } from '@/lib/constants'
import { addDays, formatDate, formatDays, toISODate, WEEKDAYS_SHORT } from '@/lib/format'
import { requestPushPermission } from '@/lib/push'
import { track } from '@/lib/analytics'
import { makeThemedStyles, useColors } from '@/lib/theme'

export interface AvailabilityValue {
  daysOfWeek: number[]
  dailyMinutes: number
  sessionsPerDay: number
  deadline: string | null
  reminderTime: string | null
}

export const DEFAULT_AVAILABILITY: AvailabilityValue = {
  daysOfWeek: [1, 2, 3, 4, 5],
  dailyMinutes: 30,
  sessionsPerDay: 1,
  deadline: null,
  reminderTime: null,
}

const MINUTE_OPTIONS = [15, 20, 30, 45, 60, 90, 120]
const DEADLINE_PRESETS = [
  { label: '1 mês', days: 30 },
  { label: '3 meses', days: 91 },
  { label: '6 meses', days: 182 },
]

/** Duração de cada sessão: o tempo do dia dividido entre as sessões. */
export function sessionMinutes(v: AvailabilityValue): number {
  return Math.floor(v.dailyMinutes / v.sessionsPerDay)
}

export function availabilitySummary(v: AvailabilityValue): string {
  const days = formatDays(v.daysOfWeek)
  const per = v.sessionsPerDay === 1
    ? `${v.dailyMinutes} min por dia`
    : `${v.sessionsPerDay} sessões de ${sessionMinutes(v)} min por dia`
  return `${days[0].toUpperCase()}${days.slice(1)}, ${per}`
}

export function AvailabilityForm({ value, onChange, showDeadline = true }: {
  value: AvailabilityValue
  onChange: (v: AvailabilityValue) => void
  showDeadline?: boolean
}) {
  const s = useStyles()
  const c = useColors()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const today = toISODate(new Date())
  const set = (patch: Partial<AvailabilityValue>) => onChange({ ...value, ...patch })

  const toggleDay = (d: number) => {
    const has = value.daysOfWeek.includes(d)
    if (has && value.daysOfWeek.length === 1) return
    set({ daysOfWeek: has ? value.daysOfWeek.filter((x) => x !== d) : [...value.daysOfWeek, d].sort() })
  }

  const setMinutes = (dailyMinutes: number) => {
    // Cada sessão precisa de pelo menos 10 min: reduz as sessões se preciso.
    const sessionsPerDay = Math.max(1, Math.min(value.sessionsPerDay, Math.floor(dailyMinutes / 10)))
    set({ dailyMinutes, sessionsPerDay })
  }

  const sessionOptions = [1, 2, 3].filter((n) => Math.floor(value.dailyMinutes / n) >= 10)
  const presetDeadline = DEADLINE_PRESETS.find((p) => value.deadline === addDays(today, p.days))

  const toggleReminder = async (on: boolean) => {
    if (!on) return set({ reminderTime: null })
    set({ reminderTime: value.reminderTime ?? '19:00' })
    const granted = await requestPushPermission()
    if (granted) track('reminder_enabled')
  }

  return (
    <View>
      <Text style={s.label}>Em quais dias você quer estudar?</Text>
      <View style={s.days}>
        {WEEKDAYS_SHORT.map((name, d) => {
          const on = value.daysOfWeek.includes(d)
          return (
            <TouchableOpacity key={d} style={[s.day, on && s.dayOn]} onPress={() => toggleDay(d)} activeOpacity={0.75}>
              <Text style={[s.dayText, on && s.dayTextOn]}>{name.slice(0, 3)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={s.shortcuts}>
        <Chip label="Dias úteis" selected={value.daysOfWeek.join() === '1,2,3,4,5'} onPress={() => set({ daysOfWeek: [1, 2, 3, 4, 5] })} />
        <Chip label="Todos os dias" selected={value.daysOfWeek.length === 7} onPress={() => set({ daysOfWeek: [0, 1, 2, 3, 4, 5, 6] })} />
      </View>

      <Text style={s.label}>Quanto tempo por dia?</Text>
      <ChipGroup
        options={MINUTE_OPTIONS.map((m) => ({ label: m < 60 ? `${m} min` : `${m / 60} h${m % 60 ? ` ${m % 60}` : ''}`, value: m }))}
        value={value.dailyMinutes}
        onChange={setMinutes}
      />

      <Text style={s.label}>Em quantas sessões por dia?</Text>
      <ChipGroup
        options={sessionOptions.map((n) => ({ label: n === 1 ? '1 sessão' : `${n} sessões`, value: n }))}
        value={value.sessionsPerDay}
        onChange={(sessionsPerDay) => set({ sessionsPerDay })}
      />
      <Text style={s.hint}>
        {value.sessionsPerDay === 1
          ? `Uma sessão de ${value.dailyMinutes} min.`
          : `${value.sessionsPerDay} sessões de ${sessionMinutes(value)} min ao longo do dia.`}
        {' '}O cronograma nunca passa desse tempo.
      </Text>

      {showDeadline && (
        <>
          <Text style={s.label}>Tem um prazo?</Text>
          <View style={s.shortcuts}>
            <Chip label="Sem prazo" selected={!value.deadline} onPress={() => set({ deadline: null })} />
            {DEADLINE_PRESETS.map((p) => (
              <Chip key={p.days} label={p.label} selected={presetDeadline?.days === p.days} onPress={() => set({ deadline: addDays(today, p.days) })} />
            ))}
            <Chip
              label={value.deadline && !presetDeadline ? formatDate(value.deadline) : 'Escolher data'}
              selected={!!value.deadline && !presetDeadline}
              onPress={() => setCalendarOpen(true)}
              icon={<CalendarBlank size={16} color={value.deadline && !presetDeadline ? c.primarySoftText : c.gray700} weight="bold" />}
            />
          </View>
          <Text style={s.hint}>
            {value.deadline
              ? `A trilha é montada para caber até ${formatDate(value.deadline)}.`
              : 'Sem prazo, você escolhe a profundidade e a gente calcula quando termina.'}
          </Text>
        </>
      )}

      <View style={s.reminder}>
        <Bell size={22} color={c.gray700} weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={s.reminderTitle}>Lembrete diário</Text>
          {value.reminderTime ? (
            <TouchableOpacity onPress={() => setTimeOpen(true)} hitSlop={8}>
              <Text style={s.reminderTime}>às {value.reminderTime} · trocar</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.reminderOff}>Avisamos no horário, nos dias de estudo.</Text>
          )}
        </View>
        <Toggle value={!!value.reminderTime} onChange={toggleReminder} />
      </View>

      <CalendarSheet
        visible={calendarOpen}
        title="Prazo"
        value={value.deadline ?? addDays(today, 60)}
        minDate={addDays(today, 7)}
        onConfirm={(deadline) => { set({ deadline }); setCalendarOpen(false) }}
        onClose={() => setCalendarOpen(false)}
      />
      <TimeSheet
        visible={timeOpen}
        value={value.reminderTime ?? '19:00'}
        onConfirm={(reminderTime) => { set({ reminderTime }); setTimeOpen(false) }}
        onClose={() => setTimeOpen(false)}
      />
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  label: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray900, marginTop: 24, marginBottom: 12 },
  hint: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 10, lineHeight: 18 },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: {
    flex: 1, aspectRatio: 1, maxWidth: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.white, borderWidth: 1.5, borderColor: c.gray200,
  },
  dayOn: { backgroundColor: c.primary, borderColor: c.primary },
  dayText: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.gray700 },
  dayTextOn: { color: c.onPrimary },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reminder: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28,
    backgroundColor: c.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.gray100,
  },
  reminderTitle: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900 },
  reminderTime: { fontFamily: FONTS.semiBold, fontSize: 14, color: c.primary, marginTop: 2 },
  reminderOff: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
}))
