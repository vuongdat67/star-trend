#!/usr/bin/env python3
"""
CI-safe data build for GitHub Pages.
Only fetches data -> writes to docs/data/ and data/.
Does NOT touch static frontend files (HTML/CSS/JS).
Continues on partial failures so deployment never breaks.
"""

import sys
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DOCS_DATA_DIR = os.path.join(BASE_DIR, 'docs', 'data')
DATA_DIR = os.path.join(BASE_DIR, 'data')


def ensure_dirs():
    os.makedirs(DOCS_DATA_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)


def save_json(filename, data):
    for directory in [DATA_DIR, DOCS_DATA_DIR]:
        path = os.path.join(directory, filename)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            size_kb = os.path.getsize(path) // 1024
            print(f"   -> {os.path.basename(directory)}/{filename} ({size_kb} KB)")
        except Exception as e:
            print(f"   [WARN] Could not save {path}: {e}")


def safe_run(label, fn):
    try:
        result = fn()
        return result
    except Exception as e:
        print(f"   [{label}] FAILED: {e}")
        return None


def extract_list(raw, keys=('data', 'repos', 'items')):
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for k in keys:
            v = raw.get(k)
            if isinstance(v, list):
                return v
    return []


def build_all(username='vuongdat67'):
    print("=" * 55)
    print(f"  CI Data Build — @{username}")
    print("=" * 55)

    ensure_dirs()
    token = os.getenv('GITHUB_TOKEN') or os.getenv('GH_TOKEN')

    # ── 1. Stars ──────────────────────────────────────────────
    print("\n[1/4] Starred repos...")
    try:
        from services.stars_service import save_stars_data
        from services.stats_service import compute_stars_stats
        from services.export_service import export_all_markdown_and_csv
        import export_stars

        raw = export_stars.fetch_all_stars(username, token=token)
        analysis = export_stars.parse_and_analyze(raw)
        repos = analysis['repos']
        save_stars_data(repos)
        stats = compute_stars_stats(repos)
        save_json('stars.json', {'repos': repos, 'stats': stats})

        fresh = sorted(repos, key=lambda r: r.get('starred_at', ''), reverse=True)[:60]
        save_json('fresh.json', {'repos': fresh})

        safe_run('markdown export', lambda: export_all_markdown_and_csv(repos, stats, username))
        print(f"      {len(repos)} repos, {len(fresh)} fresh")
    except Exception as e:
        print(f"   Stars FAILED: {e}")

    # ── 2. GitHub Trending ────────────────────────────────────
    print("\n[2/4] GitHub trending...")
    try:
        from services.github_trending_service import get_github_trending
        for period in ['daily', 'weekly', 'monthly']:
            raw = safe_run(f'trend:{period}', lambda p=period: get_github_trending(since=p))
            repos_list = extract_list(raw) if raw is not None else []
            save_json(f'trending_{period}.json', {'repos': repos_list, 'period': period})
            print(f"      {period}: {len(repos_list)} repos")
    except Exception as e:
        print(f"   Trending FAILED: {e}")

    # ── 3. Hugging Face ───────────────────────────────────────
    print("\n[3/4] Hugging Face trending...")
    try:
        from services.huggingface_service import get_huggingface_trending
        raw_m = safe_run('hf-models', lambda: get_huggingface_trending('models'))
        raw_d = safe_run('hf-datasets', lambda: get_huggingface_trending('datasets'))
        items = extract_list(raw_m) + extract_list(raw_d)
        save_json('hf_trending.json', {'items': items})
        print(f"      {len(items)} items")
    except Exception as e:
        print(f"   HF FAILED: {e}")

    # ── 4. AI Pulse ───────────────────────────────────────────
    print("\n[4/4] AI Pulse...")
    try:
        from services.ai_pulse_service import get_ai_pulse_data
        raw = safe_run('ai-pulse', get_ai_pulse_data)
        items = extract_list(raw, keys=('data', 'items')) if raw else []
        save_json('ai_pulse.json', {'items': items, 'data': items})
        print(f"      {len(items)} items")
    except Exception as e:
        print(f"   AI Pulse FAILED: {e}")

    # ── 5. Static Assets Data (Collections, Dev Tools, Weekly Digest, Jobs) ─────
    print("\n[5/5] Syncing Collections, Dev Tools, Weekly Digest & Jobs...")
    import shutil
    for extra_file in ['collections.json', 'dev_tools.json', 'weekly_digest.json', 'jobs.json']:
        src_path = os.path.join(DATA_DIR, extra_file)
        dst_path = os.path.join(DOCS_DATA_DIR, extra_file)
        if os.path.exists(src_path):
            shutil.copyfile(src_path, dst_path)
            print(f"   -> docs/data/{extra_file} synced")
        elif os.path.exists(dst_path):
            shutil.copyfile(dst_path, src_path)
            print(f"   -> data/{extra_file} synced from docs")

    print("\n[DONE] CI build complete!")


if __name__ == '__main__':
    user = sys.argv[1] if len(sys.argv) > 1 else 'vuongdat67'
    build_all(user)
