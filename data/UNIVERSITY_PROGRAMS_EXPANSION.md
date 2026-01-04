# University Programs Database Expansion Guide

## Overview

The `university_programs.json` file contains a comprehensive mapping of German universities to their available study programs (Studiengänge). This file is used by the `ErasmusSelector` component to populate the study program dropdown.

## Data Structure

The file uses a flat JSON object structure:

```json
{
  "University Name (Exact Match)": [
    "Program Name (B.Sc.)",
    "Program Name (M.Sc.)",
    "Program Name (State Examination)",
    ...
  ],
  ...
}
```

### Key Requirements

1. **Exact University Name Matching**: The university name in this file MUST exactly match the name in `universities.json`
2. **Program Format**: Include degree level in parentheses: `(B.Sc.)`, `(M.Sc.)`, `(B.A.)`, `(M.A.)`, `(State Examination)`, etc.
3. **Alphabetical Order**: Programs within each university should be sorted alphabetically
4. **Completeness**: Include ALL available programs for each university (Bachelor's, Master's, State Examinations)

## Current Status

As of the initial implementation, the database includes comprehensive program lists for:

1. Technical University of Munich (TUM) - 75+ programs
2. Free University of Berlin - 85+ programs
3. Heidelberg University - 80+ programs
4. Ludwig Maximilian University of Munich (LMU) - 90+ programs
5. Humboldt University of Berlin - 55+ programs
6. Technical University of Berlin (TU Berlin) - 60+ programs

**Total Universities in System**: ~400 (from `universities.json`)
**Universities with Complete Program Data**: 6 (1.5%)
**Remaining Universities**: ~394

## Data Sources

For comprehensive program data, use these official sources:

1. **Hochschulkompass** (https://www.hochschulkompass.de/)
   - Official database of the German Rectors' Conference
   - Search by university name
   - Lists all accredited study programs

2. **University Official Websites**
   - Each university's "Studiengänge" or "Study Programs" section
   - Usually under "Studium" or "Studies" menu
   - Most accurate and up-to-date source

3. **DAAD Study Programs Database**
   - https://www.daad.de/en/study-and-research-in-germany/
   - Comprehensive database for international students

4. **State Examination Programs**
   - Medicine: Human Medicine, Veterinary Medicine, Dentistry
   - Law: Law (Jura)
   - Pharmacy: Pharmacy
   - Food Chemistry: Food Chemistry
   - Teacher Training: Lehramt programs (varies by state)

## Expansion Strategy

### Phase 1: High-Priority Universities
Focus on universities that appear in `erasmus-partners.json` first:
- Already completed: TUM, Free University of Berlin, Heidelberg

### Phase 2: Major Universities
Add the largest and most popular universities:
- Already completed: LMU Munich, Humboldt University, TU Berlin
- Next priorities:
  - RWTH Aachen University
  - University of Bonn
  - University of Hamburg
  - University of Freiburg
  - University of Tübingen
  - KIT Karlsruhe
  - University of Göttingen

### Phase 3: Systematic Expansion
Work through `universities.json` systematically:
1. Group by state (Bundesland)
2. Process 10-20 universities per batch
3. Verify program lists against official sources
4. Test in the component after each batch

## Adding New Universities

### Step 1: Identify University Name
```bash
# Check exact name in universities.json
grep -i "university name" data/universities.json
```

### Step 2: Research Programs
1. Visit the university's official website
2. Navigate to "Study Programs" or "Studiengänge"
3. Compile a complete list including:
   - All Bachelor's programs
   - All Master's programs
   - All State Examination programs
   - All consecutive and non-consecutive programs

### Step 3: Format Programs
- Include degree level: `(B.Sc.)`, `(M.Sc.)`, `(B.A.)`, `(M.A.)`
- Use English names (matching the existing data structure)
- Sort alphabetically
- Be consistent with naming conventions

### Step 4: Add to JSON
```json
{
  "University Name (Exact Match)": [
    "Program Name (B.Sc.)",
    "Program Name (M.Sc.)",
    ...
  ]
}
```

### Step 5: Validate
1. Check JSON syntax (use a JSON validator)
2. Verify university name matches exactly
3. Test in the component
4. Run build to ensure no errors

## Common Program Categories

### Engineering & Technology
- Computer Science / Informatics
- Mechanical Engineering
- Electrical Engineering
- Civil Engineering
- Chemical Engineering
- Industrial Engineering
- Aerospace Engineering
- Automotive Engineering

### Natural Sciences
- Mathematics
- Physics
- Chemistry
- Biology
- Biochemistry
- Biotechnology
- Geology
- Meteorology

### Business & Economics
- Business Administration (BWL)
- Economics (VWL)
- Business Informatics
- Industrial Engineering (Wirtschaftsingenieurwesen)

### Humanities & Social Sciences
- History
- Philosophy
- Political Science
- Sociology
- Psychology
- Education Science
- Media and Communication Studies

### Languages & Literature
- German Studies
- English Studies
- Romance Studies
- Slavic Studies
- Asian Studies
- Near Eastern Studies

### Medicine & Health
- Human Medicine (State Examination)
- Veterinary Medicine (State Examination)
- Dentistry (State Examination)
- Pharmacy (State Examination)
- Psychology
- Sports Science

### Law & Administration
- Law (State Examination)
- Public Administration
- Business Law

### Architecture & Design
- Architecture
- Landscape Architecture
- Urban and Regional Planning

## Quality Assurance Checklist

Before adding a university to the database:

- [ ] University name matches exactly with `universities.json`
- [ ] All programs include degree level in parentheses
- [ ] Programs are sorted alphabetically
- [ ] No duplicate programs
- [ ] JSON syntax is valid
- [ ] Program names are in English (consistent with existing data)
- [ ] All major programs are included (Bachelor's, Master's, State Examinations)
- [ ] Tested in the component to ensure programs appear correctly

## Automation Opportunities

For large-scale expansion, consider:

1. **Web Scraping Script**: Automated extraction from Hochschulkompass
2. **API Integration**: If official APIs become available
3. **Crowdsourcing**: Community contributions with verification
4. **Batch Processing**: Script to validate and format multiple universities

## Maintenance

- Review and update annually (programs change frequently)
- Monitor for new programs at major universities
- Remove discontinued programs
- Update program names if they change
- Verify program lists remain accurate

## Notes

- The component falls back to `erasmus-partners.json` for universities not yet in this database
- This ensures backward compatibility
- Universities with programs in this database will show ALL programs, not just those with Erasmus partnerships
- This provides a better user experience and more comprehensive data

## Current Coverage Statistics

- **Total Universities**: ~400
- **With Complete Programs**: 6 (1.5%)
- **Average Programs per University**: ~70-90
- **Estimated Total Programs When Complete**: ~28,000-36,000
- **Current Programs in Database**: ~450

## Next Steps

1. Continue adding universities systematically
2. Prioritize universities with high student populations
3. Focus on universities with Erasmus partnerships
4. Maintain data quality and consistency
5. Test thoroughly after each addition

