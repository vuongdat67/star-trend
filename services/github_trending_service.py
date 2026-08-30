import os
import json
import time
import re
import urllib.request
import urllib.error
import urllib.parse
from html import unescape
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_FILE = os.path.join(DATA_DIR, 'trending_github.json')
FRESH_CACHE_FILE = os.path.join(DATA_DIR, 'fresh_github.json')

MEMORY_CACHE = {}
FRESH_CACHE = {}
CACHE_TTL = 900  # 15 phút

def get_fallback_from_disk(file_path, cache_key):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                disk = json.load(f)
                if cache_key in disk:
                    return disk[cache_key].get('data', [])
        except Exception:
            pass
    return []

def save_to_disk(file_path, cache_key, data):
    try:
        disk = {}
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                disk = json.load(f)
        disk[cache_key] = {'timestamp': time.time(), 'data': data}
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(disk, f, ensure_ascii=False)
    except Exception as e:
        print(f"[!] Warning: Could not save cache to disk: {e}")

def scrape_github_html(language='', since='daily'):
    url = f"https://github.com/trending/{language}?since={since}" if language else f"https://github.com/trending?since={since}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache'
    }
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=12) as resp:
        html = resp.read().decode('utf-8')

    articles = re.findall(r'<article class="Box-row">([\s\S]*?)</article>', html)
    results = []

    for rank, art in enumerate(articles, 1):
        # Name from <h2>
        h2_match = re.search(r'<h2[^>]*>([\s\S]*?)</h2>', art)
        full_name = ""
        if h2_match:
            a_match = re.search(r'href="/([^"]+)"', h2_match.group(1))
            if a_match:
                full_name = a_match.group(1).strip().strip('/')
                
        if not full_name or '/' not in full_name:
            continue

        owner = full_name.split('/')[0]
        repo_name = full_name.split('/')[1]

        # Description
        desc_match = re.search(r'<p class="col-9 color-fg-muted my-1[^"]*">([\s\S]*?)</p>', art)
        description = unescape(re.sub(r'<[^>]+>', '', desc_match.group(1)).strip()) if desc_match else ""

        # Language
        lang_match = re.search(r'itemprop="programmingLanguage">([^<]+)<', art)
        language_name = lang_match.group(1).strip() if lang_match else "Others"

        # Language color
        color_match = re.search(r'background-color:\s*([^"\';]+)', art)
        language_color = color_match.group(1).strip() if color_match else "#8b949e"

        # Stars
        stars_match = re.search(r'href="/[^/]+/[^/]+/stargazers"[^>]*>[\s\S]*?</svg>\s*([\d,]+)\s*</a>', art)
        stars = int(stars_match.group(1).replace(',', '')) if stars_match else 0

        # Forks
        forks_match = re.search(r'href="/[^/]+/[^/]+/forks"[^>]*>[\s\S]*?</svg>\s*([\d,]+)\s*</a>', art)
        forks = int(forks_match.group(1).replace(',', '')) if forks_match else 0

        # Stars today/period
        today_match = re.search(r'([\d,]+)\s+stars\s+(today|this week|this month)', art)
        stars_since = today_match.group(1).strip() if today_match else ""
        period_label = today_match.group(2).strip() if today_match else since

        # Contributors
        built_by = re.findall(r'src="https://avatars.githubusercontent.com/u/(\d+)\?[^"]*"[\s\S]*?alt="@([^"]+)"', art)
        contributors = [{"avatar": f"https://avatars.githubusercontent.com/u/{u}?s=40&v=4", "username": user} for u, user in built_by]

        results.append({
            "rank": rank,
            "full_name": full_name,
            "owner": owner,
            "name": repo_name,
            "url": f"https://github.com/{full_name}",
            "description": description,
            "language": language_name,
            "language_color": language_color,
            "stars": stars,
            "forks": forks,
            "stars_since": stars_since,
            "since": since,
            "period_label": period_label,
            "contributors": contributors,
            "source": "github"
        })

    return results

