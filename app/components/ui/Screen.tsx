// components/ui/Screen.tsx — moldura de toda tela: área segura, barra do topo,
// conteúdo rolável e rodapé fixo opcional.
//
// Barra do topo: botão quadrado contornado de voltar à esquerda, título
// pequeno no centro (só em telas de apoio), ações à direita. Título grande de
// tela vai no conteúdo, com <Text variant="title">.
import type { ReactElement, ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View, type RefreshControlProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { CaretLeftIcon, XIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { IconButton } from '@/components/ui/IconButton'
import { GUTTER, SPACE } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export function Screen({
  title, back = false, close = false, onBack, right, children, footer, scroll = true, refreshControl, padded = true,
}: {
  /** Título pequeno, centralizado na barra. */
  title?: string
  /** Botão de voltar (‹). */
  back?: boolean
  /** Botão de fechar (×), para telas que se abrem por cima. */
  close?: boolean
  onBack?: () => void
  right?: ReactNode
  children: ReactNode
  /** Fica preso embaixo, acima do teclado (o botão principal). */
  footer?: ReactNode
  scroll?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
  /** Recuo lateral do conteúdo. */
  padded?: boolean
}) {
  const s = useStyles()
  const router = useRouter()
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))
  const hasBar = back || close || !!title || !!right
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {hasBar ? (
        <View style={s.bar}>
          <View style={s.side}>
            {back || close ? (
              <IconButton onPress={goBack} accessibilityLabel={close ? 'Fechar' : 'Voltar'}>
                {close ? <XIcon /> : <CaretLeftIcon />}
              </IconButton>
            ) : null}
          </View>
          <Text variant="labelStrong" align="center" numberOfLines={1} style={s.title}>{title ?? ''}</Text>
          <View style={[s.side, s.sideRight]}>{right}</View>
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[padded && s.padded, s.content]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded && s.padded]}>{children}</View>
        )}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const useStyles = makeThemedStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.bg },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, height: 52, gap: SPACE.sm },
  side: { minWidth: 36, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  sideRight: { justifyContent: 'flex-end' },
  title: { flex: 1 },
  padded: { paddingHorizontal: GUTTER },
  content: { paddingTop: SPACE.sm, paddingBottom: SPACE.xxxl },
  footer: { paddingHorizontal: GUTTER, paddingTop: SPACE.sm, paddingBottom: SPACE.sm, gap: SPACE.xs, backgroundColor: c.bg },
}))
