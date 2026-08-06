const ALLOWED_CONSOLE_MESSAGE = 'only allowed dev from replysuite came here'

export default defineNuxtPlugin(() => {
  if (import.meta.dev) return

  const allowedInfo = console.info.bind(console)
  const silence = () => undefined

  console.log = silence
  console.warn = silence
  console.error = silence
  console.debug = silence
  console.trace = silence

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      console.clear()
      allowedInfo(ALLOWED_CONSOLE_MESSAGE)
    }, 0)
  }, { once: true })
})
