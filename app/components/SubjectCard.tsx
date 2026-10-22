// components/SubjectCard.tsx — um tema na lista: capa, título, estado e
// progresso. Usado em Temas e nos avisos da tela Hoje.
import { View } from 'react-native'
import { CaretRightIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Cover } from '@/components/ui/Cover'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Tag, type TagVariant } from '@/components/ui/Tag'
import { SPACE } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { useColors } from '@/lib/theme'
import type { SubjectSummary } from '@/lib/types'

const STATUS: Record<SubjectSummary['status'], { label: string; variant: TagVariant } | null> = {
  generating: { label: 'Montando a trilha', variant: 'muted' },
  review: { label: 'Pronta para revisar', variant: 'solid' },
  failed: { label: 'Não deu certo', variant: 'danger' },
  paused: { label: 'Pausado', variant: 'muted' },
  completed: { label: 'Concluído', variant: 'success' },
  active: null,
}

export function SubjectCard({ subject, onPress, compact = false }: {
  subject: SubjectSummary
  onPress: () => void
  /** Só a linha de cima (avisos da tela Hoje). */
  compact?: boolean
}) {
  const c = useColors()
  const status = STATUS[subject.status]
  const showProgress = !compact && subject.progress.total > 0
  return (
    <Card onPress={onPress} accessibilityLabel={subject.title} style={{ gap: SPACE.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        <Cover icon={subject.icon} color={subject.color} size={compact ? 44 : 52} />
        <View style={{ flex: 1, gap: SPACE.xs }}>
          <Text variant="subheading" numberOfLines={2}>{subject.title}</Text>
          {status ? <Tag label={status.label} variant={status.variant} />
            : subject.nextLesson ? <Text variant="caption" tone="secondary" numberOfLines={1}>Próxima: {subject.nextLesson.title}</Text>
            : null}
        </View>
        <CaretRightIcon size={16} color={c.textTertiary} />
      </View>
      {showProgress ? (
        <View style={{ gap: SPACE.sm }}>
          <ProgressBar percent={subject.progress.percent} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" tone="secondary">{subject.progress.completed} de {subject.progress.total} aulas</Text>
            {subject.endDate && subject.status === 'active' ? (
              <Text variant="caption" tone="secondary">Termina em {formatDate(subject.endDate)}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  )
}
