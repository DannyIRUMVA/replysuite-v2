type LanguageDefinition = {
  code: string
  name: string
  nativeName: string
  isLowResource: boolean
  aliases: string[]
}

type RuntimeLanguage = {
  code: string
  name: string
  nativeName: string
  isLowResource: boolean
  isPrimary?: boolean
  isFallback?: boolean
}

type LanguageProfile = {
  languageCode: string
  systemRules: string
  examples?: any[]
  glossary?: Record<string, string>
  fallbackRules?: string | null
}

const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', isLowResource: false, aliases: ['english', 'en'] },
  { code: 'fr', name: 'French', nativeName: 'Français', isLowResource: false, aliases: ['french', 'français', 'francais', 'fr'] },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', isLowResource: true, aliases: ['kinyarwanda', 'ikinyarwanda', 'rw'] },
  { code: 'sw', name: 'Kiswahili', nativeName: 'Kiswahili', isLowResource: false, aliases: ['kiswahili', 'swahili', 'sw'] },
  { code: 'rn', name: 'Kirundi', nativeName: 'Ikirundi', isLowResource: true, aliases: ['kirundi', 'ikirundi', 'rn'] },
  { code: 'lg', name: 'Luganda', nativeName: 'Luganda', isLowResource: true, aliases: ['luganda', 'ganda', 'lg'] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isLowResource: false, aliases: ['arabic', 'العربية', 'عربي', 'ar'] },
]

const DEFAULT_LANGUAGE_PROFILES: Record<string, LanguageProfile> = {
  en: {
    languageCode: 'en',
    systemRules: 'Reply in clear, helpful English. Keep customer-support answers concise and practical.',
    fallbackRules: 'If the user asks for another supported language, switch to that language.',
  },
  fr: {
    languageCode: 'fr',
    systemRules: 'Réponds en français clair, naturel et utile. Garde un ton professionnel et humain.',
    fallbackRules: 'Si le message est ambigu, demande une clarification courte.',
  },
  rw: {
    languageCode: 'rw',
    systemRules: 'Subiza mu Kinyarwanda gisanzwe, cyumvikana kandi cyubaha umukiriya. Irinde guhindura amagambo uko yakabaye avuye mu Cyongereza. Koresha Icyongereza gusa ku mazina y’ibicuruzwa, brands, cyangwa amagambo ya tekiniki adafite igisobanuro gisanzwe.',
    glossary: { appointment: 'gahunda yo guhura', payment: 'kwishyura', support: 'ubufasha' },
    fallbackRules: 'Niba utizeye neza icyo umukiriya ashaka, baza ikibazo kimwe kigufi mu Kinyarwanda.',
  },
  sw: {
    languageCode: 'sw',
    systemRules: 'Jibu kwa Kiswahili fasaha, rahisi na cha kirafiki kwa huduma kwa wateja. Epuka kuchanganya Kiingereza bila sababu isipokuwa kwa majina ya bidhaa, brands au istilahi za kiufundi.',
    glossary: { appointment: 'miadi', payment: 'malipo', support: 'msaada' },
    fallbackRules: 'Kama ujumbe haueleweki, uliza swali moja fupi la ufafanuzi kwa Kiswahili.',
  },
  rn: {
    languageCode: 'rn',
    systemRules: 'Wishure mu Kirundi gisanzwe, cubaha kandi cumvikana ku mukiriya. Ntufate ko Ikirundi ari co kimwe n’Ikinyarwanda. Irinde kuvanga Icongereza atari ngombwa.',
    glossary: { appointment: 'isango', payment: 'ukwishura', support: 'ubufasha' },
    fallbackRules: 'Nimba utazi neza ico umukiriya ashaka, baza ikibazo kimwe kigufi mu Kirundi.',
  },
  lg: {
    languageCode: 'lg',
    systemRules: 'Respond in simple, natural Luganda for customer support. Keep sentences short. Avoid unnecessary English mixing except for product names, brands, or technical terms.',
    glossary: { appointment: 'okusisinkana', payment: 'okusasula', support: 'obuyambi' },
    fallbackRules: 'If unsure, ask one short clarification question in Luganda. If Luganda quality may be poor, keep wording simple.',
  },
  ar: {
    languageCode: 'ar',
    systemRules: 'أجب بالعربية الفصحى الواضحة والمهنية. حافظ على أسلوب مختصر ومفيد لخدمة العملاء. لا تنتقل إلى الإنجليزية إلا عند الحاجة لأسماء المنتجات أو المصطلحات التقنية.',
    glossary: { appointment: 'موعد', payment: 'دفع', support: 'دعم' },
    fallbackRules: 'إذا كانت رسالة المستخدم غير واضحة، اطرح سؤال توضيح قصيراً بالعربية.',
  },
}

