import os
import json
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_FILE = os.path.join(DATA_DIR, 'trending_hf.json')

HF_CACHE = {}
CACHE_TTL = 900

def get_huggingface_trending(entity_type='models'):
    """Lấy danh sách Trending Models hoặc Datasets từ Hugging Face API miễn phí."""
    cache_key = entity_type
    now = time.time()

    if cache_key in HF_CACHE and now - HF_CACHE[cache_key]['timestamp'] < CACHE_TTL:
        return HF_CACHE[cache_key]['data']

    # Try disk cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                disk = json.load(f)
                if cache_key in disk and now - disk[cache_key].get('timestamp', 0) < CACHE_TTL:
                    HF_CACHE[cache_key] = disk[cache_key]
                    return disk[cache_key]['data']
        except Exception:
            pass

    endpoint = f"https://huggingface.co/api/{entity_type}?sort=trendingScore&direction=-1&limit=25"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarHub/1.0',
        'Accept': 'application/json'
    }

    try:
        req = urllib.request.Request(endpoint, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode('utf-8'))

        results = []
        for rank, item in enumerate(raw, 1):
            model_id = item.get('id') or item.get('_id') or ''
            owner = model_id.split('/')[0] if '/' in model_id else ''
            name = model_id.split('/')[1] if '/' in model_id else model_id
            
            likes = item.get('likes', 0)
            downloads = item.get('downloads', 0)
            pipeline_tag = item.get('pipeline_tag') or item.get('task') or 'Model'
            tags = item.get('tags', [])[:5]

            results.append({
                "rank": rank,
                "full_name": model_id,
                "owner": owner,
                "name": name,
                "url": f"https://huggingface.co/{model_id}",
                "description": f"Pipeline: {pipeline_tag} | Downloads: {downloads:,} | Likes: {likes:,}",
                "pipeline_tag": pipeline_tag,
                "likes": likes,
                "downloads": downloads,
                "tags": tags,
                "source": "huggingface",
                "type": entity_type
            })

        HF_CACHE[cache_key] = {'timestamp': now, 'data': results}
        
        # Save disk cache
        try:
            disk = {}
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    disk = json.load(f)
            disk[cache_key] = {'timestamp': now, 'data': results}
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(disk, f, ensure_ascii=False)
        except Exception:
            pass

        return results

    except Exception as e:
        print(f"[!] Hugging Face fetch error: {e}")
        # Fallback if available
        if cache_key in HF_CACHE:
            return HF_CACHE[cache_key]['data']
        return []
