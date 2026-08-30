#!/usr/bin/env python3
"""
Build Static Data for GitHub Pages.
Runs via GitHub Actions daily: fetches all data and writes JSON files
into docs/data/ so the static frontend can read them without a server.
"""

import sys
import os
import json
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from services.stars_service import save_stars_data
from services.github_trending_service import get_github_trending
from services.huggingface_service import get_huggingface_trending
from services.ai_pulse_service import get_ai_pulse_data
from services.stats_service import compute_stars_stats
from services.export_service import export_all_markdown_and_csv
import export_stars

DOCS_DIR = os.path.join(BASE_DIR, 'docs')
DATA_DIR = os.path.join(DOCS_DIR, 'data')

def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)

def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    size_kb = os.path.getsize(path) // 1024
    print(f"   -> docs/data/{filename} ({size_kb} KB)")

def build_all(username='vuongdat67'):
    print("=" * 55)
    print(f"  Building Static Site Data for @{username}")
    print("=" * 55)

    ensure_dirs()
    token = os.getenv('GITHUB_TOKEN') or os.getenv('GH_TOKEN')

    # 1. Stars data
    print("\n[1/5] Fetching starred repositories...")
    raw_items = export_stars.fetch_all_stars(username, token=token)
    analysis = export_stars.parse_and_analyze(raw_items)
    repos = analysis['repos']
    save_stars_data(repos)
    stats = compute_stars_stats(repos)
    save_json('stars.json', {'repos': repos, 'stats': stats})
    print(f"      {len(repos)} repos saved")

    # 2. Markdown / CSV
    print("\n[2/5] Exporting Markdown & CSV...")
    export_all_markdown_and_csv(repos, stats, username)

    # 3. Trending (daily, weekly, monthly)
    print("\n[3/5] Fetching GitHub trending...")
    for period in ['daily', 'weekly', 'monthly']:
        data = get_github_trending(since=period)
        # get_github_trending returns a list directly
        repos = data if isinstance(data, list) else data.get('repos', [])
        save_json(f'trending_{period}.json', {'repos': repos, 'period': period})

    # 4. Hugging Face
    print("\n[4/5] Fetching Hugging Face trending...")
    hf_models_raw = get_huggingface_trending('models')
    hf_datasets_raw = get_huggingface_trending('datasets')
    # service returns dict with 'data' key or list
    def extract_hf(raw):
        if isinstance(raw, list): return raw
        if isinstance(raw, dict): return raw.get('data', [])
        return []
    all_hf = extract_hf(hf_models_raw) + extract_hf(hf_datasets_raw)
    save_json('hf_trending.json', {'items': all_hf})

    # 5. AI Pulse
    print("\n[5/5] Fetching AI Pulse / Radar...")
    pulse_raw = get_ai_pulse_data()
    # returns dict with 'data' key containing list
    if isinstance(pulse_raw, dict):
        items = pulse_raw.get('data', pulse_raw.get('items', []))
    else:
        items = pulse_raw if isinstance(pulse_raw, list) else []
    save_json('ai_pulse.json', {'items': items})

    # 6. Fresh repos (recently starred)
    print("\n[6/6] Building fresh repos list...")
    sorted_repos = sorted(repos, key=lambda r: r.get('starred_at', ''), reverse=True)
    fresh = sorted_repos[:60]
    save_json('fresh.json', {'repos': fresh})

    # 7. Copy static assets to docs/
    print("\n[*] Copying static frontend to docs/...")
    static_src = os.path.join(BASE_DIR, 'static')
    for item in ['index.html', 'css', 'js']:
        src = os.path.join(static_src, item)
        dst = os.path.join(DOCS_DIR, item)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
        elif os.path.isdir(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    print("\n[✓] Static build completed!")
    print(f"    Site root: {DOCS_DIR}")

if __name__ == '__main__':
    user = sys.argv[1] if len(sys.argv) > 1 else 'vuongdat67'
    build_all(user)
