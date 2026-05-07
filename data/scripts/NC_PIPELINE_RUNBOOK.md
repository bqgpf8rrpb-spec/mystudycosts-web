# NC Pipeline Runbook

This runbook documents operation and rollout controls for the modular NC pipeline.

## Pipeline entry points

- Scrape and normalize NC data: `python data/scripts/fetch_ncs.py`
- Apply normalized updates to canonical data: `python data/scripts/auto_update_nc.py`

## Runtime artifacts

- Raw scrape snapshots: `data/nc_raw/<run_id>/`
- Pipeline reports: `data/nc_reports/<run_id>/`
- University fallback cache: `data/nc_cache/`
- Unmapped records: `data/unmapped_records.json`
- Normalized patch input for auto updater: `data/new_nc_data.json`

## Failure handling model

- Single scraper module failure does **not** fail the entire run.
- If cached data exists and is fresh (`--fallback-cache-ttl-days`), that module is marked as `fallback_cache`.
- Hard failure is triggered only when quality gates are violated:
  - `successful_modules < min_successful_modules`, or
  - `failure_rate > max_failure_rate`.

## Recommended rollout phases

1. Pilot with a small allow-list:
   - `python data/scripts/fetch_ncs.py --universities tum,uni_koeln --strict`
2. Validate mapping quality in `data/unmapped_records.json`.
3. Expand module coverage incrementally.
4. Tighten quality gates as coverage grows.

## Monitoring and alerts

- GitHub Step Summary contains per-run module counts and failure overview.
- Artifacts contain full JSON diagnostics for post-mortem.
- Optional webhook alert:
  - Set `NC_PIPELINE_WEBHOOK_URL` in repository secrets.
  - Alerts are sent for failed modules or hard-fail runs.

