// components/Confetti.tsx — chuva de confete em Animated puro (sem dependência).
// Usado no fim de uma sessão. Dispara uma vez ao montar.
import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native'
const { width: W, height: H } = Dimensions.get('window')
const PIECES = 42
// Cores de MARCA (fixas nos dois temas — confete é acento decorativo).
const PALETTE = ['#0F766E', '#2DD4BF', '#F59E0B', '#FDE68A', '#3B82F6', '#EC4899']

type Piece = {
  left: number; size: number; color: string
  delay: number; duration: number; drift: number; spins: number
  round: boolean
}

// Geometria estável por montagem (useRef, não re-sorteia em re-render).
function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, () => ({
    left: Math.random() * W,
    size: 6 + Math.random() * 6,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    delay: Math.random() * 500,
    duration: 2300 + Math.random() * 1300,
    drift: (Math.random() - 0.5) * 140,
    spins: 2 + Math.random() * 3,
    round: Math.random() < 0.35,
  }))
}

function ConfettiPiece({ p }: { p: Piece }) {
  const prog = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(prog, {
      toValue: 1, duration: p.duration, delay: p.delay,
      easing: Easing.in(Easing.quad), useNativeDriver: true,
    }).start()
  }, [])

  const translateY = prog.interpolate({ inputRange: [0, 1], outputRange: [-40, H * 0.95] })
  const translateX = prog.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] })
  const rotate = prog.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * p.spins}deg`] })
  const opacity = prog.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] })

  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: p.left,
        width: p.size, height: p.round ? p.size : p.size * 1.8,
        borderRadius: p.round ? p.size / 2 : 2,
        backgroundColor: p.color,
        opacity, transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  )
}

export function Confetti() {
  const pieces = useRef(makePieces()).current
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => <ConfettiPiece key={i} p={p} />)}
    </View>
  )
}
