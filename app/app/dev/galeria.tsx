// app/dev/galeria.tsx — galeria de componentes, SÓ em desenvolvimento.
//
// Mostra cada componente da biblioteca (components/ui) e os compostos do
// produto com dados de exemplo, nos estados que importam. Serve para conferir
// o padrão visual sem precisar de backend, e para revisar uma mudança de
// componente em todos os lugares ao mesmo tempo. Em produção, redireciona.
import { useState } from 'react'
import { View } from 'react-native'
import { Redirect } from 'expo-router'
import { BellIcon, BooksIcon, CalendarBlankIcon, ClockIcon, FireIcon, PlusIcon, TrashIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Tag } from '@/components/ui/Tag'
import { Card } from '@/components/ui/Card'
import { Chip, ChipGroup, RadioCard } from '@/components/ui/Chip'
import { Composer } from '@/components/ui/Composer'
import { TextField } from '@/components/ui/TextField'
import { Toggle } from '@/components/ui/Toggle'
import { ListGroup } from '@/components/ui/ListGroup'
import { ListRow } from '@/components/ui/ListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProgressBar, StepProgress } from '@/components/ui/ProgressBar'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { EmptyView } from '@/components/ui/StateView'
import { Cover } from '@/components/ui/Cover'
import { SessionCard } from '@/components/SessionCard'
import { SubjectCard } from '@/components/SubjectCard'
import { ModuleList } from '@/components/ModuleList'
import { LessonBlocks } from '@/components/LessonBlocks'
import { ExerciseCard } from '@/components/ExerciseCard'
import { MediaBlock } from '@/components/media/MediaBlock'
import { SPACE } from '@/lib/constants'
import { useTheme } from '@/lib/theme'
import type { Block, Exercise, MediaItem, PathModule, SubjectSummary, TodaySession } from '@/lib/types'

const SESSION: TodaySession = {
  id: 's1', slot: 1, plannedMinutes: 30, status: 'in_progress', isExtra: false,
  subject: { id: 'h', title: 'História do Brasil', icon: '🏛️', color: 'clay' },
  lessons: [
    { id: 'l1', title: 'As capitanias hereditárias', minutes: 15, completed: true, ready: true },
    { id: 'l2', title: 'O governo-geral e a fundação de Salvador', minutes: 15, completed: false, ready: true },
  ],
}

const SUBJECT: SubjectSummary = {
  id: 'h', title: 'História do Brasil', icon: '🏛️', color: 'clay', status: 'active', failureReason: null,
  progress: { completed: 8, total: 24, percent: 33, minutesDone: 160, minutesTotal: 480 },
  nextLesson: { id: 'l2', title: 'O governo-geral e a fundação de Salvador' }, nextSessionDate: '2026-10-23',
  endDate: '2026-12-12', deadline: null, fitsDeadline: true, createdAt: '2026-10-01',
}

const MODULES: PathModule[] = [
  {
    id: 'm1', position: 1, title: 'Brasil colônia', objective: 'Explicar como Portugal ocupou e administrou o território.',
    lessons: [
      { id: 'l1', position: 1, title: 'As capitanias hereditárias', minutes: 15, completed: true, ready: true },
      { id: 'l2', position: 2, title: 'O governo-geral e a fundação de Salvador', minutes: 15, completed: false, ready: true },
      { id: 'l3', position: 3, title: 'O ciclo do açúcar no Nordeste', minutes: 15, completed: false, ready: false },
    ],
  },
  {
    id: 'm2', position: 2, title: 'O ciclo do ouro', objective: 'Relacionar a mineração à mudança do eixo econômico.',
    lessons: [{ id: 'l4', position: 4, title: 'A descoberta do ouro em Minas Gerais', minutes: 15, completed: false, ready: false }],
  },
]

const BLOCKS: Block[] = [
  { type: 'paragraph', text: 'Em 1534, sem dinheiro para ocupar um território tão grande, a Coroa portuguesa dividiu o litoral em faixas e entregou cada uma a um donatário.' },
  { type: 'heading', text: 'Quem eram os donatários' },
  { type: 'list', items: ['Nobres e militares de confiança do rei', 'Responsáveis por povoar e defender a terra', 'Pagavam a ocupação com recursos próprios'] },
  { type: 'callout', title: 'Erro comum', text: 'As capitanias não eram propriedade privada: o donatário administrava, mas a terra seguia sendo da Coroa.' },
  { type: 'key_points', title: null, items: ['O sistema foi criado em 1534', 'A maioria das capitanias fracassou', 'Em 1549 veio o governo-geral'] },
]

