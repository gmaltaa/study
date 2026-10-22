// lib/auth.tsx — sessão e perfil do usuário, num contexto.
//
// A sessão vem do Supabase (persistida no AsyncStorage). O perfil vem da API
// (/api/me) e diz se o onboarding já foi feito. O _layout decide a rota a partir
// destes dois.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { getCalendars } from 'expo-localization'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'
import { identify, resetAnalytics } from '@/lib/analytics'
import { signOutGoogle } from '@/lib/google-auth'
import { syncPushToken, unregisterPush } from '@/lib/push'
import type { Profile } from '@/lib/types'

interface AuthContextType {
  session: Session | null
  /** A sessão salva já foi lida. */
  ready: boolean
  profile: Profile | undefined
  profileLoading: boolean
  profileError: boolean
  refetchProfile: () => void
  signOut: () => Promise<void>
  /** Recuperação de senha: entre o código válido e a senha nova, só a tela de senha. */
  recovering: boolean
  beginRecovery: () => void
  endRecovery: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

function deviceTimezone(): string | null {
  try {
    return getCalendars()[0]?.timeZone ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) queryClient.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  const profileQuery = useQuery({
    queryKey: [...keys.me, userId],
    queryFn: api.me,
    enabled: !!userId,
  })

  // Ao entrar: identifica no analytics, acerta o fuso e o token de push.
  useEffect(() => {
    if (!userId || !profileQuery.data) return
    identify(userId)
    const tz = deviceTimezone()
    if (tz && tz !== profileQuery.data.timezone) {
      api.updateMe({ timezone: tz })
        .then((p) => queryClient.setQueryData([...keys.me, userId], p))
        .catch(() => {})
    }
    void syncPushToken()
  }, [userId, profileQuery.data?.id])

  const signOut = useCallback(async () => {
    await unregisterPush()
    await signOutGoogle()
    resetAnalytics()
    await supabase.auth.signOut()
    queryClient.clear()
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    session,
    ready,
    profile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.isError,
    refetchProfile: () => void profileQuery.refetch(),
    signOut,
    recovering,
    beginRecovery: () => setRecovering(true),
    endRecovery: () => setRecovering(false),
  }), [session, ready, profileQuery.data, profileQuery.isLoading, profileQuery.isError, signOut, recovering])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Atualiza o perfil no cache depois de editar. */
export function setProfileCache(profile: Profile) {
  queryClient.setQueryData([...keys.me, profile.id], profile)
}
