export interface BlogArticleMeta {
  slug: string
  title: string
  description: string
  excerpt: string
  category: string
  badge: string
  author: string
  authorInitials: string
  date: string
  readTime: string
  to: string
  ogImage: string
  featured?: boolean
}

export const blogArticles: BlogArticleMeta[] = [
  {
    slug: 'replysuite-alternatives',
    title: 'Best Crisp Alternatives for AI Customer Support (2026)',
    description: 'A practical guide to Crisp alternatives for teams that want an embeddable AI chatbot, website support, and WhatsApp integration without confusing AI add-ons.',
    excerpt: 'Compare ReplySuite with Crisp, Tidio, Chatbase, Intercom, Zendesk, Freshchat, Help Scout, Gorgias, LiveChat, Zoho SalesIQ, and Tawk.to.',
    category: 'Comparison',
    badge: 'Comparison Guide',
    author: 'ReplySuite Editorial',
    authorInitials: 'RS',
    date: 'May 05, 2026',
    readTime: '16 min read',
    to: '/blog/replysuite-alternatives',
    ogImage: '/og/blog/replysuite-alternatives.svg'
  },
  {
    slug: 'ai-chatbot-pricing',
    title: 'AI Chatbot Pricing in 2026: What Actually Matters',
    description: 'Understand flat pricing, usage-based pricing, and how ReplySuite compares for teams that want a website chatbot and WhatsApp growth without confusing AI billing.',
    excerpt: 'Understand flat pricing, usage-based AI costs, and how to choose the right model for your business.',
    category: 'Pricing',
    badge: 'Pricing Guide',
    author: 'ReplySuite Editorial',
    authorInitials: 'RS',
    date: 'April 15, 2026',
    readTime: '14 min read',
    to: '/blog/ai-chatbot-pricing',
    ogImage: '/og/blog/ai-chatbot-pricing.svg',
    featured: true
  },
  {
    slug: 'privacy-first-ai',
    title: 'Privacy-First AI: Navigating GDPR in 2026',
    description: 'A practical look at privacy-first AI, customer data handling, and what businesses should look for in an AI chatbot platform.',
    excerpt: 'What privacy-first AI really means when your chatbot handles customer conversations and business content.',
    category: 'Security',
    badge: 'Trust & Security',
    author: 'ReplySuite Editorial',
    authorInitials: 'RS',
    date: 'May 03, 2026',
    readTime: '11 min read',
    to: '/blog/privacy-first-ai',
    ogImage: '/og/blog/privacy-first-ai.svg'
  },
  {
    slug: 'reduce-support-tickets',
    title: 'How to Reduce Support Tickets with a Trained AI Chatbot',
    description: 'Learn how businesses reduce repetitive support work by training AI chatbots on their own content and routing customers more effectively.',
    excerpt: 'A practical playbook for reducing repetitive support load without making customer experience worse.',
    category: 'Efficiency',
    badge: 'Support Efficiency',
    author: 'ReplySuite Editorial',
    authorInitials: 'RS',
    date: 'April 28, 2026',
    readTime: '10 min read',
    to: '/blog/reduce-support-tickets',
    ogImage: '/og/blog/reduce-support-tickets.svg'
  },
  {
    slug: 'whatsapp-ai-guide',
    title: 'How to Connect AI to WhatsApp: A Practical Guide',
    description: 'A step-by-step guide to connecting AI to WhatsApp for customer support, lead capture, and faster replies.',
    excerpt: 'A practical guide to moving from a website chatbot to WhatsApp support without overcomplicating setup.',
    category: 'WhatsApp',
    badge: 'Step-by-Step Guide',
    author: 'ReplySuite Editorial',
    authorInitials: 'RS',
    date: 'April 24, 2026',
    readTime: '9 min read',
    to: '/blog/whatsapp-ai-guide',
    ogImage: '/og/blog/whatsapp-ai-guide.svg'
  }
]

export const blogArticleMap = Object.fromEntries(
  blogArticles.map((article) => [article.slug, article])
) as Record<string, BlogArticleMeta>
