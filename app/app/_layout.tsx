// app/_layout.tsx — provedores, fontes, splash e o portão de rotas.
//
// O portão decide a tela a partir de três coisas:
//   sem sessão              → boas-vindas e telas de login
//   recuperando a senha     → só a tela de senha nova
//   sessão sem onboarding   → onboarding (e a criação do primeiro tema)
//   sessão com onboarding   → o app (Hoje)
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useFonts,
  HostGrotesk_400Regular,
  HostGrotesk_500Medium,
  HostGrotesk_600SemiBold,
  HostGrotesk_700Bold,
  HostGrotesk_800ExtraBold,
} from '@expo-google-fonts/host-grotesk'
import { AnimatedSplash } from '@/components/AnimatedSplash'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ToastHost } from '@/components/ToastHost'
import { ErrorView } from '@/components/StateView'
import { ThemeProvider, useColors, useTheme } from '@/lib/theme'
import { queryClient } from '@/lib/query'
import { AuthProvider, useAuth } from '@/lib/auth'
import { configureGoogleSignin } from '@/lib/google-auth'
import { initAnalytics } from '@/lib/analytics'
import { addNotificationTapListener } from '@/lib/push'
import { View } from 'react-native'

SplashScreen.preventAutoHideAsync().catch(() => {})

/** Telas de quem ainda não entrou. */
const AUTH_ROUTES = new Set(['welcome', 'signin', 'signup', 'verify-email', 'forgot-password', 'verify-reset'])
/** Telas permitidas durante o onboarding (o primeiro tema é criado nele). */
const ONBOARDING_ROUTES = new Set(['onboarding', 'tema', 'aula'])

function RootNavigator() {
  const router = useRouter()
  const segments = useSegments()
  const first = (segments[0] ?? '') as string
  const { session, ready, profile, profileError, refetchProfile, recovering } = useAuth()
  const { scheme } = useTheme()
  const c = useColors()

  const resolved = ready && (!session || !!profile || profileError)

  useEffect(() => {
    if (!resolved) return
    if (!session) {
      if (!AUTH_ROUTES.has(first)) router.replace('/welcome')
      return
    }
    if (recovering) {
      if (first !== 'reset-password') router.replace('/reset-password')
      return
    }
    if (!profile) return
    if (!profile.onboardedAt) {
      if (!ONBOARDING_ROUTES.has(first)) router.replace('/onboarding')
      return
    }
    if (AUTH_ROUTES.has(first) || first === 'onboarding' || first === 'reset-password') router.replace('/')
  }, [resolved, session, recovering, profile?.onboardedAt, first])

  useEffect(() => addNotificationTapListener((url) => router.push(url as never)), [])

  if (session && profileError && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ErrorView message="Não conseguimos falar com o servidor. Confira sua conexão." onRetry={refetchProfile} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="aula/[id]" options={{ gestureEnabled: false }} />
      </Stack>
      <SplashGate resolved={resolved} />
    </>
  )
}

/** Segura a splash nativa até a sessão e o perfil estarem resolvidos, e some com fade. */
function SplashGate({ resolved }: { resolved: boolean }) {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <AnimatedSplash
      hide={resolved}
      onReady={() => SplashScreen.hideAsync().catch(() => {})}
      onHidden={() => setGone(true)}
    />
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
    HostGrotesk_700Bold,
    HostGrotesk_800ExtraBold,
  })

  useEffect(() => {
    configureGoogleSignin()
    initAnalytics()
  }, [])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <RootNavigator />
                <ToastHost />
                <OfflineBanner />
              </AuthProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
