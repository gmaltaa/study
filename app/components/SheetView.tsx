// components/SheetView.tsx — visual do bottom sheet (backdrop + sheet), SEM Modal.
// Pode ser usado inline (dentro de outro Modal, sem aninhar) ou via BottomSheet.
import {
  useEffect, useRef, useState, ReactNode } from 'react'
import {
  Animated, Dimensions, Keyboard, Platform, Pressable, StyleSheet, View,
} from 'react-native'
import { Text } from '@/components/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FONTS, GUTTER } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

const { height: SCREEN_H } = Dimensions.get('window')

export function SheetView({
  visible, onClose, onClosed, title, children,
  floatingHandle = false, collapsedRatio = 0.82, avoidKeyboard = false, fullHeight = false,
}: {
  visible: boolean
  onClose: () => void
  onClosed?: () => void
  title?: string
  children: ReactNode
  floatingHandle?: boolean
  collapsedRatio?: number
  avoidKeyboard?: boolean
  fullHeight?: boolean
}) {
  const s = useStyles()
  const insets = useSafeAreaInsets()
  const [render, setRender] = useState(visible)
  const [kbHeight, setKbHeight] = useState(0)
  const translateY = useRef(new Animated.Value(SCREEN_H)).current
  const backdrop = useRef(new Animated.Value(0)).current

  // Dentro de um Modal, o KeyboardAvoidingView/adjustResize não empurra o sheet.
  // Escutamos o teclado e levantamos o sheet pela altura dele (funciona sempre).
  useEffect(() => {
    if (!avoidKeyboard) return
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const sub1 = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0))
    const sub2 = Keyboard.addListener(hideEvt, () => setKbHeight(0))
    return () => { sub1.remove(); sub2.remove() }
  }, [avoidKeyboard])

  useEffect(() => {
    if (visible) {
      setRender(true)
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 240, mass: 0.9 }),
      ]).start()
    } else if (render) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        // O callback do Animated dispara TAMBEM quando a animacao e
        // INTERROMPIDA — comecar outra nos mesmos valores para a anterior e
        // chama isto com finished=false. Tratar isso como "fechei" avisava o
        // dono no meio de uma REABERTURA: ele desmontava o Modal e, como o
        // `visible` nao tinha mudado, o efeito de remontagem nao rodava de novo
        // e aquele sheet nao abria mais ate trocar de tela.
        if (!finished) return
        setRender(false)
        onClosed?.()
      })
    }
  }, [visible])

  if (!render) return null

  const sheet = (
    <Animated.View
      style={[
        s.sheet,
        // fullHeight = ocupa da status bar até embaixo (consistente em iOS e Android).
        fullHeight
          ? { flex: 1, marginTop: insets.top + 8, paddingBottom: insets.bottom + 10, transform: [{ translateY }] }
          : { maxHeight: SCREEN_H * collapsedRatio, paddingBottom: insets.bottom + 10, transform: [{ translateY }] },
        // floatingHandle = conteúdo encosta no topo (ex.: cabeçalho colorido)
        !floatingHandle && { paddingTop: 14 },
        // Levanta o sheet acima do teclado (quando avoidKeyboard).
        avoidKeyboard && kbHeight > 0 ? { marginBottom: kbHeight } : null,
      ]}
    >
      {title ? <Text style={s.title}>{title}</Text> : null}
      {children}
    </Animated.View>
  )

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={s.anchor} pointerEvents="box-none">{sheet}</View>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  backdrop: { backgroundColor: c.overlay },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: c.gray900, paddingHorizontal: GUTTER, marginBottom: 12 },
}))
