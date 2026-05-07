'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const PartnerMap = dynamic(() => import('@/components/PartnerMap'), {
  ssr: false
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function TestMapPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .not('lat', 'is', null);

      if (error) {
        setPartners([]);
      } else {
        setPartners(data || []);
      }

      setLoading(false);
    }

    fetchPartners();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Map Test</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <PartnerMap partners={partners} />
      )}
    </div>
  );
}