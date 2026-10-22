// components/Toggle.tsx — switch on/off animado. Fonte única.
import { useEffect, useRef } from 'react'
import { Animated, Pressable } from 'react-native'
import { makeThemedStyles, useColors } from '@/lib/theme'

const W = 50
const H = 30
const KNOB = 24

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const s = useStyles()
  const c = useColors()
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start()
  }, [value])

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [c.gray200, c.primary] })
  const x = anim.interpolate({ inputRange: [0, 1], outputRange: [3, W - KNOB - 3] })

  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8}>
      <Animated.View style={[s.track, { backgroundColor: bg }]}>
        <Animated.View style={[s.knob, { transform: [{ translateX: x }] }]} />
      </Animated.View>
    </Pressable>
  )
}

const useStyles = makeThemedStyles((c) => ({
  track: { width: W, height: H, borderRadius: H / 2, justifyContent: 'center' },
  knob: {
    width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: c.white,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
}))
