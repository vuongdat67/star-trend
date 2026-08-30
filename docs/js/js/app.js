/**
 * Jet-Black Charcoal Stars, Trending, Academic Conferences, arXiv & CVE Hub
 * Supports both local server mode (/api/...) and static GitHub Pages mode (./data/....json)
 */

// ── Static / Server mode detection ──────────────────────────────────────
// Local Python server runs on port 5000 → server mode (/api/ routes).
// GitHub Pages or http.server on any other port → static mode (./data/*.json).
const _STATIC_MODE = !(window.location.port === '5000');
const DATA_BASE = _STATIC_MODE
  ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)
  : '';

const state = {
  platform: 'github',            // 'github' | 'huggingface'
  feedMode: 'trending',          // 'trending' | 'stars' | 'new' | 'pulse'
  radarSubfilter: 'all',         // 'all' | 'conf' | 'arxiv' | 'hf' | 'cve' | 'hn' | 'x' | 'labs'
  period: 'daily',               // 'daily' | 'weekly' | 'monthly'
  layout: localStorage.getItem('layout') || 'layout-grid-3',
  sidebarHidden: localStorage.getItem('sidebarHidden') === 'true',
  searchQuery: '',
  selectedLang: '',
  selectedCategory: '',
  selectedTopic: '',
  selectedSort: 'default',
  theme: localStorage.getItem('theme') || 'dark',
  showAllTags: false,
  pageSize: parseInt(localStorage.getItem('pageSize') || '24', 10),
  renderedCount: 0,
  isLoadingMore: false,

  // Datasets
  starsRepos: [],
  stats: {},
  trendingRepos: [],
  freshRepos: [],
  hfTrending: [],
  aiPulse: [],
  notesData: { bookmarks: [], notes: {} },
  activeNoteTarget: null
};

// General Category Rules
const CATEGORY_RULES = [
  { name: '🤖 AI & LLM Agents', keywords: ['ai', 'llm', 'claude', 'gpt', 'agent', 'mcp', 'openai', 'anthropic', 'prompt', 'rag', 'deepseek', 'langchain', 'llama', 'machine-learning', 'neurips', 'iclr', 'icml'] },
  { name: '🛠️ Dev Tools & CLI', keywords: ['cli', 'terminal', 'devtools', 'developer-tools', 'automation', 'productivity', 'tool', 'workflow', 'git', 'scraper', 'powershell', 'shell'] },
  { name: '🛡️ Security & CVE / RE', keywords: ['security', 'cybersecurity', 'malware', 'exploit', 'reverse-engineering', 'decompiler', 'disassembler', 'pentest', 'vulnerability', 'cve', 'cwe', 'hack', 'antivirus', 'ieee-sp', 'usenix', 'ndss'] },
  { name: '📚 Tutorials & Docs', keywords: ['awesome', 'tutorial', 'learning', 'interview', 'roadmap', 'book', 'courses', 'education', 'algorithms'] },
  { name: '🌐 Web & Backend', keywords: ['react', 'vue', 'nextjs', 'tailwind', 'frontend', 'backend', 'web', 'fastapi', 'flask', 'django', 'express', 'nodejs'] },
  { name: '⚙️ Systems & Low-Level', keywords: ['rust', 'c++', 'kernel', 'driver', 'windows', 'linux', 'operating-system', 'embedded', 'compiler', 'database', 'wasm', 'osdi', 'sosp'] }
];

function classifyItem(item) {
  const text = `${(item.topics || item.tags || []).join(' ')} ${item.description || item.summary || ''} ${item.full_name || item.name || item.title || ''}`.toLowerCase();
  for (const cat of CATEGORY_RULES) {
    if (cat.keywords.some(k => text.includes(k))) return cat.name;
  }
  return '📦 Miscellaneous';
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  applyLayout(state.layout);
  applySidebarState(state.sidebarHidden);

  const pageLimitSelect = document.getElementById('page-limit-select');
  if (pageLimitSelect) pageLimitSelect.value = state.pageSize.toString();

  setupScrollObserver();

  // Load all initial datasets concurrently
  await Promise.all([
    fetchStarsData(),
    fetchNotesData(),
    fetchTrendingData(),
    fetchFreshData(),
    fetchHFTrending(),
    fetchAIPulse()
  ]);

  lucide.createIcons();
});

