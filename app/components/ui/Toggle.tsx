// components/ui/Toggle.tsx — interruptor, nas proporções do iOS. Ligado = preto.
import { useEffect, useRef } from 'react'
import { Animated, Pressable } from 'react-native'
import { makeThemedStyles, useColors } from '@/lib/theme'

const W = 51
const H = 31
const KNOB = 27

export function Toggle({ value, onChange, accessibilityLabel }: {
  value: boolean
  onChange: (v: boolean) => void
  accessibilityLabel?: string
}) {
  const s = useStyles()
  const c = useColors()
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, damping: 18, stiffness: 260, mass: 0.6 }).start()
  }, [value])

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [c.surfaceSunken, c.primary] })
  const x = anim.interpolate({ inputRange: [0, 1], outputRange: [2, W - KNOB - 2] })

  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[s.track, { backgroundColor: bg }]}>
        <Animated.View style={[s.knob, { backgroundColor: value ? c.onPrimary : c.staticWhite, transform: [{ translateX: x }] }]} />
      </Animated.View>
    </Pressable>
  )
}

const useStyles = makeThemedStyles((c) => ({
  track: { width: W, height: H, borderRadius: H / 2, justifyContent: 'center' },
  knob: {
    width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    shadowColor: c.shadow, shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
}))
