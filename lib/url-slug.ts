/**
 * URL Slug Utility Functions
 * 
 * Converts university and program names to clean URL slugs
 */

/**
 * Convert a string to a URL-friendly slug
 * 
 * @param text - Text to convert to slug
 * @returns Clean URL slug (lowercase, no special characters)
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    // Replace common German special characters
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Remove all special characters except hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-');
}

/**
 * Generate a program ID slug from university and program name
 * 
 * @param university - University name
 * @param programName - Program name
 * @returns Combined slug (university-program)
 */
export function generateProgramId(university: string, programName: string): string {
  const uniSlug = toSlug(university);
  const programSlug = toSlug(programName);
  
  // Take first 50 chars of each to keep URL reasonable length
  const uniShort = uniSlug.substring(0, 50);
  const programShort = programSlug.substring(0, 50);
  
  return `${uniShort}-${programShort}`;
}

/**
 * Parse program ID back to university and program name
 * Note: This is approximate since we can't perfectly reverse the slug
 * This would require a lookup in the actual data
 * 
 * @param slug - Program ID slug
 * @returns Object with university and program slugs (approximate)
 */
export function parseProgramId(slug: string): { university: string; program: string } {
  // Split on the last hyphen (assuming format: university-program)
  // This is not perfect but works for most cases
  const parts = slug.split('-');
  if (parts.length < 2) {
    return { university: slug, program: '' };
  }
  
  // Find a reasonable split point (look for common words)
  // For now, simple heuristic: split in the middle
  const midPoint = Math.floor(parts.length / 2);
  const university = parts.slice(0, midPoint).join('-');
  const program = parts.slice(midPoint).join('-');
  
  return { university, program };
}