// ==================== THEME & LAYOUT ====================
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    lucide.createIcons();
  }
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function applyLayout(layoutClass) {
  state.layout = layoutClass;
  localStorage.setItem('layout', layoutClass);
  const container = document.getElementById('cards-feed-container');
  if (container) {
    container.className = `cards-feed-grid ${layoutClass}`;
  }

  document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
  const btnId = layoutClass === 'layout-grid-3' ? 'layout-btn-3' : (layoutClass === 'layout-grid-2' ? 'layout-btn-2' : 'layout-btn-1');
  const activeBtn = document.getElementById(btnId);
  if (activeBtn) activeBtn.classList.add('active');
}

function switchLayout(layoutClass) {
  applyLayout(layoutClass);
}

function applySidebarState(hidden) {
  state.sidebarHidden = hidden;
  localStorage.setItem('sidebarHidden', hidden.toString());
  const grid = document.getElementById('main-layout-grid');
  if (grid) {
    if (hidden) {
      grid.classList.add('sidebar-hidden');
    } else {
      grid.classList.remove('sidebar-hidden');
    }
  }
}

function toggleSidebarVisibility() {
  applySidebarState(!state.sidebarHidden);
  showToast(state.sidebarHidden ? 'Đã ẩn Sidebar để mở rộng không gian' : 'Đã hiện Sidebar danh mục');
}

function handlePageLimitChange(val) {
  state.pageSize = parseInt(val, 10);
  localStorage.setItem('pageSize', val);
  renderFeed();
}

