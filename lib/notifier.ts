'use client'

export type NotificationPayload = {
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  duration?: number
}

type NotifierFn = (payload: NotificationPayload) => void

let globalNotifier: NotifierFn | null = null

export function registerGlobalNotifier(fn: NotifierFn) {
  // Register a function that shows notifications in the mounted client tree
  globalNotifier = fn
}

export function notify(payload: NotificationPayload) {
  if (typeof window === 'undefined') {
    // SSR/Node: ignore to avoid reference errors
    return
  }
  if (globalNotifier) {
    try {
      globalNotifier(payload)
    } catch {
      // no-op
    }
  } else {
    // Fallback: console (in case provider not mounted yet)
    console[payload.type === 'error' ? 'error' : 'log'](
      `[notify:${payload.type}] ${payload.title}: ${payload.message}`
    )
  }
}

export const notifySuccess = (message: string, title = 'موفق', duration = 4000) =>
  notify({ type: 'success', title, message, duration })

export const notifyError = (message: string, title = 'خطا', duration = 6000) =>
  notify({ type: 'error', title, message, duration })

export const notifyInfo = (message: string, title = 'اطلاعات', duration = 4000) =>
  notify({ type: 'info', title, message, duration })

export const notifyWarning = (message: string, title = 'هشدار', duration = 5000) =>
  notify({ type: 'warning', title, message, duration })


