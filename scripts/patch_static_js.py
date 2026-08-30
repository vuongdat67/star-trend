#!/usr/bin/env python3
"""
Patches docs/js/app.js to work in static mode (GitHub Pages).
Replaces all /api/... fetch calls with ./data/....json equivalents.
Also persists notes/bookmarks to localStorage instead of server.
"""

import os
import re

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs')
JS_PATH = os.path.join(DOCS_DIR, 'js', 'app.js')

STATIC_PATCH = '''
// ==================== STATIC MODE FLAG ====================
const STATIC_MODE = true;
const DATA_BASE = (() => {
  // Works for GitHub Pages: https://user.github.io/repo/ and local file:// 
  const loc = window.location.pathname;
  const base = loc.substring(0, loc.lastIndexOf('/') + 1);
  return base;
})();

// Rewritten fetch helpers for static JSON files
async function fetchStarsData() {
  try {
    const res = await fetch(DATA_BASE + 'data/stars.json');
    const data = await res.json();
    state.starsRepos = data.repos || [];
    state.stats = data.stats || {};
    const counter = document.getElementById('stars-total-count');
    if (counter) counter.textContent = state.starsRepos.length;
    populateLanguageSelect();
    renderSidebar();
    if (state.feedMode === 'stars') renderFeed();
  } catch (err) {
    console.error('Stars fetch error:', err);
  }
}

async function fetchNotesData() {
  // Load from localStorage in static mode
  try {
    const raw = localStorage.getItem('notesData');
    state.notesData = raw ? JSON.parse(raw) : { bookmarks: [], notes: {} };
  } catch (err) {
    state.notesData = { bookmarks: [], notes: {} };
  }
}

async function fetchTrendingData() {
  try {
    const period = state.period || 'daily';
    const res = await fetch(DATA_BASE + `data/trending_${period}.json`);
    const data = await res.json();
    let repos = data.repos || [];
    if (state.selectedLang) {
      repos = repos.filter(r => (r.language || '').toLowerCase() === state.selectedLang.toLowerCase());
    }
    state.trendingRepos = repos;
    renderTicker();
    if (state.platform === 'github' && state.feedMode === 'trending') {
      renderSidebar();
      renderFeed();
    }
  } catch (err) {
    console.error('Trending fetch error:', err);
    state.trendingRepos = [];
  }
}

async function fetchFreshData() {
  try {
    const res = await fetch(DATA_BASE + 'data/fresh.json');
    const data = await res.json();
    let repos = data.repos || [];
    if (state.selectedLang) {
      repos = repos.filter(r => (r.language || '').toLowerCase() === state.selectedLang.toLowerCase());
    }
    state.freshRepos = repos;
    if (state.platform === 'github' && state.feedMode === 'new') {
      renderSidebar();
      renderFeed();
    }
  } catch (err) {
    console.error('Fresh fetch error:', err);
    state.freshRepos = [];
  }
}

async function fetchHFTrending() {
  try {
    const res = await fetch(DATA_BASE + 'data/hf_trending.json');
    const data = await res.json();
    state.hfTrending = data.items || [];
    if (state.platform === 'huggingface') {
      renderSidebar();
      renderFeed();
    }
  } catch (err) {
    console.error('HF fetch error:', err);
    state.hfTrending = [];
  }
}

async function fetchAIPulse() {
  try {
    const res = await fetch(DATA_BASE + 'data/ai_pulse.json');
    const data = await res.json();
    state.aiPulse = data.items || [];
    if (state.feedMode === 'pulse') {
      renderRadarSubfilters();
      renderSidebar();
      renderFeed();
    }
  } catch (err) {
    console.error('AI pulse error:', err);
  }
}

// Bookmark/Notes: save to localStorage
async function toggleBookmark(fullName) {
  const index = state.notesData.bookmarks.indexOf(fullName);
  if (index >= 0) {
    state.notesData.bookmarks.splice(index, 1);
    showToast('Đã bỏ bookmark ' + fullName);
  } else {
    state.notesData.bookmarks.push(fullName);
    showToast('Đã bookmark ' + fullName);
  }
  localStorage.setItem('notesData', JSON.stringify(state.notesData));
  renderSidebar();
  renderFeed();
}

async function saveCurrentNote() {
  if (!state.activeNoteTarget) return;
  const text = document.getElementById('note-textarea').value.trim();
  const rawTags = document.getElementById('note-tags-input').value;
  const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);

  if (text || tags.length > 0) {
    state.notesData.notes[state.activeNoteTarget] = { text, tags, updated_at: new Date().toISOString() };
  } else {
    delete state.notesData.notes[state.activeNoteTarget];
  }

  closeNoteModal();
  showToast('Đã lưu ghi chú!');
  localStorage.setItem('notesData', JSON.stringify(state.notesData));
  renderFeed();
}

// Export: download JSON in static mode
async function triggerCustomExport() {
  showToast('Đang tải xuống dữ liệu...');
  try {
    const blob = new Blob([JSON.stringify({
      repos: state.starsRepos,
      trending: state.trendingRepos,
      stats: state.stats
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'star-trend-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống star-trend-export.json!');
  } catch (err) {
    showToast('Lỗi xuất file!', 'error');
  }
}

// Sync: not available in static mode, inform user
async function triggerSync() {
  showToast('Chế độ tĩnh (GitHub Pages): Dữ liệu cập nhật hàng ngày qua GitHub Actions!', 'info');
}
'''

def patch():
    if not os.path.exists(JS_PATH):
        print(f"[WARN] {JS_PATH} not found, skipping patch.")
        return

    with open(JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the existing fetch functions that we'll replace
    # Find and remove function blocks we're overriding
    funcs_to_remove = [
        'async function fetchStarsData',
        'async function fetchNotesData',
        'async function fetchTrendingData',
        'async function fetchFreshData',
        'async function fetchHFTrending',
        'async function fetchAIPulse',
        'async function toggleBookmark',
        'async function saveCurrentNote',
        'async function triggerCustomExport',
        'async function triggerSync',
    ]

    # Use regex to remove each function body
    for func_name in funcs_to_remove:
        # Match: async function NAME(...) { ... } - handling nested braces
        pattern = rf'{re.escape(func_name)}\([^)]*\)\s*\{{' 
        match = re.search(pattern, content)
        if match:
            start = match.start()
            # Find matching closing brace
            depth = 0
            i = match.end() - 1
            while i < len(content):
                if content[i] == '{':
                    depth += 1
                elif content[i] == '}':
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        # Also eat trailing newlines
                        while end < len(content) and content[end] in '\n\r':
                            end += 1
                        content = content[:start] + content[end:]
                        break
                i += 1

    # Inject static patch at the top (after first comment block)
    insert_after = content.find('\n', content.find('*/') if '*/' in content else 0)
    if insert_after < 0:
        insert_after = 0
    content = content[:insert_after + 1] + STATIC_PATCH + content[insert_after + 1:]

    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    size_kb = os.path.getsize(JS_PATH) // 1024
    print(f"[OK] Patched {JS_PATH} ({size_kb} KB) for static mode")

if __name__ == '__main__':
    patch()
