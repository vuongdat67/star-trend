/**
 * Jet-Black Charcoal Stars, Trending, Collections, Stats, Jobs & AI Radar Hub
 * Supports dual-mode: Local Python Server (/api/...) and Static GitHub Pages (./data/*.json)
 * Implements Vui Coding & CyberJutsu Inspired Deep-Dive & Job Radar Architectures
 */

const _STATIC_MODE = !(window.location.port === '5000');

const DATA_BASE = (() => {
  if (!_STATIC_MODE) return '';
  const scripts = document.querySelectorAll('script[src]');
  for (const s of scripts) {
    if (s.src && s.src.includes('app.js')) {
      return s.src.replace(/js\/app\.js.*$/, '');
    }
  }
  const p = window.location.pathname;
  return p.endsWith('/') ? p : p.substring(0, p.lastIndexOf('/') + 1);
})();

const state = {
  platform: 'github',            // 'github' | 'huggingface'
  feedMode: 'trending',          // 'trending' | 'stars' | 'new' | 'pulse' | 'collections' | 'stats' | 'tools' | 'jobs'
  radarSubfilter: 'all',         // 'all' | 'conf' | 'arxiv' | 'hf' | 'cve' | 'hn' | 'x' | 'labs'
  toolsSubfilter: 'all',         // 'all' | 'launch' | 'ai' | 'debug' | 'sec'
  jobsSubfilter: 'all',          // 'all' | 'sec' | 'ai' | 'dev' | 'game' | 'cloud' | 'platforms' | 'insights'
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
  collections: [],
  devTools: [],
  launches: [],
  weeklyDigest: {},
  jobsData: { insights: {}, platforms: [], sample_jobs: [] },
  launchUpvotes: JSON.parse(localStorage.getItem('launchUpvotes') || '{}'),
  notesData: { bookmarks: [], notes: {} },
  activeNoteTarget: null
};

