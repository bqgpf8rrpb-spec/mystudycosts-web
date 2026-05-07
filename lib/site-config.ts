/**
 * Site configuration: base URL and metadata defaults.
 */

/** Site base URL for metadata, OG tags, canonical links */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://mystudycosts.com';
}
