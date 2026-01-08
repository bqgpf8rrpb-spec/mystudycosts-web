import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ncIndexData from '@/data/nc_search_index.json';
import { parseProgramId, toSlug } from '@/lib/url-slug';
import ProgramDetailContent from '@/components/program/ProgramDetailContent';

interface ProgramPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// Helper function to find program by matching slug
function findProgramById(id: string): typeof ncIndexData[0] | null {
  // Try to parse the ID to get approximate university and program
  const { university: uniSlug, program: progSlug } = parseProgramId(id);
  
  // Find matching program in index
  for (const entry of ncIndexData) {
    const entryUniSlug = toSlug(entry.university);
    const entryProgSlug = toSlug(entry.programName);
    
    // Check if both slugs match (fuzzy match - contains)
    if (entryUniSlug.includes(uniSlug) || uniSlug.includes(entryUniSlug)) {
      if (entryProgSlug.includes(progSlug) || progSlug.includes(entryProgSlug)) {
        return entry;
      }
    }
    
    // Also try exact match on the generated ID
    const generatedId = `${entryUniSlug.substring(0, 50)}-${entryProgSlug.substring(0, 50)}`;
    if (generatedId === id) {
      return entry;
    }
  }
  
  // Fallback: try to find by partial match on the ID
  const idParts = id.split('-');
  if (idParts.length >= 2) {
    // Find best match by comparing all entries
    let bestMatch: typeof ncIndexData[0] | null = null;
    let bestScore = 0;
    
    for (const entry of ncIndexData) {
      const entryUniSlug = toSlug(entry.university);
      const entryProgSlug = toSlug(entry.programName);
      
      // Calculate match score
      let score = 0;
      for (const part of idParts) {
        if (part.length > 3) {
          if (entryUniSlug.includes(part)) score += 2;
          if (entryProgSlug.includes(part)) score += 2;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
    
    if (bestMatch && bestScore >= 2) {
      return bestMatch;
    }
  }
  
  return null;
}

export async function generateMetadata({ params }: ProgramPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const program = findProgramById(id);
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mystudycosts.com';
  const siteUrl = `${baseUrl}/${locale}`;
  
  if (!program) {
    return {
      title: 'Programm nicht gefunden',
      description: 'Das angeforderte Programm konnte nicht gefunden werden.',
    };
  }
  
  // Generate dynamic title
  const ncText = program.nc !== null && program.nc > 0 
    ? `NC ${program.nc}` 
    : 'zulassungsfrei';
  const title = `NC & Kosten: ${program.programName} an der ${program.university} ${program.city} (Stand 2026)`;
  
  // Generate dynamic description
  const ncValue = program.nc !== null && program.nc > 0 ? program.nc.toFixed(1) : 'keinen';
  const erasmusText = program.erasmusCount > 0 
    ? ` ${program.erasmusCount} Erasmus-Partner` 
    : '';
  const description = `Aktueller NC von ${ncValue}, monatliche Fixkosten von ${program.totalMonthlyCosts}€ und${erasmusText} für ${program.programName} in ${program.city}. Jetzt Studienplatz 2026 planen!`;
  
  // Generate OG image URL (optional - can be created dynamically)
  const ogImageUrl = `${siteUrl}/og-image?title=${encodeURIComponent(program.programName)}&university=${encodeURIComponent(program.university)}`;
  
  return {
    title,
    description,
    keywords: [
      program.programName,
      program.university,
      program.city,
      `NC ${program.nc !== null ? program.nc : 'zulassungsfrei'}`,
      'Studienkosten',
      'Studium 2026',
      program.state,
    ],
    openGraph: {
      title,
      description,
      url: `${siteUrl}/program/${id}`,
      siteName: 'MyStudyCosts',
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${program.programName} an der ${program.university}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${siteUrl}/program/${id}`,
    },
  };
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { locale, id } = await params;
  const program = findProgramById(id);
  
  if (!program) {
    notFound();
  }
  
  // Ensure type is valid
  const programData = {
    ...program,
    type: (program.type === 'Uni' || program.type === 'FH' || program.type === 'Privat' 
      ? program.type 
      : 'Uni') as 'Uni' | 'FH' | 'Privat',
  };
  
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 pb-40">
      <ProgramDetailContent program={programData} locale={locale} />
    </main>
  );
}