// ==================== DATA FETCHERS (server + static mode) ====================
async function fetchStarsData() {
  try {
    const url = _STATIC_MODE ? DATA_BASE + 'data/stars.json' : '/api/stars';
    const res = await fetch(url);
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
  if (_STATIC_MODE) {
    try {
      const raw = localStorage.getItem('notesData');
      state.notesData = raw ? JSON.parse(raw) : { bookmarks: [], notes: {} };
    } catch { state.notesData = { bookmarks: [], notes: {} }; }
    return;
  }
  try {
    const res = await fetch('/api/notes');
    state.notesData = await res.json();
  } catch (err) {
    console.error('Notes fetch error:', err);
  }
}

async function fetchTrendingData() {
  try {
    let repos;
    if (_STATIC_MODE) {
      const period = state.period || 'daily';
      const res = await fetch(DATA_BASE + `data/trending_${period}.json`);
      const data = await res.json();
      repos = data.repos || [];
      if (state.selectedLang) {
        repos = repos.filter(r => (r.language || '').toLowerCase() === state.selectedLang.toLowerCase());
      }
    } else {
      const lang = encodeURIComponent(state.selectedLang);
      const since = encodeURIComponent(state.period);
      const res = await fetch(`/api/trending?language=${lang}&since=${since}`);
      const data = await res.json();
      repos = data.repos || [];
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
    let repos;
    if (_STATIC_MODE) {
      const res = await fetch(DATA_BASE + 'data/fresh.json');
      const data = await res.json();
      repos = data.repos || [];
      if (state.selectedLang) {
        repos = repos.filter(r => (r.language || '').toLowerCase() === state.selectedLang.toLowerCase());
      }
    } else {
      const lang = encodeURIComponent(state.selectedLang);
      const res = await fetch(`/api/fresh?language=${lang}`);
      const data = await res.json();
      repos = data.repos || [];
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
    const url = _STATIC_MODE ? DATA_BASE + 'data/hf_trending.json' : '/api/hf-trending?type=models';
    const res = await fetch(url);
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
    const url = _STATIC_MODE ? DATA_BASE + 'data/ai_pulse.json' : '/api/ai-pulse';
    const res = await fetch(url);
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

// ==================== EXACT USER MOMENTUM TICKER ====================
function renderTicker() {
  const marquee = document.getElementById('ticker-marquee');
  if (!marquee) return;

  const items = state.trendingRepos.length > 0 ? state.trendingRepos : state.starsRepos.slice(0, 15);
  if (items.length === 0) return;

  const doubleList = [...items, ...items];
  let html = '';

  doubleList.forEach((r, idx) => {
    const rank = r.rank || (idx % items.length + 1);
    const owner = r.owner || (r.full_name ? r.full_name.split('/')[0] : 'github');
    const name = r.name || (r.full_name ? r.full_name.split('/')[1] : r.full_name);
    const avatarUrl = `https://github.com/${owner}.png?size=40`;
    const starsFormatted = formatNumber(r.stars);
    const gainFormatted = r.stars_since ? (r.stars_since.startsWith('+') ? r.stars_since : `+${r.stars_since}`) : '+1.2k';

    html += `
      <a href="${r.url || r.html_url}" target="_blank" class="ticker-card-item">
        <img class="ticker-avatar" src="${avatarUrl}" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
        <span class="ticker-rank-pill">GH #${rank}</span>
        <span class="ticker-name-text">${name}</span>
        <span class="ticker-stars-text">★ ${starsFormatted}</span>
        <span class="ticker-momentum-pill">↗ ${gainFormatted}</span>
      </a>
    `;
  });

  marquee.innerHTML = html;
}

// ==================== RADAR SUB-FILTERS ====================
function renderRadarSubfilters() {
  const bar = document.getElementById('radar-subfilters');
  if (!bar) return;

  if (state.feedMode !== 'pulse') {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';

  const counts = {
    all: state.aiPulse.length,
    conf: state.aiPulse.filter(i => i.category && i.category.includes('Hội Nghị')).length,
    arxiv: state.aiPulse.filter(i => i.category && i.category.includes('arXiv')).length,
    hf: state.aiPulse.filter(i => i.category && i.category.includes('Hugging Face')).length,
    cve: state.aiPulse.filter(i => i.source.includes('CVE') || (i.category && i.category.includes('CVE'))).length,
    hn: state.aiPulse.filter(i => i.source.includes('Hacker News')).length,
    x: state.aiPulse.filter(i => i.source.includes('X (Twitter)')).length,
    labs: state.aiPulse.filter(i => i.category && i.category.includes('Lab')).length
  };

  bar.innerHTML = `
    <button class="radar-filter-pill ${state.radarSubfilter === 'all' ? 'active' : ''}" onclick="selectRadarSubfilter('all')">
      📌 Tất cả (${counts.all})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'conf' ? 'active' : ''}" onclick="selectRadarSubfilter('conf')">
      🏛️ Hội Nghị Đỉnh Cao (${counts.conf})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'arxiv' ? 'active' : ''}" onclick="selectRadarSubfilter('arxiv')">
      📄 arXiv Preprints (${counts.arxiv})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'hf' ? 'active' : ''}" onclick="selectRadarSubfilter('hf')">
      🧪 HF Papers (${counts.hf})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'cve' ? 'active' : ''}" onclick="selectRadarSubfilter('cve')">
      🛡️ Lỗ Hổng CVE/CWE (${counts.cve})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'hn' ? 'active' : ''}" onclick="selectRadarSubfilter('hn')">
      📰 Hacker News (${counts.hn})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'x' ? 'active' : ''}" onclick="selectRadarSubfilter('x')">
      🌐 X Trends (${counts.x})
    </button>
    <button class="radar-filter-pill ${state.radarSubfilter === 'labs' ? 'active' : ''}" onclick="selectRadarSubfilter('labs')">
      🤖 AI Labs (${counts.labs})
    </button>
  `;
}

function selectRadarSubfilter(sub) {
  state.radarSubfilter = sub;
  renderRadarSubfilters();
  renderSidebar();
  renderFeed();
}

// ==================== DYNAMIC SIDEBAR (AUTO-ADAPTS TO CURRENT VIEW) ====================
function getRawItemsForCurrentView() {
  if (state.feedMode === 'pulse') {
    if (state.radarSubfilter === 'conf') return state.aiPulse.filter(i => i.category && i.category.includes('Hội Nghị'));
    if (state.radarSubfilter === 'arxiv') return state.aiPulse.filter(i => i.category && i.category.includes('arXiv'));
    if (state.radarSubfilter === 'hf') return state.aiPulse.filter(i => i.category && i.category.includes('Hugging Face'));
    if (state.radarSubfilter === 'cve') return state.aiPulse.filter(i => i.source.includes('CVE') || (i.category && i.category.includes('CVE')));
    if (state.radarSubfilter === 'hn') return state.aiPulse.filter(i => i.source.includes('Hacker News'));
    if (state.radarSubfilter === 'x') return state.aiPulse.filter(i => i.source.includes('X (Twitter)'));
    if (state.radarSubfilter === 'labs') return state.aiPulse.filter(i => i.category && i.category.includes('Lab'));
    return state.aiPulse;
  }
  if (state.platform === 'huggingface') return state.hfTrending;
  if (state.feedMode === 'stars') return state.starsRepos;
  if (state.feedMode === 'trending') return state.trendingRepos;
  if (state.feedMode === 'new') return state.freshRepos;
  return [];
}

function renderSidebar() {
  const items = getRawItemsForCurrentView();

  const catCounter = {};
  const topicCounter = {};

  items.forEach(item => {
    let cat = '';
    if (state.platform === 'huggingface') {
      cat = item.pipeline_tag ? `🎯 ${item.pipeline_tag}` : '📦 Models';
    } else if (state.feedMode === 'pulse') {
      cat = item.category ? `${item.category}` : '📰 Tech News';
    } else {
      cat = classifyItem(item);
    }
    catCounter[cat] = (catCounter[cat] || 0) + 1;

    const tags = item.topics || item.tags || (item.language ? [item.language.toLowerCase()] : []);
    tags.forEach(t => {
      const cleanT = t.toLowerCase().trim();
      if (cleanT) topicCounter[cleanT] = (topicCounter[cleanT] || 0) + 1;
    });
  });

  // Render Categories List
  const catContainer = document.getElementById('sidebar-categories-list');
  if (catContainer) {
    let catHtml = `
      <div class="cat-row ${state.selectedCategory === '' ? 'active' : ''}" onclick="selectCategoryFilter('')">
        <span>Tất cả danh mục</span>
        <span class="cat-num">${items.length}</span>
      </div>
    `;

    Object.keys(catCounter).sort((a, b) => catCounter[b] - catCounter[a]).forEach(c => {
      catHtml += `
        <div class="cat-row ${state.selectedCategory === c ? 'active' : ''}" onclick="selectCategoryFilter('${c}')">
          <span>${c}</span>
          <span class="cat-num">${catCounter[c]}</span>
        </div>
      `;
    });

    catContainer.innerHTML = catHtml;
  }

  // Render Topics Cloud
  const topicsContainer = document.getElementById('sidebar-topics-cloud');
  if (topicsContainer) {
    const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
    const limit = state.showAllTags ? 60 : 18;
    const sliceTopics = sortedTopics.slice(0, limit);

    let topicHtml = `
      <span class="topic-pill ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">
        #tất_cả
      </span>
      <span class="topic-pill ${state.selectedTopic === 'bookmarked' ? 'active' : ''}" onclick="selectTopicFilter('bookmarked')">
        ⭐ #bookmark (${state.notesData.bookmarks.length})
      </span>
    `;

    sliceTopics.forEach(t => {
      topicHtml += `
        <span class="topic-pill ${state.selectedTopic === t.name || state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
          #${t} <span style="opacity: 0.6; font-size: 0.85em;">${topicCounter[t]}</span>
        </span>
      `;
    });

    topicsContainer.innerHTML = topicHtml;

    const toggleBtn = document.getElementById('toggle-more-tags-btn');
    if (toggleBtn) {
      toggleBtn.textContent = state.showAllTags ? 'Thu gọn bớt topics' : `+ Xem thêm (${Math.max(0, sortedTopics.length - 18)} topics)`;
    }
  }

  lucide.createIcons();
}

function toggleMoreTags() {
  state.showAllTags = !state.showAllTags;
  renderSidebar();
}

function selectCategoryFilter(cat) {
  state.selectedCategory = cat;
  renderSidebar();
  renderFeed();
}

function selectTopicFilter(topic) {
  state.selectedTopic = topic;
  renderSidebar();
  renderFeed();
}

// ==================== PLATFORM & MODE SWITCHING ====================
function switchPlatformSource(platform) {
  state.platform = platform;
  state.selectedCategory = '';
  state.selectedTopic = '';

  document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`source-btn-${platform === 'github' ? 'github' : 'hf'}`);
  if (activeBtn) activeBtn.classList.add('active');

  const periodGroup = document.getElementById('period-switch-group');
  if (periodGroup) {
    periodGroup.style.display = platform === 'github' ? 'flex' : 'none';
  }

  if (platform === 'huggingface') {
    state.selectedLang = '';
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = '';
  }

  renderRadarSubfilters();
  renderSidebar();
  renderFeed();
}

function switchFeedMode(mode) {
  state.feedMode = mode;
  state.selectedCategory = '';
  state.selectedTopic = '';

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`mode-btn-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  if (mode === 'new' && state.freshRepos.length === 0) {
    fetchFreshData();
  }

  renderRadarSubfilters();
  renderSidebar();
  renderFeed();
}

function changePeriod(period) {
  state.period = period;
  document.querySelectorAll('#period-switch-group .tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`period-${period}`);
  if (activeBtn) activeBtn.classList.add('active');
  fetchTrendingData();
}

function handleSearch(val) {
  state.searchQuery = val.trim().toLowerCase();
  renderFeed();
}

function handleLangChange() {
  state.selectedLang = document.getElementById('lang-select').value;
  if (state.feedMode === 'trending') {
    fetchTrendingData();
  } else if (state.feedMode === 'new') {
    fetchFreshData();
  } else {
    renderFeed();
  }
}

function handleSortChange() {
  state.selectedSort = document.getElementById('sort-select').value;
  renderFeed();
}

// ==================== DATA FILTERING & FEED ====================
function getActiveItems() {
  let list = getRawItemsForCurrentView();

  // 1. Text Search
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(r => {
      const matchName = (r.full_name || r.title || '').toLowerCase().includes(q);
      const matchDesc = (r.description || r.summary || '').toLowerCase().includes(q);
      const matchLang = (r.language || r.pipeline_tag || r.source || '').toLowerCase().includes(q);
      const matchTopics = (r.topics || r.tags || []).some(t => t.toLowerCase().includes(q));
      const matchNote = (state.notesData.notes[r.full_name]?.text || '').toLowerCase().includes(q);
      return matchName || matchDesc || matchLang || matchTopics || matchNote;
    });
  }

  // 2. Language Filter
  if (state.selectedLang && state.platform === 'github') {
    list = list.filter(r => (r.language || '').toLowerCase() === state.selectedLang.toLowerCase());
  }

  // 3. Category Filter
  if (state.selectedCategory) {
    list = list.filter(r => {
      if (state.platform === 'huggingface') {
        return `🎯 ${r.pipeline_tag}` === state.selectedCategory || state.selectedCategory.includes(r.pipeline_tag || '');
      }
      if (state.feedMode === 'pulse') {
        return r.category === state.selectedCategory || (r.category && state.selectedCategory.includes(r.category));
      }
      return classifyItem(r) === state.selectedCategory || (r.categories || []).includes(state.selectedCategory);
    });
  }

  // 4. Topic Filter
  if (state.selectedTopic) {
    if (state.selectedTopic === 'bookmarked') {
      list = list.filter(r => state.notesData.bookmarks.includes(r.full_name));
    } else {
      list = list.filter(r => (r.topics || r.tags || (r.language ? [r.language.toLowerCase()] : [])).map(t => t.toLowerCase()).includes(state.selectedTopic.toLowerCase()));
    }
  }

  // 5. Sorting
  if (state.selectedSort === 'stars-desc') {
    list.sort((a, b) => (b.stars || b.likes || b.upvotes || 0) - (a.stars || a.likes || a.upvotes || 0));
  } else if (state.selectedSort === 'date-desc') {
    list.sort((a, b) => (b.starred_at || b.published_at || '').localeCompare(a.starred_at || a.published_at || ''));
  } else if (state.selectedSort === 'name-asc') {
    list.sort((a, b) => (a.full_name || a.title || '').localeCompare(b.full_name || b.title || ''));
  }

  return list;
}

function renderFeed() {
  const container = document.getElementById('cards-feed-container');
  const sentinel = document.getElementById('scroll-sentinel');
  if (!container) return;

  const items = getActiveItems();
  state.renderedCount = Math.min(state.pageSize, items.length);

  document.getElementById('displayed-count-label').textContent = items.length.toLocaleString();

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 16px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border);">
        <i data-lucide="inbox" style="width: 32px; height: 32px; margin-bottom: 6px; opacity: 0.5;"></i>
        <h4 style="font-size: 14px; margin-bottom: 4px; color: var(--text-main);">Không tìm thấy mục nào</h4>
        <p style="font-size: 12px;">Hãy thử xóa bộ lọc danh mục/topic hoặc chọn tab khác.</p>
      </div>
    `;
    if (sentinel) sentinel.style.display = 'none';
    lucide.createIcons();
    return;
  }

  container.innerHTML = '';
  renderCardsBatch(items.slice(0, state.renderedCount));

  if (sentinel) {
    sentinel.style.display = state.renderedCount < items.length ? 'block' : 'none';
  }
}

function renderCardsBatch(batch) {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  const fragment = document.createDocumentFragment();

  batch.forEach((r, idx) => {
    const isBookmarked = state.notesData.bookmarks.includes(r.full_name);
    const hasNote = Boolean(state.notesData.notes[r.full_name]?.text);
    const rank = r.rank || (idx + 1);

    const card = document.createElement('div');
    card.className = 'project-card';

    // RENDER AI PULSE / CONFERENCES / ARXIV / CVE / X / HN
    if (state.feedMode === 'pulse') {
      let severityBadge = '';
      if (r.badge && r.badge.includes('CRITICAL')) severityBadge = 'cve-critical';
      else if (r.badge && r.badge.includes('HIGH')) severityBadge = 'cve-high';
      else if (r.badge && r.badge.includes('MEDIUM')) severityBadge = 'cve-medium';

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-block">
            <span class="badge-tag">${r.source}</span>
            <span class="badge-tag ${severityBadge}">${r.badge}</span>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-faint);">${r.published_at || ''}</span>
        </div>

        <a href="${r.url}" target="_blank" class="card-title-link" style="font-size: 14px;">
          ${r.title}
          <i data-lucide="arrow-up-right" style="width: 13px; height: 13px; opacity: 0.7; margin-left: 2px;"></i>
        </a>

        <div class="card-desc-text">${r.summary || ''}</div>

        <div class="card-footer-row">
          <div class="domain-chips-list">
            ${(r.tags || []).map(t => `<span class="domain-chip" onclick="selectTopicFilter('${t}')">#${t}</span>`).join('')}
          </div>
          ${r.upvotes ? `<span style="color: var(--pill-amber-text); font-family: var(--font-mono);">★ ${r.upvotes}</span>` : (r.authors ? `<span style="color: var(--text-muted);">${r.authors}</span>` : '')}
        </div>
      `;
      fragment.appendChild(card);
      return;
    }

    // RENDER REPO / HF MODEL CARD
    const owner = r.owner || (r.full_name ? r.full_name.split('/')[0] : 'github');
    const avatarUrl = `https://github.com/${owner}.png?size=40`;
    let badgesHtml = '';
    if (rank <= 3 && state.feedMode === 'trending') badgesHtml += `<span class="badge-tag">Top ${rank}</span>`;
    if (r.type === 'models') badgesHtml += `<span class="badge-tag">🤗 Model</span>`;
    if (r.type === 'datasets') badgesHtml += `<span class="badge-tag">📊 Dataset</span>`;

    const starsStr = formatNumber(r.stars || r.likes || 0);
    const forksStr = formatNumber(r.forks || r.downloads || 0);
    const tags = (r.topics || r.tags || (r.language ? [r.language] : [])).slice(0, 3);
    const tagsHtml = tags.map(t => `<span class="domain-chip" onclick="selectTopicFilter('${t}')">${t}</span>`).join('');

    card.innerHTML = `
      <div class="card-header-row">
        <div class="card-title-block">
          <img class="card-avatar" src="${avatarUrl}" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
          <span class="rank-tag">#${rank}</span>
          <a href="${r.url || r.html_url}" target="_blank" class="card-title-link">
            ${r.full_name}
          </a>
          ${badgesHtml}
        </div>

        <div style="display: flex; gap: 4px;">
          <button class="btn-zinc btn-icon" onclick="toggleBookmark('${r.full_name}')" title="${isBookmarked ? 'Bỏ Bookmark' : 'Bookmark'}">
            <i data-lucide="bookmark" style="width: 13px; height: 13px; ${isBookmarked ? 'color: var(--pill-amber-text); fill: var(--pill-amber-text);' : ''}"></i>
          </button>
          <button class="btn-zinc btn-icon" onclick="openNoteModal('${r.full_name}')" title="Ghi chú">
            <i data-lucide="file-text" style="width: 13px; height: 13px; ${hasNote ? 'color: var(--pill-blue-text);' : ''}"></i>
          </button>
        </div>
      </div>

      <div class="card-desc-text">
        ${r.description || 'Không có mô tả.'}
      </div>

      <div class="card-footer-row">
        <div class="domain-chips-list">
          ${tagsHtml || `<span class="domain-chip">${r.language || r.pipeline_tag || 'Code'}</span>`}
        </div>

        <div class="metrics-row">
          <span title="Stars / Likes">
            <i data-lucide="star" style="width: 12px; height: 12px; color: var(--pill-amber-text);"></i>
            <span>${starsStr}</span>
          </span>
          <span title="Forks / Downloads">
            <i data-lucide="git-fork" style="width: 12px; height: 12px;"></i>
            <span>${forksStr}</span>
          </span>
          ${r.stars_since ? `<span style="font-weight: 700; color: var(--pill-green-text);">+${r.stars_since}</span>` : ''}
        </div>
      </div>
    `;

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  lucide.createIcons();
}

// ==================== INFINITE SCROLL ====================
function setupScrollObserver() {
  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !state.isLoadingMore) {
      const items = getActiveItems();
      if (state.renderedCount < items.length) {
        state.isLoadingMore = true;
        const nextBatch = items.slice(state.renderedCount, state.renderedCount + state.pageSize);
        state.renderedCount += nextBatch.length;
        renderCardsBatch(nextBatch);
        state.isLoadingMore = false;
        sentinel.style.display = state.renderedCount < items.length ? 'block' : 'none';
      }
    }
  }, { rootMargin: '250px' });

  observer.observe(sentinel);
}

// ==================== LANGUAGE SELECT ====================
function populateLanguageSelect() {
  const select = document.getElementById('lang-select');
  if (!select) return;

  const langs = state.stats.all_languages || {};
  let opt = '<option value="">Tất cả ngôn ngữ</option>';
  Object.keys(langs).sort().forEach(l => {
    opt += `<option value="${l}">${l} (${langs[l]})</option>`;
  });
  select.innerHTML = opt;
}

// ==================== BOOKMARKS & NOTES ====================
async function toggleBookmark(fullName) {
  const index = state.notesData.bookmarks.indexOf(fullName);
  if (index >= 0) {
    state.notesData.bookmarks.splice(index, 1);
    showToast(`Đã bỏ bookmark ${fullName}`);
  } else {
    state.notesData.bookmarks.push(fullName);
    showToast(`Đã bookmark ${fullName}`);
  }

  renderSidebar();
  renderFeed();

  if (_STATIC_MODE) {
    localStorage.setItem('notesData', JSON.stringify(state.notesData));
  } else {
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.notesData)
      });
    } catch (err) { console.error('Bookmark save error:', err); }
  }
}

