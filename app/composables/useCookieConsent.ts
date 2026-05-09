type CookieConsentPreferences = {
  essential: true
  analytics: boolean
  functional: boolean
  updatedAt: string
}

const COOKIE_KEY = 'replysuite_cookie_preferences'

const defaultPreferences = (): CookieConsentPreferences => ({
  essential: true,
  analytics: false,
  functional: false,
  updatedAt: new Date().toISOString()
})

const parsePreferences = (value?: string | null): CookieConsentPreferences | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    return {
      essential: true,
      analytics: !!parsed.analytics,
      functional: !!parsed.functional,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    }
  } catch {
    return null
  }
}

export const useCookieConsent = () => {
  const cookie = useCookie<string | null>(COOKIE_KEY, {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    secure: !import.meta.dev,
    default: () => null
  })

  const preferences = useState<CookieConsentPreferences>('cookie-preferences', defaultPreferences)
  const isOpen = useState<boolean>('cookie-preferences-open', () => false)
  const isReady = useState<boolean>('cookie-preferences-ready', () => false)

  const syncFromCookie = () => {
    const parsed = parsePreferences(cookie.value)

    if (parsed) {
      preferences.value = parsed
      isOpen.value = false
    } else {
      preferences.value = defaultPreferences()
      isOpen.value = true
    }

    isReady.value = true
  }

  const persist = (next: { analytics: boolean; functional: boolean }) => {
    const payload: CookieConsentPreferences = {
      essential: true,
      analytics: !!next.analytics,
      functional: !!next.functional,
      updatedAt: new Date().toISOString()
    }

    preferences.value = payload
    cookie.value = JSON.stringify(payload)
    isOpen.value = false
    isReady.value = true
  }

  const acceptAll = () => persist({ analytics: true, functional: true })
  const acceptEssential = () => persist({ analytics: false, functional: false })
  const savePreferences = (next: { analytics: boolean; functional: boolean }) => persist(next)
  const openSettings = () => {
    isOpen.value = true
    isReady.value = true
  }
  const closeSettings = () => {
    if (cookie.value) isOpen.value = false
  }

  if (import.meta.client) {
    onMounted(() => {
      if (!isReady.value) syncFromCookie()
    })
  }

  return {
    preferences,
    isOpen,
    isReady,
    hasConsent: computed(() => !!cookie.value),
    acceptAll,
    acceptEssential,
    savePreferences,
    openSettings,
    closeSettings,
    syncFromCookie
  }
}
