export const chatbotLanguages = [
  { code: 'rw', label: 'Kinyarwanda', value: 'Kinyarwanda', nativeName: 'Ikinyarwanda', focus: 'African language' },
  { code: 'sw', label: 'Kiswahili', value: 'Kiswahili', nativeName: 'Kiswahili', focus: 'African language' },
  { code: 'rn', label: 'Kirundi', value: 'Kirundi', nativeName: 'Ikirundi', focus: 'African language' },
  { code: 'lg', label: 'Luganda', value: 'Luganda', nativeName: 'Luganda', focus: 'African language' },
  { code: 'ar', label: 'Arabic', value: 'Arabic', nativeName: 'العربية', focus: 'Major support language' },
  { code: 'en', label: 'English', value: 'English', nativeName: 'English', focus: 'Fallback language' },
  { code: 'fr', label: 'French', value: 'French', nativeName: 'Français', focus: 'Fallback/regional language' },
]

export const chatbotLanguageOptions = chatbotLanguages.map(({ label, value }) => ({ label, value }))
export const chatbotLanguageNames = chatbotLanguages.map((language) => language.value)
export const chatbotLanguageCodeOptions = chatbotLanguages.map(({ code, label, nativeName, focus }) => ({ code, label, nativeName, focus }))

export const getChatbotLanguageByCode = (code?: string | null) => chatbotLanguages.find((language) => language.code === code)

export const getChatbotLanguageCode = (value?: string | null) => {
  if (!value) return 'en'
  const normalized = value.trim().toLowerCase()
  const aliases: Record<string, string> = {
    english: 'en',
    en: 'en',
    french: 'fr',
    français: 'fr',
    fr: 'fr',
    kinyarwanda: 'rw',
    ikinyarwanda: 'rw',
    rw: 'rw',
    swahili: 'sw',
    kiswahili: 'sw',
    sw: 'sw',
    kirundi: 'rn',
    ikirundi: 'rn',
    rn: 'rn',
    luganda: 'lg',
    lg: 'lg',
    arabic: 'ar',
    العربية: 'ar',
    ar: 'ar',
  }

  return aliases[normalized] || 'en'
}

export const getChatbotLanguageName = (code?: string | null) => getChatbotLanguageByCode(code)?.value || 'English'

export const normalizeChatbotLanguageName = (value?: string | null) => {
  if (!value) return 'English'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'swahili') return 'Kiswahili'
  if (normalized === 'ikinyarwanda') return 'Kinyarwanda'
  if (normalized === 'ikirundi') return 'Kirundi'
  if (normalized === 'العربية') return 'Arabic'

  return chatbotLanguages.find((language) => language.value.toLowerCase() === normalized)?.value || value
}
