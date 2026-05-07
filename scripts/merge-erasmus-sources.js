#!/usr/bin/env node

/**
 * Cross-Validation & Merge Script
 *
 * Merges EU Open Data (historical mobilities) with MoveOn portal data
 * (current agreements). Assigns confidence scores to each partnership.
 *
 * Uses token-based Jaccard matching (word-level) instead of character-level
 * Levenshtein distance, plus an alias table for known name variants.
 *
 * Output: data/erasmus_partners.json (overwritten with enriched data)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EU_DATA_PATH = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const MOVEON_DIR = path.join(__dirname, '..', 'data', 'moveon');
const OUTPUT_PATH = EU_DATA_PATH;
const COUNTRY_MAP_PATH = path.join(__dirname, '..', 'data', 'country-translations.json');

// ── Alias table for universities with completely different names ──
const UNI_ALIASES = {
  'sciences po': 'institut detudes politiques',
  'sciences po paris': 'institut detudes politiques de paris',
  'sciences po lyon': 'institut detudes politiques de lyon',
  'sciences po bordeaux': 'institut detudes politiques de bordeaux',
  'sciences po grenoble': 'institut detudes politiques de grenoble',
  'sciences po lille': 'institut detudes politiques de lille',
  'sciences po strasbourg': 'institut detudes politiques de strasbourg',
  'sciences po toulouse': 'institut detudes politiques de toulouse',
  'sciences po rennes': 'institut detudes politiques de rennes',
  'sciences po aix': 'institut detudes politiques daix en provence',
  'eth zurich': 'eidgenossische technische hochschule zurich',
  'eth zuerich': 'eidgenossische technische hochschule zurich',
  'epfl': 'ecole polytechnique federale de lausanne',
  'mit': 'massachusetts institute of technology',
  'ucl': 'university college london',
  'lse': 'london school of economics and political science',
  'soas': 'school of oriental and african studies',
  'kcl': 'kings college london',
  'imperial college': 'imperial college london',
  'durham university': 'university of durham',
  'newcastle university': 'university of newcastle',
  'warwick university': 'university of warwick',
  'exeter university': 'university of exeter',
  'bath university': 'university of bath',
  'york university': 'university of york',
  'lancaster university': 'university of lancaster',
  'sussex university': 'university of sussex',
  'essex university': 'university of essex',
  'oxford brookes': 'oxford brookes university',
  'sapienza': 'sapienza universita di roma',
  'la sapienza': 'sapienza universita di roma',
  'bocconi': 'universita commerciale luigi bocconi',
  'politecnico di milano': 'politecnico di milano',
  'polimi': 'politecnico di milano',
  'politecnico di torino': 'politecnico di torino',
  'polito': 'politecnico di torino',
  'sorbonne': 'sorbonne universite',
  'sorbonne university': 'sorbonne universite',
  'paris saclay': 'universite paris saclay',
  'universite psl': 'universite paris sciences et lettres',
  'psl university': 'universite paris sciences et lettres',
  'ecole normale superieure paris': 'ecole normale superieure',
  'ens paris': 'ecole normale superieure',
  'ens lyon': 'ecole normale superieure de lyon',
  'hec paris': 'hec paris',
  'essec': 'essec business school',
  'ku leuven': 'katholieke universiteit leuven',
  'vub': 'vrije universiteit brussel',
  'ulb': 'universite libre de bruxelles',
  'uclouvain': 'universite catholique de louvain',
  'uva': 'universiteit van amsterdam',
  'vu amsterdam': 'vrije universiteit amsterdam',
  'vu': 'vrije universiteit amsterdam',
  'tue': 'technische universiteit eindhoven',
  'ut': 'universiteit twente',
  'rug': 'rijksuniversiteit groningen',
  'uu': 'universiteit utrecht',
  'wur': 'wageningen university',
  'kth': 'kungliga tekniska hogskolan',
  'kth royal institute': 'kungliga tekniska hogskolan',
  'chalmers': 'chalmers tekniska hogskola',
  'dtu': 'danmarks tekniske universitet',
  'aalto': 'aalto yliopisto',
  'aalto university': 'aalto yliopisto',
  'ntnu': 'norges teknisk naturvitenskapelige universitet',
  'uio': 'universitetet i oslo',
  'uib': 'universitetet i bergen',
  'helsinki university': 'helsingin yliopisto',
  'university of helsinki': 'helsingin yliopisto',
  'charles university': 'univerzita karlova',
  'cuni': 'univerzita karlova',
  'elte': 'eotvos lorand tudomanyegyetem',
  'jagiellonian university': 'uniwersytet jagiellonski w krakowie',
  'uw warsaw': 'uniwersytet warszawski',
  'university of warsaw': 'uniwersytet warszawski',
  'university of vienna': 'universitat wien',
  'tu wien': 'technische universitat wien',
  'uzh': 'universitat zurich',
  'university of zurich': 'universitat zurich',
  'unibas': 'universitat basel',
  'university of basel': 'universitat basel',
  'university of bern': 'universitat bern',
  'unibe': 'universitat bern',
  'unil': 'universite de lausanne',
  'unige': 'universite de geneve',
  'universidade de lisboa': 'universidade de lisboa',
  'university of lisbon': 'universidade de lisboa',
  'universidade do porto': 'universidade do porto',
  'university of porto': 'universidade do porto',
  'uc3m': 'universidad carlos iii de madrid',
  'uam': 'universidad autonoma de madrid',
  'uab': 'universitat autonoma de barcelona',
  'ub': 'universitat de barcelona',
  'upf': 'universitat pompeu fabra',
  'complutense': 'universidad complutense de madrid',
  'ucm': 'universidad complutense de madrid',
};

// Stopwords to remove from tokens (articles, prepositions)
const STOPWORDS = new Set([
  'de', 'di', 'du', 'da', 'do', 'des', 'del', 'della', 'der', 'die', 'das',
  'the', 'of', 'and', 'und', 'et', 'en', 'le', 'la', 'les', 'el', 'los',
  'van', 'von', 'zu', 'zur', 'zum', 'fur', 'fuer', 'for', 'per', 'in', 'im',
  'sur', 'aux',
]);

function normalizeForMatch(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(name) {
  return normalizeForMatch(name)
    .split(' ')
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function resolveAlias(name) {
  const n = normalizeForMatch(name);
  return UNI_ALIASES[n] || n;
}

function tokenMatch(name1, name2) {
  const resolved1 = resolveAlias(name1);
  const resolved2 = resolveAlias(name2);

  if (resolved1 === resolved2) return 1.0;

  const tokens1 = new Set(getTokens(resolved1));
  const tokens2 = new Set(getTokens(resolved2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = intersection / union;

  const n1 = normalizeForMatch(resolved1);
  const n2 = normalizeForMatch(resolved2);
  const substringScore = (n1.includes(n2) || n2.includes(n1)) ? 0.85 : 0;

  // Weighted token overlap: what fraction of the SMALLER set is covered?
  const minSize = Math.min(tokens1.size, tokens2.size);
  const coverage = minSize > 0 ? intersection / minSize : 0;

  return Math.max(jaccard, substringScore, coverage * 0.9);
}

function loadCountryMap() {
  if (fs.existsSync(COUNTRY_MAP_PATH)) {
    return JSON.parse(fs.readFileSync(COUNTRY_MAP_PATH, 'utf-8'));
  }
  return {};
}

function translateCountry(germanName, countryMap) {
  if (!germanName) return 'Unknown';
  if (countryMap[germanName]) return countryMap[germanName];
  const lower = germanName.toLowerCase();
  for (const [de, en] of Object.entries(countryMap)) {
    if (de.toLowerCase() === lower) return en;
  }
  return germanName;
}

function generatePartnerId(germanUniId, partnerName, field) {
  const hash = crypto
    .createHash('md5')
    .update(`${germanUniId}|${partnerName}|${field}`)
    .digest('hex')
    .substring(0, 10);
  return `${germanUniId.substring(0, 20)}_${hash}`;
}

// Same canonicalization map as in transform-erasmus-data.js
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
  'HOCHSCHULE_ZITTAU_GOERLITZ': 'HOCHSCHULE_ZITTAUGOERLITZ',
};

function canonicalizeUniId(id) {
  return UNI_ID_CANONICALIZE[id] || id;
}

/** Erasmus codes from Mobility Online discovery → canonical university IDs */
const ERASMUS_CODE_TO_UNI = {
  AALEN01: 'HOCHSCHULE_AALEN_TECHNIK_UND_WIRTSCHAFT',
  BIELEFE02: 'FACHHOCHSCHULE_BIELEFELD',
  BREMEN04: 'HOCHSCHULE_BREMEN',
  CHEMNIT01: 'TECHNISCHE_UNIVERSITAET_CHEMNITZ',
  DARMSTA03: 'HOCHSCHULE_DARMSTADT',
  DORTMUN02: 'FACHHOCHSCHULE_DORTMUND',
  DRESDEN13: 'HOCHSCHULE_FUER_TECHNIK_UND_WIRTSCHAFT_DRESDEN',
  DUSSELD03: 'HOCHSCHULE_DUESSELDORF',
  FLENSBU02: 'EUROPA_UNIVERSITAET_FLENSBURG',
  FRANKFU01: 'JOHANN_WOLFGANG_GOETHE_UNIVERSITAET_FRANKFURT_AM_MAIN',
  FRANKFU07: 'FRANKFURT_UNIVERSITY_OF_APPLIED_SCIENCES',
  FREIBUR04: 'EVANGELISCHE_HOCHSCHULE_FREIBURG',
  FRIEDRI01: 'FRIEDRICH_SCHILLER_UNIVERSITAET_JENA',
  HAMBURG03: 'HAW_HAMBURG',
  HAMBURG06: 'HOCHSCHULE_FUER_MUSIK_UND_THEATER_HAMBURG',
  HAMBURG12: 'HSBA_HAMBURG_SCHOOL_OF_BUSINESS_ADMINISTRATION',
  HAMBURG19: 'KUEHNE_LOGISTICS_UNIVERSITY',
  KARLSRU05: 'HOCHSCHULE_KARLSRUHE',
  KEMPTEN01: 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_KEMPTEN',
  KIEL03: 'FACHHOCHSCHULE_KIEL',
  KREFELD01: 'HOCHSCHULE_NIEDERRHEIN',
  LANDSHU01: 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_LANDSHUT',
  LEIPZIG02: 'HOCHSCHULE_FUER_TECHNIK_WIRTSCHAFT_UND_KULTUR_LEIPZIG',
  MAGDEBU04: 'HOCHSCHULE_MAGDEBURG_STENDAL',
  MAINZ08: 'JOHANNES_GUTENBERG_UNIVERSITAET_MAINZ',
  MANNHEI03: 'HOCHSCHULE_MANNHEIM',
  MULHEIM01: 'HOCHSCHULE_RUHR_WEST',
  MUNCHEN04: 'HOCHSCHULE_FUER_ANGEWANDTE_WISSENSCHAFTEN_MUENCHEN',
  NORDHAU01: 'NORDHAUSEN_UNIVERSITY_OF_APPLIED_SCIENCES',
  OFFENBU01: 'HOCHSCHULE_FUER_GESTALTUNG_OFFENBACH_AM_MAIN',
  OSNABRU02: 'HOCHSCHULE_OSNABRUECK',
  PFORZHE01: 'HOCHSCHULE_PFORZHEIM',
  ROSTOCK01: 'UNIVERSITAET_ROSTOCK',
  STUTTGA04: 'HOCHSCHULE_FUER_TECHNIK_STUTTGART',
  ULM01: 'UNIVERSITAET_ULM',
  WIESBAD01: 'HOCHSCHULE_RHEIN_MAIN',
  ZITTAU01: 'HOCHSCHULE_ZITTAU_GOERLITZ',
  BERLIN04: 'TECHNISCHE_UNIVERSITAET_BERLIN',
  ISERLOH01: 'FACHHOCHSCHULE_SUDESTFALEN',
};

