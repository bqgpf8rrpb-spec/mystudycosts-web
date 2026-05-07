/**
 * API Client Functions
 * 
 * Type-safe functions to interact with the search API
 */

export interface SearchFilters {
  q?: string; // Search query
  city?: string; // Filter by city
  type?: 'Uni' | 'FH' | 'Privat' | string; // Filter by type
  state?: string; // Filter by state
  limit?: number; // Result limit (default: 20)
  offset?: number; // Pagination offset (default: 0)
  englishOnly?: boolean; // Filter for English-taught programs only
  userGpa?: string; // User's GPA for NC comparison (optional)
}

export interface SearchResult {
  programName: string;
  university: string;
  city: string;
  state?: string;
  type?: string;
  nc?: number | null;
  totalMonthlyCosts?: number;
}

export interface FeaturedPartner {
  name: string;
  program: string;
  url: string;
  advantages: string[];
  description: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: SearchFilters;
  featuredPartner?: FeaturedPartner;
}

/**
 * Search programs using the API
 * 
 * @param query - Search query string
 * @param filters - Additional filters (city, type, state, limit, offset)
 * @returns Promise with search results
 * 
 * @example
 * const results = await searchPrograms('Business', { city: 'Munich', limit: 10 });
 */
export async function searchPrograms(
  query: string = '',
  filters: Omit<SearchFilters, 'q'> = {}
): Promise<SearchResponse> {
  try {
    // Build URL with query parameters
    const params = new URLSearchParams();
    
    if (query.trim()) {
      params.append('q', query.trim());
    }
    
    if (filters.city) {
      params.append('city', filters.city);
    }
    
    if (filters.type) {
      params.append('type', filters.type);
    }
    
    if (filters.state) {
      params.append('state', filters.state);
    }
    
    if (filters.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    
    if (filters.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }

    const url = `/api/search?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for better performance
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Search failed with status ${response.status}`
      );
    }

    const data = await response.json();
    return data as SearchResponse;
  } catch (error) {
    // Log error for debugging
    console.error('Search API error:', error);
    
    // Return empty results on error
    return {
      results: [],
      total: 0,
      query: { q: query, ...filters },
    };
  }
}

/**
 * Search NC index using the API
 * 
 * @param query - Search query string
 * @param filters - Additional filters (city, type, state, limit, offset)
 * @returns Promise with search results
 */
export async function searchNCIndex(
  query: string = '',
  filters: Omit<SearchFilters, 'q'> = {}
): Promise<SearchResponse> {
  try {
    // Build URL with query parameters
    const params = new URLSearchParams();
    
    if (query.trim()) {
      params.append('q', query.trim());
    }
    
    if (filters.city) {
      params.append('city', filters.city);
    }
    
    if (filters.type) {
      params.append('type', filters.type);
    }
    
    if (filters.state) {
      params.append('state', filters.state);
    }
    
    if (filters.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    
    if (filters.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }
    
    if (filters.englishOnly) {
      params.append('englishOnly', 'true');
    }

    if (filters.userGpa) {
      params.append('userGpa', filters.userGpa);
    }

    const url = `/api/search/nc?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `NC Search failed with status ${response.status}`
      );
    }

    const data = await response.json();
    return data as SearchResponse;
  } catch (error) {
    console.error('NC Search API error:', error);
    
    return {
      results: [],
      total: 0,
      query: { q: query, ...filters },
    };
  }
}

