---
name: SEO & LLM Optimization Plan
overview: A chronological technical implementation plan to refactor mystudycosts.com for advanced SEO and LLM-driven search extraction. The plan covers inverted pyramid content, semantic HTML, metadata/canonicals, Core Web Vitals, FAQ schema, and AI-generated code audit.
todos: []
isProject: false
---

# SEO & LLM Search Optimization Implementation Plan

## Current State Summary

Based on codebase analysis:

- **Metadata**: Solid foundation via Next.js 15 Metadata API in [app/[locale]/layout.tsx](app/[locale]/layout.tsx); locale-level canonical only (not page-specific for root pages); dynamic pages (program, city) set correct canonicals.
- **Sitemap**: Missing `/degree` and `/city/[citySlug]` routes (see [app/sitemap.ts](app/sitemap.ts)).
- **Schema**: No JSON-LD anywhere in the app.
- **HTML Semantics**: High div usage (100+ divs in StudyCostCalculator, NCCheckerContent, DegreeFinder); div-based pseudo-lists; no `dl`/`dt`/`dd`; headings rarely question-formatted.
- **Images**: Only [components/HeroDataMap.tsx](components/HeroDataMap.tsx) uses `next/image`; format not WebP/AVIF.
- **FAQ**: No FAQ component or FAQPage schema.

---

## Phase 1: Foundation & Metadata Control

### 1.1 Metadata & Canonical Audit Checklist


| Check                    | Location                                                                                                                                                 | Action                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Page-specific canonicals | [app/[locale]/layout.tsx](app/[locale]/layout.tsx)                                                                                                       | Layout sets `canonical: siteUrl`; override in each page via `generateMetadata` and `alternates.canonical` |
| Dynamic page canonicals  | [app/[locale]/program/[id]/page.tsx](app/[locale]/program/[id]/page.tsx), [app/[locale]/city/[citySlug]/page.tsx](app/[locale]/city/[citySlug]/page.tsx) | Verify canonical includes full path; ensure no trailing slash inconsistency                               |
| Root page canonical      | [app/[locale]/page.tsx](app/[locale]/page.tsx)                                                                                                           | Add `generateMetadata` with `alternates.canonical: ${baseUrl}/${locale}`                                  |
| All static pages         | calculator, nc-checker, erasmus, degree, about, blog, imprint, privacy                                                                                   | Add `generateMetadata` to each with locale-aware canonical URL                                            |
| Duplicate content        | Locale handling                                                                                                                                          | Confirm hreflang covers de, en, x-default; x-default should point to preferred locale                     |


**Implementation**: For every route under `app/[locale]/`, ensure `generateMetadata` returns `alternates: { canonical: fullPageUrl }`. Use `metadataBase` from layout for relative resolution.

### 1.2 Sitemap Expansion

- Add `/degree` to static routes in [app/sitemap.ts](app/sitemap.ts).
- Add dynamic city routes: import `getAllCities()` from [lib/city-data.ts](lib/city-data.ts), iterate cities with `toSlug(city.name)`, push URLs for each locale.
- Add `lastModified` and `changeFrequency` for city pages (e.g. monthly).
- Ensure `alternates.languages` for all new routes.

---

## Phase 2: TL;DR Component & Inverted Pyramid Content

### 2.1 Create Reusable TL;DR Component

**New file**: `components/seo/TLDR.tsx`

- Props: `summary: string` (1–2 sentences answering main search intent), optional `highlights?: string[]` (3–5 bullet points).
- Structure: Wrap in `<section aria-labelledby="tldr-heading">`, use `<h2 id="tldr-heading">` (or question like "What is this page about?" for consistency).
- Mark summary as `<p>`; highlights as `<ul><li>`.
- Support i18n via `next-intl` `useTranslations` for labels ("TL;DR", "Key points").
- For LLM extraction: place summary in first 160 characters of visible content; avoid wrapping in decorative divs that obscure plain text.

### 2.2 Page-Level Refactoring (Inverted Pyramid)