const EXERCISE: Exercise = {
  id: 'e1', position: 1, kind: 'multiple_choice', concept: 'capitanias',
  prompt: 'Por que a Coroa portuguesa criou as capitanias hereditárias?',
  correctOptionId: 'b',
  options: [
    { id: 'a', text: 'Para vender as terras e pagar dívidas', explanation: 'As terras não eram vendidas: continuavam sendo da Coroa.' },
    { id: 'b', text: 'Para ocupar o território sem gastar recursos próprios', explanation: 'Isso: o custo da ocupação ficava com os donatários.' },
    { id: 'c', text: 'Para dar autonomia política à colônia', explanation: 'A colônia continuava subordinada a Portugal.' },
  ],
}

const PODCAST: MediaItem = {
  id: 'p1', ref: null, role: 'extra', kind: 'podcast', provider: 'itunes', title: 'Capitanias hereditárias: por que deram errado',
  author: 'Podcast de história', url: 'https://example.com', mediaUrl: null, thumbnailUrl: null, durationSec: 1980,
  width: null, height: null, language: 'pt', license: null, attribution: null, description: null, caption: null,
  reason: 'Uma conversa de meia hora que aprofunda o fracasso das capitanias.', countsMinutes: 0, feedback: null,
}

const READING: MediaItem = {
  ...PODCAST, id: 'a1', kind: 'article', provider: 'wikipedia', title: 'Capitanias do Brasil', author: 'Wikipédia',
  description: 'As capitanias do Brasil foram uma forma de administração territorial do Império Português, que consistia em dividir o território em faixas.',
  reason: 'O artigo completo, com o mapa e a lista de donatários.',
}

