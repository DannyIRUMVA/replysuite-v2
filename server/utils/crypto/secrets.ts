const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

const base64ToBytes = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const deriveAesKey = async (secret: string) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export const encryptSecret = async (plainText: string, secret: string) => {
  if (!secret || secret.length < 24) throw new Error('Secret encryption key is missing or too short.')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(secret)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plainText))
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipher))}`
}

export const decryptSecret = async (cipherText: string, secret: string) => {
  if (!cipherText) return ''
  if (!cipherText.startsWith('v1:')) return cipherText
  if (!secret || secret.length < 24) throw new Error('Secret encryption key is missing or too short.')
  const [, ivB64, cipherB64] = cipherText.split(':')
  const key = await deriveAesKey(secret)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(ivB64) }, key, base64ToBytes(cipherB64))
  return textDecoder.decode(plain)
}
