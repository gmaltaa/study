// components/ui/Sheet.tsx — bottom sheet. Fonte única.
//
// Cantos grandes, alça no topo, botão redondo de fechar à esquerda e título
// centralizado. O fundo é o off-white da tela; listas dentro usam <ListGroup>.
//
//   <Sheet>      sheet dentro de um Modal (o uso normal, a partir de uma tela)
//   <SheetView>  só o visual, para quando já se está dentro de um Modal
//                (nunca empilhar Modal sobre Modal: trava a tela no iOS)
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Dimensions, Keyboard, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { IconButton } from '@/components/ui/IconButton'
import { GUTTER, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

const { height: SCREEN_H } = Dimensions.get('window')

interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Sobe junto com o teclado (sheet com campo de texto). */
  avoidKeyboard?: boolean
  /** Some com o botão de fechar (sheet de confirmação, que tem "Cancelar"). */
  hideClose?: boolean
}

export function SheetView({
  visible, onClose, onClosed, title, children, avoidKeyboard = false, hideClose = false,
}: SheetProps & { onClosed?: () => void }) {
  const s = useStyles()
  const insets = useSafeAreaInsets()
  const [render, setRender] = useState(visible)
  const [kb, setKb] = useState(0)
  const translateY = useRef(new Animated.Value(SCREEN_H)).current
  const backdrop = useRef(new Animated.Value(0)).current

  // Dentro de um Modal o ajuste automático do teclado não empurra o sheet:
  // escuta o teclado e sobe pela altura dele.
  useEffect(() => {
    if (!avoidKeyboard) return
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates?.height ?? 0))
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0))
    return () => { show.remove(); hide.remove() }
  }, [avoidKeyboard])

  useEffect(() => {
    if (visible) {
      setRender(true)
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 260, mass: 0.9 }),
      ]).start()
    } else if (render) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        // `finished` falso = a animação foi interrompida por uma reabertura.
        if (!finished) return
        setRender(false)
        onClosed?.()
      })
    }
  }, [visible])

  if (!render) return null

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
      </Animated.View>
      <View style={s.anchor} pointerEvents="box-none">
        <Animated.View
          style={[
            s.sheet,
            { maxHeight: SCREEN_H * 0.9, paddingBottom: insets.bottom + SPACE.lg, transform: [{ translateY }] },
            kb > 0 ? { marginBottom: kb } : null,
          ]}
        >
          <View style={s.grabber} />
          {title || !hideClose ? (
            <View style={s.header}>
              {hideClose ? <View style={s.side} /> : (
                <IconButton variant="floating" size="md" onPress={onClose} accessibilityLabel="Fechar">
                  <XIcon />
                </IconButton>
              )}
              <Text variant="labelStrong" align="center" style={s.title} numberOfLines={1}>{title ?? ''}</Text>
              <View style={s.side} />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </View>
  )
}

export function Sheet(props: SheetProps) {
  const [mounted, setMounted] = useState(props.visible)
  useEffect(() => { if (props.visible && !mounted) setMounted(true) }, [props.visible, mounted])
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={props.onClose} statusBarTranslucent>
      <SheetView {...props} onClosed={() => setMounted(false)} />
    </Modal>
  )
}

const useStyles = makeThemedStyles((c) => ({
  backdrop: { backgroundColor: c.overlay },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: c.surfaceSunken, marginTop: SPACE.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER - 4, paddingTop: SPACE.sm, paddingBottom: SPACE.lg },
  side: { width: 44 },
  title: { flex: 1 },
}))
