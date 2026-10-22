// components/IconButton.tsx — botão quadrado padronizado (ícone). Fonte única.
import { ReactNode } from 'react'
import { TouchableOpacity } from 'react-native'
import { makeThemedStyles } from '@/lib/theme'

export function IconButton({
  children, onPress, variant = 'outline', size = 48,
}: {
  children: ReactNode
  onPress: () => void
  variant?: 'outline' | 'primary' | 'ghost'
  size?: number
}) {
  const s = useStyles()
  const variantStyle = variant === 'primary' ? s.primary : variant === 'ghost' ? s.ghost : s.outline
  return (
    <TouchableOpacity
      style={[s.base, { width: size, height: size }, variantStyle]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {children}
    </TouchableOpacity>
  )
}

const useStyles = makeThemedStyles((c) => ({
  base: { borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  outline: { borderWidth: 1.5, borderColor: c.gray200, backgroundColor: c.white },
  primary: { backgroundColor: c.primary },
  // ghost = sem borda e sem fundo (só o ícone).
  ghost: { backgroundColor: 'transparent' },
}))