const definitionByCode = new Map(LANGUAGE_DEFINITIONS.map((language) => [language.code, language]))
const aliasToCode = new Map(
  LANGUAGE_DEFINITIONS.flatMap((language) => language.aliases.map((alias) => [alias.toLowerCase(), language.code] as const))
)

export const normalizeLanguageCode = (value?: string | null) => {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return aliasToCode.get(normalized) || null
}

const toRuntimeLanguage = (code: string, flags: Partial<RuntimeLanguage> = {}): RuntimeLanguage => {
  const definition = definitionByCode.get(code) || definitionByCode.get('en')!
  return {
    code: definition.code,
    name: definition.name,
    nativeName: definition.nativeName,
    isLowResource: definition.isLowResource,
    ...flags,
  }
}

const detectLanguageCode = (text: string) => {
  const value = text.toLowerCase()

  if (/\p{Script=Arabic}/u.test(text)) return 'ar'

  const scores: Record<string, number> = { rw: 0, sw: 0, rn: 0, lg: 0, fr: 0, en: 0 }

  const addScore = (code: string, patterns: RegExp[]) => {
    for (const pattern of patterns) {
      if (pattern.test(value)) scores[code] += 1
    }
  }

  addScore('rw', [/\bmuraho\b/, /\bamakuru\b/, /\ndashaka\b/, /\bgufasha\b/, /\bibiciro\b/, /\bkwishyura\b/, /\bserivisi\b/])
  addScore('sw', [/\bhabari\b/, /\bnataka\b/, /\btafadhali\b/, /\bbei\b/, /\bmsaada\b/, /\bmalipo\b/, /\bhuduma\b/])
  addScore('rn', [/\bbite\b/, /\bndashaka\b/, /\bnogufasha\b/, /\bcanke\b/, /\bigiciro\b/, /\bukwishura\b/])
  addScore('lg', [/\bgyebale\b/, /\bnjagala\b/, /\bnnyinza\b/, /\bokumanya\b/, /\bebbeeyi\b/, /\bobuyambi\b/])
  addScore('fr', [/\bbonjour\b/, /\bmerci\b/, /\bprix\b/, /\baide\b/, /\bpaiement\b/, /\brendez-vous\b/])
  addScore('en', [/\bhello\b/, /\bprice\b/, /\bhelp\b/, /\bpayment\b/, /\bappointment\b/, /\bsupport\b/])

  const [bestCode, bestScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return bestScore > 0 ? bestCode : null
}

const getFallbackLanguages = (defaultLanguage?: string | null) => {
  const primaryCode = normalizeLanguageCode(defaultLanguage) || 'en'

  // Until chatbot_languages is deployed/backfilled, treat the initial language set as supported
  // so existing chatbots can immediately respond in African target languages.
  return LANGUAGE_DEFINITIONS.map((language) => toRuntimeLanguage(language.code, {
    isPrimary: language.code === primaryCode,
    isFallback: language.code === 'en',
  }))
}

const getLocalProfile = (code: string) => DEFAULT_LANGUAGE_PROFILES[code] || DEFAULT_LANGUAGE_PROFILES.en

const normalizeProfileRow = (row: any): LanguageProfile | null => {
  if (!row?.language_code) return null
  return {
    languageCode: row.language_code,
    systemRules: row.system_rules || getLocalProfile(row.language_code).systemRules,
    examples: Array.isArray(row.examples) ? row.examples : [],
    glossary: row.glossary && typeof row.glossary === 'object' ? row.glossary : {},
    fallbackRules: row.fallback_rules || null,
  }
}

export const buildChatbotLanguagePolicy = async ({
  supabase,
  chatbot,
  userMessage,
  sessionPreferredLanguage,
}: {
  supabase: any
  chatbot: { id: string; default_language?: string | null }
  userMessage: string
  sessionPreferredLanguage?: string | null
}) => {
  let languages = getFallbackLanguages(chatbot.default_language)
  let profiles = new Map<string, LanguageProfile>()

  try {
    const { data, error } = await supabase
      .from('chatbot_languages')
      .select('language_code, is_primary, is_fallback, is_enabled, languages(name, native_name, is_low_resource)')
      .eq('chatbot_id', chatbot.id)
      .eq('is_enabled', true)

    if (!error && Array.isArray(data) && data.length > 0) {
      languages = data.map((row: any) => {
        const definition = definitionByCode.get(row.language_code)
        const related = Array.isArray(row.languages) ? row.languages[0] : row.languages
        return {
          code: row.language_code,
          name: related?.name || definition?.name || row.language_code,
          nativeName: related?.native_name || definition?.nativeName || row.language_code,
          isLowResource: related?.is_low_resource ?? definition?.isLowResource ?? false,
          isPrimary: !!row.is_primary,
          isFallback: !!row.is_fallback,
        }
      })
    }
  } catch {
    // New language tables may not be deployed yet; fall back to chatbots.default_language.
  }

  const supportedCodes = new Set(languages.map((language) => language.code))
  const primary = languages.find((language) => language.isPrimary) || languages[0] || toRuntimeLanguage('en', { isPrimary: true })
  const fallback = languages.find((language) => language.isFallback) || languages.find((language) => language.code === 'en') || primary
  const detectedCode = detectLanguageCode(userMessage)
  const sessionCode = normalizeLanguageCode(sessionPreferredLanguage)

  let active = primary
  if (detectedCode && supportedCodes.has(detectedCode)) {
    active = languages.find((language) => language.code === detectedCode) || active
  } else if (sessionCode && supportedCodes.has(sessionCode)) {
    active = languages.find((language) => language.code === sessionCode) || active
  }

  try {
    const { data, error } = await supabase
      .from('language_profiles')
      .select('language_code, system_rules, examples, glossary, fallback_rules')
      .in('language_code', Array.from(new Set([active.code, primary.code, fallback.code])))

    if (!error && Array.isArray(data)) {
      profiles = new Map(data.map((row: any) => [row.language_code, normalizeProfileRow(row) || getLocalProfile(row.language_code)]))
    }
  } catch {
    // Ignore if language_profiles is not deployed yet.
  }

  const activeProfile = profiles.get(active.code) || getLocalProfile(active.code)
  const supportedSummary = languages
    .map((language) => `${language.name} (${language.nativeName})${language.isPrimary ? ' [primary]' : ''}${language.isFallback ? ' [fallback]' : ''}`)
    .join(', ')

  const glossaryEntries = activeProfile.glossary && Object.keys(activeProfile.glossary).length > 0
    ? Object.entries(activeProfile.glossary).map(([term, translation]) => `- ${term}: ${translation}`).join('\n')
    : 'No required glossary terms.'

  const lowResourceRule = active.isLowResource
    ? 'This is a lower-resource language for AI models. Prefer simple, natural sentences. Do not invent uncommon words. If unsure, ask one short clarification question.'
    : null

  const prompt = `
Active reply language: ${active.name} (${active.nativeName}).
Supported chatbot languages: ${supportedSummary}.
Fallback language: ${fallback.name} (${fallback.nativeName}).

Rules:
- Reply in ${active.name} unless the user explicitly asks for another supported language.
- Do not switch to English unless the user asks, the active language is English, or a brand/product/technical term is best left untranslated.
- Do not mix languages casually. Keep the reply natural for customer support.
- If the user writes in an unsupported language, politely continue in ${fallback.name} or ask which supported language they prefer.
${lowResourceRule ? `- ${lowResourceRule}` : ''}

Language-specific style:
${activeProfile.systemRules}

Glossary / terminology:
${glossaryEntries}

Fallback behavior:
${activeProfile.fallbackRules || 'If unsure, ask one short clarification question.'}
`.trim()

  return {
    activeLanguage: active,
    primaryLanguage: primary,
    fallbackLanguage: fallback,
    supportedLanguages: languages,
    prompt,
  }
}
