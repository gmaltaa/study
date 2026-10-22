// components/ui/ListGroup.tsx — lista agrupada: um bloco cinza quente com as
// linhas separadas por filete recuado. Os filhos são <ListRow variant="grouped">.
import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Divider } from '@/components/ui/Divider'
import { RADIUS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export function ListGroup({ children, inset = 52, style }: {
  children: ReactNode
  /** Onde o filete começa: 52 alinha com o texto de linhas que têm ícone; 16 para linhas sem ícone. */
  inset?: number
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  const items = Children.toArray(children).filter(isValidElement)
  return (
    <View style={[s.group, style]}>
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <Divider inset={inset} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  group: { backgroundColor: c.surfaceMuted, borderRadius: RADIUS.xl, overflow: 'hidden' },
}))
