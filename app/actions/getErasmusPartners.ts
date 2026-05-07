'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Uses Supabase schema which differs from the local ErasmusPartner type
export interface ErasmusPartnerFromSupabase {
  id: string;
  partner_university_name: string;
  partner_city: string;
  partner_country: string;
  subject_area: string;
  program_type: string;
  latitude: number | null;
  longitude: number | null;
  website_url: string;
  home_university: string | null;
}

export async function getErasmusPartners(): Promise<ErasmusPartnerFromSupabase[]> {
  try {
    const { data, error } = await supabase
      .from('erasmus_partners')
      .select(`
        id,
        partner_university_name,
        partner_city,
        partner_country,
        subject_area,
        program_type,
        latitude,
        longitude,
        website_url,
        home_university
      `)
      .order('partner_university_name');

    if (error) {
      console.error('Error fetching Erasmus partners:', error);
      throw new Error('Failed to fetch Erasmus partners from database');
    }

    const partners: ErasmusPartnerFromSupabase[] = (data ?? []).map((partner) => ({
      id: partner.id,
      partner_university_name: partner.partner_university_name,
      partner_city: partner.partner_city,
      partner_country: partner.partner_country,
      subject_area: partner.subject_area ?? '',
      program_type: partner.program_type ?? '',
      latitude: partner.latitude ?? null,
      longitude: partner.longitude ?? null,
      website_url: partner.website_url ?? '',
      home_university: partner.home_university ?? null,
    }));

    console.log(`✅ Retrieved ${partners.length} Erasmus partners from Supabase`);

    return partners;
  } catch (error) {
    console.error('Server action error:', error);
    throw new Error('Failed to retrieve Erasmus partners');
  }
}

// Optional: Function to get partner count for statistics
export async function getErasmusPartnersCount(): Promise<{ total: number; withCoords: number }> {
  try {
    // Get total count
    const { count: total } = await supabase
      .from('erasmus_partners')
      .select('*', { count: 'exact', head: true });

    // Get count with coordinates
    const { count: withCoords } = await supabase
      .from('erasmus_partners')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null);

    return {
      total: total || 0,
      withCoords: withCoords || 0,
    };
  } catch (error) {
    console.error('Error getting partner counts:', error);
    return { total: 0, withCoords: 0 };
  }
}
