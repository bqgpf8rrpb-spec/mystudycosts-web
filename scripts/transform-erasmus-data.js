#!/usr/bin/env node

/**
 * Transforms EU Erasmus+ Mobility Raw Data (XLSX) into the ErasmusPartnerDatabase format.
 *
 * Pipeline:
 * 1. Streams each XLSX file row-by-row (memory-efficient for 70MB+ files)
 * 2. Filters: Sending Country = Germany, Field = Higher Education, student mobility
 * 3. Extracts unique (Sending Org, Receiving Org, Field of Ed) tuples
 * 4. Groups by German university
 * 5. Outputs data/erasmus_partners.json in ErasmusPartnerDatabase format
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const UNI_MAPPING_PATH = path.join(__dirname, '..', 'data', 'german_uni_mapping.json');

// ── ISCED Field of Education mapping (code prefix -> readable name) ──

const ISCED_FIELD_MAP = {
  '011': 'Education',
  '012': 'Education',
  '021': 'Arts',
  '022': 'Humanities',
  '023': 'Languages',
  '028': 'Arts & Humanities',
  '031': 'Social Sciences',
  '032': 'Journalism & Media',
  '038': 'Social Sciences',
  '041': 'Business Administration',
  '042': 'Law',
  '048': 'Business & Law',
  '051': 'Biology',
  '052': 'Environmental Sciences',
  '053': 'Physics & Chemistry',
  '054': 'Mathematics & Statistics',
  '058': 'Natural Sciences',
  '061': 'Information & Communication Technologies',
  '068': 'ICT',
  '071': 'Engineering',
  '072': 'Manufacturing & Processing',
  '073': 'Architecture & Construction',
  '078': 'Engineering',
  '081': 'Agriculture',
  '082': 'Forestry',
  '083': 'Fisheries',
  '084': 'Veterinary Medicine',
  '088': 'Agriculture',
  '091': 'Medicine',
  '092': 'Health Sciences',
  '098': 'Health Sciences',
  '101': 'Social Services',
  '102': 'Social Work',
  '103': 'Security & Safety',
  '108': 'Social Services',
  '099': 'Health Sciences',
};

const BROAD_FIELD_MAP = {
  'education': 'Education',
  'arts and humanities': 'Arts & Humanities',
  'arts': 'Arts',
  'humanities': 'Humanities',
  'social sciences, journalism and information': 'Social Sciences',
  'social and behavioural sciences': 'Social Sciences',
  'journalism and information': 'Journalism & Media',
  'business, administration and law': 'Business & Law',
  'business and administration': 'Business Administration',
  'natural sciences, mathematics and statistics': 'Natural Sciences',
  'biological and related sciences': 'Biology',
  'physical sciences': 'Physics & Chemistry',
  'mathematics and statistics': 'Mathematics & Statistics',
  'environment': 'Environmental Sciences',
  'information and communication technologies': 'ICT',
  'information and communication technologies (icts)': 'ICT',
  'engineering, manufacturing and construction': 'Engineering',
  'engineering and engineering trades': 'Engineering',
  'manufacturing and processing': 'Manufacturing & Processing',
  'architecture and construction': 'Architecture & Construction',
  'agriculture, forestry, fisheries and veterinary': 'Agriculture',
  'health and welfare': 'Health Sciences',
  'health': 'Health Sciences',
  'welfare': 'Social Services',
  'services': 'Services',
  'transport services': 'Services',
  'transport services, not elsewhere classified': 'Services',
  'inter-disciplinary programmes and qualifications involving education': 'Education',
  'arts and humanities, inter-disciplinary programmes': 'Arts & Humanities',
};

function mapFieldOfEducation(raw) {
  if (!raw || raw === '-') return 'General';

  const prefix3 = raw.substring(0, 3);
  const prefix4 = raw.substring(0, 4);
  if (ISCED_FIELD_MAP[prefix4]) return ISCED_FIELD_MAP[prefix4];
  if (ISCED_FIELD_MAP[prefix3]) return ISCED_FIELD_MAP[prefix3];

  const desc = raw.split(' - ').slice(1).join(' - ').trim().toLowerCase();
  if (desc) {
    if (BROAD_FIELD_MAP[desc]) return BROAD_FIELD_MAP[desc];
    if (desc.includes('not further defined') || desc.includes('not elsewhere classified')) {
      const parentDesc = desc.replace(/, not (further defined|elsewhere classified)/, '').trim();
      if (BROAD_FIELD_MAP[parentDesc]) return BROAD_FIELD_MAP[parentDesc];
    }
  }

  const rawLower = raw.toLowerCase().trim();
  if (BROAD_FIELD_MAP[rawLower]) return BROAD_FIELD_MAP[rawLower];

  if (desc && !desc.includes('not further defined') && !desc.includes('not elsewhere classified')) {
    return desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  return 'General';
}

// ── Activity type filtering ──

const STUDENT_MOBILITY_PATTERNS = [
  'HE-SMS',
  'HE-SMT',
  'HE-LM-SMS',
  'HE-LM-SMT',
  'Student mobility for studies',
  'Student mobility for traineeships',
];

function isStudentMobility(activity) {
  if (!activity) return false;
  return STUDENT_MOBILITY_PATTERNS.some((p) => activity.includes(p));
}

// ── German university name normalization ──
// Maps known abbreviations / alternate names to canonical form.
// Canonical key = the full official name used most often across years.

const ORG_NAME_MERGES = {
  'TUM': 'TECHNISCHE UNIVERSITAET MUENCHEN',
  'LMU MUENCHEN': 'LUDWIG-MAXIMILIANS-UNIVERSITAET MUENCHEN',
  'RWTH AACHEN': 'RHEINISCH-WESTFAELISCHE TECHNISCHE HOCHSCHULE AACHEN',
  'Universität Münster, UM': 'WESTFAELISCHE WILHELMS-UNIVERSITAET MUENSTER',
  'Universität Münster': 'WESTFAELISCHE WILHELMS-UNIVERSITAET MUENSTER',
  'FH MÜNSTER': 'FH Münster University of Applied Sciences',
  'FSU JENA': 'FRIEDRICH-SCHILLER-UNIVERSITAET JENA',
  'FAU': 'FRIEDRICH-ALEXANDER-UNIVERSITAET ERLANGEN NUERNBERG',
  'KIT': 'KARLSRUHER INSTITUT FUER TECHNOLOGIE',
  'CAU': 'CHRISTIAN-ALBRECHTS-UNIVERSITAET ZU KIEL',
  'GUF': 'JOHANN WOLFGANG GOETHE-UNIVERSITAET FRANKFURT AM MAIN',
  'LUH': 'GOTTFRIED WILHELM LEIBNIZ UNIVERSITAET HANNOVER',
  'UHEI': 'RUPRECHT-KARLS-UNIVERSITAET HEIDELBERG',
  'OVGU': 'OTTO-VON-GUERICKE-UNIVERSITAET MAGDEBURG',
  'TUD': 'TECHNISCHE UNIVERSITAET DRESDEN',
  'TUB': 'TECHNISCHE UNIVERSITAET BERLIN',
  'TUC': 'TECHNISCHE UNIVERSITAET CHEMNITZ',
  'TUIL': 'TECHNISCHE UNIVERSITAET ILMENAU',
  'TUDO': 'TECHNISCHE UNIVERSITAT DORTMUND',
  'UFR': 'ALBERT-LUDWIGS-UNIVERSITAET FREIBURG',
  'UDE': 'UNIVERSITAET DUISBURG-ESSEN',
  'UDUS': 'HEINRICH-HEINE-UNIVERSITAET DUESSELDORF',
  'UHAM': 'UNIVERSITAET HAMBURG',
  'UoC': 'UNIVERSITAET ZU KOELN',
  'UKON': 'UNIVERSITAET KONSTANZ',
  'UP': 'UNIVERSITAET POTSDAM',
  'UROS': 'UNIVERSITAET ROSTOCK',
  'USTUTT': 'UNIVERSITAET STUTTGART',
  'UULM': 'UNIVERSITAET ULM',
  'UBREMEN': 'UNIVERSITAET BREMEN',
  'UREG': 'UNIVERSITAET REGENSBURG',
  'UAU': 'UNIVERSITAET AUGSBURG',
  'UOS': 'UNIVERSITAET OSNABRUECK',
  'UZL': 'UNIVERSITAET ZU LUEBECK',
  'MLU': 'MARTIN-LUTHER-UNIVERSITAET HALLE-WITTENBERG',
  'UG': 'UNIVERSITAET GOETTINGEN',
  'Georg-August-Universitat Gottingen Stiftung Offentlichen Rechts': 'UNIVERSITAET GOETTINGEN',
  'LEUPHANA': 'LEUPHANA UNIVERSITAET LUENEBURG',
  'PHHD': 'PAEDAGOGISCHE HOCHSCHULE HEIDELBERG',
  'HM': 'HOCHSCHULE MUENCHEN',
  'DSHS KOLN': 'DEUTSCHE SPORTHOCHSCHULE KOELN',
  'H-DA': 'HOCHSCHULE DARMSTADT',
  'HSD': 'HOCHSCHULE DUESSELDORF',
  'BUW': 'BERGISCHE UNIVERSITAET WUPPERTAL',
  'EUV': 'EUROPA-UNIVERSITAET VIADRINA FRANKFURT (ODER)',
  'HWR': 'HOCHSCHULE FUER WIRTSCHAFT UND RECHT BERLIN',
  'HTW Berlin': 'HOCHSCHULE FUER TECHNIK UND WIRTSCHAFT BERLIN',
  'HTW Dresden': 'HOCHSCHULE FUER TECHNIK UND WIRTSCHAFT DRESDEN',
  'UNI BA': 'OTTO-FRIEDRICH-UNIVERSITAET BAMBERG',
  'UNIBI': 'UNIVERSITAET BIELEFELD',
  'HERTIE': 'HERTIE SCHOOL OF GOVERNANCE GGMBH',
  'BRSU': 'HOCHSCHULE BONN-RHEIN-SIEG',
  'BTU CS': 'BRANDENBURGISCHE TECHNISCHE UNIVERSITAET COTTBUS-SENFTENBERG',
  'UDK': 'UNIVERSITAET DER KUENSTE BERLIN',
  'EKUT': 'EBERHARD KARLS UNIVERSITAET TUEBINGEN',
  'BayHfoD': 'HOCHSCHULE FUER DEN OEFFENTLICHEN DIENST IN BAYERN',
  'UNI HILDESHEIM': 'STIFTUNG UNIVERSITAET HILDESHEIM',
  'UNI WUERZBURG': 'JULIUS-MAXIMILIANS-UNIVERSITAET WUERZBURG',
  'TU BAF': 'TECHNISCHE UNIVERSITAET BERGAKADEMIE FREIBERG',
  'OTH REGENSBURG': 'OSTBAYERISCHE TECHNISCHE HOCHSCHULE REGENSBURG',
  'HdM': 'HOCHSCHULE DER MEDIEN STUTTGART',
  'UK': 'UNIVERSITAET ZU KOELN',
  'UBER': 'UNIVERSITAET BERN',
  'UGOE': 'UNIVERSITAET GOETTINGEN',
  'ULEI': 'UNIVERSITAET LEIPZIG',
  'JLU': 'JUSTUS-LIEBIG-UNIVERSITAET GIESSEN',
  'UMR': 'PHILIPPS UNIVERSITAET MARBURG',
  'USAAR': 'UNIVERSITAT DES SAARLANDES',
  'UPB': 'UNIVERSITAET PADERBORN',
  'UE': 'UNIVERSITAET ERFURT',
  'KUEI': 'KATHOLISCHE UNIVERSITAET EICHSTAETT-INGOLSTADT',
  'TUHH': 'TECHNISCHE UNIVERSITAET HAMBURG',
  'EUF': 'EUROPA-UNIVERSITAET FLENSBURG',
  'THI': 'TECHNISCHE HOCHSCHULE INGOLSTADT',
  'THN': 'TECHNISCHE HOCHSCHULE NUERNBERG GEORG SIMON OHM',
  'THD': 'TECHNISCHE HOCHSCHULE DEGGENDORF',
  'MHH': 'MEDIZINISCHE HOCHSCHULE HANNOVER',
  'HMTMH': 'HOCHSCHULE FUER MUSIK THEATER UND MEDIEN HANNOVER',
  'HBK': 'HOCHSCHULE FUER BILDENDE KUENSTE BRAUNSCHWEIG',
  'HCU': 'HAFENCITY UNIVERSITAET HAMBURG',
  'HFT': 'HOCHSCHULE FUER TECHNIK STUTTGART',
  'HFU': 'HOCHSCHULE FURTWANGEN',
  'HNEE': 'HOCHSCHULE FUER NACHHALTIGE ENTWICKLUNG EBERSWALDE',
  'HS EL': 'HOCHSCHULE EMDEN LEER',
  'HSBA': 'HAMBURG SCHOOL OF BUSINESS ADMINISTRATION',
  'HSBO': 'HOCHSCHULE BOCHUM',
  'HSH': 'HOCHSCHULE HANNOVER',
  'HSWT': 'HOCHSCHULE WEIHENSTEPHAN-TRIESDORF',
  'JHS': 'JADE HOCHSCHULE WILHELMSHAVEN OLDENBURG ELSFLETH',
  'KHB': 'KUNSTHOCHSCHULE BERLIN-WEISSENSEE',
  'KLU': 'KUEHNE LOGISTICS UNIVERSITY',
  'KSH': 'KATHOLISCHE STIFTUNGSHOCHSCHULE MUENCHEN',
  'PH KA': 'PAEDAGOGISCHE HOCHSCHULE KARLSRUHE',
  'PHL': 'PAEDAGOGISCHE HOCHSCHULE LUDWIGSBURG',
  'RSH': 'ROBERT SCHUMANN HOCHSCHULE DUESSELDORF',
  'THB': 'TECHNISCHE HOCHSCHULE BRANDENBURG',
  'THWS': 'TECHNISCHE HOCHSCHULE WUERZBURG-SCHWEINFURT',
  'UWH': 'UNIVERSITAET WITTEN HERDECKE',
  'WHU': 'WHU OTTO BEISHEIM SCHOOL OF MANAGEMENT',
  'WHZ': 'WESTSAECHSISCHE HOCHSCHULE ZWICKAU',
  'ZU': 'ZEPPELIN UNIVERSITAET',
  'EHD': 'EVANGELISCHE HOCHSCHULE DARMSTADT',
  'HSRW': 'HOCHSCHULE RHEIN-WAAL',
  'Georg-August-Universität Göttingen': 'UNIVERSITAET GOETTINGEN',
  'Georg-August-Universität Göttingen Stiftung Öffentlichen Rechts': 'UNIVERSITAET GOETTINGEN',
  'GEORG-AUGUST-UNIVERSITAT GOTTINGEN STIFTUNG OFFENTLICHEN RECHTS': 'UNIVERSITAET GOETTINGEN',
  'GEORG-AUGUST-UNIVERSITAT GOTTINGENSTIFTUNG OFFENTLICHEN RECHTS': 'UNIVERSITAET GOETTINGEN',
  'GEORG-AUGUST-UNIVERSITAET GOETTINGEN STIFTUNG OEFFENTLICHEN RECHTS': 'UNIVERSITAET GOETTINGEN',
  'JOHANN WOLFGANG GOETHE-UNIVERSITAT FRANKFURT AM MAIN': 'JOHANN WOLFGANG GOETHE-UNIVERSITAET FRANKFURT AM MAIN',
  'JOHANN WOLFGANG GOETHE-UNIVERSITATFRANKFURT AM MAIN': 'JOHANN WOLFGANG GOETHE-UNIVERSITAET FRANKFURT AM MAIN',
  'STIFTUNG EUROPA-UNIVERSITAT VIADRINA FRANKFURT (ODER)': 'EUROPA-UNIVERSITAET VIADRINA FRANKFURT (ODER)',
};

function resolveOrgName(orgName) {
  return ORG_NAME_MERGES[orgName] || orgName;
}

// Maps non-canonical university IDs (caused by inconsistent umlaut spelling
// across EU data years) to their canonical form.
const UNI_ID_CANONICALIZE = {
  'BRANDENBURGISCHE_TECHNISCHE_UNIVERSITAT_COTTBUS_SENFTENBERG': 'BRANDENBURGISCHE_TECHNISCHE_UNIVERSITAET_COTTBUS_SENFTENBERG',
  'DEUTSCHE_SPORTHOCHSCHULE_KOLN': 'DEUTSCHE_SPORTHOCHSCHULE_KOELN',
  'EUROPA_UNIVERSITAT_FLENSBURG': 'EUROPA_UNIVERSITAET_FLENSBURG',
  'FRIEDRICH_SCHILLER_UNIVERSITAT_JENA': 'FRIEDRICH_SCHILLER_UNIVERSITAET_JENA',
  'HOCHSCHULE_DUSSELDORF': 'HOCHSCHULE_DUESSELDORF',
  'HOCHSCHULE_FUR_BILDENDE_KUNSTE_DRESDEN': 'HOCHSCHULE_FUER_BILDENDE_KUENSTE_DRESDEN',
  'HOCHSCHULE_FUR_DEN_OFFENTLICHEN_DIENST_IN_BAYERN': 'HOCHSCHULE_FUER_DEN_OEFFENTLICHEN_DIENST_IN_BAYERN',
  'HOCHSCHULE_FUR_OFFENTLICHE_VERWALTUNG_KEHL': 'HOCHSCHULE_FUER_OEFFENTLICHE_VERWALTUNG_KEHL',
  'HOCHSCHULE_FUR_WIRTSCHAFT_UND_RECHT_BERLIN': 'HOCHSCHULE_FUER_WIRTSCHAFT_UND_RECHT_BERLIN',
  'JOHANNES_GUTENBERG_UNIVERSITAT_MAINZ': 'JOHANNES_GUTENBERG_UNIVERSITAET_MAINZ',
  'JULIUS_MAXIMILIANS_UNIVERSITAT_WURZBURG': 'JULIUS_MAXIMILIANS_UNIVERSITAET_WUERZBURG',
  'KATHOLISCHE_UNIVERSITAT_EICHSTATT_INGOLSTADT': 'KATHOLISCHE_UNIVERSITAET_EICHSTAETT_INGOLSTADT',
  'LEUPHANA_UNIVERSITAT_LUNEBURG': 'LEUPHANA_UNIVERSITAET_LUENEBURG',
  'PADAGOGISCHE_HOCHSCHULE_HEIDELBERG': 'PAEDAGOGISCHE_HOCHSCHULE_HEIDELBERG',
  'PADAGOGISCHE_HOCHSCHULE_LUDWIGSBURG': 'PAEDAGOGISCHE_HOCHSCHULE_LUDWIGSBURG',
  'STIFTUNG_UNIVERSITAT_HILDESHEIM': 'STIFTUNG_UNIVERSITAET_HILDESHEIM',
  'TECHNISCHE_UNIVERSITAT_BERLIN': 'TECHNISCHE_UNIVERSITAET_BERLIN',
  'UNIVERSITAT_DER_KUNSTE_BERLIN': 'UNIVERSITAET_DER_KUENSTE_BERLIN',
  'UNIVERSITAT_KONSTANZ': 'UNIVERSITAET_KONSTANZ',
  'UNIVERSITAT_PASSAU': 'UNIVERSITAET_PASSAU',
  'UNIVERSITAT_ZU_LUBECK': 'UNIVERSITAET_ZU_LUEBECK',
  'STIFTUNG_EUROPA_UNIVERSITAT_VIADRINA_FRANKFURT_ODER': 'EUROPA_UNIVERSITAET_VIADRINA_FRANKFURT_ODER',
  'HOCHSCHULE_FUR_ANGEWANDTE_WISSENSCHAFTEN_FACHHOCHSCHULE_ANSB': 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_ANSBACH',
  'HOCHSCHULE_FUR_ANGEWANDTE_WISSENSCHAFTEN_FACHHOCHSCHULE_LAND': 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_LANDSHUT',
  'HOCHSCHULE_FUR_MUSIK_UND_THEATER_FELIX_MENDELSSOHN_BARTHOLDY': 'HOCHSCHULE_FUER_MUSIK_UND_THEATER_FELIX_MENDELSSOHN_BARTHOLD',
  'HMKW_HOCHSCHULE_FUR_MEDIEN_KOMMUNIKATION_UND_WIRTSCHAFT_GMBH': 'HMKW_HOCHSCHULE_FUER_MEDIEN_KOMMUNIKATION_UND_WIRTSCHAFT',
  'HAWK_HOCHSCHULE_FUR_ANGEWANDTE_WISSENSCHAFT_UND_KUNST_FACHHO': 'HAWK_HOCHSCHULE_HILDESHEIMHOLZMINDENGOETTINGEN',
  'HELMUT_SCHMIDT_UNIVERSITAT_UNIVERSITAT_DER_BUNDESWEHR_HAMBUR': 'HELMUT_SCHMIDT_UNIVERSITAET_UNIVERSITAET_DER_BUNDESWEHR_HAMB',
  'UNIVERSITE_DE_SCIENCES_ADMINISTRATIVES_APPLIQUEES_DE_KEHL_HS': 'HOCHSCHULE_FUER_OEFFENTLICHE_VERWALTUNG_KEHL',
  'GEORG_AUGUST_UNIVERSITAET_GOETTINGEN_STIFTUNG_OEFFENTLICHEN_': 'UNIVERSITAET_GOETTINGEN',
  'FREMDSPRACHENINSTITUT_LHM': 'FREMDSPRACHENINSTITUT_LHM_FACHAKADEMIE_FUER_UEBERSETZEN_UND_',
  'HAMBURG_SCHOOL_OF_BUSINESS_ADMINISTRATION': 'HAMBURG_SCHOOL_OF_BUSINESS_ADMINISTRATION_GGMBH',
  'HERTIE_SCHOOL_OF_GOVERNANCE_GEMMEINNUTZIGE_GMBH': 'HERTIE_SCHOOL_OF_GOVERNANCE_GGMBH',
  'HERTIE_SCHOOL_GEMEINNUETZIGE_GMBH': 'HERTIE_SCHOOL_OF_GOVERNANCE_GGMBH',
  'HOCHSCHULE_DER_WIRTSCHAFT_FUER_MANAGEMENT': 'HOCHSCHULE_DER_WIRTSCHAFT_FUER_MANAGEMENT_GGMBH',
  'HOCHSCHULE_FUER_PHILOSOPHIE_MUENCHEN_PHILOSOPHISCHE_FAKULTAE': 'HOCHSCHULE_FUER_PHILOSOPHIE_MUENCHEN',
  'ISM_INTERNATIONAL_SCHOOL_OF_MANAGEMENT': 'ISM_INTERNATIONAL_SCHOOL_OF_MANAGEMENT_GMBH_GEMEINNUETZIGE_G',
  'JADE_HOCHSCHULE_WILHELMSHAVENOLDENBURGELSFLETH': 'JADE_HOCHSCHULE_WILHELMSHAVEN_OLDENBURG_ELSFLETH',
  'KATHOLISCHE_HOCHSCHULE_FREIBURG_GGMBH': 'KATHOLISCHE_HOCHSCHULE_FREIBURG',
  'KATHOLISCHE_HOCHSCHULE_FUER_SOZIALWESEN': 'KATHOLISCHE_HOCHSCHULE_FUER_SOZIALWESEN_BERLIN_KHSB',
  'KATHOLISCHE_STIFTUNGSHOCHSCHULE_MUENCHEN_HOCHSCHULE_FUER_ANG': 'KATHOLISCHE_STIFTUNGSHOCHSCHULE_MUENCHEN',
  'KUNSTHOCHSCHULE_BERLIN_WEISSENSEE_HOCHSCHULE_FUER_GESTALTUNG': 'KUNSTHOCHSCHULE_BERLIN_WEISSENSEE',
  'MSB_MEDICAL_SCHOOL_BERLIN_GMBH': 'MSB_MEDICAL_SCHOOL_BERLIN',
  'FACHHOCHSCHULE_DRESDEN_PRIVATE_FACHHOCHSCHULE_GEMEINNUETZIGE_': 'FACHHOCHSCHULE_DRESDEN_PRIVATE_FACHHOCHSCHULE_GMBH',
  'FACHHOCHSCHULE_DER_WIRTSCHAFT': 'FACHHOCHSCHULE_DER_WIRTSCHAFT_NORDRHEIN_WESTFALEN_GGMBH',
  'HOCHSCHULEN_FRESENIUS_GEMEINNUETZIGE_TRAEGERGESELLSCHAFT_MBH': 'HOCHSCHULE_FRESENIUS_GEMEINNUETZIGEGMBH',
  'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_HAMBURG': 'HAW_HAMBURG',
};

function normalizeUniId(orgName) {
  let name = orgName
    .replace(/[^a-zA-ZäöüÄÖÜß\s-]/g, '')
    .trim()
    .toUpperCase()
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .replace(/ß/g, 'SS')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_');

  // Fix ASCII-only umlauts from newer EU data (2023+) where ü→u, ö→o
  name = name
    .replace(/_FUR_/g, '_FUER_')
    .replace(/MUNCHEN/g, 'MUENCHEN')
    .replace(/WURTTEMBERG/g, 'WUERTTEMBERG')
    .replace(/(?:^|_)KOLN(?:_|$)/g, (m) => m.replace('KOLN', 'KOELN'))
    .replace(/OFFENTLICH/g, 'OEFFENTLICH')
    .replace(/GEMEINNUTZIG/g, 'GEMEINNUETZIG')
    .replace(/NURNBERG/g, 'NUERNBERG')
    .replace(/LUBECK/g, 'LUEBECK')
    .replace(/TUBINGEN/g, 'TUEBINGEN')
    .replace(/GOTTINGEN/g, 'GOETTINGEN')
    .replace(/WURZBURG/g, 'WUERZBURG')
    .replace(/LUNEBURG/g, 'LUENEBURG')
    .replace(/DUSSELDORF/g, 'DUESSELDORF')
    .replace(/OSNABRUCK/g, 'OSNABRUECK')
    .replace(/SAARBRUCKEN/g, 'SAARBRUECKEN');

  if (name.length > 60) {
    name = name.substring(0, 60);
  }

  return UNI_ID_CANONICALIZE[name] || name;
}

function normalizeCountryName(rawCountry) {
  if (!rawCountry) return '';
  const parts = rawCountry.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawCountry.trim();
}

function normalizeCity(rawCity) {
  if (!rawCity || rawCity === '-') return '';
  return rawCity
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function generatePartnerId(germanUniId, partnerName, field) {
  const crypto = require('crypto');
  const hash = crypto
    .createHash('md5')
    .update(`${germanUniId}|${partnerName}|${field}`)
    .digest('hex')
    .substring(0, 10);
  return `${germanUniId.substring(0, 20)}_${hash}`;
}

// ── Cost index calculation ──

const COUNTRY_COST_INDEX = {
  'Denmark': 1200, 'Norway': 1300, 'Sweden': 1100, 'Finland': 1000,
  'Switzerland': 1500, 'Iceland': 1200, 'Ireland': 1100, 'Luxembourg': 1100,
  'Netherlands': 1000, 'Austria': 900, 'Belgium': 900, 'France': 1000,
  'United Kingdom': 1100, 'Italy': 850, 'Spain': 800, 'Portugal': 700,
  'Greece': 650, 'Malta': 750, 'Cyprus': 750, 'Slovenia': 700,
  'Czech Republic': 600, 'Czechia': 600, 'Estonia': 650, 'Latvia': 600,
  'Lithuania': 550, 'Poland': 550, 'Slovakia': 550, 'Hungary': 500,
  'Croatia': 600, 'Romania': 450, 'Bulgaria': 400, 'Turkey': 400,
  'Serbia': 400, 'North Macedonia': 350,
};

function getCostIndex(city, country) {
  return COUNTRY_COST_INDEX[country] || 750;
}

// ── Main processing ──

function getActivityType(activity) {
  if (!activity) return 'study';
  return activity.includes('SMT') || activity.toLowerCase().includes('traineeship')
    ? 'traineeship' : 'study';
}

function extractYearFromFilename(filePath) {
  const basename = path.basename(filePath);
  const match = basename.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

async function processFile(filePath, partnerships) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
  const fileYear = extractYearFromFilename(filePath);

  let rowCount = 0;
  let matchCount = 0;
  let headers = null;

  const COL = {};

  return new Promise((resolve, reject) => {
    workbook.on('worksheet', (worksheet) => {
      worksheet.on('row', (row) => {
        rowCount++;
        const vals = row.values.slice(1);

        if (rowCount === 1) {
          headers = vals.map(String);
          headers.forEach((h, i) => {
            if (h === 'Sending Country') COL.sendCountry = i;
            if (h === 'Sending City') COL.sendCity = i;
            if (h === 'Sending Organization') COL.sendOrg = i;
            if (h === 'Receiving Country') COL.recvCountry = i;
            if (h === 'Receiving City') COL.recvCity = i;
            if (h === 'Receiving Organization') COL.recvOrg = i;
            if (h === 'Field') COL.field = i;
            if (h === 'Field of Education') COL.fieldOfEd = i;
            if (h === 'Activity (mob)') COL.activity = i;
            if (h === 'Participant Profile') COL.profile = i;
          });
          return;
        }

        const sendCountry = String(vals[COL.sendCountry] || '');
        if (!sendCountry.startsWith('DE')) return;

        const field = String(vals[COL.field] || '');
        if (field !== 'Higher Education') return;

        const activity = String(vals[COL.activity] || '');
        if (!isStudentMobility(activity)) return;

        const sendOrg = String(vals[COL.sendOrg] || '').trim();
        const recvOrg = String(vals[COL.recvOrg] || '').trim();
        if (!sendOrg || sendOrg === '-' || !recvOrg || recvOrg === '-') return;

        const sendCity = String(vals[COL.sendCity] || '').trim();
        const recvCity = String(vals[COL.recvCity] || '').trim();
        const recvCountry = normalizeCountryName(String(vals[COL.recvCountry] || ''));
        const fieldOfEd = String(vals[COL.fieldOfEd] || '');
        const actType = getActivityType(activity);

        const key = `${sendOrg}|||${recvOrg}|||${fieldOfEd}`;

        if (!partnerships.has(key)) {
          partnerships.set(key, {
            sendOrg,
            sendCity: normalizeCity(sendCity),
            recvOrg,
            recvCity: normalizeCity(recvCity),
            recvCountry,
            fieldOfEd,
            count: 0,
            activityType: actType,
            lastYear: fileYear || 0,
          });
        }

        const existing = partnerships.get(key);
        existing.count++;
        if (fileYear && fileYear > (existing.lastYear || 0)) {
          existing.lastYear = fileYear;
        }
        // If any record is 'study', prefer that over 'traineeship'
        if (actType === 'study') {
          existing.activityType = 'study';
        }
        matchCount++;
      });
    });

    workbook.on('end', () => {
      console.log(`  Rows: ${rowCount.toLocaleString()}, German HE student matches: ${matchCount.toLocaleString()} (year: ${fileYear || '?'})`);
      resolve();
    });

    workbook.on('error', (err) => reject(err));
    workbook.read();
  });
}

async function main() {
  console.log('=== Erasmus+ Data Transformer ===\n');

  const manifestPath = path.join(RAW_DIR, 'manifest.json');
  let files;
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    files = manifest.files.map((f) => f.path);
  } else {
    const xlsxFiles = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.xlsx') && f.includes('KA1'));
    files = xlsxFiles.map((f) => path.join(RAW_DIR, f));
  }

  if (files.length === 0) {
    console.error('No XLSX files found. Run download-erasmus-data.js first.');
    process.exit(1);
  }

  console.log(`Processing ${files.length} file(s)...\n`);

  const partnerships = new Map();

  for (const file of files) {
    const basename = path.basename(file);
    console.log(`Processing ${basename}...`);
    try {
      await processFile(file, partnerships);
    } catch (err) {
      console.error(`  ERROR processing ${basename}: ${err.message}`);
    }
  }

  console.log(`\nTotal unique partnerships: ${partnerships.size.toLocaleString()}`);

  // ── Group by German university (with merge resolution) ──

  const uniMap = new Map();

  for (const [, p] of partnerships) {
    const resolvedOrg = resolveOrgName(p.sendOrg);
    const uniId = normalizeUniId(resolvedOrg);
    if (!uniMap.has(uniId)) {
      uniMap.set(uniId, {
        name: resolvedOrg,
        city: p.sendCity,
        partners: [],
      });
    }

    const subject = mapFieldOfEducation(p.fieldOfEd);
    const partnerId = generatePartnerId(uniId, p.recvOrg, subject);

    uniMap.get(uniId).partners.push({
      id: partnerId,
      partner_uni_name: p.recvOrg,
      partner_city: p.recvCity || 'Unknown',
      partner_country: p.recvCountry || 'Unknown',
      subject_area: subject,
      cost_index: getCostIndex(p.recvCity, p.recvCountry),
      activity_type: p.activityType || 'study',
      last_mobility_year: p.lastYear || null,
    });
  }

  // ── Deduplicate partners within each university ──
  // Multiple XLSX years may produce the same partnership; keep unique (partner_name + subject)

  for (const [uniId, uni] of uniMap) {
    const seen = new Set();
    const deduped = [];
    for (const partner of uni.partners) {
      const dedupKey = `${partner.partner_uni_name}|||${partner.subject_area}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        deduped.push(partner);
      }
    }
    uni.partners = deduped;
  }

  // ── Build output in ErasmusPartnerDatabase format ──

  const universities = {};
  for (const [uniId, uni] of [...uniMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    universities[uniId] = {
      name: uni.name,
      city: uni.city,
      partners: uni.partners,
    };
  }

  const database = { universities };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(database));

  // ── Generate uni ID mapping for the app ──
  // Maps canonical names, known abbreviations, AND English name variants to uni IDs.

  const ENGLISH_NAME_ALIASES = {
    'Technical University of Munich (TUM)': 'TECHNISCHE UNIVERSITAET MUENCHEN',
    'Ludwig Maximilian University of Munich (LMU)': 'LUDWIG-MAXIMILIANS-UNIVERSITAET MUENCHEN',
    'Heidelberg University': 'RUPRECHT-KARLS-UNIVERSITAET HEIDELBERG',
    'Humboldt University of Berlin': 'HUMBOLDT-UNIVERSITAET ZU BERLIN',
    'Free University of Berlin': 'FREIE UNIVERSITAET BERLIN',
    'Technical University of Berlin (TU Berlin)': 'TECHNISCHE UNIVERSITAET BERLIN',
    'University of Freiburg': 'ALBERT-LUDWIGS-UNIVERSITAET FREIBURG',
    'RWTH Aachen University': 'RHEINISCH-WESTFAELISCHE TECHNISCHE HOCHSCHULE AACHEN',
    'University of Tübingen': 'EBERHARD KARLS UNIVERSITAET TUEBINGEN',
    'University of Bonn': 'RHEINISCHE FRIEDRICH-WILHELMS-UNIVERSITAET BONN',
    'University of Göttingen': 'UNIVERSITAET GOETTINGEN',
    'Technical University of Darmstadt': 'TECHNISCHE UNIVERSITAT DARMSTADT',
    'University of Cologne': 'UNIVERSITAET ZU KOELN',
    'University of Münster': 'WESTFAELISCHE WILHELMS-UNIVERSITAET MUENSTER',
    'University of Würzburg': 'JULIUS-MAXIMILIANS-UNIVERSITAET WUERZBURG',
    'University of Konstanz': 'UNIVERSITAET KONSTANZ',
    'University of Mannheim': 'UNIVERSITAET MANNHEIM',
    'Technical University of Dresden': 'TECHNISCHE UNIVERSITAET DRESDEN',
    'University of Leipzig': 'UNIVERSITAET LEIPZIG',
    'University of Stuttgart': 'UNIVERSITAET STUTTGART',
    'University of Mainz': 'JOHANNES GUTENBERG-UNIVERSITAET MAINZ',
    'University of Kiel': 'CHRISTIAN-ALBRECHTS-UNIVERSITAET ZU KIEL',
    'University of Regensburg': 'UNIVERSITAET REGENSBURG',
    'University of Rostock': 'UNIVERSITAET ROSTOCK',
    'University of Jena': 'FRIEDRICH-SCHILLER-UNIVERSITAET JENA',
    'Friedrich Schiller University Jena': 'FRIEDRICH-SCHILLER-UNIVERSITAET JENA',
    'University of Marburg': 'PHILIPPS-UNIVERSITAET MARBURG',
    'Philipps University Marburg': 'PHILIPPS-UNIVERSITAET MARBURG',
    'University of Giessen': 'JUSTUS-LIEBIG-UNIVERSITAET GIESSEN',
    'Justus Liebig University Giessen': 'JUSTUS-LIEBIG-UNIVERSITAET GIESSEN',
    'University of Duisburg-Essen': 'UNIVERSITAET DUISBURG-ESSEN',
    'University of Bielefeld': 'UNIVERSITAET BIELEFELD',
    'University of Bremen': 'UNIVERSITAET BREMEN',
    'University of Oldenburg': 'CARL VON OSSIETZKY UNIVERSITAET OLDENBURG',
    'University of Osnabrück': 'UNIVERSITAET OSNABRUECK',
    'University of Potsdam': 'UNIVERSITAET POTSDAM',
    'University of Bayreuth': 'UNIVERSITAET BAYREUTH',
    'University of Bamberg': 'OTTO-FRIEDRICH-UNIVERSITAET BAMBERG',
    'University of Kassel': 'UNIVERSITAET KASSEL',
    'University of Koblenz-Landau': 'UNIVERSITAET KOBLENZ',
    'University of Greifswald': 'UNIVERSITAET GREIFSWALD',
    'University of Halle-Wittenberg': 'MARTIN-LUTHER-UNIVERSITAET HALLE-WITTENBERG',
    'Martin Luther University Halle-Wittenberg': 'MARTIN-LUTHER-UNIVERSITAET HALLE-WITTENBERG',
    'University of Erfurt': 'UNIVERSITAET ERFURT',
    'University of Lübeck': 'UNIVERSITAET ZU LUEBECK',
    'Technical University of Braunschweig': 'TECHNISCHE UNIVERSITAET BRAUNSCHWEIG',
    'Technical University of Dortmund': 'TECHNISCHE UNIVERSITAT DORTMUND',
    'Technical University of Kaiserslautern': 'TECHNISCHE UNIVERSITAET KAISERSLAUTERN',
    'Technical University of Chemnitz': 'TECHNISCHE UNIVERSITAET CHEMNITZ',
    'Leibniz University Hannover': 'GOTTFRIED WILHELM LEIBNIZ UNIVERSITAET HANNOVER',
    'Heinrich Heine University Düsseldorf': 'HEINRICH-HEINE-UNIVERSITAET DUESSELDORF',
    'Goethe University Frankfurt': 'JOHANN WOLFGANG GOETHE-UNIVERSITAET FRANKFURT AM MAIN',
    'University of Hohenheim': 'UNIVERSITAET HOHENHEIM',
    'University of Augsburg': 'UNIVERSITAET AUGSBURG',
    'University of Ulm': 'UNIVERSITAET ULM',
    'University of Hamburg': 'UNIVERSITAET HAMBURG',
    'University of Erlangen-Nuremberg (FAU)': 'FRIEDRICH-ALEXANDER-UNIVERSITAET ERLANGEN NUERNBERG',
    'Berlin School of Economics and Law': 'HOCHSCHULE FUER WIRTSCHAFT UND RECHT BERLIN',
    'Karlsruhe Institute of Technology (KIT)': 'KARLSRUHER INSTITUT FUER TECHNOLOGIE',
    'University of Passau': 'UNIVERSITAET PASSAU',
    'University of the Arts Berlin': 'UNIVERSITAET DER KUENSTE BERLIN',
    'Otto von Guericke University Magdeburg': 'OTTO-VON-GUERICKE-UNIVERSITAET MAGDEBURG',
    'Ruhr University Bochum': 'RUHR-UNIVERSITAET BOCHUM',
  };

  const uniMapping = {};
  for (const [uniId, uni] of uniMap) {
    uniMapping[uni.name] = uniId;
  }
  for (const [abbrev, canonical] of Object.entries(ORG_NAME_MERGES)) {
    const canonicalId = normalizeUniId(canonical);
    if (uniMap.has(canonicalId)) {
      uniMapping[abbrev] = canonicalId;
    }
  }
  for (const [englishName, euName] of Object.entries(ENGLISH_NAME_ALIASES)) {
    const euId = normalizeUniId(euName);
    if (uniMap.has(euId)) {
      uniMapping[englishName] = euId;
    }
  }
  fs.writeFileSync(UNI_MAPPING_PATH, JSON.stringify(uniMapping, null, 2));

  // ── Stats ──

  const totalPartners = [...uniMap.values()].reduce((sum, u) => sum + u.partners.length, 0);
  const allCountries = new Set();
  const allSubjects = new Set();
  let studyCount = 0;
  let traineeshipCount = 0;
  const yearCounts = {};
  for (const uni of uniMap.values()) {
    for (const p of uni.partners) {
      allCountries.add(p.partner_country);
      allSubjects.add(p.subject_area);
      if (p.activity_type === 'traineeship') traineeshipCount++;
      else studyCount++;
      if (p.last_mobility_year) {
        yearCounts[p.last_mobility_year] = (yearCounts[p.last_mobility_year] || 0) + 1;
      }
    }
  }

  console.log('\n=== Statistics ===');
  console.log(`German universities: ${uniMap.size}`);
  console.log(`Total partner entries: ${totalPartners.toLocaleString()}`);
  console.log(`  Study (SMS): ${studyCount.toLocaleString()}`);
  console.log(`  Traineeship (SMT): ${traineeshipCount.toLocaleString()}`);
  console.log(`Unique destination countries: ${allCountries.size}`);
  console.log(`Subject areas: ${allSubjects.size}`);
  console.log(`Last mobility year distribution:`);
  for (const [year, count] of Object.entries(yearCounts).sort()) {
    console.log(`  ${year}: ${count.toLocaleString()} partners`);
  }
  console.log(`\nTop 15 universities by partner count:`);

  const sorted = [...uniMap.entries()]
    .sort((a, b) => b[1].partners.length - a[1].partners.length)
    .slice(0, 15);
  for (const [id, uni] of sorted) {
    console.log(`  ${uni.name}: ${uni.partners.length} partners`);
  }

  console.log(`\nOutput: ${OUTPUT_PATH}`);
  console.log(`Mapping: ${UNI_MAPPING_PATH}`);

  const fileSizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`File size: ${fileSizeMB} MB`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
