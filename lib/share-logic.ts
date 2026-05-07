/**
 * Share Logic for Erasmus Calculator
 * 
 * Provides functions to generate shareable links and use the Web Share API
 * for sharing Erasmus comparison results.
 */

export interface ErasmusShareData {
  homeUniversity?: string; // German home university name
  homeProgram?: string; // Selected program name
  partnerUniversity?: string; // Erasmus partner university name
  partnerCity?: string; // Partner city
  partnerCountry?: string; // Partner country
  hasBAfoeg?: boolean; // BAföG status
}

/**
 * Generate a shareable URL with Base64-encoded parameters
 * 
 * @param data - The Erasmus comparison data to encode
 * @param baseUrl - Base URL of the application (defaults to current origin)
 * @returns Shareable URL with encoded parameters
 */
export function generateShareLink(
  data: ErasmusShareData,
  baseUrl?: string
): string {
  // Get base URL
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://mystudycosts.com');
  
  // Create payload object with only defined values
  const payload: ErasmusShareData = {};
  if (data.homeUniversity) payload.homeUniversity = data.homeUniversity;
  if (data.homeProgram) payload.homeProgram = data.homeProgram;
  if (data.partnerUniversity) payload.partnerUniversity = data.partnerUniversity;
  if (data.partnerCity) payload.partnerCity = data.partnerCity;
  if (data.partnerCountry) payload.partnerCountry = data.partnerCountry;
  if (data.hasBAfoeg !== undefined) payload.hasBAfoeg = data.hasBAfoeg;
  
  // Encode to Base64
  try {
    const jsonString = JSON.stringify(payload);
    const base64 = btoa(encodeURIComponent(jsonString)); // Use encodeURIComponent for safe encoding
    const locale = typeof window !== 'undefined' 
      ? window.location.pathname.split('/')[1] || 'de'
      : 'de';
    
    return `${base}/${locale}/erasmus?share=${base64}`;
  } catch (error) {
    console.error('Error generating share link:', error);
    // Fallback: return base URL without parameters
    return `${base}/erasmus`;
  }
}

/**
 * Parse share parameters from URL
 * 
 * @param shareParam - Base64-encoded share parameter from URL
 * @returns Parsed Erasmus share data or null if invalid
 */
export function parseShareLink(shareParam: string): ErasmusShareData | null {
  try {
    // Decode from Base64
    const decoded = decodeURIComponent(atob(shareParam));
    const data = JSON.parse(decoded) as ErasmusShareData;
    
    // Validate and return
    return data;
  } catch (error) {
    console.error('Error parsing share link:', error);
    return null;
  }
}

/**
 * Share using Web Share API (mobile) or fallback to clipboard
 * 
 * @param data - The Erasmus comparison data to share
 * @param title - Share title (optional)
 * @param text - Share text (optional)
 * @returns Promise that resolves when sharing is complete
 */
export async function shareErasmusComparison(
  data: ErasmusShareData,
  title?: string,
  text?: string
): Promise<boolean> {
  const shareLink = generateShareLink(data);
  const defaultTitle = 'Erasmus Cost Comparison';
  const defaultText = 'Check out this Erasmus cost comparison!';
  
  const shareData: ShareData = {
    title: title || defaultTitle,
    text: text || defaultText,
    url: shareLink,
  };
  
  // Check if Web Share API is supported (mobile devices)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      // Fallback to clipboard
      return fallbackToClipboard(shareLink);
    }
  } else {
    // Fallback to clipboard for desktop browsers
    return fallbackToClipboard(shareLink);
  }
}

/**
 * Fallback: Copy link to clipboard
 * 
 * @param url - URL to copy
 * @returns Promise that resolves when copy is complete
 */
async function fallbackToClipboard(url: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Check if Web Share API is available
 * 
 * @returns True if Web Share API is supported
 */
export function isWebShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Get share button text based on availability
 * 
 * @returns Appropriate text for share button
 */
export function getShareButtonText(): string {
  if (isWebShareAvailable()) {
    return 'Share';
  }
  return 'Copy Link';
}

