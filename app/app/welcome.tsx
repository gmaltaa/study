// app/welcome.tsx — primeira tela de quem não entrou: três telas de
// apresentação e as formas de entrar.
import { useRef, useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BookOpenText, CalendarCheck, PathIcon as Path } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { GoogleButton } from '@/components/GoogleButton'
import { AppleButton } from '@/components/AppleButton'
import { APP_NAME, FONTS, GUTTER } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

const SLIDES = [
  {
    Icon: BookOpenText,
    title: 'Aprenda o que quiser, por conta própria',
    body: 'História do Brasil, Python, finanças pessoais. Você diz o tema e o seu objetivo.',
  },
  {
    Icon: Path,
    title: 'Do zero ao avançado, na ordem certa',
    body: 'A IA monta a trilha em módulos, cada um apoiado no anterior, com aulas curtas e exercícios.',
  },
  {
    Icon: CalendarCheck,
    title: 'No seu tempo, todos os dias',
    body: 'Diga quanto tempo tem. O cronograma nunca passa disso, e se você faltar um dia, ele se ajusta sozinho.',
  },
]

export default function Welcome() {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [page, setPage] = useState(0)
  const scroller = useRef<ScrollView>(null)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width)
    if (p !== page) setPage(p)
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Text style={s.brand}>{APP_NAME}</Text>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map(({ Icon, title, body }) => (
          <View key={title} style={[s.slide, { width }]}>
            <View style={s.iconWrap}>
              <Icon size={64} color={c.primary} weight="duotone" />
            </View>
            <Text style={s.title}>{title}</Text>
            <Text style={s.body}>{body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={s.dots}>
        {SLIDES.map((_, i) => <View key={i} style={[s.dot, i === page && s.dotOn]} />)}
      </View>
      <View style={s.actions}>
        <Button label="Criar conta" onPress={() => router.push('/signup')} />
        <GoogleButton />
        <AppleButton />
        <Button label="Já tenho conta" variant="ghost" onPress={() => router.push('/signin')} />
      </View>
    </SafeAreaView>
  )
}

const useStyles = makeThemedStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.bg },
  brand: { fontFamily: FONTS.extraBold, fontSize: 20, color: c.primary, textAlign: 'center', marginTop: 12 },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GUTTER * 2 },
  iconWrap: {
    width: 128, height: 128, borderRadius: 64, backgroundColor: c.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  title: { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 34, color: c.gray900, textAlign: 'center' },
  body: { fontFamily: FONTS.regular, fontSize: 17, lineHeight: 25, color: c.gray600, textAlign: 'center', marginTop: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.gray300 },
  dotOn: { width: 24, backgroundColor: c.primary },
  actions: { paddingHorizontal: GUTTER, gap: 10, paddingBottom: 8 },
}))
