// components/ToastHost.tsx — toast de sucesso minimalista no topo (3s, entra/sai animado).
// Montado UMA vez no _layout. Disparado via `toast.success('...')` de qualquer lugar.
import { useEffect, useRef, useState } from 'react'
import { Animated, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CheckCircle } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { _subscribeToast } from '@/lib/toast'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

const DURATION = 3000

export function ToastHost() {
  const s = useStyles()
  const c = useColors()
  const insets = useSafeAreaInsets()
  const [msg, setMsg] = useState<string | null>(null)
  const anim = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const hide = () => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMsg(null)
      })
    }
    _subscribeToast((m) => {
      if (timer.current) clearTimeout(timer.current)
      setMsg(m)
      anim.setValue(0)
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.9 }).start()
      timer.current = setTimeout(hide, DURATION)
    })
    return () => {
      _subscribeToast(null)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (!msg) return null

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.wrap,
        {
          top: insets.top + 8,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        },
      ]}
    >
      <View style={s.toast}>
        <CheckCircle size={18} color={c.staticWhite} weight="fill" />
        <Text style={s.text} numberOfLines={2}>{msg}</Text>
      </View>
    </Animated.View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2000, paddingHorizontal: 16 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.navy, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 440,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  text: { fontFamily: FONTS.semiBold, fontSize: 14, color: c.staticWhite, flexShrink: 1 },
}))