// Phase 4: Merge partners from multiple MoveOn files for same university (e.g. unikoeln + uni-koeln-faculties)
function mergePartnersByName(partners) {
  const byKey = new Map();
  for (const p of partners) {
    const key = (p.partner_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      if (p.faculty_department && (!existing.faculty_department || !existing.faculty_department.includes(p.faculty_department))) {
        existing.faculty_department = [existing.faculty_department, p.faculty_department].filter(Boolean).join('|| ');
      }
    } else {
      byKey.set(key, { ...p });
    }
  }
  return Array.from(byKey.values());
}

function loadMoveOnData() {
  const moveOnByUni = new Map();
  if (!fs.existsSync(MOVEON_DIR)) return moveOnByUni;

  const files = fs.readdirSync(MOVEON_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(MOVEON_DIR, file), 'utf-8'));
      if (!data.university_id || !data.partners || data.partners.length === 0) continue;

      let resolvedId = data.university_id;
      if (ERASMUS_CODE_TO_UNI[resolvedId]) {
        resolvedId = ERASMUS_CODE_TO_UNI[resolvedId];
        if (data.university_name === 'Mobility-Online Portal') {
          data.university_name = resolvedId.replace(/_/g, ' ');
        }
      }
      const canonId = canonicalizeUniId(resolvedId);
      data.university_id = canonId;

      const existing = moveOnByUni.get(canonId);
      if (existing) {
        const merged = mergePartnersByName([...existing.partners, ...data.partners]);
        existing.partners = merged;
        existing.partner_count = merged.length;
      } else {
        moveOnByUni.set(canonId, data);
      }
    } catch (e) { /* skip corrupt files */ }
  }

  return moveOnByUni;
}

