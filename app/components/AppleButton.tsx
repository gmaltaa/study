// components/AppleButton.tsx — "Continuar com a Apple". Botão próprio (não o
// nativo) para usar a fonte do produto, dentro das diretrizes da Apple: logo,
// texto aprovado e contraste. Não aparece fora do iOS.
import { useEffect, useState } from 'react'
import { TouchableOpacity, ActivityIndicator, Alert, View, Image, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { isAppleSignInAvailable, signInWithApple } from '@/lib/apple-auth'
import { api } from '@/lib/api'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

const APPLE_LOGO = require('../assets/images/logoapple.png')

export function AppleButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const s = useStyles()
  const c = useColors()
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { isAppleSignInAvailable().then(setAvailable) }, [])
  if (!available) return null

  const onPress = async () => {
    if (busy) return
    setBusy(true)
    const res = await signInWithApple()
    setBusy(false)
    if (!res.ok) {
      if (res.reason !== 'cancelled') Alert.alert('Não deu certo', 'Não foi possível entrar com a Apple. Tente de novo.')
      return
    }
    // A Apple só manda o nome na primeira autorização: é a única chance de salvar.
    if (res.fullName) api.updateMe({ displayName: res.fullName.slice(0, 60) }).catch(() => {})
  }

  return (
    <TouchableOpacity style={[s.btn, style, busy && s.btnDisabled]} onPress={onPress} disabled={busy} activeOpacity={0.85}>
      {busy ? (
        <ActivityIndicator color={c.staticWhite} />
      ) : (
        <View style={s.row}>
          <Image source={APPLE_LOGO} style={s.logo} resizeMode="contain" />
          <Text style={s.txt}>Continuar com a Apple</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const useStyles = makeThemedStyles((c) => ({
  btn: { backgroundColor: c.staticBlack, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 24, height: 24 },
  txt: { fontFamily: FONTS.bold, fontSize: 16, color: c.staticWhite },
}))
