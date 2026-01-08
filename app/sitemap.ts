import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import ncIndexData from '@/data/nc_search_index.json';
import { generateProgramId } from '@/lib/url-slug';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mystudycosts.com';

// Date for lastModified (January 2026)
const LAST_MODIFIED_DATE = new Date('2026-01-15');

// Define all static routes (excluding dynamic blog posts for now)
const staticRoutes = [
  '',
  '/calculator',
  '/nc-checker',
  '/erasmus',
  '/about',
  '/blog',
  '/imprint',
  '/privacy',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  // Generate routes for each locale
  routing.locales.forEach((locale) => {
    // Static routes (Landingpage, NC-Checker, etc.)
    staticRoutes.forEach((route) => {
      const isMainPage = route === '' || route === '/calculator' || route === '/nc-checker';
      routes.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: LAST_MODIFIED_DATE,
        changeFrequency: isMainPage ? 'weekly' : 'monthly',
        priority: isMainPage ? 1.0 : 0.8,
        alternates: {
          languages: {
            de: `${baseUrl}/de${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      });
    });

    // Dynamic program routes
    ncIndexData.forEach((program) => {
      const programId = generateProgramId(program.university, program.programName);
      routes.push({
        url: `${baseUrl}/${locale}/program/${programId}`,
        lastModified: LAST_MODIFIED_DATE,
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: {
          languages: {
            de: `${baseUrl}/de/program/${programId}`,
            en: `${baseUrl}/en/program/${programId}`,
          },
        },
      });
    });
  });

  return routes;
}

