// components/BottomSheet.tsx — SheetView dentro de um Modal (uso standalone, não-aninhado).
// Para sheets DENTRO de outro modal, use <SheetView> direto (sem aninhar Modal).
import { useEffect, useState, ReactNode } from 'react'
import { Modal, Platform } from 'react-native'
import { SheetView } from '@/components/SheetView'

export function BottomSheet({
  visible, onClose, onClosed, onDismissed, onShown, title, children, floatingHandle = false, collapsedRatio, avoidKeyboard = false, fullHeight = false, overlays,
}: {
  visible: boolean
  onClose: () => void
  /** Dispara quando o Modal terminou de ser APRESENTADO. É o momento seguro
   *  para dar foco a um campo: `autoFocus` durante a apresentação é engolido no
   *  iOS, e o teclado simplesmente não sobe. Só dispara na apresentação — se o
   *  sheet reabre com o Modal ainda montado, não vem de novo (aí `autoFocus`
   *  funciona, porque não há apresentação em curso). */
  onShown?: () => void
  // Dispara DEPOIS que a animação de fechamento termina e o Modal desmonta.
  // Útil no iOS: só é seguro apresentar um picker nativo (foto/câmera) quando
  // este Modal já saiu de cena — apresentar durante o dismiss trava a UI.
  onClosed?: () => void
  /** Dispara quando a dispensa NATIVA terminou (iOS). É o único momento seguro
   *  para apresentar outro Modal — quem encadeia usa lib/afterSheet. No Android
   *  o RN não emite o evento, então ele sai no fim da animação de JS. */
  onDismissed?: () => void
  title?: string
  children: ReactNode
  floatingHandle?: boolean
  collapsedRatio?: number
  avoidKeyboard?: boolean
  /** Ocupa da status bar até embaixo, em vez de se medir pelo conteúdo (ver
   *  SheetView). Com `avoidKeyboard`, o sheet não sobe — ele ENCOLHE pela
   *  altura do teclado, porque o topo está ancorado. É a diferença entre o
   *  conteúdo continuar todo alcançável e o cabeçalho sair pela borda de cima,
   *  que é o que acontece quando um sheet medido pelo conteúdo é empurrado. */
  fullHeight?: boolean
  // Pickers inline (SheetView) renderizados DENTRO do mesmo Modal — sem aninhar Modais.
  overlays?: ReactNode
}) {
  const [modalVisible, setModalVisible] = useState(visible)
  // `modalVisible` na lista de propósito: se ele for a false enquanto `visible`
  // ainda é true, este é o único efeito que traz o sheet de volta. Com [visible]
  // sozinho ele não rodava (o valor não mudou) e o sheet ficava morto.
  useEffect(() => { if (visible && !modalVisible) setModalVisible(true) }, [visible, modalVisible])

  return (
    // O Modal fica NA ÁRVORE e se apaga por `visible`: o RN devolve null quando
    // não está mostrando, então ele não ocupa tela nem captura toque. Fechar por
    // DESMONTE era o que impedia o onDismiss — o próprio RN documenta que a view
    // é destruída antes de o callback disparar.
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}
      statusBarTranslucent onDismiss={onDismissed} onShow={onShown}>
      <SheetView
        visible={visible}
        onClose={onClose}
        onClosed={() => {
          setModalVisible(false)
          onClosed?.()
          // Android não dispara onDismiss (lá o Modal é um Dialog, não um controller
          // apresentado) — e também não tem a corrida. Avisa aqui.
          if (Platform.OS !== 'ios') onDismissed?.()
        }}
        title={title}
        floatingHandle={floatingHandle}
        collapsedRatio={collapsedRatio}
        avoidKeyboard={avoidKeyboard}
        fullHeight={fullHeight}
      >
        {children}
      </SheetView>
      {overlays}
    </Modal>
  )
}
