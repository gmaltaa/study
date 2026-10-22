// components/ui/Toast.tsx — aviso curto no topo (3 s). Montado UMA vez no
// _layout; disparado de qualquer lugar com `toast.success('...')`.
import { useEffect, useRef, useState } from 'react'
import { Animated, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CheckCircleIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { elevation } from '@/components/ui/elevation'
import { RADIUS, SPACE } from '@/lib/constants'
import { _subscribeToast } from '@/lib/toast'
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
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMsg(null)
      })
    }
    _subscribeToast((m) => {
      if (timer.current) clearTimeout(timer.current)
      setMsg(m)
      anim.setValue(0)
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 240, mass: 0.8 }).start()
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
      accessibilityLiveRegion="polite"
      style={[s.wrap, {
        top: insets.top + SPACE.sm,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }]}
    >
      <View style={s.toast}>
        <CheckCircleIcon size={18} color={c.onPrimary} />
        <Text variant="label" tone="onPrimary" numberOfLines={2} style={{ flexShrink: 1 }}>{msg}</Text>
      </View>
    </Animated.View>
  )
}

const useStyles = makeThemedStyles((c, scheme) => ({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2000, paddingHorizontal: SPACE.lg },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, maxWidth: 440,
    backgroundColor: c.primary, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
    ...elevation('md', c, scheme),
  },
}))
