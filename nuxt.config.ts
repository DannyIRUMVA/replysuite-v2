// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@polar-sh/nuxt'
  ],
  supabase: {
    redirect: false,
    cookieOptions: {
      maxAge: 604800,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  },
  runtimeConfig: {
    instagramClientId: process.env.INSTAGRAM_APP_ID,
    instagramClientSecret: process.env.INSTAGRAM_SECRET,
    instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI,
    instagramVerifyToken: process.env.INSTAGRAM_VERIFY_TOKEN,
    sendpulseId: process.env.SENDPULSE_ID,
    sendpulseSecret: process.env.SENDPULSE_SECRET,
    smtpFrom: process.env.SMTP_FROM,
    smtpFromName: process.env.SMTP_FROM_NAME,

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL
    },

    polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
    polarServer: process.env.POLAR_SERVER,
    polarOrganizationId: process.env.POLAR_ORGANIZATION_ID,
    geminiApiKey: process.env.GEMINI_API_KEY,
    azureOpenAiKey: process.env.AZURE_OPENAI_KEY,
    azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  },
  vite: {
    server: {
      allowedHosts: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost'
      }
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ]
    }
  },

  nitro: {
    preset: 'cloudflare-pages',
    hooks: {
      'render:html'(html, { event }) {
        // If we are on a widget page, strip the devtools script to prevent SecurityError in iframes
        if (event.path.startsWith('/widget/')) {
          html.bodyAppend = html.bodyAppend.filter(s => !s.includes('nuxt-devtools'))
          html.head = html.head.filter(s => !s.includes('nuxt-devtools'))
        }
      }
    }
  }
})
