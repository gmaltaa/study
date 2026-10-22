// lib/toast.ts — disparo de toast de sucesso, chamável de qualquer lugar.
// Um único <ToastHost/> (montado no _layout) escuta e renderiza.
type Listener = (message: string) => void

let listener: Listener | null = null

export const toast = {
  success(message: string) {
    listener?.(message)
  },
}

/** Uso interno do ToastHost. */
export function _subscribeToast(l: Listener | null) {
  listener = l
}
