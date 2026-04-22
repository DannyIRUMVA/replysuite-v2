import { useState } from '#app'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export interface ConfirmRequest {
  message: string
  title?: string
  resolve: (val: boolean) => void
}

export const useNotify = () => {
  const toasts = useState<Toast[]>('toasts', () => [])
  const confirmRequest = useState<ConfirmRequest | null>('confirm-request', () => null)

  const showToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    toasts.value.push({ id, message, type, duration })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const confirm = (message: string, title = 'Confirm Action'): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmRequest.value = {
        message,
        title,
        resolve: (val: boolean) => {
          confirmRequest.value = null
          resolve(val)
        }
      }
    })
  }

  return {
    toasts,
    confirmRequest,
    success: (msg: string, dur?: number) => showToast(msg, 'success', dur),
    error: (msg: string, dur?: number) => showToast(msg, 'error', dur),
    info: (msg: string, dur?: number) => showToast(msg, 'info', dur),
    warn: (msg: string, dur?: number) => showToast(msg, 'warning', dur),
    removeToast,
    confirm
  }
}
