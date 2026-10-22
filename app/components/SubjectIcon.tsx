// components/SubjectIcon.tsx — o emoji do tema num círculo da cor dele.
import { View } from 'react-native'
import { Text } from '@/components/Text'
import { subjectColor } from '@/lib/theme'

export function SubjectIcon({ icon, color, size = 44 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `${subjectColor(color)}22`, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.5 }}>{icon}</Text>
    </View>
  )
}
