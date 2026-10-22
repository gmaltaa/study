// components/ModuleList.tsx — a trilha: módulos em ordem, cada um abrindo as
// suas aulas. Na prévia mostra a estrutura; no tema ativo, o que já foi feito.
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { CaretDownIcon, CaretUpIcon, CheckCircleIcon, CircleIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Tag } from '@/components/ui/Tag'
import { Divider } from '@/components/ui/Divider'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { formatMinutes } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { PathModule } from '@/lib/types'

export function ModuleList({ modules, showProgress = false, onLessonPress }: {
  modules: PathModule[]
  showProgress?: boolean
  /** Toque numa aula já feita (para rever). */
  onLessonPress?: (lessonId: string) => void
}) {
  const s = useStyles()
  const c = useColors()
  const firstPending = modules.find((m) => m.lessons.some((l) => !l.completed))?.id
  const [open, setOpen] = useState<string | null>(firstPending ?? modules[0]?.id ?? null)

  return (
    <View style={{ gap: SPACE.sm }}>
      {modules.map((m, i) => {
        const done = m.lessons.filter((l) => l.completed).length
        const minutes = m.lessons.reduce((sum, l) => sum + l.minutes, 0)
        const isOpen = open === m.id
        const complete = showProgress && m.lessons.length > 0 && done === m.lessons.length
        return (
          <View key={m.id} style={s.module}>
            <Pressable
              style={({ pressed }) => [s.header, pressed && { opacity: 0.7 }]}
              onPress={() => setOpen(isOpen ? null : m.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <Text variant="heading" tone={complete ? 'tertiary' : 'primary'} style={s.number}>{i + 1}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="subheading">{m.title}</Text>
                <Text variant="caption" tone="secondary">
                  {m.lessons.length} {m.lessons.length === 1 ? 'aula' : 'aulas'} · {formatMinutes(minutes)}
                  {showProgress ? ` · ${done} de ${m.lessons.length} feitas` : ''}
                </Text>
              </View>
              {isOpen ? <CaretUpIcon size={16} color={c.textTertiary} /> : <CaretDownIcon size={16} color={c.textTertiary} />}
            </Pressable>
            {isOpen ? (
              <View style={s.body}>
                <Text variant="body" tone="secondary" style={s.objective}>{m.objective}</Text>
                {m.lessons.map((l, j) => {
                  const pressable = !!onLessonPress && l.completed
                  return (
                    <View key={l.id}>
                      {j > 0 ? <Divider inset={32} /> : null}
                      <Pressable
                        style={({ pressed }) => [s.lesson, pressed && pressable && { opacity: 0.6 }]}
                        disabled={!pressable}
                        onPress={() => onLessonPress?.(l.id)}
                        accessibilityRole={pressable ? 'button' : undefined}
                      >
                        {showProgress && l.completed
                          ? <CheckCircleIcon size={20} color={c.text} />
                          : <CircleIcon size={20} color={c.borderStrong} />}
                        <Text variant="label" tone={showProgress && l.completed ? 'secondary' : 'primary'} style={{ flex: 1 }}>{l.title}</Text>
                        <Tag label={`${l.minutes} min`} style={{ alignSelf: 'center' }} />
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  module: { backgroundColor: c.surface, borderRadius: RADIUS.xl, borderWidth: HAIRLINE, borderColor: c.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg },
  number: { width: 24 },
  body: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.sm },
  objective: { marginBottom: SPACE.sm },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md },
}))
