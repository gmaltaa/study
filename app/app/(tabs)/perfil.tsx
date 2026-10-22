// app/(tabs)/perfil.tsx — conta, aparência, notificações, links legais, sair e
// excluir a conta (exigência das lojas). Listas agrupadas, como nos ajustes do iOS.
import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Linking, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import {
  BellIcon, CheckIcon, DeviceMobileIcon, EnvelopeSimpleIcon, FileTextIcon, FireIcon, LifebuoyIcon, MoonIcon,
  ShieldCheckIcon, SignOutIcon, SunIcon, TrashIcon, UserIcon,
} from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { ListGroup } from '@/components/ui/ListGroup'
import { ListRow } from '@/components/ui/ListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TextField } from '@/components/ui/TextField'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { api, errorMessage, setDebugDate } from '@/lib/api'
import { setProfileCache, useAuth } from '@/lib/auth'
import { hasPushPermission, requestPushPermission } from '@/lib/push'
import { invalidateStudy } from '@/lib/query'
import { toast } from '@/lib/toast'
import { APP_NAME, GUTTER, SITE_URL, SPACE } from '@/lib/constants'
import { makeThemedStyles, useColors, useTheme, type ThemePreference } from '@/lib/theme'

const APPEARANCE: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Automático', icon: <DeviceMobileIcon /> },
  { value: 'light', label: 'Claro', icon: <SunIcon /> },
  { value: 'dark', label: 'Escuro', icon: <MoonIcon /> },
]

export default function ProfileScreen() {
  const s = useStyles()
  const c = useColors()
  const { profile, session, signOut } = useAuth()
  const { preference, setPreference } = useTheme()
  const [editName, setEditName] = useState(false)
  const [name, setName] = useState(profile?.displayName ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [push, setPush] = useState<boolean | null>(null)

  useEffect(() => { hasPushPermission().then(setPush) }, [])

  const saveName = useMutation({
    mutationFn: () => api.updateMe({ displayName: name.trim() }),
    onSuccess: (p) => { setProfileCache(p); setEditName(false); toast.success('Nome atualizado') },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })
  const deleteAccount = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => { setConfirmDelete(false); void signOut() },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })

  const open = (path: string) => { if (SITE_URL) void Linking.openURL(`${SITE_URL}${path}`) }
  const displayName = profile?.displayName || 'Sem nome'
  const streak = profile?.longestStreak ?? 0

  return (
    <Screen>
      <View style={s.header}>
        <View style={s.avatar}><Text variant="title">{displayName.charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" numberOfLines={1}>{displayName}</Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>{session?.user.email ?? ''}</Text>
        </View>
      </View>

      <SectionHeader title="Conta" />
      <ListGroup>
        <ListRow leading={<UserIcon />} title="Nome" value={displayName} chevron onPress={() => { setName(profile?.displayName ?? ''); setEditName(true) }} />
        <ListRow leading={<EnvelopeSimpleIcon />} title="E-mail" value={session?.user.email ?? ''} />
        <ListRow leading={<FireIcon color={c.accent} />} title="Maior sequência" value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`} />
      </ListGroup>

      <SectionHeader title="Aparência" />
      <ListGroup>
        {APPEARANCE.map((a) => (
          <ListRow
            key={a.value}
            leading={a.icon}
            title={a.label}
            onPress={() => setPreference(a.value)}
            trailing={preference === a.value ? <CheckIcon size={18} color={c.text} /> : null}
          />
        ))}
      </ListGroup>

      <SectionHeader title="Notificações" />
      <ListGroup>
        <ListRow
          leading={<BellIcon />}
          title="Notificações"
          value={push == null ? null : push ? 'Ativadas' : 'Desligadas'}
          chevron={push === false}
          onPress={push === false ? async () => setPush(await requestPushPermission()) : undefined}
        />
      </ListGroup>
      <Text variant="caption" tone="tertiary" style={s.note}>O horário do lembrete fica na disponibilidade de cada tema.</Text>

      {SITE_URL ? (
        <>
          <SectionHeader title="Sobre" />
          <ListGroup>
            <ListRow leading={<FileTextIcon />} title="Termos de uso" chevron onPress={() => open('/termos')} />
            <ListRow leading={<ShieldCheckIcon />} title="Privacidade" chevron onPress={() => open('/privacidade')} />
            <ListRow leading={<LifebuoyIcon />} title="Suporte" chevron onPress={() => open('/suporte')} />
          </ListGroup>
        </>
      ) : null}

      {__DEV__ ? <DebugDate /> : null}

      <ListGroup style={{ marginTop: SPACE.xxl }}>
        <ListRow leading={<SignOutIcon />} title="Sair" onPress={() => void signOut()} />
        <ListRow leading={<TrashIcon />} title="Excluir conta" destructive onPress={() => setConfirmDelete(true)} />
      </ListGroup>
      <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: SPACE.xl }}>{APP_NAME}</Text>

      <Sheet visible={editName} onClose={() => setEditName(false)} title="Seu nome" avoidKeyboard>
        <View style={{ paddingHorizontal: GUTTER }}>
          <TextField value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} autoFocus />
          <Button label="Salvar" onPress={() => saveName.mutate()} loading={saveName.isPending} disabled={!name.trim()} />
        </View>
      </Sheet>
      <ConfirmSheet
        visible={confirmDelete}
        title="Excluir sua conta?"
        message="Sua conta, seus temas, trilhas e todo o progresso são apagados de vez. Não dá para desfazer."
        confirmLabel="Excluir conta"
        destructive
        loading={deleteAccount.isPending}
        onConfirm={() => deleteAccount.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  )
}

/** Só em desenvolvimento: troca o "hoje" do backend para testar dias seguidos,
 *  dias pulados e o replanejamento sem mexer no relógio. */
function DebugDate() {
  const [date, setDate] = useState('')
  const apply = (value: string | null) => {
    setDebugDate(value)
    invalidateStudy()
    toast.success(value ? `Hoje simulado: ${value}` : 'Data real')
  }
  return (
    <>
      <SectionHeader title="Desenvolvimento" description="Simula a data de hoje no backend." />
      <TextField value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" autoCapitalize="none" />
      <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
        <Button label="Aplicar" variant="secondary" size="md" onPress={() => apply(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null)} style={{ flex: 1 }} />
        <Button label="Data real" variant="ghost" size="md" onPress={() => { setDate(''); apply(null) }} style={{ flex: 1 }} />
      </View>
    </>
  )
}

const useStyles = makeThemedStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, paddingTop: SPACE.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: SPACE.sm, marginLeft: SPACE.lg },
}))
