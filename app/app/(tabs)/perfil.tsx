// app/(tabs)/perfil.tsx — conta, aparência, notificações, links legais, sair e
// excluir a conta (exigência das lojas).
import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Linking, TouchableOpacity, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { Bell, CaretRight, FileText, Fire, Lifebuoy, PencilSimple, ShieldCheck, SignOut, Trash } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { ChipGroup } from '@/components/Chip'
import { TextField } from '@/components/Field'
import { BottomSheet } from '@/components/BottomSheet'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { api, errorMessage, setDebugDate } from '@/lib/api'
import { setProfileCache, useAuth } from '@/lib/auth'
import { hasPushPermission, requestPushPermission } from '@/lib/push'
import { invalidateStudy } from '@/lib/query'
import { toast } from '@/lib/toast'
import { APP_NAME, FONTS, GUTTER, SITE_URL } from '@/lib/constants'
import { makeThemedStyles, useColors, useTheme, type ThemePreference } from '@/lib/theme'

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

  const open = (path: string) => SITE_URL && Linking.openURL(`${SITE_URL}${path}`)

  return (
    <Screen>
      <Text style={s.title}>Perfil</Text>

      <Card style={s.account}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{profile?.displayName || 'Sem nome'}</Text>
          <Text style={s.email}>{session?.user.email ?? ''}</Text>
        </View>
        <TouchableOpacity onPress={() => { setName(profile?.displayName ?? ''); setEditName(true) }} hitSlop={8}>
          <PencilSimple size={22} color={c.primary} weight="bold" />
        </TouchableOpacity>
      </Card>

      <Card style={s.streak}>
        <Fire size={24} color={c.accent} weight="fill" />
        <Text style={s.streakText}>Maior sequência: <Text style={s.bold}>{profile?.longestStreak ?? 0} {profile?.longestStreak === 1 ? 'dia' : 'dias'}</Text></Text>
      </Card>

      <Text style={s.section}>Aparência</Text>
      <ChipGroup<ThemePreference>
        options={[{ label: 'Automático', value: 'system' }, { label: 'Claro', value: 'light' }, { label: 'Escuro', value: 'dark' }]}
        value={preference}
        onChange={setPreference}
      />

      <Text style={s.section}>Notificações</Text>
      <Card style={s.rowCard}>
        <Bell size={22} color={c.gray700} weight="bold" />
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle}>{push ? 'Notificações ativadas' : 'Notificações desligadas'}</Text>
          <Text style={s.rowText}>O horário do lembrete fica na disponibilidade de cada tema.</Text>
        </View>
      </Card>
      {push === false ? (
        <Button label="Ativar notificações" variant="secondary" onPress={async () => setPush(await requestPushPermission())} style={{ marginTop: 10 }} />
      ) : null}

      {SITE_URL ? (
        <>
          <Text style={s.section}>Sobre</Text>
          <Card style={{ paddingVertical: 4 }}>
            <LinkRow icon={<FileText size={20} color={c.gray700} weight="bold" />} label="Termos de uso" onPress={() => open('/termos')} />
            <LinkRow icon={<ShieldCheck size={20} color={c.gray700} weight="bold" />} label="Privacidade" onPress={() => open('/privacidade')} />
            <LinkRow icon={<Lifebuoy size={20} color={c.gray700} weight="bold" />} label="Suporte" onPress={() => open('/suporte')} last />
          </Card>
        </>
      ) : null}

      {__DEV__ ? <DebugDate /> : null}

      <View style={s.actions}>
        <Button label="Sair" variant="secondary" icon={<SignOut size={18} weight="bold" />} onPress={() => void signOut()} />
        <Button label="Excluir conta" variant="ghostDanger" icon={<Trash size={18} color={c.red} weight="bold" />} onPress={() => setConfirmDelete(true)} />
      </View>
      <Text style={s.version}>{APP_NAME}</Text>

      <BottomSheet visible={editName} onClose={() => setEditName(false)} title="Seu nome" avoidKeyboard>
        <View style={{ paddingHorizontal: GUTTER }}>
          <TextField value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} autoFocus />
          <Button label="Salvar" onPress={() => saveName.mutate()} loading={saveName.isPending} disabled={!name.trim()} />
        </View>
      </BottomSheet>
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

function LinkRow({ icon, label, onPress, last }: { icon: ReactNode; label: string; onPress: () => void; last?: boolean }) {
  const s = useStyles()
  const c = useColors()
  return (
    <TouchableOpacity style={[s.link, !last && s.linkBorder]} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={s.linkText}>{label}</Text>
      <CaretRight size={18} color={c.gray500} weight="bold" />
    </TouchableOpacity>
  )
}

/** Só em desenvolvimento: troca o "hoje" do backend para testar dias seguidos,
 *  dias pulados e o replanejamento sem mexer no relógio. */
function DebugDate() {
  const s = useStyles()
  const [date, setDate] = useState('')
  const apply = (value: string | null) => {
    setDebugDate(value)
    invalidateStudy()
    toast.success(value ? `Hoje simulado: ${value}` : 'Data real')
  }
  return (
    <>
      <Text style={s.section}>Desenvolvimento</Text>
      <TextField label="Simular a data de hoje" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" autoCapitalize="none" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Aplicar" variant="secondary" onPress={() => apply(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null)} style={{ flex: 1 }} />
        <Button label="Data real" variant="ghost" onPress={() => { setDate(''); apply(null) }} style={{ flex: 1 }} />
      </View>
    </>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900, paddingTop: 12, paddingBottom: 16 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: FONTS.bold, fontSize: 18, color: c.gray900 },
  email: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray500, marginTop: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  streakText: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray700 },
  bold: { fontFamily: FONTS.bold, color: c.gray900 },
  section: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray900, marginTop: 28, marginBottom: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: c.gray900 },
  rowText: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2, lineHeight: 18 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  linkBorder: { borderBottomWidth: 1, borderBottomColor: c.gray100 },
  linkText: { flex: 1, fontFamily: FONTS.medium, fontSize: 15, color: c.gray900 },
  actions: { marginTop: 32, gap: 4 },
  version: { fontFamily: FONTS.regular, fontSize: 12, color: c.gray500, textAlign: 'center', marginTop: 16 },
}))
