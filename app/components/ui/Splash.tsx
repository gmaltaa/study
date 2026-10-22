// components/ui/Splash.tsx — continuação da splash nativa em JS: a marca
// respira até o app estar pronto e some com fade. Mesma imagem e mesma cor da
// splash nativa (app.json), para a troca não "pular".
import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { SPLASH_BG } from '@/lib/theme'

export function Splash({ hide, onHidden, onReady }: {
  hide: boolean
  onHidden: () => void
  onReady?: () => void
}) {
  const opacity = useRef(new Animated.Value(1)).current
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])

  useEffect(() => {
    if (!hide) return
    Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onHidden()
    })
  }, [hide])

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, { opacity }]} pointerEvents="none" onLayout={() => onReady?.()}>
      <Animated.Image
        source={require('../../assets/splash-icon.png')}
        style={{
          width: 120, height: 120,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.02] }) }],
        }}
        resizeMode="contain"
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // zIndex e elevation altos: no Android, sem isso a barra de abas desenha por cima.
  fill: { backgroundColor: SPLASH_BG, justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 9999 },
})
