export interface ExportRow {
  label: string;
  value: string;
}

export interface ExportPayload {
  summary: {
    title: string;
    generatedAt: string;
    locale: string;
    currency: string;
    university: string;
    city: string;
    monthlyTotal: string;
    annualTotal: string;
    upfrontTotal: string;
    firstYearTotal: string;
  };
  details: {
    profile: ExportRow[];
    costBreakdown: ExportRow[];
  };
  recommendations: {
    title: string;
    items: string[];
    note?: string;
  };
  additionalSections?: Array<{
    id: string;
    title: string;
    rows: ExportRow[];
  }>;
}

export interface BuildStudyCostExportPayloadInput {
  locale: string;
  generatedAt?: Date;
  currencyCode: string;
  university: string;
  city: string;
  countryOfOrigin: string;
  housingType: string;
  monthlyTotal: string;
  annualTotal: string;
  upfrontTotal: string;
  firstYearTotal: string;
  costBreakdown: ExportRow[];
  recommendationItems: string[];
  i18n?: {
    reportTitle?: string;
    profileUniversity?: string;
    profileCity?: string;
    profileCountryOfOrigin?: string;
    profileHousingType?: string;
    recommendationsTitle?: string;
    recommendationsNote?: string;
    financialAdviceTitle?: string;
    checklistTitle?: string;
    tipPrefix?: string;
    checklistItems?: string[];
    tipHighRent?: string;
    tipHighInsurance?: string;
    tipHighMonthlyTotal?: string;
    tipPrivateHousing?: string;
    tipVisaPlanning?: string;
    tipBudgetTracking?: string;
  };
}

interface FinancialTipsInput {
  city: string;
  countryOfOrigin: string;
  housingType: string;
  costBreakdown: ExportRow[];
  locale: string;
  i18n?: {
    tipHighRent?: string;
    tipHighInsurance?: string;
    tipHighMonthlyTotal?: string;
    tipPrivateHousing?: string;
    tipVisaPlanning?: string;
    tipBudgetTracking?: string;
  };
}

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function extractCostByLabel(rows: ExportRow[], matcher: RegExp): number {
  const match = rows.find((row) => matcher.test(row.label.toLowerCase()));
  return match ? parseAmount(match.value) : 0;
}

function interpolateCity(template: string, city: string): string {
  return template.replace('{city}', city);
}

export function generateFinancialTips(data: FinancialTipsInput): string[] {
  const isGerman = data.locale === 'de';
  const tips: string[] = [];
  const rent = extractCostByLabel(data.costBreakdown, /rent|miete/);
  const insurance = extractCostByLabel(data.costBreakdown, /insurance|versicherung/);
  const monthlyTotal = extractCostByLabel(data.costBreakdown, /monthly total|monat/i);

  if (rent > 600) {
    tips.push(
      data.i18n?.tipHighRent ?? (isGerman
        ? 'Ihre Miete liegt über 600 EUR: Prüfen Sie Wohngeld und Optionen beim Studentenwerk.'
        : 'Your rent is above 600 EUR: check eligibility for Wohngeld and Studentenwerk housing options.')
    );
  }

  if (insurance > 120) {
    tips.push(
      data.i18n?.tipHighInsurance ?? (isGerman
        ? 'Ihre Krankenversicherung ist relativ hoch: Vergleichen Sie studentische Tarife verschiedener Anbieter.'
        : 'Health insurance is relatively high: compare student tariffs from multiple statutory providers.')
    );
  }

  if (monthlyTotal > 1300) {
    tips.push(
      data.i18n?.tipHighMonthlyTotal ?? (isGerman
        ? 'Ihr monatliches Budget ist hoch: Priorisieren Sie Einsparungen bei Fixkosten (Miete, Nebenkosten, Mobilität).'
        : 'Your monthly budget is high: prioritize fixed-cost reductions (rent, utilities, transport package).')
    );
  }

  if (data.housingType.toLowerCase().includes('private')) {
    tips.push(
      data.i18n?.tipPrivateHousing ?? (isGerman
        ? 'Private Wohnungen erhöhen die Erstjahreskosten; prüfen Sie WG-Optionen für geringere Kaution und Monatskosten.'
        : 'Private apartments increase first-year costs; compare WG options to lower deposit and monthly expenses.')
    );
  }

  if (tips.length < 3 && data.countryOfOrigin.toLowerCase() !== 'germany') {
    tips.push(
      data.i18n?.tipVisaPlanning ?? (isGerman
        ? 'Planen Sie Visa- und Sperrkontozahlungen frühzeitig, um Zusatzkosten und Verzögerungen zu vermeiden.'
        : 'Plan visa and blocked-account payments early to avoid rush fees and delayed enrollment.')
    );
  }

  if (tips.length < 3) {
    const fallback = isGerman
      ? 'Tracken Sie die ersten 90 Tage in {city} mit einem Wochenbudget, um Kostenabweichungen früh zu erkennen.'
      : 'Track your first 90 days in {city} with a weekly budget to catch cost drift early.';
    tips.push(interpolateCity(data.i18n?.tipBudgetTracking ?? fallback, data.city));
  }

  return tips.slice(0, 4);
}

