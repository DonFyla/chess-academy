export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/coach',
          '/coach/*',
          '/login',
          '/signup',
          '/test-email',
        ],
      },
    ],
    sitemap: 'https://www.themovingtrain.org/sitemap.xml',
  }
}
