export type AdmissionBucket = 0 | 1 | 2;
type SupportedLocale = 'de' | 'en';
export type AdmissionBandTranslationKey =
  | 'admissionBandHigh'
  | 'admissionBandTight'
  | 'admissionBandNoChance';
export type AdmissionBandDescriptionTranslationKey =
  | 'admissionBandHighDesc'
  | 'admissionBandTightDesc'
  | 'admissionBandNoChanceDesc';

export function normalizeNcValue(ncValue: number | string | null): number | null {
  if (ncValue === null || ncValue === undefined) return null;

  if (typeof ncValue === 'number') {
    return Number.isFinite(ncValue) ? ncValue : null;
  }

  const normalized = ncValue.trim().toLowerCase().replace(',', '.');
  if (!normalized) return null;
  if (normalized === 'n/a' || normalized === 'zulassungsfrei') return 99;

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isOpenAdmissionNc(ncValue: number | string | null): boolean {
  const normalized = normalizeNcValue(ncValue);
  return normalized === null || normalized >= 99;
}

export function formatNcDisplay(
  ncValue: number | string | null,
  locale: SupportedLocale = 'de'
): string {
  const openAdmissionLabel = locale === 'en' ? 'Open Admission' : 'Zulassungsfrei';
  if (isOpenAdmissionNc(ncValue)) return openAdmissionLabel;

  const normalized = normalizeNcValue(ncValue);
  if (normalized === null) return openAdmissionLabel;

  if (Number.isInteger(normalized)) {
    return normalized.toString();
  }

  return normalized.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export function calculateAdmissionChance(
  userNc: number | null,
  programNc: number | string | null
): AdmissionBucket {
  if (userNc === null || userNc === undefined || Number.isNaN(userNc)) return 0;
  if (isOpenAdmissionNc(programNc)) return 0;

  const normalizedProgramNc = normalizeNcValue(programNc);
  if (normalizedProgramNc === null) return 0;
  if (userNc <= normalizedProgramNc) return 0;
  if (userNc <= normalizedProgramNc + 0.3) return 1;
  return 2;
}

export function getAdmissionBandLabelKey(bucket: AdmissionBucket): AdmissionBandTranslationKey {
  if (bucket === 2) return 'admissionBandHigh';
  if (bucket === 1) return 'admissionBandTight';
  return 'admissionBandNoChance';
}

export function getAdmissionBandDescriptionKey(
  bucket: AdmissionBucket
): AdmissionBandDescriptionTranslationKey {
  if (bucket === 2) return 'admissionBandHighDesc';
  if (bucket === 1) return 'admissionBandTightDesc';
  return 'admissionBandNoChanceDesc';
}
