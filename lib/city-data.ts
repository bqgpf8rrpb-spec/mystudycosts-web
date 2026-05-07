/**
 * City Data Utility Functions
 * 
 * Extracts and processes city data from university_programs.json
 */

import universityPrograms from '@/data/university_programs.json';
import { toSlug } from './url-slug';

export interface CityData {
  name: string;
  slug: string;
  universities: string[];
  programCount: number;
  averageSemesterFee: number;
  state: string;
}

/**
 * Extract city name from university key format: "University Name (City)"
 */
function extractCityFromKey(key: string): string | null {
  const match = key.match(/\(([^)]+)\)$/);
  return match ? match[1] : null;
}

/**
 * Extract university name from key format: "University Name (City)"
 */
function extractUniversityFromKey(key: string): string {
  const match = key.match(/^(.+?)\s*\(/);
  return match ? match[1].trim() : key;
}

/**
 * Get all unique cities from university_programs.json
 */
export function getAllCities(): CityData[] {
  const cityMap = new Map<string, {
    universities: Set<string>;
    programs: Array<{ semester_fee: number; state: string }>;
  }>();

  // Process all university entries
  for (const [key, programs] of Object.entries(universityPrograms)) {
    const cityName = extractCityFromKey(key);
    if (!cityName) continue;

    const universityName = extractUniversityFromKey(key);
    
    if (!cityMap.has(cityName)) {
      cityMap.set(cityName, {
        universities: new Set(),
        programs: [],
      });
    }

    const cityData = cityMap.get(cityName)!;
    cityData.universities.add(universityName);

    // Add all programs for this university
    if (Array.isArray(programs)) {
      programs.forEach((program: any) => {
        cityData.programs.push({
          semester_fee: program.semester_fee || 0,
          state: program.state || '',
        });
      });
    }
  }

  // Convert to CityData array
  const cities: CityData[] = [];
  for (const [cityName, data] of cityMap.entries()) {
    const semesterFees = data.programs
      .map(p => p.semester_fee)
      .filter(fee => fee > 0);
    
    const averageSemesterFee = semesterFees.length > 0
      ? Math.round(semesterFees.reduce((sum, fee) => sum + fee, 0) / semesterFees.length)
      : 0;

    // Get the most common state for this city
    const stateCounts = new Map<string, number>();
    data.programs.forEach(p => {
      if (p.state) {
        stateCounts.set(p.state, (stateCounts.get(p.state) || 0) + 1);
      }
    });
    const mostCommonState = Array.from(stateCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    cities.push({
      name: cityName,
      slug: toSlug(cityName),
      universities: Array.from(data.universities).sort(),
      programCount: data.programs.length,
      averageSemesterFee,
      state: mostCommonState,
    });
  }

  // Sort by city name
  return cities.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get city data by slug
 */
export function getCityBySlug(slug: string): CityData | null {
  const cities = getAllCities();
  return cities.find(city => city.slug === slug) || null;
}

/**
 * Get city data by name
 */
export function getCityByName(name: string): CityData | null {
  const cities = getAllCities();
  return cities.find(city => city.name === name) || null;
}