| Page                                                                           | Current                               | Refactor                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app/[locale]/nc-checker/page.tsx](app/[locale]/nc-checker/page.tsx)           | NCCheckerContent with search UI first | Add TL;DR above fold: "The NC Checker shows your admission chances for German study programs based on your Abitur grade. Enter your grade and subject to see safe, reach, and unlikely programs." |
| [app/[locale]/calculator/page.tsx](app/[locale]/calculator/page.tsx)           | StudyCostCalculator                   | Add TL;DR: "Calculate blocked account, rent, semester fees, and total monthly costs for studying in Germany. Adjust city, accommodation, and lifestyle for a personalized estimate."              |
| [app/[locale]/erasmus/page.tsx](app/[locale]/erasmus/page.tsx)                 | ErasmusPageContent                    | Add TL;DR: "Find Erasmus partner universities for your German program. Compare grants, living costs, and application deadlines by country."                                                       |
| [app/[locale]/degree/page.tsx](app/[locale]/degree/page.tsx)                   | DegreeFinder                          | Add TL;DR describing degree search and NC-based chances.                                                                                                                                          |
| [app/[locale]/city/[citySlug]/page.tsx](app/[locale]/city/[citySlug]/page.tsx) | City content                          | Add city-specific TL;DR: "Study in {City}: {N} universities, average semester fee {X}€, top programs…"                                                                                            |
| [app/[locale]/program/[id]/page.tsx](app/[locale]/program/[id]/page.tsx)       | ProgramDetailContent                  | Add TL;DR at top: "NC {value}, {costs}€/month, {erasmusCount} Erasmus partners for {program} at {university}."                                                                                    |


**Principle**: The first 1–2 lines of visible content must answer "What will I get from this page?" for both users and LLMs.

---

## Phase 3: Semantic HTML & Structure Standards

### 3.1 Div-to-Semantic Audit (Priority Order)

**Tier 1 (high traffic / key content)**  

- [components/program/ProgramDetailContent.tsx](components/program/ProgramDetailContent.tsx): Replace stats grid divs with `<dl>`, `<dt>`, `<dd>` for NC, Monthly Costs, Erasmus Partner. Use `<section>` for header and stats block.
- [components/landing/FeatureCards.tsx](components/landing/FeatureCards.tsx): Wrap each card in `<article>`; use `<section>` for the cards container.
- [app/[locale]/city/[citySlug]/page.tsx](app/[locale]/city/[citySlug]/page.tsx): University list → `<ul><li>`; any cost/stat blocks → `dl/dt/dd`.

**Tier 2 (feature components)**  

- [components/NCCheckerContent.tsx](components/NCCheckerContent.tsx): `groupedUniversities` (safe/reach/available/unlikely) → `<ol>` or `<ul>` with `<li>`; accordion/section wrappers → `<section>`.
- [components/DegreeFinder.tsx](components/DegreeFinder.tsx): Same pattern for grouped programs; use `<section>` for major blocks.
- [components/ErasmusFinder.tsx](components/ErasmusFinder.tsx): `costComparisons`, `filteredUniversities` → `<ul><li>`.
- [components/nc-checker/SearchInterface.tsx](components/nc-checker/SearchInterface.tsx): Results list → `<ol role="list">` or `<ul>` with `<li>`.
- [components/nc-checker/ProgramCard.tsx](components/nc-checker/ProgramCard.tsx): Key/value pairs (NC, costs, etc.) → `dl/dt/dd` or table if tabular.
- [components/erasmus/CostComparison.tsx](components/erasmus/CostComparison.tsx): Grant vs cost comparison → HTML `<table>` with `thead`, `tbody`, `th`, `td`.
- [components/layout/LegalFooter.tsx](components/layout/LegalFooter.tsx): Address/contact → `dl/dt/dd`.

**Tier 3 (large calculators)**  

- [components/StudyCostCalculator.tsx](components/StudyCostCalculator.tsx): Step lists → `<ol>`; blocked account providers table already uses `<table>`; add `<section>` for logical blocks; replace div-based result cards with semantic wrappers.

### 3.2 Heading Standards (Question Format)

- **Rule**: Primary sections use question headings (`h2`): "What is the NC Checker?", "How does the cost calculator work?", "Which Erasmus partners are available?"
- **Audit targets**: All pages under `app/[locale]/`, plus feature components that render major sections.
- **Implementation**: Create `components/seo/SectionHeading.tsx` (optional) that enforces question pattern and `aria-level` if needed; or update existing headings in place.
- **Translation**: Add question-heading keys to `messages/de.json` and `messages/en.json`.

### 3.3 Tables for Relational Facts


| Location                                                                                   | Data                      | Change                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [components/program/ProgramDetailContent.tsx](components/program/ProgramDetailContent.tsx) | NC, costs, Erasmus count  | Prefer `dl/dt/dd` (single row of stats, not grid). For city/program comparison pages with multiple rows, use `<table>`. |
| [components/erasmus/CostComparison.tsx](components/erasmus/CostComparison.tsx)             | Grant vs cost by scenario | Convert to `<table>` with `caption`, `scope="col"`/`scope="row"` for headers.                                           |
| [components/nc-checker/ProgramCard.tsx](components/nc-checker/ProgramCard.tsx)             | Program attributes        | Use `dl` for 2–3 key/value pairs; `table` if many attributes.                                                           |


### 3.4 Inline Definitions for Technical Terms

