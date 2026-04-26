import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  // Apply to all routes to ensure redirects don't break framing
  // console.log(`[Middleware] Setting framing headers for ${event.path}`)
  
  // Use append to ensure it's added, but clear first if possible
  setResponseHeader(event, 'Content-Security-Policy', "frame-ancestors * http: https: localhost:* file:;")
  setResponseHeader(event, 'X-Frame-Options', 'ALLOWALL') // Some older browsers still need this
  setResponseHeader(event, 'X-Powered-By', 'ReplySuite-AI')
})