def fallback_github_api_search(language='', since='daily'):
    """Dự phòng khi scraping trang trending bị rate-limit hoặc chặn."""
    days = 1 if since == 'daily' else (7 if since == 'weekly' else 30)
    date_str = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    query = f"created:>{date_str}"
    if language:
        query += f" language:{language}"
        
    url = f"https://api.github.com/search/repositories?q={urllib.parse.quote(query)}&sort=stars&order=desc&per_page=25"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarHub/1.0',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        
    items = data.get('items', [])
    results = []
    for rank, item in enumerate(items, 1):
        results.append({
            "rank": rank,
            "full_name": item.get('full_name', ''),
            "owner": (item.get('owner') or {}).get('login', ''),
            "name": item.get('name', ''),
            "url": item.get('html_url', ''),
            "description": item.get('description') or '',
            "language": item.get('language') or 'Others',
            "language_color": "#8b949e",
            "stars": item.get('stargazers_count', 0),
            "forks": item.get('forks_count', 0),
            "stars_since": str(item.get('stargazers_count', 0)),
            "since": since,
            "period_label": "recent",
            "contributors": [],
            "source": "github_api"
        })
    return results

def get_github_trending(language='', since='daily'):
    cache_key = f"{language}:{since}"
    now = time.time()

    if cache_key in MEMORY_CACHE:
        entry = MEMORY_CACHE[cache_key]
        if now - entry['timestamp'] < CACHE_TTL:
            return entry['data']

    cached_data = get_fallback_from_disk(CACHE_FILE, cache_key)
    if cached_data:
        MEMORY_CACHE[cache_key] = {'timestamp': now, 'data': cached_data}

    try:
        live_data = scrape_github_html(language, since)
        if live_data and len(live_data) > 0:
            MEMORY_CACHE[cache_key] = {'timestamp': now, 'data': live_data}
            save_to_disk(CACHE_FILE, cache_key, live_data)
            return live_data
    except Exception as e:
        print(f"[!] GitHub Trending scrape error for {cache_key}: {e}")

    try:
        api_data = fallback_github_api_search(language, since)
        if api_data and len(api_data) > 0:
            MEMORY_CACHE[cache_key] = {'timestamp': now, 'data': api_data}
            save_to_disk(CACHE_FILE, cache_key, api_data)
            return api_data
    except Exception as e:
        print(f"[!] GitHub API fallback error: {e}")

    return cached_data if cached_data else []

def get_fresh_discoveries(language=''):
    """Lấy danh sách các dự án mới tạo trong 14 ngày gần nhất với đà tăng trưởng cao (>30 stars)."""
    cache_key = f"fresh:{language}"
    now = time.time()

    if cache_key in FRESH_CACHE and now - FRESH_CACHE[cache_key]['timestamp'] < CACHE_TTL:
        return FRESH_CACHE[cache_key]['data']

    disk_cached = get_fallback_from_disk(FRESH_CACHE_FILE, cache_key)
    if disk_cached:
        FRESH_CACHE[cache_key] = {'timestamp': now, 'data': disk_cached}

    date_str = (datetime.now() - timedelta(days=14)).strftime('%Y-%m-%d')
    query = f"created:>{date_str} stars:>20"
    if language:
        query += f" language:{language}"

    url = f"https://api.github.com/search/repositories?q={urllib.parse.quote(query)}&sort=stars&order=desc&per_page=30"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarHub/1.0',
        'Accept': 'application/vnd.github.v3+json'
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        items = data.get('items', [])
        results = []
        for rank, item in enumerate(items, 1):
            created_date = item.get('created_at', '')[:10]
            results.append({
                "rank": rank,
                "full_name": item.get('full_name', ''),
                "owner": (item.get('owner') or {}).get('login', ''),
                "name": item.get('name', ''),
                "url": item.get('html_url', ''),
                "description": item.get('description') or '',
                "language": item.get('language') or 'Others',
                "language_color": "#38bdf8",
                "stars": item.get('stargazers_count', 0),
                "forks": item.get('forks_count', 0),
                "stars_since": f"Mới tạo ({created_date})",
                "since": "new",
                "period_label": f"tạo {created_date}",
                "topics": item.get('topics', []),
                "contributors": [],
                "source": "github_fresh"
            })

        FRESH_CACHE[cache_key] = {'timestamp': now, 'data': results}
        save_to_disk(FRESH_CACHE_FILE, cache_key, results)
        return results

    except Exception as e:
        print(f"[!] Fresh discoveries fetch error: {e}")
        return disk_cached if disk_cached else []
