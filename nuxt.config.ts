// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  nitro: {
    preset: 'cloudflare-pages'
  },
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    instagramClientId: process.env.INSTAGRAM_APP_ID,
    instagramClientSecret: process.env.INSTAGRAM_SECRET,
    instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI,
    sendpulseId: process.env.SENDPULSE_ID,
    sendpulseSecret: process.env.SENDPULSE_SECRET,
    smtpFrom: process.env.SMTP_FROM,
    smtpFromName: process.env.SMTP_FROM_NAME,

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  vite: {
    server: {
      allowedHosts: true
    }
  }
})
