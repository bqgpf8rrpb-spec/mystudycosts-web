# Erasmus Data Expansion Guide

This guide explains how to expand the Erasmus partner data to include comprehensive German university data.

## Data Structure

The data structure follows a flat, simplified format without group classifications. Each entry maps a German University + Degree Program combination to a list of Erasmus partner institutions.

### File Location

- **Main Data File**: `data/erasmus-partners.json`
- **Type Definitions**: `data/erasmus-types.ts`
- **Template Example**: `data/erasmus-data-template.json`

## Data Format

### Entry Structure

```json
{
  "germanUniversity": "Technical University of Munich (TUM)",
  "courseOfStudy": "Computer Science",
  "partners": [
    {
      "name": "ETH Zurich",
      "city": "Zurich",
      "country": "Switzerland",
      "monthlyLivingCost": 1400,
      "travelCost": 150,
      "insuranceCost": 80
    }
  ]
}
```

### Field Descriptions

#### `germanUniversity` (string, required)
- The official name of the German university
- **Must match exactly** the name in `data/universities.json`
- Examples:
  - "Technical University of Munich (TUM)"
  - "Free University of Berlin"
  - "Heidelberg University"

#### `courseOfStudy` (string, required)
- The degree program name (Studiengang) in English
- Use common program names:
  - "Computer Science"
  - "Business Administration"
  - "Mechanical Engineering"
  - "Medicine"
  - "Law"
  - etc.

#### `partners` (array, required)
- List of Erasmus partner universities for this combination
- Minimum: 1 partner
- Recommended: 3-10 partners per combination

#### Partner University Fields

##### `name` (string, required)
- Official name of the partner university
- Examples: "ETH Zurich", "Sorbonne University", "University of Edinburgh"

##### `city` (string, required)
- City where the partner university is located
- Examples: "Zurich", "Paris", "Edinburgh"

##### `country` (string, required)
- Country name (must match one of the supported Erasmus countries)
- Supported countries: Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Greece, Hungary, Iceland, Ireland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden, Switzerland, United Kingdom

##### `monthlyLivingCost` (number, required)
- Estimated monthly living cost in EUR
- Based on 2026 projected inflation rates
- Includes: accommodation, food, transport, utilities, leisure
- Typical ranges:
  - High-cost cities (Switzerland, Scandinavia, UK): 1100-1500 EUR
  - Medium-cost cities (France, Germany, Netherlands): 900-1200 EUR
  - Lower-cost cities (Eastern Europe, Southern Europe): 550-850 EUR

##### `travelCost` (number, required)
- One-time travel cost in EUR
- Estimated flight/train cost from Germany to the destination
- Typical ranges: 100-200 EUR for European destinations

##### `insuranceCost` (number, required)
- Monthly health insurance cost in EUR
- Required international health insurance for Erasmus students
- Typical ranges: 35-90 EUR/month depending on country

## Erasmus Grant Amounts (2026)

Grants are automatically calculated based on the destination country. The system uses the following amounts:

- **€390/month**: Austria, Belgium, Denmark, Finland, France, Iceland, Ireland, Italy, Liechtenstein, Luxembourg, Netherlands, Norway, Sweden, Switzerland, United Kingdom
- **€330/month**: Cyprus, Czech Republic, Greece, Malta, Portugal, Slovenia, Spain, Bulgaria, Croatia, Estonia, Hungary, Latvia, Lithuania, Poland, Romania, Slovakia

## Data Population Strategy

### Step 1: Identify German Universities

Use the existing `data/universities.json` file as your source for German university names. Ensure exact name matching.

### Step 2: List Degree Programs

For each university, identify available degree programs. Common programs include:

- Computer Science / Informatik
- Business Administration / BWL
- Mechanical Engineering / Maschinenbau
- Electrical Engineering / Elektrotechnik
- Medicine / Medizin
- Law / Jura
- Economics / Wirtschaftswissenschaften
- Psychology / Psychologie
- Natural Sciences / Naturwissenschaften
- etc.

### Step 3: Find Erasmus Partners

For each university + program combination, research:
1. Official Erasmus partnership agreements
2. University International Office websites
3. Existing exchange program databases

### Step 4: Gather Cost Data

For each partner university, research:
1. **Living Costs**: Use university cost-of-living estimates, Numbeo, or official student cost guides
2. **Travel Costs**: Use flight/train booking sites for estimates
3. **Insurance Costs**: Check requirements for the specific country

**Important**: Use 2026 projected costs (account for inflation)

### Step 5: Format and Add Data

1. Use the template structure
2. Ensure JSON is valid (use a JSON validator)
3. Maintain consistent naming conventions
4. Add entries to `erasmus-partners.json` in alphabetical order (by university, then by program)

## Example: Adding New Data

```json
{
  "germanUniversity": "RWTH Aachen University",
  "courseOfStudy": "Electrical Engineering",
  "partners": [
    {
      "name": "TU Delft",
      "city": "Delft",
      "country": "Netherlands",
      "monthlyLivingCost": 1150,
      "travelCost": 100,
      "insuranceCost": 60
    },
    {
      "name": "KTH Royal Institute of Technology",
      "city": "Stockholm",
      "country": "Sweden",
      "monthlyLivingCost": 1250,
      "travelCost": 180,
      "insuranceCost": 70
    }
  ]
}
```

## Validation Checklist

Before adding data, verify:

- [ ] German university name matches `universities.json` exactly
- [ ] Course of study name is in English and consistent
- [ ] Partner country is in the supported Erasmus countries list
- [ ] All numeric values are positive numbers
- [ ] JSON syntax is valid
- [ ] Cost estimates reflect 2026 projected values
- [ ] City and country names are spelled correctly
- [ ] No duplicate partner entries for the same combination

## Maintenance

- Review and update cost data annually
- Verify Erasmus grant amounts when they change
- Remove discontinued partnerships
- Add new partnerships as they become available
- Keep university names synchronized with `universities.json`

## Notes

- The data structure is intentionally flat and simple (no nested hierarchies)
- No group classifications are used - grants are determined by country
- Multiple entries for the same university + program are allowed (they will be merged in the UI)
- The system automatically filters and displays partners based on user selection