function matchMoveOnToEuUni(moveOnUniId, moveOnUniName, euUniIds, euDb) {
  if (euDb.universities[moveOnUniId]) return moveOnUniId;

  let bestMatch = null;
  let bestScore = 0;

  for (const euId of euUniIds) {
    const euUni = euDb.universities[euId];
    const score = tokenMatch(moveOnUniName, euUni.name);
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = euId;
    }
  }

  return bestMatch;
}

function matchPartnerByName(moveonPartner, euPartners) {
  let bestMatch = null;
  let bestScore = 0;

  for (const euPartner of euPartners) {
    const score = tokenMatch(moveonPartner.partner_name, euPartner.partner_uni_name);
    if (score > bestScore && score > 0.45) {
      bestScore = score;
      bestMatch = euPartner;
    }
  }

  return bestScore >= 0.45 ? { partner: bestMatch, score: bestScore } : null;
}

// Phase 6: Dynamic confidence from year (currentYear - 2 = likely_active)
function confidenceFromYear(lastYear) {
  if (!lastYear) return 'historical';
  const currentYear = new Date().getFullYear();
  if (lastYear >= currentYear - 2) return 'likely_active';
  if (lastYear >= currentYear - 4) return 'possibly_active';
  return 'historical';
}

async function main() {
  console.log('=== Cross-Validation & Merge ===\n');

  const euDb = JSON.parse(fs.readFileSync(EU_DATA_PATH, 'utf-8'));
  const euUniIds = Object.keys(euDb.universities);
  console.log(`EU data: ${euUniIds.length} universities`);

  const moveOnByUni = loadMoveOnData();
  console.log(`MoveOn data: ${moveOnByUni.size} universities with scraped data`);

  const countryMap = loadCountryMap();
  const countryMapEntries = Object.keys(countryMap).length;
  console.log(`Country translations: ${countryMapEntries} entries\n`);

  let stats = {
    verified_active: 0,
    moveon_only: 0,
    likely_active: 0,
    possibly_active: 0,
    historical: 0,
    traineeship: 0,
    moveon_unis_matched: 0,
    moveon_unis_unmatched: 0,
    new_partners_added: 0,
    countries_translated: 0,
  };

  // Step 1: Assign confidence to all existing EU partners based on last_mobility_year
  for (const uniId of euUniIds) {
    const uni = euDb.universities[uniId];
    for (const partner of uni.partners) {
      partner.source = partner.source || 'eu_opendata';
      if (partner.activity_type === 'traineeship') {
        partner.confidence = 'traineeship';
      } else if (!partner.confidence || partner.confidence === 'likely_active') {
        partner.confidence = confidenceFromYear(partner.last_mobility_year);
      }
    }
  }

  // Step 2: Cross-validate with MoveOn data
  for (const [moveOnUniId, moveOnData] of moveOnByUni) {
    const euUniId = matchMoveOnToEuUni(moveOnUniId, moveOnData.university_name, euUniIds, euDb);

    if (!euUniId) {
      stats.moveon_unis_unmatched++;
      console.log(`  UNMATCHED MoveOn uni: ${moveOnData.university_name}`);
      continue;
    }

    stats.moveon_unis_matched++;
    const euUni = euDb.universities[euUniId];
    const euPartners = euUni.partners;
    const verifiedAt = moveOnData.scraped_at;

    let uniMatched = 0;
    let uniNew = 0;

    for (const moPartner of moveOnData.partners) {
      const match = matchPartnerByName(moPartner, euPartners);

      // Translate MoveOn country name (German -> English)
      const translatedCountry = translateCountry(moPartner.country, countryMap);
      const wasTranslated = translatedCountry !== moPartner.country;
      if (wasTranslated) stats.countries_translated++;

      if (match) {
        const euPartner = match.partner;
        euPartner.source = 'both';
        euPartner.confidence = 'verified_active';
        euPartner.last_verified = verifiedAt;
        if (moPartner.faculty_department) euPartner.faculty_department = moPartner.faculty_department;
        if (moPartner.study_levels?.length) euPartner.study_levels = moPartner.study_levels;
        if (moPartner.spots) euPartner.spots_per_year = moPartner.spots;
        if (moPartner.moveon_id) euPartner.moveon_id = moPartner.moveon_id;
        if (moPartner.lat && !euPartner.lat) euPartner.lat = moPartner.lat;
        if (moPartner.lng && !euPartner.lng) euPartner.lng = moPartner.lng;
        stats.verified_active++;
        uniMatched++;
      } else {
        const subjectArea = moPartner.faculty_department || moPartner.isced_subject || 'General';
        const newPartner = {
          id: generatePartnerId(euUniId, moPartner.partner_name, subjectArea),
          partner_uni_name: moPartner.partner_name,
          partner_city: moPartner.city || 'Unknown',
          partner_country: translatedCountry,
          subject_area: subjectArea,
          source: 'moveon',
          confidence: 'moveon_only',
          last_verified: verifiedAt,
          faculty_department: moPartner.faculty_department || null,
          study_levels: moPartner.study_levels || [],
          spots_per_year: moPartner.spots || null,
          moveon_id: moPartner.moveon_id || null,
          lat: moPartner.lat || null,
          lng: moPartner.lng || null,
          cost_index: null,
        };
        euPartners.push(newPartner);
        stats.moveon_only++;
        stats.new_partners_added++;
        uniNew++;
      }
    }

    console.log(`  ${euUniId}: ${uniMatched} matched, ${uniNew} new (${moveOnData.partners.length} MoveOn partners)`);
  }

  // Count final confidence distribution from actual data (not accumulators)
  let totalPartners = 0;
  const finalConf = { verified_active: 0, moveon_only: 0, likely_active: 0, possibly_active: 0, historical: 0, traineeship: 0 };
  for (const uniId of Object.keys(euDb.universities)) {
    for (const p of euDb.universities[uniId].partners) {
      totalPartners++;
      if (finalConf[p.confidence] !== undefined) finalConf[p.confidence]++;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(euDb));

  console.log(`\n=== Merge Complete ===`);
  console.log(`Total universities: ${Object.keys(euDb.universities).length}`);
  console.log(`Total partners: ${totalPartners}`);
  console.log(`\nConfidence distribution:`);
  for (const [k, v] of Object.entries(finalConf)) {
    console.log(`  ${k.padEnd(20)}${v}`);
  }
  console.log(`\nMoveOn matching:`);
  console.log(`  Unis matched:     ${stats.moveon_unis_matched}`);
  console.log(`  Unis unmatched:   ${stats.moveon_unis_unmatched}`);
  console.log(`  New partners:     ${stats.new_partners_added}`);
  console.log(`  Countries translated: ${stats.countries_translated}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
