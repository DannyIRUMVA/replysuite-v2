// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'ReplySuite | AI Chatbots for Brand Growth',
      titleTemplate: '%s | ReplySuite',
      meta: [
        { name: 'theme-color', content: '#D4AF37' },
        { name: 'author', content: 'ReplySuite' },
        { name: 'description', content: 'ReplySuite is an AI-powered live chat and automation platform. Build trainable chatbots that reply on Instagram, WhatsApp, and your website — 24/7.' },
        { property: 'og:site_name', content: 'ReplySuite' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:image', content: 'https://replysuite.app/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@replysuite' },
        { name: 'twitter:image', content: 'https://replysuite.app/og-image.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://replysuite.app/' }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'ReplySuite',
            description: 'AI-powered live chat and automation platform.',
            url: 'https://replysuite.app/',
            publisher: {
              '@type': 'Organization',
              name: 'ReplySuite',
              url: 'https://replysuite.app',
              logo: {
                '@type': 'ImageObject',
                url: 'https://replysuite.app/favicon.ico'
              }
            },
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://replysuite.app/search?q={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          })
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'ReplySuite',
            url: 'https://replysuite.app',
            logo: 'https://replysuite.app/favicon.ico',
            description: 'AI-powered live chat and chatbot automation for Instagram, WhatsApp, and websites.',
            sameAs: [
              'https://twitter.com/replysuite'
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: 'support@replysuite.app',
              availableLanguage: ['English', 'French', 'Kinyarwanda']
            }
          })
        },
        {
          children: `(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "wglphllrsx");`
        }
      ]
    }
  },
  ssr: true,
  hooks: {
    'render:html'(html: any, { event }: any) {
      // If we are on a widget page, strip the devtools script to prevent SecurityError in iframes
      if (event && event.path && event.path.startsWith('/widget/')) {
        if (html.bodyAppend) {
          html.bodyAppend = html.bodyAppend.filter((s: string) => !s.includes('nuxt-devtools'))
        }
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
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    whatsappWebhookUrl: process.env.WHATSAPP_WEBHOOK_URL,

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
      metaAppId: process.env.INSTAGRAM_APP_ID
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
        // protocol: 'wss',
        // clientPort: 443
      }
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'lucide-vue-next'
      ]
    }
  },

  nitro: {
    preset: 'cloudflare-pages',
    commonJS: {
      dynamicRequireTargets: [
        './node_modules/pdf-parse/lib/pdf.js/**/*.js',
        './node_modules/pdf-parse/**/*.js'
      ]
    },
    routeRules: {
      // Broadcast ReplySuite tech fingerprint — picked up by Wappalyzer server-side
      '/**': {
        headers: {
          'X-Powered-By': 'ReplySuite-AI'
        }
      }
    }
  }
})
