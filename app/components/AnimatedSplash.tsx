// components/AnimatedSplash.tsx — splash em JS: logo animada (pulso, estilo loading) sobre
// o fundo da marca; faz fade-out quando o app está pronto, revelando a Home suavemente.
// Use a mesma imagem/cor do splash nativo (app.json) para um hand-off sem "pulo".
import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { makeThemedStyles } from '@/lib/theme'

// Mantenha igual ao backgroundColor do plugin expo-splash-screen no app.json.
// FIXO nos dois temas (a splash nativa tem a cor da marca, não acompanha o tema).
const SPLASH_BG = '#0F766E'

export function AnimatedSplash({ hide, onHidden, onReady }: {
  hide: boolean
  onHidden: () => void
  onReady?: () => void
}) {
  const s = useStyles()
  const opacity = useRef(new Animated.Value(1)).current
  const pulse = useRef(new Animated.Value(0)).current

  // Loop de "respiração" da logo (escala + opacidade) — sensação de loading.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // Quando pronto, fade-out e desmonta.
  useEffect(() => {
    if (!hide) return
    Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true })
      .start(({ finished }) => { if (finished) onHidden() })
  }, [hide])

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] })
  const logoOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] })

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.fill, { opacity }]}
      pointerEvents="none"
      onLayout={() => onReady?.()}
    >
      <Animated.Image
        source={require('../assets/splash-icon.png')}
        style={{ width: 160, height: 160, transform: [{ scale }], opacity: logoOpacity }}
        resizeMode="contain"
      />
    </Animated.View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  // zIndex + elevation altos: sem isso, no Android a bottom tab bar (e views com
  // elevation) desenham POR CIMA da splash, mesmo ela sendo renderizada por último.
  fill: {
    backgroundColor: SPLASH_BG, justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, elevation: 9999,
  },
}))