// Dev Quotes
const DEV_QUOTES = [
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
  { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" }
];

// General Category Rules
const CATEGORY_RULES = [
  { name: '🤖 AI & LLM Agents', keywords: ['ai', 'llm', 'claude', 'gpt', 'agent', 'mcp', 'openai', 'anthropic', 'prompt', 'rag', 'deepseek', 'langchain', 'llama', 'machine-learning', 'neurips', 'iclr', 'icml'] },
  { name: '🛠️ Dev Tools & CLI', keywords: ['cli', 'terminal', 'devtools', 'developer-tools', 'automation', 'productivity', 'tool', 'workflow', 'git', 'scraper', 'powershell', 'shell'] },
  { name: '🛡️ Security & CVE / RE', keywords: ['security', 'cybersecurity', 'malware', 'exploit', 'reverse-engineering', 'decompiler', 'disassembler', 'pentest', 'vulnerability', 'cve', 'cwe', 'hack', 'antivirus', 'ieee-sp', 'usenix', 'ndss', 'soc', 'splunk'] },
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

// ── Dual-Mode Resilient Fetcher with Auto-Fallback ─────────────────────
async function fetchWithFallback(apiPath, staticRelPath) {
  // 1. If in server mode, try API first
  if (!_STATIC_MODE && apiPath) {
    try {
      const res = await fetch(apiPath);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`API ${apiPath} failed, falling back to static path...`);
    }
  }

  // 2. Try static file path
  try {
    const res = await fetch(DATA_BASE + staticRelPath);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error(`Failed to load from static ${staticRelPath}:`, e);
  }

  // 3. Fallback: try direct relative path
  try {
    const res = await fetch('./' + staticRelPath);
    if (res.ok) return await res.json();
  } catch (e) {
    // ignore
  }

  return null;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  applyLayout(state.layout);
  applySidebarState(state.sidebarHidden);
  refreshDevQuote();

  const pageLimitSelect = document.getElementById('page-limit-select');
  if (pageLimitSelect) pageLimitSelect.value = state.pageSize.toString();

  setupScrollObserver();

  // Load all initial datasets concurrently with resilient fallback
  await Promise.all([
    fetchStarsData(),
    fetchNotesData(),
    fetchTrendingData(),
    fetchFreshData(),
    fetchHFTrending(),
    fetchAIPulse(),
    fetchCollectionsData(),
    fetchDevToolsData(),
    fetchWeeklyDigestData(),
    fetchJobsData()
  ]);

  renderFeed();
  renderSidebar();
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

  if (window.updateChartsTheme) {
    window.updateChartsTheme(theme);
  }
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function applyLayout(layoutClass) {
  state.layout = layoutClass;
  localStorage.setItem('layout', layoutClass);
  const container = document.getElementById('cards-feed-container');
  if (container && ['trending', 'stars', 'new', 'pulse'].includes(state.feedMode)) {
    container.className = `cards-feed-grid ${layoutClass}`;
  }

  document.querySelectorAll('.layout-toggle-group .layout-btn').forEach(b => b.classList.remove('active'));
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
  showToast(state.sidebarHidden ? 'Đã ẩn Sidebar để mở rộng khung nhìn' : 'Đã hiện Sidebar danh mục');
}

function handlePageLimitChange(val) {
  state.pageSize = parseInt(val, 10);
  localStorage.setItem('pageSize', val);
  renderFeed();
}

// ==================== DATA FETCHERS ====================
async function fetchStarsData() {
  const data = await fetchWithFallback('/api/stars', 'data/stars.json');
  if (data) {
    state.starsRepos = data.repos || [];
    state.stats = data.stats || {};
    const counter = document.getElementById('stars-total-count');
    if (counter) counter.textContent = state.starsRepos.length;
    populateLanguageSelect();
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
  const data = await fetchWithFallback('/api/notes', 'data/notes.json');
  if (data) state.notesData = data;
}

async function fetchTrendingData() {
  const period = state.period || 'daily';
  const data = await fetchWithFallback(`/api/trending?since=${period}`, `data/trending_${period}.json`);
  if (data) {
    state.trendingRepos = data.repos || [];
    renderTicker();
  }
}

async function fetchFreshData() {
  const data = await fetchWithFallback('/api/fresh', 'data/fresh.json');
  if (data) state.freshRepos = data.repos || [];
}

async function fetchHFTrending() {
  const data = await fetchWithFallback('/api/hf-trending?type=models', 'data/hf_trending.json');
  if (data) state.hfTrending = data.items || [];
}

async function fetchAIPulse() {
  const data = await fetchWithFallback('/api/ai-pulse', 'data/ai_pulse.json');
  if (data) state.aiPulse = data.items || [];
}

async function fetchCollectionsData() {
  const data = await fetchWithFallback('/api/collections', 'data/collections.json');
  if (data) state.collections = data.collections || [];
}

async function fetchDevToolsData() {
  const data = await fetchWithFallback('/api/dev-tools', 'data/dev_tools.json');
  if (data) {
    state.devTools = data.tools || [];
    state.launches = data.launches || [];
  }
}

async function fetchWeeklyDigestData() {
  const data = await fetchWithFallback('/api/weekly-digest', 'data/weekly_digest.json');
  if (data) state.weeklyDigest = data;
}

async function fetchJobsData() {
  const data = await fetchWithFallback('/api/jobs', 'data/jobs.json');
  if (data) state.jobsData = data;
}

// ==================== PLATFORM & FEED MODES ====================
function switchPlatformSource(platform) {
  state.platform = platform;
  document.getElementById('source-btn-github').classList.toggle('active', platform === 'github');
  document.getElementById('source-btn-hf').classList.toggle('active', platform === 'huggingface');

  if (platform === 'huggingface') {
    document.getElementById('period-switch-group').style.display = 'none';
  } else {
    document.getElementById('period-switch-group').style.display = ['trending', 'stars', 'new'].includes(state.feedMode) ? 'flex' : 'none';
  }

  renderSidebar();
  renderFeed();
}

function switchFeedMode(mode) {
  state.feedMode = mode;
  state.selectedCategory = '';
  state.selectedTopic = '';

  document.querySelectorAll('.tab-btn-group .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`mode-btn-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  const periodGroup = document.getElementById('period-switch-group');
  const radarSubfilters = document.getElementById('radar-subfilters');
  const toolsSubfilters = document.getElementById('tools-subfilters');
  const jobsSubfilters = document.getElementById('jobs-subfilters');
  const controlsRowBottom = document.getElementById('controls-row-bottom');
  const resultInfoBar = document.getElementById('result-info-bar');
  const cardsContainer = document.getElementById('cards-feed-container');
  const statsContainer = document.getElementById('stats-view-container');

  // Toggle Visibility
  if (periodGroup) periodGroup.style.display = (mode === 'trending' || mode === 'new') ? 'flex' : 'none';
  if (radarSubfilters) radarSubfilters.style.display = (mode === 'pulse') ? 'flex' : 'none';
  if (toolsSubfilters) toolsSubfilters.style.display = (mode === 'tools') ? 'flex' : 'none';
  if (jobsSubfilters) jobsSubfilters.style.display = (mode === 'jobs') ? 'flex' : 'none';

  if (mode === 'stats') {
    if (cardsContainer) cardsContainer.style.display = 'none';
    if (statsContainer) statsContainer.style.display = 'flex';
    if (controlsRowBottom) controlsRowBottom.style.display = 'none';
    if (resultInfoBar) resultInfoBar.style.display = 'none';
    renderStatsDashboard();
    return;
  } else {
    if (cardsContainer) cardsContainer.style.display = 'grid';
    if (statsContainer) statsContainer.style.display = 'none';
    if (controlsRowBottom) controlsRowBottom.style.display = 'flex';
    if (resultInfoBar) resultInfoBar.style.display = 'flex';
  }

  if (mode === 'pulse') renderRadarSubfilters();
  renderSidebar();
  renderFeed();
}

function changePeriod(period) {
  state.period = period;
  document.getElementById('period-daily').classList.toggle('active', period === 'daily');
  document.getElementById('period-weekly').classList.toggle('active', period === 'weekly');
  document.getElementById('period-monthly').classList.toggle('active', period === 'monthly');
  fetchTrendingData().then(() => {
    if (state.feedMode === 'trending') renderFeed();
  });
}

function switchToolsSubfilter(sub) {
  state.toolsSubfilter = sub;
  document.querySelectorAll('#tools-subfilters .pill-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderFeed();
}

function switchJobsSubfilter(sub) {
  state.jobsSubfilter = sub;
  document.querySelectorAll('#jobs-subfilters .pill-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderFeed();
}

// ==================== LIVE TICKER ====================
function renderTicker() {
  const marquee = document.getElementById('ticker-marquee');
  if (!marquee) return;

  const items = state.trendingRepos.slice(0, 10);
  if (items.length === 0) {
    marquee.innerHTML = `<span style="padding-left: 1rem; color: var(--text-muted);">Đang tải dữ liệu bứt phá hôm nay...</span>`;
    return;
  }

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
      <a href="javascript:void(0)" onclick="openRepoDetailModal('${r.full_name}')" class="ticker-card-item">
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
  if (!bar || state.feedMode !== 'pulse') return;

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
    <button class="pill-btn ${state.radarSubfilter === 'all' ? 'active' : ''}" onclick="selectRadarSubfilter('all')">
      📌 Tất cả (${counts.all})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'conf' ? 'active' : ''}" onclick="selectRadarSubfilter('conf')">
      🏛️ Hội Nghị (${counts.conf})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'arxiv' ? 'active' : ''}" onclick="selectRadarSubfilter('arxiv')">
      📄 arXiv (${counts.arxiv})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'hf' ? 'active' : ''}" onclick="selectRadarSubfilter('hf')">
      🧪 HF Papers (${counts.hf})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'cve' ? 'active' : ''}" onclick="selectRadarSubfilter('cve')">
      🛡️ CVE/CWE (${counts.cve})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'hn' ? 'active' : ''}" onclick="selectRadarSubfilter('hn')">
      📰 Hacker News (${counts.hn})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'x' ? 'active' : ''}" onclick="selectRadarSubfilter('x')">
      🌐 X Trends (${counts.x})
    </button>
    <button class="pill-btn ${state.radarSubfilter === 'labs' ? 'active' : ''}" onclick="selectRadarSubfilter('labs')">
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

// ==================== SIDEBAR RENDERING ====================
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
  return state.starsRepos; // fallback to stars for categories in other views
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
    const displayTopics = state.showAllTags ? sortedTopics : sortedTopics.slice(0, 24);

    let topicHtml = `
      <span class="topic-chip ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">
        #tất_cả
      </span>
      <span class="topic-chip ${state.selectedTopic === 'bookmarked' ? 'active' : ''}" onclick="selectTopicFilter('bookmarked')">
        ⭐ Bookmarks (${state.notesData.bookmarks.length})
      </span>
    `;

    displayTopics.forEach(t => {
      topicHtml += `
        <span class="topic-chip ${state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
          #${t} <span style="opacity: 0.6; font-size: 10px;">${topicCounter[t]}</span>
        </span>
      `;
    });

    topicsContainer.innerHTML = topicHtml;
    const toggleBtn = document.getElementById('toggle-more-tags-btn');
    if (toggleBtn) {
      toggleBtn.style.display = sortedTopics.length > 24 ? 'flex' : 'none';
      toggleBtn.textContent = state.showAllTags ? 'Thu gọn bớt topics' : `+ Xem thêm (${sortedTopics.length - 24} topics)`;
    }
  }
}

