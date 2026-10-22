// components/Screen.tsx — moldura padrão de tela: área segura, cabeçalho com
// voltar e título, conteúdo rolável e rodapé fixo opcional (botão principal).
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View, type RefreshControlProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { CaretLeft } from 'phosphor-react-native'
import type { ReactElement } from 'react'
import { Text } from '@/components/Text'
import { FONTS, GUTTER } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function Screen({
  title, back = false, onBack, right, children, footer, scroll = true, refreshControl, surface = 'bg',
}: {
  title?: string
  /** Mostra o botão de voltar (router.back, ou `onBack`). */
  back?: boolean
  onBack?: () => void
  right?: ReactNode
  children: ReactNode
  /** Fica preso embaixo, acima do teclado (ex.: botão "Continuar"). */
  footer?: ReactNode
  scroll?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
  surface?: 'bg' | 'white'
}) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const hasHeader = back || !!title || !!right
  return (
    <SafeAreaView style={[s.safe, surface === 'white' && s.safeWhite]} edges={['top', 'bottom']}>
      {hasHeader && (
        <View style={s.header}>
          {back ? (
            <TouchableOpacity
              style={s.back}
              onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <CaretLeft size={24} color={c.gray900} weight="bold" />
            </TouchableOpacity>
          ) : <View style={s.side} />}
          <Text style={s.title} numberOfLines={1}>{title ?? ''}</Text>
          <View style={s.side}>{right}</View>
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.content, { flex: 1 }]}>{children}</View>
        )}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const useStyles = makeThemedStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.bg },
  safeWhite: { backgroundColor: c.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingVertical: 8, gap: 8 },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  side: { minWidth: 40, alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontFamily: FONTS.bold, fontSize: 17, color: c.gray900 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 8, gap: 8 },
}))
