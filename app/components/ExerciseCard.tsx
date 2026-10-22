// components/ExerciseCard.tsx — um exercício: escolhe a alternativa, vê na
// hora se acertou e o porquê de cada alternativa (a certa e a escolhida).
import { Pressable, View } from 'react-native'
import { CheckIcon, XIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { Exercise } from '@/lib/types'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function ExerciseCard({ exercise, chosen, onChoose }: {
  exercise: Exercise
  /** Alternativa escolhida; null enquanto não respondeu. */
  chosen: string | null
  onChoose: (optionId: string) => void
}) {
  const s = useStyles()
  const c = useColors()
  const answered = chosen !== null
  const correct = chosen === exercise.correctOptionId

  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}>
        <Text variant="eyebrow" tone="secondary">
          {exercise.kind === 'true_false' ? 'Verdadeiro ou falso' : 'Escolha a alternativa certa'}
        </Text>
        <Text variant="heading">{exercise.prompt}</Text>
      </View>
      <View style={{ gap: SPACE.sm }}>
        {exercise.options.map((o, i) => {
          const isCorrect = o.id === exercise.correctOptionId
          const isChosen = o.id === chosen
          const state = !answered ? 'idle' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'other'
          return (
            <Pressable
              key={o.id}
              onPress={() => onChoose(o.id)}
              disabled={answered}
              accessibilityRole="button"
              accessibilityState={{ selected: isChosen, disabled: answered }}
              style={({ pressed }) => [s.option, s[state], pressed && !answered && { opacity: 0.7 }]}
            >
              <View style={s.optionRow}>
                <View style={[s.letter, state === 'correct' && s.letterCorrect, state === 'wrong' && s.letterWrong]}>
                  {state === 'correct' ? <CheckIcon size={14} color={c.staticWhite} />
                    : state === 'wrong' ? <XIcon size={14} color={c.staticWhite} />
                    : <Text variant="micro" tone="secondary">{exercise.kind === 'true_false' ? (i === 0 ? 'V' : 'F') : LETTERS[i]}</Text>}
                </View>
                <Text variant="label" tone={state === 'other' ? 'tertiary' : 'primary'} style={{ flex: 1 }}>{o.text}</Text>
              </View>
              {answered && (isCorrect || isChosen) ? (
                <Text variant="caption" tone="secondary" style={s.explanation}>{o.explanation}</Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
      {answered ? (
        <Text variant="labelStrong" tone={correct ? 'success' : 'danger'}>
          {correct ? 'Isso mesmo.' : 'Não foi dessa vez. A explicação está acima.'}
        </Text>
      ) : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  option: {
    borderRadius: RADIUS.lg, borderWidth: HAIRLINE, borderColor: c.borderStrong, backgroundColor: c.surface,
    padding: SPACE.lg, gap: SPACE.sm,
  },
  idle: {},
  correct: { borderColor: c.success, backgroundColor: c.successSoft },
  wrong: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  other: { borderColor: c.border },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  letter: {
    width: 26, height: 26, borderRadius: 13, borderWidth: HAIRLINE, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  letterCorrect: { backgroundColor: c.success, borderColor: c.success },
  letterWrong: { backgroundColor: c.danger, borderColor: c.danger },
  explanation: { marginLeft: 26 + SPACE.md },
}))
