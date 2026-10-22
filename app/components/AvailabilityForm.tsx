// components/AvailabilityForm.tsx — dias, tempo por dia, sessões, prazo e
// lembrete. O mesmo formulário cria o tema e edita a disponibilidade depois.
import { useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { BellIcon, CalendarBlankIcon, ClockIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Chip, ChipGroup } from '@/components/ui/Chip'
import { ListGroup } from '@/components/ui/ListGroup'
import { ListRow } from '@/components/ui/ListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Toggle } from '@/components/ui/Toggle'
import { CalendarSheet } from '@/components/CalendarSheet'
import { TimeSheet } from '@/components/TimeSheet'
import { GUTTER, SPACE } from '@/lib/constants'
import { addDays, formatDate, formatDays, toISODate, WEEKDAYS_SHORT } from '@/lib/format'
import { requestPushPermission } from '@/lib/push'
import { track } from '@/lib/analytics'

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
  return `${days[0].toUpperCase()}${days.slice(1)}, ${per}.`
}

const minutesLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`)

export function AvailabilityForm({ value, onChange }: {
  value: AvailabilityValue
  onChange: (v: AvailabilityValue) => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  // Os 7 dias cabem numa linha até em tela de 320 px.
  const { width } = useWindowDimensions()
  const day = Math.min(44, Math.floor((width - GUTTER * 2 - 6 * 4) / 7))
  const today = toISODate(new Date())
  const set = (patch: Partial<AvailabilityValue>) => onChange({ ...value, ...patch })

  const toggleDay = (d: number) => {
    const has = value.daysOfWeek.includes(d)
    if (has && value.daysOfWeek.length === 1) return
    set({ daysOfWeek: has ? value.daysOfWeek.filter((x) => x !== d) : [...value.daysOfWeek, d].sort() })
  }

  // Cada sessão precisa de pelo menos 10 min: reduz as sessões se preciso.
  const setMinutes = (dailyMinutes: number) =>
    set({ dailyMinutes, sessionsPerDay: Math.max(1, Math.min(value.sessionsPerDay, Math.floor(dailyMinutes / 10))) })

  const sessionOptions = [1, 2, 3].filter((n) => Math.floor(value.dailyMinutes / n) >= 10)
  const preset = DEADLINE_PRESETS.find((p) => value.deadline === addDays(today, p.days))
  const customDeadline = !!value.deadline && !preset

  const toggleReminder = async (on: boolean) => {
    if (!on) return set({ reminderTime: null })
    set({ reminderTime: value.reminderTime ?? '19:00' })
    if (await requestPushPermission()) track('reminder_enabled')
  }

  return (
    <View>
      <SectionHeader title="Em quais dias?" style={{ marginTop: 0 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {WEEKDAYS_SHORT.map((name, d) => (
          <Chip
            key={d}
            shape="circle"
            label={name}
            selected={value.daysOfWeek.includes(d)}
            onPress={() => toggleDay(d)}
            accessibilityLabel={name}
            style={{ width: day, height: day, borderRadius: day / 2 }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
        <Chip label="Dias úteis" selected={value.daysOfWeek.join() === '1,2,3,4,5'} onPress={() => set({ daysOfWeek: [1, 2, 3, 4, 5] })} />
        <Chip label="Todos os dias" selected={value.daysOfWeek.length === 7} onPress={() => set({ daysOfWeek: [0, 1, 2, 3, 4, 5, 6] })} />
      </View>

      <SectionHeader title="Quanto tempo por dia?" />
      <ChipGroup options={MINUTE_OPTIONS.map((m) => ({ label: minutesLabel(m), value: m }))} value={value.dailyMinutes} onChange={setMinutes} />

      <SectionHeader
        title="Em quantas sessões?"
        description={value.sessionsPerDay === 1
          ? `Uma sessão de ${value.dailyMinutes} min. O cronograma nunca passa desse tempo.`
          : `${value.sessionsPerDay} sessões de ${sessionMinutes(value)} min ao longo do dia. O cronograma nunca passa desse tempo.`}
      />
      <ChipGroup
        options={sessionOptions.map((n) => ({ label: n === 1 ? '1 sessão' : `${n} sessões`, value: n }))}
        value={value.sessionsPerDay}
        onChange={(sessionsPerDay) => set({ sessionsPerDay })}
      />

      <SectionHeader
        title="Tem um prazo?"
        description={value.deadline
          ? `A trilha é montada para caber até ${formatDate(value.deadline)}.`
          : 'Sem prazo, você escolhe a profundidade e a gente calcula quando termina.'}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <Chip label="Sem prazo" selected={!value.deadline} onPress={() => set({ deadline: null })} />
        {DEADLINE_PRESETS.map((p) => (
          <Chip key={p.days} label={p.label} selected={preset?.days === p.days} onPress={() => set({ deadline: addDays(today, p.days) })} />
        ))}
        <Chip
          label={customDeadline ? formatDate(value.deadline!) : 'Outra data'}
          selected={customDeadline}
          onPress={() => setCalendarOpen(true)}
          icon={<CalendarBlankIcon />}
        />
      </View>

      <SectionHeader title="Lembrete" />
      <ListGroup>
        <ListRow
          leading={<BellIcon />}
          title="Lembrete diário"
          subtitle={value.reminderTime ? 'Nos dias de estudo' : 'Avisamos no horário escolhido'}
          trailing={<Toggle value={!!value.reminderTime} onChange={toggleReminder} accessibilityLabel="Lembrete diário" />}
        />
        {value.reminderTime ? (
          <ListRow leading={<ClockIcon />} title="Horário" value={value.reminderTime} chevron onPress={() => setTimeOpen(true)} />
        ) : null}
      </ListGroup>
      {!value.reminderTime ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.sm }}>Você pode ligar depois, na tela do tema.</Text>
      ) : null}

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
