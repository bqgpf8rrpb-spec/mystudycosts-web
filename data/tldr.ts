/**
 * TL;DR content per page for inverted pyramid / LLM extraction
 */

export const TLDR_BY_PAGE: Record<
  string,
  { de: { summary: string; highlights: string[] }; en: { summary: string; highlights: string[] } }
> = {
  'nc-checker': {
    de: {
      summary:
        'Der NC-Checker zeigt deine Zulassungschancen für deutsche Studiengänge basierend auf deiner Abiturnote. Gib deine Note und dein Fach ein, um sichere, Wunsch- und Grenzfach-Programme zu finden.',
      highlights: [
        'Über 400 Studiengänge durchsuchbar',
        'Filter nach Bundesland und Hochschultyp',
        'Sichere, Wunsch- und Grenzfach-Einstufung',
      ],
    },
    en: {
      summary:
        'The NC Checker shows your admission chances for German study programs based on your Abitur grade. Enter your grade and subject to see safe, reach, and unlikely programs.',
      highlights: [
        'Search 400+ study programs',
        'Filter by state and institution type',
        'Safe, reach, and unlikely classification',
      ],
    },
  },
  calculator: {
    de: {
      summary:
        'Berechne Blockkonto, Miete, Semesterbeitrag und monatliche Gesamtkosten für dein Studium in Deutschland. Passe Stadt, Unterkunft und Lebensstil für eine personalisierte Schätzung an.',
      highlights: [
        '60+ deutsche Universitätsstädte',
        'Live-Währungsumrechnung',
        'Detaillierte Kostenaufstellung',
      ],
    },
    en: {
      summary:
        'Calculate blocked account, rent, semester fees, and total monthly costs for studying in Germany. Adjust city, accommodation, and lifestyle for a personalized estimate.',
      highlights: [
        '60+ German university cities',
        'Live currency conversion',
        'Detailed cost breakdown',
      ],
    },
  },
  erasmus: {
    de: {
      summary:
        'Finde Erasmus-Partneruniversitäten für dein deutsches Programm. Vergleiche Stipendien, Lebenshaltungskosten und Bewerbungsfristen nach Land.',
      highlights: [
        'Interaktive Karte aller Partnerunis',
        'BAföG-Vorteile für Auslandssemester',
        'Kostenvergleich pro Land',
      ],
    },
    en: {
      summary:
        'Find Erasmus partner universities for your German program. Compare grants, living costs, and application deadlines by country.',
      highlights: [
        'Interactive map of all partner universities',
        'BAföG benefits for study abroad',
        'Cost comparison by country',
      ],
    },
  },
  degree: {
    de: {
      summary:
        'Finde Studiengänge, die zu deiner Abiturnote passen. Gib dein Fach ein und sieh Programme nach Zulassungschance (sicher, Wunsch, Grenzfach) sortiert.',
      highlights: [
        'NC-basierte Zulassungschancen',
        'Alternativen bei strengem NC',
        'Erasmus-Partner pro Programm',
      ],
    },
    en: {
      summary:
        'Find degree programs that match your Abitur grade. Enter your subject and see programs sorted by admission chance (safe, reach, borderline).',
      highlights: [
        'NC-based admission chances',
        'Alternatives for competitive programs',
        'Erasmus partners per program',
      ],
    },
  },
};
