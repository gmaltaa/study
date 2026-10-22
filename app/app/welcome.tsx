// app/welcome.tsx — primeira tela de quem não entrou. Mostra o produto em vez
// de explicá-lo: o nome, a promessa, um pedido de exemplo como ele é feito no
// app e temas que dá para estudar. Tocar em qualquer um leva ao cadastro.
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowUpIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { ListRow } from '@/components/ui/ListRow'
import { Screen } from '@/components/ui/Screen'
import { GoogleButton } from '@/components/GoogleButton'
import { AppleButton } from '@/components/AppleButton'
import { APP_NAME, SPACE } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

const EXAMPLES = [
  'Finanças pessoais, do zero ao investimento',
  'Python para automatizar planilhas',
  'Filosofia antiga, de Sócrates a Epicuro',
  'Fotografia com o celular',
]

export default function Welcome() {
  const s = useStyles()
  const router = useRouter()
  const start = () => router.push('/signup')

  return (
    <Screen
      footer={
        <>
          <Button label="Criar conta" onPress={start} />
          <GoogleButton />
          <AppleButton />
          <Button label="Já tenho conta" variant="ghost" onPress={() => router.push('/signin')} />
        </>
      }
    >
      <View style={s.hero}>
        <Text variant="wordmark" align="center">{APP_NAME}</Text>
        <Text variant="reading" tone="secondary" align="center">
          Diga o que quer aprender e quanto tempo tem.{'\n'}A gente monta o caminho e te diz o que estudar hoje.
        </Text>
      </View>

      {/* O card não é tocável: o botão redondo é o alvo (botão dentro de botão
          confunde leitor de tela e quebra no web). */}
      <Card variant="elevated" style={s.prompt}>
        <Text variant="heading">Quero entender a história do Brasil para o ENEM</Text>
        <IconButton variant="solid" size="md" onPress={start} accessibilityLabel="Começar" style={{ alignSelf: 'flex-end' }}>
          <ArrowUpIcon />
        </IconButton>
      </Card>

      <View style={{ marginTop: SPACE.lg }}>
        {EXAMPLES.map((e) => <ListRow key={e} variant="divided" title={e} onPress={start} numberOfLines={1} />)}
      </View>
    </Screen>
  )
}

const useStyles = makeThemedStyles(() => ({
  hero: { alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxl },
  prompt: { minHeight: 136, justifyContent: 'space-between', gap: SPACE.md },
}))
