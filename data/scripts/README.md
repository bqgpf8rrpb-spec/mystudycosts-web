# NC Data Update Script

This script automatically fetches and updates NC (Numerus Clausus) thresholds for all study programs in the database.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Sources

Edit `fetch_ncs.py` and implement the `fetch_nc_from_api()` function with your actual data sources:

- **Hochschulkompass API**: Official German university database
- **University Websites**: Direct scraping from university pages
- **Custom APIs**: Any other NC data sources

### Example Implementation

```python
def fetch_nc_from_api(university_name: str, program_name: str) -> Optional[float]:
    """Example: Fetch from Hochschulkompass API"""
    try:
        # Replace with actual API endpoint
        response = requests.get(
            'https://www.hochschulkompass.de/api/v1/nc-data',
            params={
                'university': university_name,
                'program': program_name,
                'semester': '2025/26'
            },
            headers={'Authorization': f'Bearer {API_KEY}'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return float(data.get('nc_threshold', 0.0))
        
        return None
    except Exception as e:
        logger.warning(f"API error: {e}")
        return None
```

## Usage

### Manual Run

```bash
python data/scripts/fetch_ncs.py
```

### GitHub Actions

The script runs automatically every Monday at 3:00 AM UTC via GitHub Actions.

To trigger manually:
1. Go to GitHub Actions tab
2. Select "Update NC Data" workflow
3. Click "Run workflow"

## Features

- ✅ **Error Handling**: Continues processing even if individual updates fail
- ✅ **Backup Creation**: Creates backup before making changes
- ✅ **Diff Checking**: Only commits if data actually changed
- ✅ **Logging**: Detailed logs for debugging
- ✅ **Statistics**: Reports update counts and errors

## Output

The script will:
1. Load current `university_programs.json`
2. Create a backup file
3. Fetch latest NC data for all programs
4. Update the JSON file if changes are detected
5. Log statistics about the update process

## GitHub Actions Secrets

Required secrets for Vercel deployment:
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

To find these:
1. Go to Vercel Dashboard → Settings → General
2. Copy the Organization ID and Project ID
3. Create a token at Vercel Dashboard → Settings → Tokens

## Notes

- The script handles both old (string) and new (object) program formats
- NC-free programs (nc_threshold = 0.0) are preserved
- Failed updates don't break the entire process
- The workflow uses `[skip ci]` in commit messages to avoid infinite loops

