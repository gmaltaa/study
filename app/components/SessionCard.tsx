// components/SessionCard.tsx — uma sessão de estudo do dia: o tema, as aulas
// da sessão e o botão de começar. Usado na tela Hoje.
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { CheckCircleIcon, CircleIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Cover } from '@/components/ui/Cover'
import { Divider } from '@/components/ui/Divider'
import { Tag } from '@/components/ui/Tag'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { TodaySession } from '@/lib/types'

export function SessionCard({ session }: { session: TodaySession }) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const done = session.status === 'completed'
  const next = session.lessons.find((l) => !l.completed)
  const started = session.lessons.some((l) => l.completed) || session.status === 'in_progress'
  const minutes = session.lessons.reduce((n, l) => n + l.minutes, 0)

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Cover icon={session.subject.icon} color={session.subject.color} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>{session.subject.title}</Text>
          <Text variant="caption" tone="secondary">
            {session.isExtra ? 'Aula extra' : `Sessão ${session.slot}`} · {minutes} min
          </Text>
        </View>
        {done ? <Tag label="Feita" variant="success" /> : null}
      </View>
      <View style={s.lessons}>
        {session.lessons.map((l, i) => (
          <View key={l.id}>
            {i > 0 ? <Divider inset={32} /> : null}
            <View style={s.lesson}>
              {l.completed
                ? <CheckCircleIcon size={20} color={c.text} />
                : <CircleIcon size={20} color={c.borderStrong} />}
              <Text variant="label" tone={l.completed ? 'tertiary' : 'primary'} style={{ flex: 1 }} numberOfLines={2}>{l.title}</Text>
              <Tag label={`${l.minutes} min`} style={{ alignSelf: 'center' }} />
            </View>
          </View>
        ))}
      </View>
      {!done && next ? (
        <Button
          label={started ? 'Continuar' : 'Começar'}
          onPress={() => router.push({ pathname: '/aula/[id]', params: { id: next.id, sessionId: session.id } })}
          style={s.button}
        />
      ) : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: RADIUS.xl, borderWidth: HAIRLINE, borderColor: c.border, padding: SPACE.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  lessons: { marginTop: SPACE.md },
  lesson: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md },
  button: { marginTop: SPACE.sm },
}))
