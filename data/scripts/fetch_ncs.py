#!/usr/bin/env python3
"""Entry point for the modular NC scraping pipeline."""

from nc_pipeline.runner import run_pipeline


if __name__ == "__main__":
    raise SystemExit(run_pipeline())

