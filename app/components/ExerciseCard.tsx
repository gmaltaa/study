// components/ExerciseCard.tsx — um exercício: escolhe a alternativa, vê na
// hora se acertou e a explicação de cada alternativa (o porquê da certa e das
// erradas).
import { TouchableOpacity, View } from 'react-native'
import { CheckCircle, XCircle } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { Exercise } from '@/lib/types'

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
    <View>
      <Text style={s.kind}>{exercise.kind === 'true_false' ? 'Verdadeiro ou falso' : 'Escolha a alternativa certa'}</Text>
      <Text style={s.prompt}>{exercise.prompt}</Text>
      <View style={s.options}>
        {exercise.options.map((o) => {
          const isCorrect = o.id === exercise.correctOptionId
          const isChosen = o.id === chosen
          const state = !answered ? 'idle' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'other'
          return (
            <TouchableOpacity
              key={o.id}
              style={[s.option, state === 'correct' && s.optionCorrect, state === 'wrong' && s.optionWrong, state === 'other' && s.optionOther]}
              onPress={() => onChoose(o.id)}
              disabled={answered}
              activeOpacity={0.8}
            >
              <View style={s.optionRow}>
                <Text style={[s.optionText, state === 'other' && s.optionTextOther]}>{o.text}</Text>
                {state === 'correct' && <CheckCircle size={22} color={c.green} weight="fill" />}
                {state === 'wrong' && <XCircle size={22} color={c.red} weight="fill" />}
              </View>
              {answered && (isCorrect || isChosen) ? <Text style={s.explanation}>{o.explanation}</Text> : null}
            </TouchableOpacity>
          )
        })}
      </View>
      {answered ? (
        <View style={[s.verdict, correct ? s.verdictOk : s.verdictBad]}>
          <Text style={[s.verdictText, { color: correct ? c.green : c.red }]}>
            {correct ? 'Isso mesmo!' : 'Não foi dessa vez. Veja a explicação acima.'}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  kind: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.gray500, textTransform: 'uppercase', letterSpacing: 0.6 },
  prompt: { fontFamily: FONTS.bold, fontSize: 20, color: c.gray900, lineHeight: 28, marginTop: 8, marginBottom: 20 },
  options: { gap: 10 },
  option: { borderRadius: 16, borderWidth: 1.5, borderColor: c.gray200, backgroundColor: c.white, padding: 16, gap: 8 },
  optionCorrect: { borderColor: c.green, backgroundColor: c.greenLight },
  optionWrong: { borderColor: c.red, backgroundColor: c.redLight },
  optionOther: { opacity: 0.6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionText: { flex: 1, fontFamily: FONTS.semiBold, fontSize: 16, color: c.gray900, lineHeight: 22 },
  optionTextOther: { color: c.gray600 },
  explanation: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray700, lineHeight: 21 },
  verdict: { borderRadius: 12, padding: 12, marginTop: 14 },
  verdictOk: { backgroundColor: c.greenLight },
  verdictBad: { backgroundColor: c.redLight },
  verdictText: { fontFamily: FONTS.bold, fontSize: 15, textAlign: 'center' },
}))
