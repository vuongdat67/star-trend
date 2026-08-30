#!/usr/bin/env python3
"""
Automated Sync Script for GitHub Actions Workflow & Local Cron
Syncs:
1. User's Starred Repositories from GitHub API
2. Trending Repositories from GitHub
3. Trending Models & Datasets from Hugging Face
4. AI Research & Announcements Pulse
5. Generates Markdown (by Language, Topic, Timeline), JSON, and CSV files.
"""

import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from services.stars_service import save_stars_data
from services.github_trending_service import get_github_trending
from services.huggingface_service import get_huggingface_trending
from services.ai_pulse_service import get_ai_pulse_data
from services.stats_service import compute_stars_stats
from services.export_service import export_all_markdown_and_csv
import export_stars

def sync_everything(username='vuongdat67'):
    print(f"=======================================================")
    print(f"[*] Starting Automated Sync for @{username}")
    print(f"=======================================================")

    # 1. Fetch Stars
    token = os.getenv('GITHUB_TOKEN') or os.getenv('GH_TOKEN')
    print("[1/4] Fetching latest starred repos from GitHub API...")
    raw_items = export_stars.fetch_all_stars(username, token=token)
    analysis = export_stars.parse_and_analyze(raw_items)
    repos = analysis['repos']
    save_stars_data(repos)
    print(f" -> Saved {len(repos)} starred repositories to data/stars.json")

    # 2. Compute Stats & Export Markdown / CSV
    print("[2/4] Generating Markdown documents & CSV spreadsheet...")
    stats = compute_stars_stats(repos)
    export_all_markdown_and_csv(repos, stats, username)
    print(" -> Generated github_stars.md, github_stars_by_topic.md, github_stars_timeline.md, github_stars.csv")

    # 3. Scrape Trending (GitHub + Hugging Face)
    print("[3/4] Caching latest GitHub & Hugging Face Trending...")
    for period in ['daily', 'weekly', 'monthly']:
        get_github_trending(since=period)
    get_huggingface_trending('models')
    get_huggingface_trending('datasets')
    print(" -> Cached GitHub and HuggingFace trending datasets")

    # 4. Fetch AI News & Papers
    print("[4/4] Aggregating latest AI news & Hugging Face papers...")
    get_ai_pulse_data()
    print(" -> Cached AI Pulse feed")

    print("\n[✓] Automated Sync completed successfully!")

if __name__ == '__main__':
    user = sys.argv[1] if len(sys.argv) > 1 else 'vuongdat67'
    sync_everything(user)
