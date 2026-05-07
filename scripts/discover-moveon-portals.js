#!/usr/bin/env node

/**
 * MoveOn Portal Discovery
 *
 * Systematically discovers MoveOn portal URLs for German universities by
 * testing known URL patterns against moveon4.de subdomains.
 * Outputs data/moveon_registry.json with confirmed portals.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PARTNERS_DB = path.join(__dirname, '..', 'data', 'erasmus_partners.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'moveon_registry.json');

// Advanced publisher paths (standard publisher is deprecated across MoveOn)
const ADV_PUB_PATHS = [
  '/start/', '/home-page/', '/results/', '/partner-universities/',
  '/partnerhochschulen/', '/austauschmoeglichkeiten/', '/aufenthaltsmoeglichkeiten/',
  '/stay-search/', '/exchange-opportunities/', '/erasmus-vereinbarungen/',
  '/search/', '/erasmus/', '/exchange/', '/international/', '/incoming/',
  '/outgoing/', '/mobility/', '/agreements/', '/partner/', '/partnerunis/',
  '/suchergebnisse/', '/search-results/', '/erasmus-partner/',
];

const KNOWN_PORTALS = {
  TECHNISCHE_UNIVERSITAET_MUENCHEN: { slug: 'tum', type: 'advanced', path: '/report-page-5027/' },
  FREIE_UNIVERSITAET_BERLIN: { slug: 'fuberlin', type: 'advanced', path: '/report-page-1606/' },
  HUMBOLDT_UNIVERSITAET_ZU_BERLIN: { slug: 'huberlin', type: 'advanced', path: '/home-page-1757/' },
  RHEINISCH_WESTFAELISCHE_TECHNISCHE_HOCHSCHULE_AACHEN: { slug: 'rwthaachen', type: 'advanced', path: '/results/' },
  LUDWIG_MAXIMILIANS_UNIVERSITAET_MUENCHEN: { slug: 'lmu', type: 'advanced', path: '/home-page-2558/' },
  GOTTFRIED_WILHELM_LEIBNIZ_UNIVERSITAET_HANNOVER: { slug: 'hannover', type: 'advanced', path: '/aufenthaltsmoeglichkeiten/' },
  GEORG_AUGUST_UNIVERSITAET_GOETTINGEN_STIFTUNG_OEFFENTLICHEN_RECHTS: { slug: 'goettingen', type: 'advanced', path: '/report-page-1856/' },
  JULIUS_MAXIMILIANS_UNIVERSITAET_WUERZBURG: { slug: 'wuerzburg', type: 'advanced', path: '/home-page-1721/' },
  JUSTUS_LIEBIG_UNIVERSITAET_GIESSEN: { slug: 'giessen', type: 'advanced', path: '/home-page-1579/' },
  UNIVERSITAET_PASSAU: { slug: 'passau', type: 'advanced', path: '/start/' },
  UNIVERSITAET_SIEGEN: { slug: 'siegen', type: 'advanced', path: '/stay-search/' },
  HOCHSCHULE_RHEIN_WAAL: { slug: 'hsrw', type: 'advanced', path: '/home-page/' },
  UNIVERSITAET_ULM: { slug: 'ulm', type: 'advanced', path: '/home-page-1582/' },
  UNIVERSITAET_LEIPZIG: { slug: 'unileipzig', type: 'advanced', path: '/erasmus-vereinbarungen/' },
  PHILIPPS_UNIVERSITAET_MARBURG: { slug: 'marburg', type: 'advanced', path: '/start/' },
  TECHNISCHE_UNIVERSITAET_BRAUNSCHWEIG: { slug: 'tu-braunschweig', type: 'advanced', path: '/start/' },
  MARTIN_LUTHER_UNIVERSITAET_HALLE_WITTENBERG: { slug: 'halle', type: 'advanced', path: '/start/' },
  FRIEDRICH_SCHILLER_UNIVERSITAET_JENA: { slug: 'uni-jena', type: 'advanced', path: '/start/' },
  OTTO_VON_GUERICKE_UNIVERSITAET_MAGDEBURG: { slug: 'ovgu', type: 'advanced', path: '/start/' },
  HEINRICH_HEINE_UNIVERSITAET_DUESSELDORF: { slug: 'hhu', type: 'advanced', path: '/start/' },
  RUHR_UNIVERSITAET_BOCHUM: { slug: 'rub', type: 'advanced', path: '/start/' },
  UNIVERSITAET_ZU_KOELN: { slug: 'koeln', type: 'advanced', path: '/start/' },
  UNIVERSITAET_ZU_LUEBECK: { slug: 'luebeck', type: 'advanced', path: '/start/' },
  UNIVERSITAET_OSNABRUECK: { slug: 'osnabrueck', type: 'advanced', path: '/start/' },
  EUROPA_UNIVERSITAET_FLENSBURG: { slug: 'flensburg', type: 'advanced', path: '/start/' },
  BAUHAUS_UNIVERSITAET_WEIMAR: { slug: 'weimar', type: 'advanced', path: '/start/' },
  FACHHOCHSCHULE_POTSDAM: { slug: 'potsdam', type: 'advanced', path: '/start/' },
  HOCHSCHULE_COBURG: { slug: 'coburg', type: 'advanced', path: '/start/' },
  HOCHSCHULE_HOF: { slug: 'hof', type: 'advanced', path: '/start/' },
  HOCHSCHULE_STRALSUND: { slug: 'stralsund', type: 'advanced', path: '/start/' },
  HOCHSCHULE_WORMS: { slug: 'worms', type: 'advanced', path: '/start/' },
  HOCHSCHULE_MITTWEIDA: { slug: 'mittweida', type: 'advanced', path: '/start/' },
  HOCHSCHULE_BIBERACH: { slug: 'biberach', type: 'advanced', path: '/start/' },
  WESTSAECHSISCHE_HOCHSCHULE_ZWICKAU: { slug: 'zwickau', type: 'advanced', path: '/start/' },
  HOCHSCHULE_WEIHENSTEPHAN_TRIESDORF: { slug: 'hswt', type: 'advanced', path: '/start/' },
};

function generateSlugs(uniId, uniName) {
  const slugs = new Set();
  const id = uniId.toLowerCase();
  const name = uniName.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '').trim();

  const words = name.split(/[\s-]+/).filter(w => w.length > 1);
  const city = extractCity(id, name);

  if (city) {
    slugs.add(city);
    slugs.add(`uni-${city}`);
  }

  if (id.includes('TECHNISCHE_UNIVERSITAET') || id.includes('TECHNISCHE_HOCHSCHULE') || name.includes('tu ') || name.includes('technical university')) {
    if (city) {
      slugs.add(`tu-${city}`);
      slugs.add(`tu${city}`);
    }
  }

  if (id.includes('HOCHSCHULE') && !id.includes('UNIVERSITAET')) {
    if (city) {
      slugs.add(`hs-${city}`);
      slugs.add(`haw-${city}`);
      slugs.add(`hawk-${city}`);
      slugs.add(`htw-${city}`);
    }
  }

  if (id.includes('FACHHOCHSCHULE')) {
    if (city) {
      slugs.add(`fh-${city}`);
    }
  }

  const commonAbbrevs = {
    'ludwig_maximilians_universitaet': ['lmu'],
    'rheinische_friedrich_wilhelms_universitaet': ['uni-bonn', 'bonn'],
    'eberhard_karls_universitaet': ['uni-tuebingen', 'tuebingen'],
    'ruprecht_karls_universitaet': ['uni-heidelberg', 'heidelberg'],
    'julius_maximilians_universitaet': ['uni-wuerzburg', 'wuerzburg'],
    'friedrich_alexander_universitaet': ['fau', 'uni-erlangen'],
    'christian_albrechts_universitaet': ['cau', 'uni-kiel'],
    'westfaelische_wilhelms_universitaet': ['uni-muenster', 'muenster'],
    'albert_ludwigs_universitaet': ['uni-freiburg', 'freiburg'],
    'johann_wolfgang_goethe_universitaet': ['uni-frankfurt', 'goethe-uni'],
    'carl_von_ossietzky_universitaet': ['uni-oldenburg', 'oldenburg'],
    'otto_von_guericke_universitaet': ['ovgu', 'uni-magdeburg'],
    'otto_friedrich_universitaet': ['uni-bamberg', 'bamberg'],
    'heinrich_heine_universitaet': ['hhu', 'uni-duesseldorf'],
    'rheinisch_westfaelische_technische_hochschule': ['rwth-aachen', 'rwth'],
    'karlsruher_institut_fuer_technologie': ['kit', 'kit-karlsruhe'],
    'europa_universitaet_viadrina': ['europa-uni', 'viadrina'],
    'fernuniversitaet_in_hagen': ['fernuni-hagen', 'fernuni'],
    'technische_universitaet_dresden': ['tu-dresden', 'tud'],
    'technische_universitaet_berlin': ['tu-berlin', 'tub'],
    'technische_universitaet_darmstadt': ['tu-darmstadt', 'tuda'],
    'technische_universitaet_kaiserslautern': ['tu-kaiserslautern', 'tukl'],
    'technische_universitaet_dortmund': ['tu-dortmund'],
    'technische_universitaet_chemnitz': ['tu-chemnitz'],
    'technische_universitaet_clausthal': ['tu-clausthal'],
    'technische_universitaet_ilmenau': ['tu-ilmenau'],
    'technische_universitaet_hamburg': ['tuhh', 'tu-hamburg', 'tuhamburg'],
    'universitaet_hamburg': ['uni-hamburg', 'hamburg', 'unihamburg'],
    'universitaet_bremen': ['uni-bremen', 'bremen', 'unibremen'],
    'universitaet_leipzig': ['uni-leipzig', 'leipzig', 'unileipzig'],
    'universitaet_rostock': ['uni-rostock', 'rostock', 'unirostock'],
    'universitaet_greifswald': ['uni-greifswald', 'greifswald', 'unigreifswald'],
    'universitaet_potsdam': ['uni-potsdam', 'potsdam', 'unipotsdam'],
    'universitaet_bielefeld': ['uni-bielefeld', 'bielefeld', 'unibielefeld'],
    'universitaet_konstanz': ['uni-konstanz', 'konstanz', 'unikonstanz'],
    'universitaet_mannheim': ['uni-mannheim', 'mannheim', 'unimannheim'],
    'universitaet_passau': ['uni-passau', 'passau', 'unipassau'],
    'universitaet_bayreuth': ['uni-bayreuth', 'bayreuth', 'unibayreuth'],
    'universitaet_augsburg': ['uni-augsburg', 'augsburg', 'uniaugsburg'],
    'universitaet_regensburg': ['uni-regensburg', 'regensburg', 'uniregensburg'],
    'universitaet_siegen': ['uni-siegen', 'siegen', 'unisiegen'],
    'universitaet_kassel': ['uni-kassel', 'kassel', 'unikassel'],
    'universitaet_paderborn': ['uni-paderborn', 'paderborn', 'unipaderborn'],
    'universitaet_osnabrueck': ['uni-osnabrueck', 'osnabrueck', 'uniosnabrueck'],
    'universitaet_trier': ['uni-trier', 'trier', 'unitrier'],
    'universitaet_koblenz': ['uni-koblenz', 'koblenz', 'unikoblenz'],
    'universitaet_des_saarlandes': ['uni-saarland', 'saarland', 'unisaarland', 'uds'],
    'universitaet_erfurt': ['uni-erfurt', 'erfurt', 'unierfurt'],
    'universitaet_luebeck': ['uni-luebeck', 'luebeck', 'uniluebeck'],
    'universitaet_ulm': ['uni-ulm', 'ulm', 'uniulm'],
    'universitaet_stuttgart': ['uni-stuttgart', 'stuttgart', 'unistuttgart'],
    'universitaet_hohenheim': ['uni-hohenheim', 'hohenheim', 'unihohenheim'],
    'universitaet_duisburg_essen': ['uni-due', 'duisburg-essen', 'ude', 'unidue'],
    'ruhr_universitaet_bochum': ['rub', 'uni-bochum', 'bochum', 'unibochum'],
    'bergische_universitaet_wuppertal': ['uni-wuppertal', 'wuppertal', 'uniwuppertal', 'buw'],
    'westfaelische_wilhelms_universitaet': ['wwu', 'uni-muenster', 'muenster', 'unimuenster'],
    'technische_universitaet_muenchen': ['tum'],
    'albert_ludwigs_universitaet': ['uni-freiburg', 'freiburg', 'unifreiburg'],
    'universitat_freiburg': ['uni-freiburg', 'freiburg', 'unifreiburg'],
    'ruprecht_karls_universitaet': ['uni-heidelberg', 'heidelberg', 'uniheidelberg'],
    'universitaet_zu_koeln': ['koeln', 'unikoeln', 'uni-koeln'],
    'brandenburgische_technische_universitaet': ['b-tu', 'btu', 'tu-cottbus'],
    'leuphana_universitaet': ['leuphana', 'uni-lueneburg', 'lueneburg'],
    'europa_universitaet_flensburg': ['euf', 'flensburg', 'uniflensburg'],
    'europa_universitaet_viadrina': ['europa-uni', 'viadrina', 'euviadrina'],
    'stiftung_universitaet_hildesheim': ['uni-hildesheim', 'hildesheim', 'unihildesheim'],
    'hochschule_fuer_wirtschaft_und_recht': ['hwr', 'hwrberlin'],
    'hochschule_fuer_technik_und_wirtschaft_berlin': ['htw', 'htwberlin', 'htw-berlin'],
    'hochschule_fuer_technik_und_wirtschaft_dresden': ['htw-dresden', 'htwdresden'],
    'hochschule_bonn_rhein_sieg': ['brsu', 'hbrs', 'h-brs'],
    'hochschule_der_medien': ['hdm', 'hdmstuttgart'],
    'hochschule_darmstadt': ['hda', 'h-da'],
    'hochschule_duesseldorf': ['hsd', 'hs-duesseldorf'],
    'hochschule_muenchen': ['hm', 'hm-muenchen'],
    'hochschule_fuer_angewandte_wissenschaften_augsburg': ['tha', 'th-augsburg', 'hs-augsburg'],
    'hochschule_fuer_angewandte_wissenschaften_hof': ['hof', 'hs-hof'],
    'hochschule_fuer_angewandte_wissenschaften_coburg': ['hs-coburg', 'coburg'],
    'hochschule_fuer_angewandte_wissenschaften_neu_ulm': ['hnu', 'hs-neu-ulm'],
    'hochschule_fuer_angewandte_wissenschaften_landshut': ['hs-landshut', 'landshut'],
    'hochschule_fuer_angewandte_wissenschaften_kempten': ['hs-kempten', 'kempten'],
    'hochschule_fuer_angewandte_wissenschaften_ansbach': ['hs-ansbach', 'ansbach'],
    'hochschule_fuer_angewandte_wissenschaften_wuerzburg_schweinfurt': ['fhws', 'hs-wuerzburg'],
    'hochschule_fuer_angewandte_wissenschaften_muenchen': ['hm', 'hm-muenchen', 'haw-muenchen'],
    'hochschule_fuer_technik_stuttgart': ['hft', 'hft-stuttgart'],
    'hochschule_fuer_technik_und_wirtschaft_des_saarlandes': ['htw-saar', 'htwsaar'],
    'hochschule_fuer_technik_wirtschaft_und_kultur_leipzig': ['htwk', 'htwk-leipzig'],
    'hochschule_fuer_musik_und_tanz_koeln': ['hfmt-koeln', 'hfmt'],
    'hochschule_fuer_nachhaltige_entwicklung_eberswalde': ['hnee', 'hs-eberswalde'],
    'hochschule_fuer_wirtschaft_und_gesellschaft_ludwigshafen': ['hwg-lu', 'hs-ludwigshafen'],
    'hochschule_fuer_wirtschaft_und_umwelt_nuertingen_geislingen': ['hfwu', 'hs-nuertingen'],
    'hochschule_fuer_oeffentliche_verwaltung_kehl': ['hs-kehl', 'kehl'],
    'hochschule_fuer_oeffentliche_verwaltung_und_finanzen_ludwigs': ['hf-ludwigsburg'],
    'hochschule_fuer_bildende_kuenste_hamburg': ['hfbk', 'hfbk-hamburg'],
    'hochschule_fuer_bildende_kuenste_braunschweig': ['hbk', 'hbk-braunschweig'],
    'hochschule_fuer_bildende_kuenste_dresden': ['hfbk-dresden'],
    'hochschule_fuer_gestaltung_offenbach': ['hfg-offenbach', 'hfg'],
    'hochschule_fuer_gestaltung_schwaebisch_gmuend': ['hfg-gmuend'],
    'hochschule_niederrhein': ['hs-niederrhein', 'hsnr'],
    'hochschule_ostwuerttemberg': ['hs-aalen', 'htw-aalen'],
    'jade_hochschule': ['jade', 'jade-hs'],
    'fachhochschule_muenster': ['fh-muenster', 'fhmuenster'],
    'fachhochschule_aachen': ['fh-aachen', 'fhaachen'],
    'fachhochschule_kiel': ['fh-kiel', 'fhkiel'],
    'fachhochschule_bielefeld': ['fh-bielefeld', 'fhbielefeld'],
    'fachhochschule_dortmund': ['fh-dortmund', 'fhdortmund'],
    'fachhochschule_suedwestfalen': ['fh-swf', 'fhswf'],
    'technische_hochschule_koeln': ['th-koeln', 'thkoeln'],
    'technische_hochschule_mittelhessen': ['thm'],
    'technische_hochschule_nuernberg': ['th-nuernberg', 'ohn'],
    'technische_hochschule_deggendorf': ['thd', 'th-deggendorf'],
    'technische_hochschule_ingolstadt': ['thi', 'th-ingolstadt'],
    'technische_hochschule_augsburg': ['tha', 'th-augsburg'],
    'technische_hochschule_wildau': ['th-wildau', 'wildau'],
    'technische_hochschule_brandenburg': ['th-brandenburg'],
    'hochschule_fulda': ['hs-fulda', 'fulda'],
    'hochschule_mainz': ['hs-mainz'],
    'hochschule_trier': ['hs-trier'],
    'hochschule_koblenz': ['hs-koblenz'],
    'hochschule_aalen': ['hs-aalen', 'aalen'],
    'hochschule_bremen': ['hs-bremen'],
    'hochschule_emden_leer': ['hs-emden-leer'],
    'hochschule_esslingen': ['hs-esslingen', 'esslingen'],
    'hochschule_flensburg': ['hs-flensburg'],
    'hochschule_hannover': ['hs-hannover'],
    'hochschule_karlsruhe': ['hka', 'hs-karlsruhe'],
    'hochschule_mannheim': ['hs-mannheim'],
    'hochschule_nordhausen': ['hs-nordhausen'],
    'hochschule_offenburg': ['hs-offenburg', 'offenburg'],
    'hochschule_pforzheim': ['hs-pforzheim', 'pforzheim'],
    'hochschule_ravensburg_weingarten': ['rwu', 'hs-weingarten'],
    'hochschule_reutlingen': ['reutlingen'],
    'hochschule_rheinmain': ['hs-rm', 'hsrm'],
    'hochschule_wismar': ['hs-wismar', 'wismar'],
    'hochschule_zittau_goerlitz': ['hszg', 'hs-zittau'],
    'bauhaus_universitaet_weimar': ['bauhaus', 'weimar'],
    'philipps_universitaet_marburg': ['uni-marburg', 'marburg'],
    'martin_luther_universitaet_halle_wittenberg': ['uni-halle', 'halle'],
    'friedrich_schiller_universitaet_jena': ['uni-jena'],
    'universitaet_goettingen': ['uni-goettingen', 'goettingen'],
  };

  for (const [pattern, abbrevs] of Object.entries(commonAbbrevs)) {
    if (id.toLowerCase().includes(pattern.toLowerCase())) {
      abbrevs.forEach(a => slugs.add(a));
    }
  }

  const idClean = id.replace(/_/g, '-').toLowerCase();
  if (words.length <= 3) {
    slugs.add(idClean);
  }

  slugs.delete('');
  return [...slugs];
}

function extractCity(uniId, uniName) {
  const cityPatterns = [
    /universitaet_(?:zu_)?(\w+)$/i,
    /hochschule_(?:fuer_\w+_)?(\w+)$/i,
    /universit..t\s+(?:zu\s+)?(\w+)$/i,
    /hochschule\s+(\w+)$/i,
  ];

  const id = uniId.toLowerCase();
  for (const p of cityPatterns) {
    const m = id.match(p);
    if (m) {
      return m[1].toLowerCase()
        .replace(/ae/g, 'ae').replace(/oe/g, 'oe').replace(/ue/g, 'ue');
    }
  }

  const name = uniName.toLowerCase();
  for (const p of cityPatterns) {
    const m = name.match(p);
    if (m) {
      return m[1].toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    }
  }

  return null;
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', timeout: 8000 }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ ok: true, status: res.statusCode, redirect: res.headers.location || null });
      } else {
        resolve({ ok: false, status: res.statusCode });
      }
    });
    req.on('error', () => resolve({ ok: false, status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
    req.end();
  });
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function discoverPortal(uniId, uniName) {
  if (KNOWN_PORTALS[uniId]) {
    const kp = KNOWN_PORTALS[uniId];
    const domain = `${kp.slug}.adv-pub.moveon4.de`;
    return {
      university_id: uniId,
      university_name: uniName,
      portal_url: `https://${domain}${kp.path}`,
      portal_type: 'advanced_publisher',
      slug: kp.slug,
      source: 'known',
      discovered_at: new Date().toISOString(),
    };
  }

  const slugs = generateSlugs(uniId, uniName);
  if (slugs.length === 0) return null;

  // Check advanced publisher first (standard publisher is deprecated)
  for (const slug of slugs) {
    for (const p of ADV_PUB_PATHS) {
      const url = `https://${slug}.adv-pub.moveon4.de${p}`;
      const result = await checkUrl(url);
      if (result.ok) {
        return {
          university_id: uniId,
          university_name: uniName,
          portal_url: url,
          portal_type: 'advanced_publisher',
          slug,
          source: 'discovered',
          discovered_at: new Date().toISOString(),
        };
      }
      await delay(400);
    }

    await delay(600);
  }

  return null;
}

async function main() {
  console.log('=== MoveOn Portal Discovery ===\n');

  const db = JSON.parse(fs.readFileSync(PARTNERS_DB, 'utf-8'));
  const uniIds = Object.keys(db.universities).sort();
  console.log(`Loaded ${uniIds.length} universities\n`);

  let existing = { portals: [], last_updated: null };
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log(`Existing registry: ${existing.portals.length} portals\n`);
  }
  const existingMap = new Map(existing.portals.map(p => [p.university_id, p]));

  let found = 0;
  let skipped = 0;
  let tested = 0;
  const results = [];

  for (const uniId of uniIds) {
    const uni = db.universities[uniId];

    if (existingMap.has(uniId)) {
      const existing_entry = existingMap.get(uniId);
      if (existing_entry.portal_url) {
        results.push(existing_entry);
        skipped++;
        continue;
      }
    }

    tested++;
    const portal = await discoverPortal(uniId, uni.name);

    if (portal) {
      found++;
      results.push(portal);
      console.log(`[${tested}/${uniIds.length - skipped}] FOUND: ${uni.name} -> ${portal.portal_url}`);
    } else {
      results.push({
        university_id: uniId,
        university_name: uni.name,
        portal_url: null,
        portal_type: null,
        slug: null,
        source: 'not_found',
        discovered_at: new Date().toISOString(),
      });
      if (tested % 50 === 0) {
        console.log(`[${tested}/${uniIds.length - skipped}] Scanned... (${found} found so far)`);
      }
    }
  }

  const registry = {
    last_updated: new Date().toISOString(),
    total_universities: uniIds.length,
    portals_found: results.filter(r => r.portal_url).length,
    portals_not_found: results.filter(r => !r.portal_url).length,
    portals: results.filter(r => r.portal_url),
    not_found: results.filter(r => !r.portal_url).map(r => ({
      university_id: r.university_id,
      university_name: r.university_name,
    })),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2));

  console.log(`\n=== Discovery Complete ===`);
  console.log(`Total universities: ${uniIds.length}`);
  console.log(`Portals found: ${registry.portals_found}`);
  console.log(`Not found: ${registry.portals_not_found}`);
  console.log(`Skipped (cached): ${skipped}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
