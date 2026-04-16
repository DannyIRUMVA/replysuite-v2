export default defineNuxtPlugin(() => {
  if (process.client) {
    // Detect if we are in an iframe
    const isIframe = window.self !== window.top

    if (isIframe) {
      // Supressing the devtools handshake which causes SecurityError in cross-origin frames
      // This is a dev-only fix to clean up your console
      try {
        // We override the devtools check property that causes the crash
        Object.defineProperty(window, '__NUXT_DEVTOOLS_DISABLE__', {
          get() { return true },
          configurable: true
        })
      } catch (e) {
        // Fallback if property is already defined
      }
      
      console.log('📦 ReplySuite Widget: DevTools suppressed in iframe mode to prevent cross-origin noise.')
    }
  }
})