function openNoteModal(targetName) {
  state.activeNoteTarget = targetName;
  document.getElementById('modal-repo-title').textContent = `Ghi chú cho ${targetName}`;
  const existing = state.notesData.notes[targetName] || {};
  document.getElementById('note-textarea').value = existing.text || '';
  document.getElementById('note-tags-input').value = (existing.tags || []).join(', ');
  document.getElementById('note-modal').classList.add('open');
  document.getElementById('note-textarea').focus();
}

function closeNoteModal() {
  document.getElementById('note-modal').classList.remove('open');
  state.activeNoteTarget = null;
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
  renderFeed();

  if (_STATIC_MODE) {
    localStorage.setItem('notesData', JSON.stringify(state.notesData));
  } else {
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.notesData)
      });
    } catch (err) { console.error('Note save error:', err); }
  }
}

// ==================== EXPORT & DOWNLOAD ====================
function openExportModal() {
  document.getElementById('export-modal').classList.add('open');
}

function closeExportModal() {
  document.getElementById('export-modal').classList.remove('open');
}

async function triggerCustomExport() {
  if (_STATIC_MODE) {
    // Static mode: download as JSON blob
    showToast('Đang tải xuống dữ liệu...');
    try {
      const blob = new Blob([JSON.stringify({ repos: state.starsRepos, trending: state.trendingRepos, stats: state.stats }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'star-trend-export.json'; a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải xuống star-trend-export.json!');
    } catch (err) { showToast('Lỗi xuất file!', 'error'); }
    return;
  }
  const customPath = document.getElementById('custom-export-path-input').value.trim();
  showToast('Đang tạo và lưu các file...');
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ export_path: customPath || null })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã lưu 4 file vào: ${data.output_dir}`);
    } else {
      showToast(data.error || 'Lỗi xuất file!', 'error');
    }
  } catch (err) {
    showToast('Lỗi khi xuất file!', 'error');
  }
}

async function triggerSync() {
  if (_STATIC_MODE) {
    showToast('Dữ liệu cập nhật hàng ngày qua GitHub Actions!', 'info');
    return;
  }
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) syncBtn.disabled = true;
  showToast('Đang kết nối GitHub API để đồng bộ stars...');
  try {
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Đồng bộ hoàn tất!');
      await fetchStarsData();
    } else {
      showToast(data.error || 'Đồng bộ thất bại!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối khi đồng bộ!', 'error');
  } finally {
    if (syncBtn) syncBtn.disabled = false;
  }
}

// ==================== TOAST ====================
function showToast(message, type = 'success') {
  const box = document.getElementById('toast-box');
  if (!box) return;

  const item = document.createElement('div');
  item.className = 'toast-message';
  item.textContent = message;

  box.appendChild(item);

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transition = 'opacity 0.2s ease';
    setTimeout(() => item.remove(), 200);
  }, 2500);
}
