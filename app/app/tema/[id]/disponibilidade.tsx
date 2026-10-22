// app/tema/[id]/disponibilidade.tsx — mudar dias, tempo, prazo e lembrete de
// um tema. O cronograma se recalcula sozinho no backend.
import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/Button'
import { AvailabilityForm, DEFAULT_AVAILABILITY, type AvailabilityValue } from '@/components/AvailabilityForm'
import { ErrorView, LoadingView } from '@/components/StateView'
import { api, errorMessage } from '@/lib/api'
import { invalidateStudy, keys, queryClient } from '@/lib/query'
import { toast } from '@/lib/toast'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export default function EditAvailability() {
  const s = useStyles()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useQuery({ queryKey: keys.subject(id), queryFn: () => api.subject(id) })
  const [value, setValue] = useState<AvailabilityValue | null>(null)

  useEffect(() => {
    const a = query.data?.availability
    if (a && !value) {
      setValue({
        daysOfWeek: a.daysOfWeek,
        dailyMinutes: a.dailyMinutes,
        sessionsPerDay: a.sessionsPerDay,
        deadline: a.deadline,
        reminderTime: a.reminderTime,
      })
    }
  }, [query.data])

  const save = useMutation({
    mutationFn: (v: AvailabilityValue) => api.updateAvailability(id, {
      daysOfWeek: v.daysOfWeek,
      dailyMinutes: v.dailyMinutes,
      sessionsPerDay: v.sessionsPerDay,
      deadline: v.deadline,
      reminderTime: v.reminderTime,
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.subject(id), data)
      invalidateStudy(id)
      toast.success('Cronograma atualizado')
      router.back()
    },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })

  if (query.isLoading) return <Screen back scroll={false}><LoadingView /></Screen>
  if (query.isError) return <Screen back scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>

  return (
    <Screen
      back
      title="Disponibilidade"
      surface="white"
      footer={<Button label="Salvar" onPress={() => save.mutate(value ?? DEFAULT_AVAILABILITY)} loading={save.isPending} />}
    >
      <Text style={s.lead}>
        O cronograma de {query.data?.title} se refaz a partir de hoje, sem perder o que você já estudou.
      </Text>
      <AvailabilityForm value={value ?? DEFAULT_AVAILABILITY} onChange={setValue} />
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  lead: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray600, lineHeight: 22 },
}))
