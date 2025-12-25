import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mystudycosts.com';

// Define all static routes (excluding dynamic blog posts for now)
const staticRoutes = [
  '',
  '/calculator',
  '/about',
  '/blog',
  '/imprint',
  '/privacy',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  // Generate routes for each locale
  routing.locales.forEach((locale) => {
    staticRoutes.forEach((route) => {
      routes.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/calculator' ? 'weekly' : 'monthly',
        priority: route === '' || route === '/calculator' ? 1.0 : 0.8,
        alternates: {
          languages: {
            de: `${baseUrl}/de${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      });
    });
  });

  return routes;
}