- Add `<dfn>` or `abbr` with `title` for: NC (Numerus Clausus), BAföG, Blocked Account, Semester Fee, Erasmus+.
- Create `components/seo/TermDefinition.tsx`: renders term with optional tooltip/title; use in first occurrence per page.
- Prioritize: NC Checker page, Calculator page, Erasmus page, Program detail.

---

## Phase 4: Technical SEO & Core Web Vitals

### 4.1 Metadata Checklist (Next.js 15 Metadata API)

- All routes have `title`, `description`, `keywords` (where relevant).
- `metadataBase` set in root layout (already done).
- Page-specific `alternates.canonical` for every route.
- `openGraph` and `twitter` for key pages (home, calculator, nc-checker, erasmus, program, city).
- `robots` for sensitive pages (e.g. noindex for test routes).
- Structured data (JSON-LD) in `<script type="application/ld+json">` (Phase 5).

### 4.2 Core Web Vitals Optimizations

**LCP (Largest Contentful Paint)**  

- Ensure hero image in [components/HeroDataMap.tsx](components/HeroDataMap.tsx) has `priority` (already present).  
- Preload critical font(s) if using custom fonts.  
- Lazy-load below-fold sections; avoid blocking main thread on calculator/NC logic.  
- Consider `loading="eager"` only for above-fold images.

**INP (Interaction to Next Paint)**  

- Defer non-critical client components: wrap heavy calculators (StudyCostCalculator, NCCheckerContent, DegreeFinder) in `dynamic(..., { ssr: false })` only if they block paint; otherwise keep SSR for SEO and use `useDeferredValue` for heavy state.  
- Debounce search inputs in ProgramSearch, NCCheckerContent.  
- Avoid layout thrashing in map components (ErasmusMap, NCMap).

**CLS (Cumulative Layout Shift)**  

- Reserve space for hero/maps with `aspect-ratio` or explicit dimensions.  
- Skeleton loaders for dynamic content (program cards, city lists).  
- Ensure images have `width`/`height` or `fill` with parent dimensions.

### 4.3 Image Optimization

- Audit all images: currently only HeroDataMap uses `next/image`.  
- Convert `/hero-network-map.png` to WebP/AVIF (use `next/image` with `sizes` and format detection).  
- Add `alt` for every image; use descriptive text (e.g. "Map of Erasmus partner universities across Europe for German study programs").  
- Configure `next.config.ts`: `images: { formats: ['image/avif', 'image/webp'] }` if not default.

### 4.4 Caching Strategy

- **Server**: Next.js 15 caches `fetch` and `generateStaticParams` by default. Ensure program/city pages use `generateStaticParams` for static generation where possible.  
- **Headers**: Add `Cache-Control` for static assets via `next.config.ts` headers; for ISR pages, use `revalidate` in `generateStaticParams` or `fetch`.  
- **Client**: No explicit browser cache headers in current config; add for `/public` assets if serving manually.

---

## Phase 5: FAQ Component & FAQPage Schema

### 5.1 FAQ Component Architecture

**New file**: `components/seo/FAQ.tsx`

- Props: `items: { question: string; answer: string }[]`, optional `title?: string`, `id?: string`.
- Structure:
  - `<section id={id} aria-labelledby="faq-heading">`
  - `<h2 id="faq-heading">` (e.g. "Frequently Asked Questions" / "Häufig gestellte Fragen")
  - Each item: `<article>` or `<details>` + `<summary>` for accordion, with `<h3>` for question and `<p>` for answer.
  - Use `<dl>` with `<dt>` (question) and `<dd>` (answer) for non-accordion variant.
- **Schema**: Emit FAQPage JSON-LD in same component or via wrapper. Ensure `mainEntity` array with `@type: "Question"`, `name`, `acceptedAnswer` with `@type: "Answer"` and `text`.

### 5.2 FAQPage JSON-LD Integration