function selectCategoryFilter(cat) {
  state.selectedCategory = state.selectedCategory === cat ? '' : cat;
  renderSidebar();
  renderFeed();
}

function selectTopicFilter(topic) {
  state.selectedTopic = state.selectedTopic === topic ? '' : topic;
  renderSidebar();
  renderFeed();
}

function toggleMoreTags() {
  state.showAllTags = !state.showAllTags;
  renderSidebar();
}

function populateLanguageSelect() {
  const select = document.getElementById('lang-select');
  if (!select) return;

  const currentVal = select.value;
  const langs = new Set();
  state.starsRepos.forEach(r => { if (r.language) langs.add(r.language); });

  let html = '<option value="">Tất cả ngôn ngữ</option>';
  Array.from(langs).sort().forEach(l => {
    html += `<option value="${l}">${l}</option>`;
  });
  select.innerHTML = html;
  select.value = currentVal;
}

function handleSearch(val) {
  state.searchQuery = val.trim().toLowerCase();
  renderFeed();
}

function handleLangChange() {
  state.selectedLang = document.getElementById('lang-select').value;
  if (state.feedMode === 'trending') {
    fetchTrendingData().then(renderFeed);
  } else if (state.feedMode === 'new') {
    fetchFreshData().then(renderFeed);
  } else {
    renderFeed();
  }
}

function handleSortChange() {
  state.selectedSort = document.getElementById('sort-select').value;
  renderFeed();
}

