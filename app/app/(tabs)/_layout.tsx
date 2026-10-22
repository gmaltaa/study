import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Books, House, UserCircle } from 'phosphor-react-native'
import { FONTS } from '@/lib/constants'
import { useColors } from '@/lib/theme'

export default function TabLayout() {
  const c = useColors()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.white,
          borderTopColor: c.gray100,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: FONTS.semiBold, fontSize: 12 },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.gray500,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ focused, color }) => <House size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="temas"
        options={{
          title: 'Temas',
          tabBarIcon: ({ focused, color }) => <Books size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => <UserCircle size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />,
        }}
      />
    </Tabs>
  )
}
