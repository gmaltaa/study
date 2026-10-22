// lib/push.ts — permissão, token e toque em notificação.
//
// A permissão NÃO é pedida no boot: é pedida quando a pessoa liga um lembrete
// (formulário do tema). Com a permissão dada, o token é registrado no backend a
// cada abertura (`syncPushToken`), porque ele pode mudar.
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { api } from '@/lib/api'

const TOKEN_KEY = 'push_token'

// Com o app aberto, o lembrete aparece como banner mesmo assim.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
} catch {}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Lembretes de estudo',
      importance: Notifications.AndroidImportance.HIGH,
    })
  } catch {}
}

export async function hasPushPermission(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).status === 'granted'
  } catch {
    return false
  }
}

/** Pede a permissão (se ainda não decidida) e registra o token. */
export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) return false
  try {
    await ensureAndroidChannel()
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return false
    await syncPushToken()
    return true
  } catch {
    return false
  }
}

/** Registra o token atual no backend, se a permissão já foi dada. */
export async function syncPushToken(): Promise<void> {
  if (!Device.isDevice || !(await hasPushPermission())) return
  // O projectId vem do EAS (`eas init`). Sem ele não há token de push.
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
    ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  if (!projectId) return
  try {
    await ensureAndroidChannel()
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await api.registerPush(token)
    await AsyncStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

/** Ao sair da conta: o aparelho deixa de receber os lembretes dela. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY)
    if (token) await api.unregisterPush(token)
    await AsyncStorage.removeItem(TOKEN_KEY)
  } catch {}
}

function urlFrom(data: unknown): string | null {
  const url = (data as { url?: unknown } | null)?.url
  return typeof url === 'string' && url.startsWith('/') ? url : null
}

/** Toque em notificação com o app aberto ou em segundo plano. */
export function addNotificationTapListener(onUrl: (url: string) => void): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = urlFrom(response?.notification?.request?.content?.data)
      if (url) onUrl(url)
    })
    return () => sub.remove()
  } catch {
    return () => {}
  }
}