// ==================== DATA FILTERING & FEED DISPATCHER ====================
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

  // Custom Views Dispatcher
  if (state.feedMode === 'collections') {
    renderCollections();
    if (sentinel) sentinel.style.display = 'none';
    return;
  }
  if (state.feedMode === 'tools') {
    renderDevTools();
    if (sentinel) sentinel.style.display = 'none';
    return;
  }
  if (state.feedMode === 'jobs') {
    renderJobs();
    if (sentinel) sentinel.style.display = 'none';
    return;
  }
  if (state.feedMode === 'stats') {
    renderStatsDashboard();
    if (sentinel) sentinel.style.display = 'none';
    return;
  }

  applyLayout(state.layout);

  const items = getActiveItems();
  state.renderedCount = Math.min(state.pageSize, items.length);

  const countLabel = document.getElementById('displayed-count-label');
  if (countLabel) countLabel.textContent = items.length.toLocaleString();

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
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
            ${r.category || ''}
          </div>
        </div>
      `;
      fragment.appendChild(card);
      return;
    }

    // RENDER HUGGING FACE MODELS / DATASETS
    if (state.platform === 'huggingface') {
      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-block">
            <span class="rank-tag">#${rank}</span>
            <a href="https://huggingface.co/${r.id}" target="_blank" class="card-title-link">
              ${r.id}
            </a>
          </div>
        </div>

        <div class="card-desc-text">${r.pipeline_tag ? `Task: ${r.pipeline_tag}` : 'Hugging Face Open Weights Model'}</div>

        <div class="card-footer-row">
          <span style="color: var(--pill-amber-text);">❤️ ${formatNumber(r.likes || 0)}</span>
          <span>⬇️ ${formatNumber(r.downloads || 0)}</span>
          <span class="badge-tag">${r.pipeline_tag || 'model'}</span>
        </div>
      `;
      fragment.appendChild(card);
      return;
    }

    // RENDER GITHUB REPOSITORIES (Trending / Stars / New)
    const owner = r.owner || (r.full_name ? r.full_name.split('/')[0] : 'github');
    const avatarUrl = `https://github.com/${owner}.png?size=40`;
    const starsFormatted = formatNumber(r.stars);
    const forksFormatted = formatNumber(r.forks);
    const langColor = window.getLanguageColor ? window.getLanguageColor(r.language) : '#8B949E';

    card.innerHTML = `
      <div class="card-header-row">
        <div class="card-title-block">
          <img class="card-avatar" src="${avatarUrl}" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
          ${state.feedMode === 'trending' ? `<span class="rank-tag">#${rank}</span>` : ''}
          <a href="javascript:void(0)" onclick="openRepoDetailModal('${r.full_name}')" class="card-title-link" title="Xem chi tiết repo">
            ${r.full_name || r.name}
          </a>
        </div>
        <button class="card-action-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${r.full_name}')" title="Bookmark repo này">
          <i data-lucide="bookmark" style="width: 14px; height: 14px;"></i>
        </button>
      </div>

      <div class="card-desc-text">${r.description || 'Không có mô tả chi tiết'}</div>

      <div class="card-footer-row">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${langColor};"></span>
            ${r.language || 'Plain'}
          </span>
          <span style="color: var(--pill-amber-text);">⭐ ${starsFormatted}</span>
          <span>🍴 ${forksFormatted}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <button class="btn-zinc" style="font-size: 11px; padding: 2px 7px;" onclick="openRepoDetailModal('${r.full_name}')">
            Chi tiết
          </button>
          <button class="card-action-btn ${hasNote ? 'active' : ''}" onclick="openNoteModal('${r.full_name}')" title="Ghi chú cá nhân">
            <i data-lucide="file-text" style="width: 13px; height: 13px;"></i>
          </button>
        </div>
      </div>
    `;

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  lucide.createIcons();
}

function setupScrollObserver() {
  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !state.isLoadingMore && ['trending', 'stars', 'new', 'pulse'].includes(state.feedMode)) {
      const items = getActiveItems();
      if (state.renderedCount < items.length) {
        state.isLoadingMore = true;
        const nextBatch = items.slice(state.renderedCount, state.renderedCount + state.pageSize);
        state.renderedCount += nextBatch.length;
        renderCardsBatch(nextBatch);
        state.isLoadingMore = false;
        if (state.renderedCount >= items.length) {
          sentinel.style.display = 'none';
        }
      }
    }
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
}

// ==================== 1. CURATED COLLECTIONS RENDERER ====================
function renderCollections() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  container.className = 'collections-grid';
  let html = '';

  const cols = state.collections || [];
  if (cols.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border);">Đang tải dữ liệu bộ sưu tập tuyển chọn...</div>`;
    return;
  }

  cols.forEach(col => {
    html += `
      <div class="collection-card">
        <div class="collection-header">
          <div class="collection-title-wrap">
            <div class="collection-title">${col.title}</div>
            <div class="collection-desc">${col.description}</div>
          </div>
          <span class="badge-tag" style="color: ${col.badge_color}; font-weight: 700;">${col.badge}</span>
        </div>

        <div>
          <div style="font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Top Repositories Tuyển Chọn:</div>
          <div class="collection-repos-list">
            ${col.repos.map(r => `
              <a href="javascript:void(0)" onclick="openRepoDetailModal('${r}')" class="collection-repo-chip">
                <i data-lucide="github" style="width: 11px; height: 11px;"></i>
                ${r.split('/')[1] || r}
              </a>
            `).join('')}
          </div>
        </div>

        <div class="collection-footer">
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${(col.tags || []).slice(0, 3).map(t => `<span class="domain-chip">#${t}</span>`).join('')}
          </div>
          <button class="btn-zinc" onclick="copyCollectionLinks('${col.id}')" title="Sao chép toàn bộ link">
            <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
            <span>Copy All</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  const countLabel = document.getElementById('displayed-count-label');
  if (countLabel) countLabel.textContent = `${cols.length} bộ sưu tập`;
  lucide.createIcons();
}

function copyCollectionLinks(colId) {
  const col = state.collections.find(c => c.id === colId);
  if (!col) return;
  const links = col.repos.map(r => `https://github.com/${r}`).join('\n');
  navigator.clipboard.writeText(links).then(() => {
    showToast(`Đã sao chép ${col.repos.length} liên kết repo!`);
  }).catch(() => {
    showToast('Lỗi khi sao chép liên kết!', 'error');
  });
}

// ==================== 2. STATS & VELOCITY DASHBOARD RENDERER ====================
function renderStatsDashboard() {
  const totalStars = state.starsRepos.reduce((acc, r) => acc + (r.stars || 0), 0);
  const avgStars = state.starsRepos.length > 0 ? Math.round(totalStars / state.starsRepos.length) : 0;

  const langCounts = {};
  state.starsRepos.forEach(r => {
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  });
  const sortedLangs = Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a]);
  const topLang = sortedLangs[0] || 'N/A';
  const topLangPct = state.starsRepos.length > 0 ? Math.round((langCounts[topLang] / state.starsRepos.length) * 100) : 0;

  const topGainer = state.trendingRepos[0] || {};
  const topGainerGain = topGainer.stars_since || topGainer.period_stars || '1.2k';

  const elTotalStars = document.getElementById('kpi-total-stars');
  if (elTotalStars) elTotalStars.textContent = totalStars.toLocaleString();

  const elTotalSub = document.getElementById('kpi-total-repos-sub');
  if (elTotalSub) elTotalSub.textContent = `Từ ${state.starsRepos.length} repositories`;

  const elTopGainer = document.getElementById('kpi-top-gainer');
  if (elTopGainer) elTopGainer.textContent = topGainer.full_name || topGainer.name || 'OpenMAIC';

  const elTopGainSub = document.getElementById('kpi-top-gain-sub');
  if (elTopGainSub) elTopGainSub.textContent = `+${topGainerGain} stars hôm nay`;

  const elTopLang = document.getElementById('kpi-top-lang');
  if (elTopLang) elTopLang.textContent = topLang;

  const elTopLangSub = document.getElementById('kpi-top-lang-sub');
  if (elTopLangSub) elTopLangSub.textContent = `${topLangPct}% thị phần kho star`;

  const elAvgStars = document.getElementById('kpi-avg-stars');
  if (elAvgStars) elAvgStars.textContent = `~${avgStars.toLocaleString()} ⭐`;

  if (window.initCharts) {
    window.initCharts(state.stats, state.starsRepos, state.theme);
  }
  if (window.renderVelocityLeaderboard) {
    window.renderVelocityLeaderboard(state.trendingRepos);
  }
  lucide.createIcons();
}

