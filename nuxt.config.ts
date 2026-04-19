// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'ReplySuite | Trainable AI for reply',
      titleTemplate: '%s | ReplySuite',
      meta: [
        { name: 'theme-color', content: '#EAB308' },
        { name: 'author', content: 'ReplySuite' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  ssr: true,
  hooks: {
    'render:html'(html: any, { event }: any) {
      // If we are on a widget page, strip the devtools script to prevent SecurityError in iframes
      if (event && event.path && event.path.startsWith('/widget/')) {
        html.bodyAppend = html.bodyAppend.filter((s: string) => !s.includes('nuxt-devtools'))
        html.head = html.head.filter((s: string) => !s.includes('nuxt-devtools'))
      }
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@polar-sh/nuxt',
    '@nuxt/scripts'
  ],
  scripts: {
    registry: {
      googleTagManager: {
        id: 'GTM-N5X7KRBD',
      }
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'lucide-vue-next'
      ]
    }
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false,
    cookieOptions: {
      maxAge: 604800,
      sameSite: 'lax',
      path: '/',
      secure: false
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
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

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
        host: 'localhost',
        clientPort: 443
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
    preset: 'cloudflare-pages'
  }
})
