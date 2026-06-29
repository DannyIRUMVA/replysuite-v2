import { defineEventHandler, setHeader } from 'h3'
import { freeTools } from '~~/shared/free-tools'

const siteUrl = 'https://replysuite.app'

const staticRoutes = [
  '/',
  '/product',
  '/features',
  '/pricing',
  '/company',
  '/contact',
  '/about',
  '/blog',
  '/docs',
  '/tools',
]

const toolRoutes = freeTools.map((tool) => `/tools/${tool.slug}`)

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400')

  const today = new Date().toISOString().slice(0, 10)
  const urls = [...staticRoutes, ...toolRoutes]
    .map((route) => {
      const priority = route === '/' ? '1.0' : route.startsWith('/tools/') ? '0.8' : route === '/tools' ? '0.9' : '0.7'
      const changefreq = route.startsWith('/tools') ? 'weekly' : 'monthly'
      return [
        '  <url>',
        `    <loc>${escapeXml(`${siteUrl}${route}`)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
})