export default function Gallery() {
  const { scheme, setPreference } = useTheme()
  const [chip, setChip] = useState(30)
  const [toggle, setToggle] = useState(true)
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [confirm, setConfirm] = useState(false)

  if (!__DEV__) return <Redirect href="/" />

  return (
    <Screen back title="Galeria" right={<Button label={scheme === 'dark' ? 'Claro' : 'Escuro'} variant="ghost" size="sm" onPress={() => setPreference(scheme === 'dark' ? 'light' : 'dark')} />}>
      <PageHeader title="Boa tarde, Gabriel" subtitle="Quarta, 22 de out. · 1 sessão · 15 min">
        <StepProgress total={5} current={1} />
      </PageHeader>

      <SectionHeader title="Tipografia" />
      <View style={{ gap: SPACE.sm }}>
        <Text variant="wordmark">Estudos</Text>
        <Text variant="display">Display serifa</Text>
        <Text variant="title">Título de tela</Text>
        <Text variant="heading">Título de card</Text>
        <Text variant="subheading">Subtítulo de linha</Text>
        <Text variant="eyebrow">Cabeçalho de seção</Text>
        <Text variant="reading">Texto corrido das aulas, em serifa, confortável para ler.</Text>
        <Text variant="body" tone="secondary">Corpo de interface, em sans.</Text>
        <Text variant="label">Rótulo de linha</Text>
        <Text variant="caption" tone="tertiary">Legenda pequena</Text>
      </View>

      <SectionHeader title="Botões" />
      <View style={{ gap: SPACE.sm }}>
        <Button label="Primário" onPress={() => {}} />
        <Button label="Secundário" variant="secondary" onPress={() => {}} />
        <Button label="Tonal" variant="tonal" onPress={() => {}} icon={<PlusIcon />} />
        <Button label="Perigo" variant="danger" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Desabilitado" disabled onPress={() => {}} />
      </View>
      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg, alignItems: 'center' }}>
        <IconButton onPress={() => {}} accessibilityLabel="a"><ClockIcon /></IconButton>
        <IconButton variant="floating" size="md" onPress={() => {}} accessibilityLabel="b"><BellIcon /></IconButton>
        <IconButton variant="solid" size="md" onPress={() => {}} accessibilityLabel="c"><PlusIcon /></IconButton>
        <IconButton variant="tonal" size="md" onPress={() => {}} accessibilityLabel="d"><CalendarBlankIcon /></IconButton>
        <Toggle value={toggle} onChange={setToggle} />
      </View>

      <SectionHeader title="Tags e escolhas" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <Tag label="15 min" />
        <Tag label="Pausado" variant="muted" />
        <Tag label="Pronta" variant="solid" />
        <Tag label="4 dias seguidos" variant="accent" icon={<FireIcon />} />
        <Tag label="Feita" variant="success" />
        <Tag label="Falhou" variant="danger" />
      </View>
      <View style={{ marginTop: SPACE.lg, gap: SPACE.md }}>
        <ChipGroup options={[15, 30, 45, 60].map((m) => ({ label: `${m} min`, value: m }))} value={chip} onChange={setChip} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => <Chip key={d} shape="circle" label={d} selected={i > 0 && i < 6} onPress={() => {}} />)}
        </View>
        <RadioCard title="Base sólida" description="Do básico ao intermediário, bem completo." selected onPress={() => {}} />
        <RadioCard title="Aprofundado" description="Até o avançado. Leva mais tempo." selected={false} onPress={() => {}} />
      </View>

      <SectionHeader title="Campos" />
      <Composer value={text} onChangeText={setText} placeholder="O que você quer aprender?" onSubmit={() => {}} />
      <TextField label="E-mail" value="" onChangeText={() => {}} placeholder="voce@email.com" style={{ marginTop: SPACE.lg }} />

      <SectionHeader title="Listas" />
      <ListGroup>
        <ListRow leading={<BellIcon />} title="Lembrete diário" trailing={<Toggle value={toggle} onChange={setToggle} />} />
        <ListRow leading={<ClockIcon />} title="Horário" value="19:00" chevron onPress={() => {}} />
        <ListRow leading={<TrashIcon />} title="Excluir tema" destructive onPress={() => {}} />
      </ListGroup>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.lg }}>
        <ListRow variant="outline" leading={<BooksIcon />} title="Biblioteca do tema" subtitle="Vídeos, podcasts, imagens e leituras" chevron onPress={() => {}} />
      </View>

      <SectionHeader title="Cards do produto" />
      <View style={{ gap: SPACE.md }}>
        <SessionCard session={SESSION} />
        <SubjectCard subject={SUBJECT} onPress={() => {}} />
        <SubjectCard subject={{ ...SUBJECT, id: 'p', title: 'Python do zero', icon: '🐍', color: 'sky', status: 'review' }} compact onPress={() => {}} />
        <Card variant="muted">
          <Text variant="heading">Dia cumprido.</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: SPACE.xs }}>4 dias de estudo seguidos.</Text>
        </Card>
        <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
          {(['stone', 'clay', 'sky', 'lilac', 'rose', 'sand'] as const).map((k) => <Cover key={k} icon="📘" color={k} size={44} />)}
        </View>
        <ProgressBar percent={33} />
      </View>

      <SectionHeader title="Trilha" />
      <ModuleList modules={MODULES} showProgress />

      <SectionHeader title="Aula" />
      <LessonBlocks blocks={BLOCKS} />
      <View style={{ marginTop: SPACE.xxl }}>
        <ExerciseCard exercise={EXERCISE} chosen={answer} onChoose={setAnswer} />
      </View>

      <SectionHeader title="Conteúdo externo" />
      <View style={{ gap: SPACE.xl }}>
        <MediaBlock item={PODCAST} />
        <MediaBlock item={READING} />
      </View>

      <SectionHeader title="Vazio e sheets" />
      <EmptyView icon={<BooksIcon />} title="Nenhum tema ainda" message="Você pode estudar até 3 temas ao mesmo tempo." />
      <View style={{ gap: SPACE.sm }}>
        <Button label="Abrir sheet" variant="secondary" onPress={() => setSheet(true)} />
        <Button label="Abrir confirmação" variant="secondary" onPress={() => setConfirm(true)} />
      </View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Horário do lembrete">
        <View style={{ paddingHorizontal: 20 }}>
          <ListGroup>
            <ListRow leading={<BellIcon />} title="Lembrete diário" trailing={<Toggle value={toggle} onChange={setToggle} />} />
            <ListRow leading={<ClockIcon />} title="Horário" value="19:00" chevron onPress={() => {}} />
          </ListGroup>
        </View>
      </Sheet>
      <ConfirmSheet
        visible={confirm}
        title="Excluir este tema?"
        message="A trilha, as aulas e todo o progresso deste tema somem de vez."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => setConfirm(false)}
        onClose={() => setConfirm(false)}
      />
    </Screen>
  )
}