// ==================== 3. DEV TOOLS & LAUNCH SHOWCASE RENDERER ====================
function renderDevTools() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  container.className = state.toolsSubfilter === 'launch' ? 'launch-grid' : 'tools-grid';
  let html = '';

  if (state.toolsSubfilter === 'launch') {
    const launches = state.launches || [];
    launches.forEach(item => {
      const upvoted = Boolean(state.launchUpvotes[item.id]);
      const currentVotes = (item.upvotes || 0) + (upvoted ? 1 : 0);

      html += `
        <div class="launch-item-card">
          <div class="card-header-row">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${item.author_avatar}" class="card-avatar" alt="${item.author}">
              <div>
                <a href="${item.demo_url || item.github_url}" target="_blank" class="card-title-link">${item.title}</a>
                <div style="font-size: 11px; color: var(--text-faint);">bởi @${item.author}</div>
              </div>
            </div>
            <button class="upvote-btn ${upvoted ? 'upvoted' : ''}" onclick="toggleLaunchUpvote('${item.id}')">
              <i data-lucide="triangle" style="width: 12px; height: 12px; fill: currentColor;"></i>
              <span>${currentVotes}</span>
            </button>
          </div>

          <div class="card-desc-text">${item.description}</div>

          <div class="card-footer-row">
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              ${(item.tech_stack || []).map(t => `<span class="badge-tag">${t}</span>`).join('')}
            </div>
            <a href="${item.github_url}" target="_blank" class="btn-zinc btn-icon" title="Xem GitHub">
              <i data-lucide="github" style="width: 13px; height: 13px;"></i>
            </a>
          </div>
        </div>
      `;
    });
  } else {
    let tools = state.devTools || [];
    if (state.toolsSubfilter === 'ai') tools = tools.filter(t => t.category.includes('AI'));
    if (state.toolsSubfilter === 'debug') tools = tools.filter(t => t.category.includes('Debug') || t.category.includes('Cheat'));
    if (state.toolsSubfilter === 'sec') tools = tools.filter(t => t.category.includes('Security'));

    tools.forEach(t => {
      html += `
        <div class="tool-item-card">
          <div>
            <div class="tool-item-header">
              <span class="tool-item-title">${t.name}</span>
              <span class="badge-tag">${t.badge}</span>
            </div>
            <div style="font-size: 11px; color: var(--pill-blue-text); margin: 3px 0 6px; font-weight: 600;">${t.category}</div>
            <div class="tool-item-desc">${t.description}</div>
          </div>

          <div class="card-footer-row" style="margin-top: 8px;">
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${(t.tags || []).map(tag => `<span class="domain-chip">#${tag}</span>`).join('')}
            </div>
            <a href="${t.url}" target="_blank" class="btn-zinc" style="font-size: 11.5px;">
              <span>Mở Web</span>
              <i data-lucide="arrow-up-right" style="width: 11px; height: 11px;"></i>
            </a>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = html;
  const countLabel = document.getElementById('displayed-count-label');
  if (countLabel) countLabel.textContent = `${state.toolsSubfilter === 'launch' ? state.launches.length : state.devTools.length} công cụ & sản phẩm`;
  lucide.createIcons();
}

function toggleLaunchUpvote(id) {
  if (state.launchUpvotes[id]) {
    delete state.launchUpvotes[id];
    showToast('Đã hủy upvote sản phẩm');
  } else {
    state.launchUpvotes[id] = true;
    showToast('Đã upvote sản phẩm! 🚀');
  }
  localStorage.setItem('launchUpvotes', JSON.stringify(state.launchUpvotes));
  renderDevTools();
}

// ==================== 4. TECH & CYBERSECURITY JOB RADAR ====================
function renderJobs() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  const jobsData = state.jobsData || {};

  // SUBVIEW 1: 30+ PLATFORMS DIRECTORY
  if (state.jobsSubfilter === 'platforms') {
    container.className = 'jobs-container';
    let html = '';
    (jobsData.platforms || []).forEach(cat => {
      html += `
        <div class="platform-category-card">
          <div class="platform-category-title">
            <i data-lucide="layers" style="width: 15px; height: 15px; color: var(--pill-blue-text);"></i>
            <span>${cat.category}</span>
          </div>
          <div class="platforms-chips-grid">
            ${cat.items.map(p => `
              <a href="${p.url}" target="_blank" class="platform-card-item">
                <div class="platform-item-header">
                  <span class="platform-name">${p.name}</span>
                  <span class="badge-tag">${p.badge}</span>
                </div>
                <div class="platform-desc">${p.desc}</div>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
    const countLabel = document.getElementById('displayed-count-label');
    if (countLabel) countLabel.textContent = `30+ Cổng tuyển dụng IT / An ninh mạng`;
    lucide.createIcons();
    return;
  }

  // SUBVIEW 2: MARKET INSIGHTS DASHBOARD
  if (state.jobsSubfilter === 'insights') {
    container.className = 'jobs-container';
    const ins = jobsData.insights || {};
    const summ = ins.summary || {};

    let html = `
      <div class="insights-wrap">
        <div class="repo-hero-banner">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">📊 ${ins.title || 'Báo Cáo Xu Hướng Tuyển Dụng ATTT & IT 2025'}</div>
            <div style="font-size: 12.5px; color: var(--text-muted);">Tổng hợp và phân tích từ ${summ.total_posts || 909} tin tuyển dụng thực tế tại Việt Nam & Global.</div>
          </div>
        </div>

        <!-- 1. Regional & Salary Matrices -->
        <div class="chart-card-box">
          <div class="chart-card-header">
            <div class="chart-card-title">
              <i data-lucide="map-pin" style="width: 16px; height: 16px; color: var(--pill-amber-text);"></i>
              <span>Khu Vực Tuyển Dụng & Mức Lương Trung Vị</span>
            </div>
          </div>
          <div class="insights-kpi-row">
            ${(ins.regions || []).map(r => `
              <div class="stats-kpi-card">
                <div class="kpi-label">${r.name}</div>
                <div class="kpi-value" style="font-size: 18px; color: var(--pill-green-text);">${r.median_salary}</div>
                <div class="kpi-subtext">Tối đa: ${r.max_salary} (${r.count} tin)</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 2. Experience Level & Salary Distribution -->
        <div class="charts-grid-2col">
          <div class="chart-card-box">
            <div class="chart-card-header">
              <div class="chart-card-title">
                <i data-lucide="user-check" style="width: 15px; height: 15px; color: var(--pill-blue-text);"></i>
                <span>Phân Bố Cấp Độ Kinh Nghiệm</span>
              </div>
            </div>
            <div class="progress-bar-container">
              ${(ins.levels || []).map(l => `
                <div class="progress-row">
                  <span class="progress-label">${l.level}</span>
                  <div class="progress-track">
                    <div class="progress-fill" style="width: ${l.percent}%; background: ${l.color};"></div>
                  </div>
                  <span class="progress-val">${l.percent}%</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="chart-card-box">
            <div class="chart-card-header">
              <div class="chart-card-title">
                <i data-lucide="dollar-sign" style="width: 15px; height: 15px; color: var(--pill-green-text);"></i>
                <span>Phân Bố Mức Lương</span>
              </div>
            </div>
            <div class="progress-bar-container">
              ${(ins.salary_distribution || []).map(s => `
                <div class="progress-row">
                  <span class="progress-label" style="font-size: 11px;">${s.range}</span>
                  <div class="progress-track">
                    <div class="progress-fill" style="width: ${s.percent}%; background: var(--pill-green-text);"></div>
                  </div>
                  <span class="progress-val">${s.percent}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 3. Top Skills -->
        <div class="chart-card-box">
          <div class="chart-card-header">
            <div class="chart-card-title">
              <i data-lucide="code-2" style="width: 16px; height: 16px; color: var(--pill-purple-text);"></i>
              <span>Top Kỹ Năng & Từ Khóa Được Đề Cập Nhiều Nhất</span>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
            ${(ins.top_skills || []).map(sk => `
              <div style="background: var(--bg-surface); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main);">${sk.name}</div>
                  <div style="font-size: 10.5px; color: var(--text-muted);">${sk.track}</div>
                </div>
                <span class="badge-tag" style="color: var(--pill-blue-text); font-weight: 700;">${sk.percent}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
    const countLabel = document.getElementById('displayed-count-label');
    if (countLabel) countLabel.textContent = `Báo cáo thị trường IT & An ninh mạng`;
    lucide.createIcons();
    return;
  }

  // SUBVIEW 3: JOB OPENINGS CARDS
  container.className = 'jobs-grid';
  let jobs = jobsData.sample_jobs || [];

  if (state.jobsSubfilter === 'sec') jobs = jobs.filter(j => j.track.includes('Cybersecurity') || j.tags.some(t => ['SOC', 'SIEM', 'Pentest'].includes(t)));
  if (state.jobsSubfilter === 'ai') jobs = jobs.filter(j => j.track.includes('AI') || j.tags.some(t => ['Python', 'LangChain', 'RAG'].includes(t)));
  if (state.jobsSubfilter === 'dev') jobs = jobs.filter(j => j.track.includes('Software') || j.tags.some(t => ['React', 'Next.js', 'Golang'].includes(t)));
  if (state.jobsSubfilter === 'game') jobs = jobs.filter(j => j.track.includes('Game'));
  if (state.jobsSubfilter === 'cloud') jobs = jobs.filter(j => j.track.includes('Cloud') || j.tags.some(t => ['AWS', 'Kubernetes', 'CI-CD'].includes(t)));

  if (state.searchQuery) {
    const q = state.searchQuery;
    jobs = jobs.filter(j => {
      return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || (j.tags || []).some(t => t.toLowerCase().includes(q));
    });
  }

  let html = '';
  jobs.forEach(job => {
    html += `
      <div class="job-card">
        <div>
          <div class="job-header-row">
            <div>
              <a href="${job.url}" target="_blank" class="job-title">${job.title}</a>
              <div class="job-company-row">
                <i data-lucide="building" style="width: 12px; height: 12px;"></i>
                <span style="font-weight: 600; color: var(--text-main);">${job.company}</span>
                <span>•</span>
                <span>${job.location}</span>
              </div>
            </div>
            <span class="job-salary-badge">${job.salary}</span>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45; margin: 10px 0;">${job.description}</div>
        </div>

        <div class="card-footer-row">
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <span class="badge-tag" style="color: var(--pill-blue-text); font-weight: 700;">${job.level}</span>
            ${(job.tags || []).slice(0, 4).map(t => `<span class="domain-chip">#${t}</span>`).join('')}
          </div>
          <a href="${job.url}" target="_blank" class="btn-zinc" style="font-size: 11.5px;">
            <span>Ứng tuyển</span>
            <i data-lucide="external-link" style="width: 11px; height: 11px;"></i>
          </a>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  const countLabel = document.getElementById('displayed-count-label');
  if (countLabel) countLabel.textContent = `${jobs.length} vị trí tuyển dụng`;
  lucide.createIcons();
}

// ==================== 5. SINGLE REPO DEEP DIVE MODAL (VUI CODING STYLE) ====================
function openRepoDetailModal(fullName) {
  const modal = document.getElementById('repo-detail-modal');
  const body = document.getElementById('repo-detail-modal-body');
  if (!modal || !body) return;

  let r = state.starsRepos.find(item => item.full_name === fullName) ||
          state.trendingRepos.find(item => item.full_name === fullName || item.name === fullName) ||
          state.freshRepos.find(item => item.full_name === fullName);

  if (!r) {
    const parts = fullName.split('/');
    r = {
      full_name: fullName,
      name: parts[1] || fullName,
      owner: parts[0] || 'github',
      description: 'Repository nguồn mở được cộng đồng developer đánh giá cao.',
      stars: 1200,
      forks: 180,
      language: 'TypeScript',
      topics: ['open-source', 'developer-tools', 'utility'],
      url: `https://github.com/${fullName}`,
      starred_at: new Date().toISOString()
    };
  }

  const owner = r.owner || (r.full_name ? r.full_name.split('/')[0] : 'github');
  const avatarUrl = `https://github.com/${owner}.png?size=80`;
  const isBookmarked = state.notesData.bookmarks.includes(r.full_name);
  const note = state.notesData.notes[r.full_name]?.text || '';
  const langColor = window.getLanguageColor ? window.getLanguageColor(r.language) : '#8B949E';

  // Find related repos (same language or domain)
  const relatedRepos = (state.starsRepos.length > 0 ? state.starsRepos : state.trendingRepos)
    .filter(item => item.full_name !== r.full_name && (item.language === r.language || classifyItem(item) === classifyItem(r)))
    .slice(0, 4);

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Hero Top Banner (Vui Coding Tier) -->
      <div class="repo-hero-banner">
        <div class="repo-hero-header">
          <div class="repo-hero-title-wrap">
            <img src="${avatarUrl}" class="repo-hero-icon" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">
                <span class="badge-tag" style="color: var(--pill-blue-text); font-weight: 700;">🏷️ GITHUB REPO XỊN</span>
                <span class="badge-tag" style="color: var(--pill-purple-text); font-weight: 700;">VUI CODING CHỌN</span>
                <span class="badge-tag" style="color: var(--pill-green-text); font-weight: 700;">🟢 ĐANG HOẠT ĐỘNG</span>
              </div>
              <h2 style="font-size: 18px; font-weight: 800; color: var(--text-main); word-break: break-all;">${r.full_name}</h2>
            </div>
          </div>
          <button class="btn-zinc ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${r.full_name}'); openRepoDetailModal('${r.full_name}');">
            <i data-lucide="bookmark" style="width: 14px; height: 14px;"></i>
            <span>${isBookmarked ? 'Đã Bookmark' : 'Lưu Bookmark'}</span>
          </button>
        </div>

        <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">${r.description || 'Không có mô tả chi tiết từ tác giả.'}</div>
      </div>

      <!-- 5-Col Metrics Grid -->
      <div class="repo-metrics-grid">
        <div class="repo-metric-card">
          <div class="repo-metric-num" style="color: var(--accent-star);">⭐ ${formatNumber(r.stars || 0)}</div>
          <div class="repo-metric-label">GitHub Stars</div>
        </div>
        <div class="repo-metric-card">
          <div class="repo-metric-num">🍴 ${formatNumber(r.forks || 0)}</div>
          <div class="repo-metric-label">Forks</div>
        </div>
        <div class="repo-metric-card">
          <div class="repo-metric-num" style="color: var(--pill-green-text);">${r.open_issues || r.open_issues_count || 12}</div>
          <div class="repo-metric-label">Open Issues</div>
        </div>
        <div class="repo-metric-card">
          <div class="repo-metric-num" style="color: var(--pill-cyan-text);">🚀 ${formatNumber(r.stars_since ? parseInt(r.stars_since.replace(/\D/g, '')) || 2 : 2)}</div>
          <div class="repo-metric-label">Tăng Trưởng</div>
        </div>
        <div class="repo-metric-card">
          <div class="repo-metric-num" style="color: var(--pill-blue-text); font-size: 14px;">${r.language || 'TypeScript'}</div>
          <div class="repo-metric-label">Ngôn Ngữ Chính</div>
        </div>
      </div>

      <!-- Quick Summary & Repository Info (2 Columns) -->
      <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px;">
        <!-- Left: Quick Analysis -->
        <div class="repo-guide-card">
          <div style="font-size: 12px; font-weight: 700; color: var(--pill-green-text); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
            Tóm Tắt Nhanh
          </div>
          <h4 style="font-size: 14.5px; font-weight: 800; color: var(--text-main);">Repo này làm được gì?</h4>
          <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.45;">
            ${r.description || 'Dự án nguồn mở cung cấp bộ công cụ tối ưu cho các nhà phát triển, hỗ trợ tự động hóa và nâng cao hiệu suất làm việc.'}
          </p>

          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 4px;">Lệnh Clone nhanh:</div>
          <div class="repo-clone-box">
            <code>git clone https://github.com/${r.full_name}.git</code>
            <button class="btn-zinc btn-icon" style="width: 22px; height: 22px;" onclick="navigator.clipboard.writeText('git clone https://github.com/${r.full_name}.git'); showToast('Đã sao chép lệnh clone!');">
              <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
            </button>
          </div>
        </div>

        <!-- Right: Repository Meta -->
        <div class="repo-guide-card">
          <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Thông Tin Repository</div>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Chủ sở hữu</span><strong style="color: var(--text-main);">${owner}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Ngôn ngữ</span><span style="color: var(--pill-blue-text); font-weight: 600;">${r.language || 'Plain Text'}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Giấy phép</span><strong style="color: var(--text-main);">${r.license?.name || 'MIT / Apache-2.0'}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Cập nhật</span><span style="color: var(--text-muted); font-family: var(--font-mono);">${r.starred_at ? r.starred_at.slice(0, 10) : '29/08/2026'}</span></div>
          </div>
        </div>
      </div>

      <!-- Installation & Usage Guide -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="repo-guide-card">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; color: var(--text-main);">
            <i data-lucide="download-cloud" style="width: 14px; height: 14px; color: var(--pill-cyan-text);"></i>
            Hướng dẫn cài đặt
          </div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45;">
            Bước 1: Clone repo về máy hoặc mở trực tiếp trên Codespaces / Gitpod.<br>
            Bước 2: Cài đặt dependencies với lệnh phù hợp (<code>npm install</code> hoặc <code>pip install -r requirements.txt</code>).
          </div>
        </div>

        <div class="repo-guide-card">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; color: var(--text-main);">
            <i data-lucide="play" style="width: 14px; height: 14px; color: var(--pill-green-text);"></i>
            Hướng dẫn sử dụng
          </div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45;">
            Thực thi script khởi chạy hoặc import package vào dự án của bạn.<br>
            Đọc kỹ file README.md trong kho mã nguồn để cấu hình biến môi trường.
          </div>
        </div>
      </div>

      <!-- Personal Notes Editor Box -->
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 5px;">
            <i data-lucide="file-text" style="width: 13px; height: 13px; color: var(--pill-blue-text);"></i>
            Ghi Chú Cá Nhân
          </span>
          <button class="btn-zinc" style="font-size: 11px; padding: 2px 7px;" onclick="openNoteModal('${r.full_name}')">Sửa ghi chú</button>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); font-style: ${note ? 'normal' : 'italic'};">
          ${note || 'Chưa có ghi chú nào cho repo này. Bấm "Sửa ghi chú" để ghi lại kiến thức/kinh nghiệm.'}
        </div>
      </div>

      <!-- Related Repositories (Cùng hệ sinh thái) -->
      ${relatedRepos.length > 0 ? `
        <div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Cùng Hệ Sinh Thái — Repo Liên Quan</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
            ${relatedRepos.map(rel => `
              <div class="tool-item-card" style="padding: 10px; cursor: pointer;" onclick="openRepoDetailModal('${rel.full_name}')">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <img src="https://github.com/${rel.owner || rel.full_name.split('/')[0]}.png?size=30" class="card-avatar" alt="">
                  <strong style="font-size: 12.5px; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rel.name || rel.full_name.split('/')[1]}</strong>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${rel.description || 'Dự án liên quan cùng chủ đề'}</div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--pill-amber-text); margin-top: 6px;">
                  <span>⭐ ${formatNumber(rel.stars)}</span>
                  <span style="color: var(--text-muted);">${rel.language || 'Code'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Bottom Actions -->
      <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
        <button class="btn-zinc" onclick="openShareRepoModal('${r.full_name}')" style="color: var(--pill-cyan-text);">
          <i data-lucide="share-2" style="width: 13px; height: 13px;"></i>
          <span>Mang repo đi khoe</span>
        </button>
        <a href="https://star-history.com/#${r.full_name}&Date" target="_blank" class="btn-zinc">
          <i data-lucide="trending-up" style="width: 13px; height: 13px;"></i>
          <span>Star History</span>
        </a>
        <a href="${r.url || ('https://github.com/' + r.full_name)}" target="_blank" class="btn-zinc" style="background: var(--primary-btn-bg); color: var(--primary-btn-text);">
          <i data-lucide="github" style="width: 13px; height: 13px;"></i>
          <span>Mở trên GitHub ↗</span>
        </a>
      </div>
    </div>
  `;

  modal.classList.add('open');
  lucide.createIcons();
}

function closeRepoDetailModal() {
  const modal = document.getElementById('repo-detail-modal');
  if (modal) modal.classList.remove('open');
}

// ==================== SHARE REPO MODAL ====================
function openShareRepoModal(fullName) {
  const shareText = `Vừa đào được ${fullName} cực xịn trên Star-Trend Hub!\n\nLink: https://github.com/${fullName}?utm_source=star-trend`;
  navigator.clipboard.writeText(shareText).then(() => {
    showToast('Đã copy nội dung bài chia sẻ kèm link UTM!');
  }).catch(() => {
    showToast('Không thể copy bài chia sẻ', 'error');
  });
}

// ==================== QUICK REPO INSPECTOR ====================
function openInspectorModal() {
  const modal = document.getElementById('inspector-modal');
  if (modal) {
    modal.classList.add('open');
    setTimeout(() => {
      const input = document.getElementById('inspector-input');
      if (input) input.focus();
    }, 100);
  }
}

function closeInspectorModal() {
  const modal = document.getElementById('inspector-modal');
  if (modal) modal.classList.remove('open');
}

async function executeRepoInspect() {
  const input = document.getElementById('inspector-input');
  const container = document.getElementById('inspector-result-container');
  if (!input || !container) return;

  let query = input.value.trim();
  if (!query) {
    showToast('Vui lòng nhập tên repo hoặc link GitHub', 'error');
    return;
  }

  query = query.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
  const parts = query.split('/');
  if (parts.length < 2) {
    showToast('Định dạng phải là: owner/repo (ví dụ: astral-sh/uv)', 'error');
    return;
  }
  const fullName = `${parts[0]}/${parts[1]}`;

  container.innerHTML = `
    <div style="text-align: center; padding: 30px; color: var(--text-muted);">
      <i data-lucide="loader-2" class="spinning" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
      <div>Đang truy vấn dữ liệu từ GitHub API cho <strong>${fullName}</strong>...</div>
    </div>
  `;
  lucide.createIcons();

  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('Không tìm thấy repository này trên GitHub');
      if (res.status === 403) throw new Error('Đã đạt giới hạn rate limit của GitHub Public API. Vui lòng thử lại sau');
      throw new Error(`Lỗi kết nối GitHub API (${res.status})`);
    }

    const r = await res.json();
    openRepoDetailModal(r.full_name);
    closeInspectorModal();
  } catch (err) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--pill-red-text); background: var(--pill-red-bg); border: 1px solid var(--pill-red-border); border-radius: var(--radius-sm); font-size: 13px;">
        <i data-lucide="alert-circle" style="width: 20px; height: 20px; margin-bottom: 6px;"></i>
        <div>${err.message}</div>
      </div>
    `;
    lucide.createIcons();
  }
}

// ==================== WEEKLY DIGEST ====================
function openDigestModal() {
  const modal = document.getElementById('digest-modal');
  const content = document.getElementById('digest-modal-content');
  if (!modal || !content) return;

  const d = state.weeklyDigest || {};
  const highlights = d.highlights || [];

  let html = `
    <div class="digest-container">
      <div class="repo-hero-banner" style="margin-bottom: 14px;">
        <div>
          <div style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">📰 ${d.week_label || 'Bản Tin Xu Hướng Tuần'}</div>
          <div style="font-size: 12.5px; color: var(--text-muted);">${d.trending_summary || ''}</div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${highlights.map(item => `
          <div class="project-card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="badge-tag" style="color: ${item.badge_color}; font-weight: 700;">${item.badge}</span>
              <a href="${item.url}" target="_blank" style="color: var(--pill-blue-text); font-size: 12px; display: inline-flex; align-items: center; gap: 3px;">
                Xem chi tiết <i data-lucide="arrow-up-right" style="width: 12px; height: 12px;"></i>
              </a>
            </div>
            <a href="${item.url}" target="_blank" style="font-size: 14px; font-weight: 700; color: var(--text-main); text-decoration: none;">${item.title}</a>
            <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.45;">${item.tldr}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  content.innerHTML = html;
  modal.classList.add('open');
  lucide.createIcons();
}

function closeDigestModal() {
  const modal = document.getElementById('digest-modal');
  if (modal) modal.classList.remove('open');
}

// ==================== DEV QUOTE RADAR ====================
function refreshDevQuote() {
  const elText = document.getElementById('dev-quote-text');
  const elAuthor = document.getElementById('dev-quote-author');
  if (!elText || !elAuthor) return;

  const rand = DEV_QUOTES[Math.floor(Math.random() * DEV_QUOTES.length)];
  elText.textContent = `"${rand.text}"`;
  elAuthor.textContent = `— ${rand.author}`;
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

function openNoteModal(fullName) {
  state.activeNoteTarget = fullName;
  const title = document.getElementById('modal-repo-title');
  const textarea = document.getElementById('note-textarea');
  const tagsInput = document.getElementById('note-tags-input');

  title.textContent = `Ghi chú cho: ${fullName}`;
  const existing = state.notesData.notes[fullName] || {};
  textarea.value = existing.text || '';
  tagsInput.value = (existing.tags || []).join(', ');

  document.getElementById('note-modal').classList.add('open');
  textarea.focus();
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
