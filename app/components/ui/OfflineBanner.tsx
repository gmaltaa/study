// components/ui/OfflineBanner.tsx — pílula discreta de "sem conexão" no topo.
// Montada UMA vez no _layout; aparece só sem internet e não bloqueia toque.
import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetInfo } from '@react-native-community/netinfo'
import { WifiSlashIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function OfflineBanner() {
  const s = useStyles()
  const c = useColors()
  const net = useNetInfo()
  const insets = useSafeAreaInsets()
  const anim = useRef(new Animated.Value(0)).current
  // Estado inicial (null) conta como online: não pisca enquanto o NetInfo checa.
  const offline = net.isConnected === false || net.isInternetReachable === false

  useEffect(() => {
    Animated.timing(anim, { toValue: offline ? 1 : 0, duration: 200, useNativeDriver: true }).start()
  }, [offline])

  return (
    <Animated.View
      pointerEvents="none"
      style={[s.wrap, { top: insets.top + 6, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}
    >
      <View style={s.pill}>
        <WifiSlashIcon size={13} color={c.onPrimary} />
        <Text variant="micro" tone="onPrimary">Sem conexão</Text>
      </View>
    </Animated.View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary,
    borderRadius: RADIUS.pill, paddingHorizontal: SPACE.md, paddingVertical: 5,
  },
}))
