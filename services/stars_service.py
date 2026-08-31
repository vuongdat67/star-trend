import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STARS_FILE = os.path.join(DATA_DIR, 'stars.json')
NOTES_FILE = os.path.join(DATA_DIR, 'notes.json')

os.makedirs(DATA_DIR, exist_ok=True)

def load_stars_data():
    """Tải dữ liệu danh sách starred repositories từ file JSON cache."""
    if os.path.exists(STARS_FILE):
        try:
            with open(STARS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    repos = data.get('repos', [])
                elif isinstance(data, list):
                    repos = data
                else:
                    repos = []
                mod_time = datetime.fromtimestamp(os.path.getmtime(STARS_FILE)).strftime('%Y-%m-%d %H:%M:%S')
                return {'repos': repos, 'updated_at': mod_time}
        except Exception as e:
            print(f"[!] Error loading stars.json: {e}")
    return {'repos': [], 'updated_at': 'Never'}

def save_stars_data(repos):
    """Lưu dữ liệu danh sách starred repositories."""
    with open(STARS_FILE, 'w', encoding='utf-8') as f:
        json.dump(repos, f, ensure_ascii=False, indent=2)

def load_notes_data():
    """Tải dữ liệu bookmarks và ghi chú cá nhân."""
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {'bookmarks': [], 'notes': {}}

def save_notes_data(data):
    """Lưu dữ liệu bookmarks và ghi chú cá nhân."""
    with open(NOTES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