export function getStandardNextSteps(locale: string, customItems?: string[]): string[] {
  if (customItems && customItems.length > 0) return customItems;
  if (locale === 'de') {
    return [
      'Prüfen Sie nach der Anmeldung eine GEZ/Rundfunkbeitrag-Befreiung oder Haushaltsaufteilung.',
      'Aktivieren Sie Ihr Semesterticket und vergleichen Sie lokale Mobilitätsoptionen.',
      'Eröffnen Sie ein Studierendenkonto und richten Sie wiederkehrende Zahlungen ein.',
      'Melden Sie Ihren Wohnsitz an (Anmeldung) und sichern Sie alle Vertrags-/Zahlungsnachweise.',
    ];
  }
  return [
    'Check GEZ/rundfunk contribution exemption or household sharing status after registration.',
    'Activate your Semesterticket and compare local transport upgrades.',
    'Open a student bank account and configure recurring rent/insurance payments.',
    'Register city address (Anmeldung) and store all contract/payment confirmations.',
  ];
}

export function buildStudyCostExportPayload(
  input: BuildStudyCostExportPayloadInput
): ExportPayload {
  const timestamp = (input.generatedAt ?? new Date()).toISOString();
  const financialTips = generateFinancialTips({
    city: input.city,
    countryOfOrigin: input.countryOfOrigin,
    housingType: input.housingType,
    costBreakdown: input.costBreakdown,
    locale: input.locale,
    i18n: {
      tipHighRent: input.i18n?.tipHighRent,
      tipHighInsurance: input.i18n?.tipHighInsurance,
      tipHighMonthlyTotal: input.i18n?.tipHighMonthlyTotal,
      tipPrivateHousing: input.i18n?.tipPrivateHousing,
      tipVisaPlanning: input.i18n?.tipVisaPlanning,
      tipBudgetTracking: input.i18n?.tipBudgetTracking,
    },
  });
  const isGerman = input.locale === 'de';
  const standardChecklist = getStandardNextSteps(input.locale, input.i18n?.checklistItems);

  return {
    summary: {
      title: input.i18n?.reportTitle ?? (isGerman ? 'MyStudyCosts Bericht' : 'MyStudyCosts Report'),
      generatedAt: timestamp,
      locale: input.locale,
      currency: input.currencyCode,
      university: input.university,
      city: input.city,
      monthlyTotal: input.monthlyTotal,
      annualTotal: input.annualTotal,
      upfrontTotal: input.upfrontTotal,
      firstYearTotal: input.firstYearTotal,
    },
    details: {
      profile: [
        { label: input.i18n?.profileUniversity ?? (isGerman ? 'Universität' : 'University'), value: input.university },
        { label: input.i18n?.profileCity ?? (isGerman ? 'Stadt' : 'City'), value: input.city },
        { label: input.i18n?.profileCountryOfOrigin ?? (isGerman ? 'Herkunftsland' : 'Country of Origin'), value: input.countryOfOrigin },
        { label: input.i18n?.profileHousingType ?? (isGerman ? 'Wohnform' : 'Housing Type'), value: input.housingType },
      ],
      costBreakdown: input.costBreakdown,
    },
    recommendations: {
      title: input.i18n?.recommendationsTitle ?? (isGerman ? 'Nächste Schritte' : 'Next Steps'),
      items: input.recommendationItems,
      note: input.i18n?.recommendationsNote ?? (isGerman
        ? 'Dieser Bereich ist absichtlich groß gehalten, damit später Erasmus-/NC-Empfehlungen ergänzt werden können.'
        : 'This section is intentionally large so future Erasmus / NC recommendations can be added here.'),
    },
    additionalSections: [
      {
        id: 'financial-advice',
        title: input.i18n?.financialAdviceTitle ?? (isGerman ? 'Finanzielle Hinweise' : 'Financial Advice'),
        rows: financialTips.map((tip, index) => ({
          label: `${input.i18n?.tipPrefix ?? (isGerman ? 'Tipp' : 'Tip')} ${index + 1}`,
          value: tip,
        })),
      },
      {
        id: 'checklist',
        title: input.i18n?.checklistTitle ?? (isGerman ? 'Checkliste' : 'Checklist'),
        rows: standardChecklist.map((item) => ({
          label: item,
          value: '',
        })),
      },
    ],
  };
}

export function buildStudyReportFileName(city: string): string {
  const safeCity = city.replace(/\s+/g, '_').replace(/[^\w-]/g, '') || 'estimate';
  const date = new Date().toISOString().split('T')[0];
  return `MyStudyCosts_Report_${safeCity}_${date}.pdf`;
}
