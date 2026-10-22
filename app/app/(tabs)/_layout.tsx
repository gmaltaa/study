import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BooksIcon, HouseIcon, UserCircleIcon } from 'phosphor-react-native'
import { FONTS, HAIRLINE } from '@/lib/constants'
import { useColors } from '@/lib/theme'

// Barra de abas discreta: mesmo fundo da tela, filete em cima, ativo em preto.
// O ícone não muda de peso entre ativo e inativo, só de cor.
export default function TabLayout() {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.border,
          borderTopWidth: HAIRLINE,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          elevation: 0,
        },
        tabBarLabelStyle: { fontFamily: FONTS.sansMedium, fontSize: 11, marginTop: 2 },
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textTertiary,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Hoje', tabBarIcon: ({ color }) => <HouseIcon size={22} color={color as string} /> }}
      />
      <Tabs.Screen
        name="temas"
        options={{ title: 'Temas', tabBarIcon: ({ color }) => <BooksIcon size={22} color={color as string} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <UserCircleIcon size={22} color={color as string} /> }}
      />
    </Tabs>
  )
}
