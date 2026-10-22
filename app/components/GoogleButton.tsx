// components/GoogleButton.tsx — "Continuar com Google". Em sucesso, quem
// redireciona é o _layout (sessão nova → onboarding ou Hoje).
import { useState } from 'react'
import { TouchableOpacity, ActivityIndicator, Alert, View, Image, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { isGoogleConfigured, signInWithGoogle } from '@/lib/google-auth'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

const GOOGLE_LOGO = require('../assets/images/logogoogle.png')

export function GoogleButton({ label = 'Continuar com Google', style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const s = useStyles()
  const c = useColors()
  const [loading, setLoading] = useState(false)
  if (!isGoogleConfigured()) return null

  const onPress = async () => {
    setLoading(true)
    const res = await signInWithGoogle()
    setLoading(false)
    // O nome do Google já chega ao perfil pelo trigger do banco (metadados da conta).
    if (res.ok) return
    if (res.reason === 'cancelled') return
    if (res.reason === 'play_services') {
      Alert.alert('Google Play indisponível', 'Atualize o Google Play Services e tente de novo.')
      return
    }
    Alert.alert('Não deu certo', 'Não foi possível entrar com o Google. Tente de novo.')
  }

  return (
    <TouchableOpacity style={[s.btn, style, loading && s.btnDisabled]} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      {loading ? (
        <ActivityIndicator color={c.staticWhite} />
      ) : (
        <View style={s.row}>
          <Image source={GOOGLE_LOGO} style={s.logo} resizeMode="contain" />
          <Text style={s.txt}>{label}</Text>
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
