// components/OfflineBanner.tsx — aviso sutil de "sem conexão".
// Pílula flutuante no topo (abaixo da status bar), aparece só quando offline.
// Renderizado UMA vez globalmente no _layout (overlay; não desloca o conteúdo).
import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetInfo } from '@react-native-community/netinfo'
import { WifiSlash } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function OfflineBanner() {
  const s = useStyles()
  const c = useColors()
  const net = useNetInfo()
  const insets = useSafeAreaInsets()
  const anim = useRef(new Animated.Value(0)).current

  // Offline = explicitamente sem conexão. O estado inicial (null) é tratado como
  // online p/ não "piscar" o aviso enquanto o NetInfo ainda não checou.
  const offline = net.isConnected === false || net.isInternetReachable === false

  useEffect(() => {
    Animated.timing(anim, {
      toValue: offline ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [offline])

  return (
    <Animated.View
      pointerEvents="none" // overlay decorativo — nunca bloqueia toques
      style={[
        s.wrap,
        {
          top: insets.top + 6,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        },
      ]}
    >
      <View style={s.pill}>
        <WifiSlash size={13} color={c.staticWhite} weight="bold" />
        <Text style={s.text}>Sem conexão</Text>
      </View>
    </Animated.View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.navy, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  text: { fontFamily: FONTS.semiBold, fontSize: 12, color: c.staticWhite },
}))
