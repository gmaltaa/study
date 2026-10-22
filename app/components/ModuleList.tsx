// components/ModuleList.tsx — a trilha: módulos em ordem, cada um abrindo as
// suas aulas. Na prévia mostra a estrutura; no tema ativo, o que já foi feito.
import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { CaretDown, CaretUp, CheckCircle, CircleIcon as Circle } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { formatMinutes } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { PathModule } from '@/lib/types'

export function ModuleList({ modules, showProgress = false, initiallyOpen, onLessonPress }: {
  modules: PathModule[]
  showProgress?: boolean
  /** Módulo aberto no início (padrão: o primeiro com aula pendente). */
  initiallyOpen?: string
  onLessonPress?: (lessonId: string) => void
}) {
  const s = useStyles()
  const c = useColors()
  const firstPending = modules.find((m) => m.lessons.some((l) => !l.completed))?.id
  const [open, setOpen] = useState<string | null>(initiallyOpen ?? firstPending ?? modules[0]?.id ?? null)

  return (
    <View style={s.list}>
      {modules.map((m, i) => {
        const done = m.lessons.filter((l) => l.completed).length
        const minutes = m.lessons.reduce((sum, l) => sum + l.minutes, 0)
        const isOpen = open === m.id
        const complete = showProgress && done === m.lessons.length && m.lessons.length > 0
        return (
          <View key={m.id} style={s.module}>
            <TouchableOpacity style={s.header} onPress={() => setOpen(isOpen ? null : m.id)} activeOpacity={0.7}>
              <View style={[s.number, complete && s.numberDone]}>
                <Text style={[s.numberText, complete && s.numberTextDone]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{m.title}</Text>
                <Text style={s.meta}>
                  {m.lessons.length} {m.lessons.length === 1 ? 'aula' : 'aulas'} · {formatMinutes(minutes)}
                  {showProgress ? ` · ${done}/${m.lessons.length} feitas` : ''}
                </Text>
              </View>
              {isOpen ? <CaretUp size={18} color={c.gray500} weight="bold" /> : <CaretDown size={18} color={c.gray500} weight="bold" />}
            </TouchableOpacity>
            {isOpen && (
              <View style={s.body}>
                <Text style={s.objective}>{m.objective}</Text>
                {m.lessons.map((l) => {
                  const pressable = !!onLessonPress && l.completed
                  return (
                    <TouchableOpacity
                      key={l.id}
                      style={s.lesson}
                      disabled={!pressable}
                      onPress={() => onLessonPress?.(l.id)}
                      activeOpacity={0.7}
                    >
                      {showProgress && l.completed
                        ? <CheckCircle size={20} color={c.green} weight="fill" />
                        : <Circle size={20} color={c.gray300} weight="bold" />}
                      <Text style={[s.lessonTitle, showProgress && l.completed && s.lessonDone]}>{l.title}</Text>
                      <Text style={s.lessonMin}>{l.minutes} min</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  list: { gap: 10 },
  module: { backgroundColor: c.white, borderRadius: 18, borderWidth: 1, borderColor: c.gray100, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  number: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numberDone: { backgroundColor: c.green },
  numberText: { fontFamily: FONTS.bold, fontSize: 14, color: c.primarySoftText },
  numberTextDone: { color: c.staticWhite },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray900, lineHeight: 21 },
  meta: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
  body: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.gray100 },
  objective: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray600, lineHeight: 20, marginTop: 12, marginBottom: 6 },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  lessonTitle: { flex: 1, fontFamily: FONTS.medium, fontSize: 15, color: c.gray900, lineHeight: 20 },
  lessonDone: { color: c.gray500 },
  lessonMin: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500 },
}))
