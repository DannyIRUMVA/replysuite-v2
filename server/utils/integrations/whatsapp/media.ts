import type { H3Event } from 'h3'

type WhatsappMediaInput = {
  id?: string
  mime_type?: string
  caption?: string
  sha256?: string
  filename?: string
}

type StoredWhatsappMediaAsset = {
  type: 'image'
  mediaId: string
  mimeType: string
  caption: string
  filename: string
  key: string
  url: string
  size: number
  usageHint: string
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const sanitizeText = (value: unknown, maxLength = 500) => String(value || '').trim().slice(0, maxLength)
const sanitizeSlug = (value: unknown, fallback = 'asset') => {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
  return slug || fallback
}

const extensionForMime = (mimeType: string) => {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'bin'
}

const getRuntimeConfigForEvent = (event?: H3Event | null) => event ? useRuntimeConfig(event) : useRuntimeConfig()

export const extractWhatsappMedia = (msg: any): WhatsappMediaInput | null => {
  if (!msg || msg.type !== 'image' || !msg.image?.id) return null

  return {
    id: sanitizeText(msg.image.id, 160),
    mime_type: sanitizeText(msg.image.mime_type, 80),
    caption: sanitizeText(msg.image.caption, 1000),
    sha256: sanitizeText(msg.image.sha256, 160),
    filename: sanitizeText(msg.image.filename, 120),
  }
}

const fetchWhatsappMediaDownloadUrl = async (mediaId: string, accessToken: string) => {
  const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data: any = await response.json().catch(() => ({}))
  if (!response.ok || data?.error || !data?.url) {
    throw new Error(data?.error?.message || `Unable to fetch WhatsApp media URL (${response.status})`)
  }
  return String(data.url)
}

const downloadWhatsappMedia = async (downloadUrl: string, accessToken: string) => {
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download WhatsApp media (${response.status})`)
  }
  const blob = await response.blob()
  return blob
}

export const storeWhatsappImageWithMediaWorker = async (params: {
  event?: H3Event | null
  accessToken: string
  chatbotId: string
  sessionId?: string | null
  messageId?: string | null
  media: WhatsappMediaInput
}): Promise<StoredWhatsappMediaAsset | null> => {
  const mediaId = sanitizeText(params.media.id, 160)
  if (!mediaId) return null

  const declaredMimeType = sanitizeText(params.media.mime_type, 80).toLowerCase()
  if (declaredMimeType && !SUPPORTED_IMAGE_MIME_TYPES.has(declaredMimeType)) {
    console.warn('[WhatsApp Media] Unsupported declared image MIME type:', declaredMimeType)
    return null
  }

  const config = getRuntimeConfigForEvent(params.event || null)
  const mediaWorkerUrl = String(config.replySuiteMediaWorkerUrl || '').trim().replace(/\/+$/, '')
  const mediaWorkerSecret = String(config.replySuiteMediaWorkerSecret || '').trim()
  if (!mediaWorkerUrl || !mediaWorkerSecret) {
    console.warn('[WhatsApp Media] Media worker is not configured; skipping R2 upload.')
    return null
  }

  const downloadUrl = await fetchWhatsappMediaDownloadUrl(mediaId, params.accessToken)
  const blob = await downloadWhatsappMedia(downloadUrl, params.accessToken)
  const mimeType = String(blob.type || declaredMimeType || 'application/octet-stream').toLowerCase()
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
    console.warn('[WhatsApp Media] Unsupported downloaded image MIME type:', mimeType)
    return null
  }

  const filename = sanitizeSlug(params.media.filename || `whatsapp-image.${extensionForMime(mimeType)}`, 'whatsapp-image')
  const form = new FormData()
  form.set('file', new File([blob], filename, { type: mimeType }))
  form.set('chatbot', sanitizeSlug(params.chatbotId, 'chatbot'))
  form.set('session', sanitizeSlug(params.sessionId || params.messageId || 'whatsapp', 'whatsapp'))
  form.set('label', sanitizeSlug(params.media.caption || filename || 'customer-image', 'customer-image'))

  const uploadResponse = await fetch(`${mediaWorkerUrl}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mediaWorkerSecret}` },
    body: form,
  })
  const uploadData: any = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok || uploadData?.success !== true) {
    throw new Error(uploadData?.error || `Media worker upload failed (${uploadResponse.status})`)
  }

  return {
    type: 'image',
    mediaId,
    mimeType,
    caption: sanitizeText(params.media.caption, 500),
    filename,
    key: String(uploadData.key || ''),
    url: String(uploadData.url || ''),
    size: Number(uploadData.size || blob.size || 0),
    usageHint: 'Use this customer-provided image in the website draft, hero, gallery, services, or brand section when relevant.',
  }
}

export const toCustomerSafeMediaContext = (asset: StoredWhatsappMediaAsset) => {
  const caption = asset.caption ? ` Caption: ${asset.caption}` : ''
  return `[Customer uploaded image available for website design. Safe asset URL: ${asset.url}.${caption} Ask where to use it if unclear.]`
}
