/**
 * Centralized external URLs used across the application.
 */

/** DAAD - German Academic Exchange Service */
export const DAAD_APPLY = 'https://www.daad.de/en/';

/** uni-assist - University application service */
export const UNI_ASSIST = 'https://www.uni-assist.de/';

/** German visa appointment booking */
export const VISA_APPOINTMENT =
  'https://service2.diplo.de/rktermin/extern/choose_realmList.do?locationCode=indi&request_locale=en';

/** Student services & housing */
export const EXTERNAL_LINKS = {
  studentenwerk: 'https://www.studierendenwerk.de/',
  wgGesucht: 'https://www.wg-gesucht.de/',
} as const;

/** Frankfurter API - exchange rates attribution */
export const FRANKFURTER_APP_URL = 'https://www.frankfurter.app';

/** Official resource links (for StudyCostCalculator compatibility) */
export const OFFICIAL_LINKS = {
  applyUniversity: DAAD_APPLY,
  uniAssist: UNI_ASSIST,
  visaAppointment: VISA_APPOINTMENT,
  accommodation: EXTERNAL_LINKS,
} as const;