- Create `lib/schema/faq.ts`: function `generateFAQSchema(items)` returns FAQPage object.
- Inject via `<script type="application/ld+json">` in layout or page; or use Next.js `metadata` (if supported for JSON-LD in head). Alternatively render in `layout.tsx` or page with `dangerouslySetInnerHTML` in a `<script>` tag.
- Validate with [Google Rich Results Test](https://search.google.com/test/rich-results) and [Schema.org Validator](https://validator.schema.org/).

### 5.3 FAQ Content per Page


| Page       | Sample questions                                                                  |
| ---------- | --------------------------------------------------------------------------------- |
| NC Checker | What is NC? How is my chance calculated? What does safe/reach/unlikely mean?      |
| Calculator | What is a blocked account? How much do I need per month? What costs are included? |
| Erasmus    | What is Erasmus+? How do I find partners for my program? When to apply?           |
| Program    | What does NC X mean for this program? How many Erasmus partners?                  |
| City       | Which universities are in this city? Average semester fee?                        |


Store FAQ items in `messages/` or a dedicated `data/faq.ts` keyed by page/section.

---

## Phase 6: AI-Generated Code Audit Protocol

### 6.1 Audit Checklist per Component

For each high-div, complex component (StudyCostCalculator, NCCheckerContent, DegreeFinder, ErasmusSelector, ErasmusFinder, nc-checker/*, erasmus/*):


| Criterion       | Check                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| Semantic HTML   | Replace divs with `section`, `article`, `aside`, `nav`, `main` where appropriate              |
| Lists           | Convert array-rendered divs to `ul`/`ol`/`li`                                                 |
| Tables          | Use `table` for tabular data; `dl` for key/value                                              |
| Headings        | Question format for h2/h3; no skipped levels                                                  |
| Accessibility   | `aria-label`, `aria-labelledby` on sections; `role="list"` if styling requires list semantics |
| Schema          | Add page-level schema (WebPage, FAQPage, Course for program pages)                            |
| Analytics       | Ensure `trackEvent` calls for key actions (search, result click, calculator submit)           |
| E-E-A-T signals | Author/date in schema; cite sources where applicable                                          |


### 6.2 Schema Additions for E-E-A-T & Knowledge Graph

- **WebPage** for all pages: `name`, `description`, `url`, `dateModified`, `publisher` (Organization).
- **Organization** (site-wide): name, url, logo.
- **Course** for program pages: `name`, `description`, `provider` (University), `offers` (costs), `aggregateRating` if applicable.
- **FAQPage** for pages with FAQ component.
- **BreadcrumbList** for program, city, and multi-step flows (calculator, degree finder).

### 6.3 Analytics Integration

- Add `trackEvent` for: NC search, program click, Erasmus partner select, calculator result, degree search.
- Ensure `ConditionalGoogleAnalytics` loads only after cookie consent (already in layout).
- Consider custom GA4 events for "key_answer_view" (TL;DR visibility), "faq_expand", "schema_eligible_page_view".

---

## Phase 7: Testing & Validation

### 7.1 Schema Testing

1. **Google Rich Results Test**: Validate FAQPage, Course, Organization, WebPage.
2. **Schema.org Validator**: Check JSON-LD syntax and type compliance.
3. **Structured Data Testing Tool** (Chrome extension): Verify on live/preview URLs.

### 7.2 Performance Testing

1. **Lighthouse** (Desktop + Mobile): LCP, INP, CLS, SEO score.
2. **WebPageTest**: Repeat view, filmstrip for LCP.
3. **Chrome DevTools Performance**: Trace main thread during calculator/search interactions.

### 7.3 SEO Crawlability

1. **Screaming Frog** or **Sitebulb**: Crawl sitemap; verify canonicals, hreflang, meta.
2. **Google Search Console**: Submit sitemap; check coverage, enhancements (FAQ rich results).

---

## Implementation Order (Chronological)

1. **Phase 1**: Metadata & sitemap (1.1, 1.2) — low risk, high impact.
2. **Phase 5**: FAQ component + schema — new component, no refactor of existing content.
3. **Phase 2**: TL;DR component + page integration — additive, then iterate per page.
4. **Phase 3**: Semantic HTML refactor — start with Tier 1 (ProgramDetailContent, FeatureCards, city page), then Tier 2.
5. **Phase 4**: Core Web Vitals, images, caching — parallel to Phase 3.
6. **Phase 6**: Full component audit — after semantic patterns are established.
7. **Phase 7**: Ongoing validation after each phase.

---

## Key Files to Create/Modify


| Action | Path                                                                       |
| ------ | -------------------------------------------------------------------------- |
| Create | `components/seo/TLDR.tsx`                                                  |
| Create | `components/seo/FAQ.tsx`                                                   |
| Create | `components/seo/TermDefinition.tsx`                                        |
| Create | `lib/schema/faq.ts`                                                        |
| Create | `lib/schema/webpage.ts` (optional)                                         |
| Modify | `app/sitemap.ts`                                                           |
| Modify | `app/[locale]/*/page.tsx` (metadata, TL;DR, FAQ)                           |
| Modify | `components/program/ProgramDetailContent.tsx`                              |
| Modify | `components/landing/FeatureCards.tsx`                                      |
| Modify | `components/NCCheckerContent.tsx`, `DegreeFinder.tsx`, `ErasmusFinder.tsx` |
| Modify | `next.config.ts` (images, headers)                                         |
| Modify | `messages/de.json`, `messages/en.json` (TL;DR, FAQ, question headings)     |


---

## Dependencies

- No new packages required for basic implementation.  
- Optional: `schema-dts` for TypeScript JSON-LD types; `@next/bundle-analyzer` for bundle size during INP optimization.

