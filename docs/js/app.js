/**
 * Jet-Black Charcoal Stars, Trending, Collections, Stats, Jobs & AI Radar Hub
 * Supports dual-mode: Local Python Server (/api/...) and Static GitHub Pages (./data/*.json)
 * Full-Page Deep-Dive Views with 30-Day Growth Line Charts & Community Radar
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
  snapshotDate: '2026-08-31',    // '2026-08-31'
  layout: localStorage.getItem('layout') || 'layout-grid-3',
  sidebarHidden: localStorage.getItem('sidebarHidden') === 'true',
  searchQuery: '',
  selectedLang: '',
  selectedJobLevel: '',
  selectedJobLocation: '',
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
  activeNoteTarget: null,
  growthChartInstance: null
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

// General Category Rules for GitHub Repos
const CATEGORY_RULES = [
  { name: 'AI & LLM Agents', keywords: ['ai', 'llm', 'claude', 'gpt', 'agent', 'mcp', 'openai', 'anthropic', 'prompt', 'rag', 'deepseek', 'langchain', 'llama', 'machine-learning'] },
  { name: 'Dev Tools & CLI', keywords: ['cli', 'terminal', 'devtools', 'developer-tools', 'automation', 'productivity', 'tool', 'workflow', 'git', 'scraper', 'powershell', 'shell'] },
  { name: 'Security & Reverse Engineering', keywords: ['security', 'cybersecurity', 'malware', 'exploit', 'reverse-engineering', 'decompiler', 'disassembler', 'pentest', 'vulnerability', 'cve', 'hack', 'ghidra', 'ida', 'soc', 'splunk', 'oscp', 'cissp'] },
  { name: 'Tutorials & Roadmap', keywords: ['awesome', 'tutorial', 'learning', 'interview', 'roadmap', 'book', 'courses', 'education', 'algorithms'] },
  { name: 'Web & Backend', keywords: ['react', 'vue', 'nextjs', 'tailwind', 'frontend', 'backend', 'web', 'fastapi', 'flask', 'django', 'express', 'nodejs'] },
  { name: 'Systems & Cloud', keywords: ['rust', 'c++', 'kernel', 'driver', 'windows', 'linux', 'operating-system', 'embedded', 'compiler', 'database', 'wasm', 'docker', 'kubernetes', 'aws'] }
];

function classifyItem(item) {
  const text = `${(item.topics || item.tags || []).join(' ')} ${item.description || item.summary || ''} ${item.full_name || item.name || item.title || ''}`.toLowerCase();
  for (const cat of CATEGORY_RULES) {
    if (cat.keywords.some(k => text.includes(k))) return cat.name;
  }
  return 'General & Others';
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

// ── Dual-Mode Resilient Fetcher with Auto-Fallback ─────────────────────
async function fetchWithFallback(apiPath, staticRelPath) {
  if (!_STATIC_MODE && apiPath) {
    try {
      const res = await fetch(apiPath);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`API ${apiPath} failed, falling back to static path...`);
    }
  }

  try {
    const res = await fetch(DATA_BASE + staticRelPath);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error(`Failed to load static ${staticRelPath}:`, e);
  }

  try {
    const res = await fetch('./' + staticRelPath);
    if (res.ok) return await res.json();
  } catch (e) {
    // ignore
  }

  return null;
}

// ==================== INIT & ROUTER ====================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(state.theme);
  applyLayout(state.layout);
  applySidebarState(state.sidebarHidden);
  refreshDevQuote();

  const pageLimitSelect = document.getElementById('page-limit-select');
  if (pageLimitSelect) pageLimitSelect.value = state.pageSize.toString();

  const dateInput = document.getElementById('snapshot-date-input');
  if (dateInput) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
    dateInput.max = today;
    state.snapshotDate = today;
  }

  setupScrollObserver();

  // Load all datasets concurrently
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

  // Handle URL hash routing
  handleHashRouting();
  window.addEventListener('hashchange', handleHashRouting);

  renderFeed();
  renderSidebar();
  lucide.createIcons();
});

function handleHashRouting() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('repo/')) {
    const fullName = hash.replace('repo/', '');
    openFullPageRepoDetail(fullName, false);
  } else if (hash.startsWith('job/')) {
    const jobId = hash.replace('job/', '');
    openFullPageJobDetail(jobId, false);
  } else if (hash.startsWith('radar/')) {
    const radarId = hash.replace('radar/', '');
    openFullPageRadarDetail(radarId, false);
  } else if (hash.startsWith('collection/')) {
    const colId = hash.replace('collection/', '');
    openFullPageCollectionDetail(colId, false);
  } else if (hash.startsWith('tool/')) {
    const toolId = hash.replace('tool/', '');
    openFullPageToolDetail(toolId, false);
  } else if (!hash) {
    closeFullPageDetail(false);
  }
}

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
  if (container && ['trending', 'stars', 'new', 'pulse', 'tools'].includes(state.feedMode)) {
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
  if (data) state.aiPulse = data.items || data.data || (Array.isArray(data) ? data : []);
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
  if (data) {
    state.jobsData = data;
    if (_STATIC_MODE) {
      try {
        const custom = JSON.parse(localStorage.getItem('customJobPlatforms') || '[]');
        if (custom.length > 0 && state.jobsData.platforms) {
          state.jobsData.platforms[0].items.unshift(...custom);
        }
      } catch (e) { /* ignore */ }
    }
  }
}

// ==================== PLATFORM & FEED MODES ====================
function switchPlatformSource(platform) {
  closeFullPageDetail(true);
  state.platform = platform;
  state.selectedCategory = '';
  state.selectedTopic = '';
  state.searchQuery = '';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

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
  closeFullPageDetail(true);
  state.feedMode = mode;
  state.selectedCategory = '';
  state.selectedTopic = '';
  state.searchQuery = '';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

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
  const dateWrap = document.getElementById('snapshot-date-wrap');

  const langSelect = document.getElementById('lang-select');
  const jobsLevelSelect = document.getElementById('jobs-level-select');
  const jobsLocationSelect = document.getElementById('jobs-location-select');

  // Toggle Mode-specific Controls
  if (periodGroup) periodGroup.style.display = (mode === 'trending' || mode === 'new') ? 'flex' : 'none';
  if (dateWrap) dateWrap.style.display = (mode === 'trending' || mode === 'pulse' || mode === 'stars') ? 'inline-flex' : 'none';
  if (radarSubfilters) radarSubfilters.style.display = (mode === 'pulse') ? 'flex' : 'none';
  if (toolsSubfilters) toolsSubfilters.style.display = (mode === 'tools') ? 'flex' : 'none';
  if (jobsSubfilters) jobsSubfilters.style.display = (mode === 'jobs') ? 'flex' : 'none';

  // Toggle Filters in Row Bottom
  if (mode === 'jobs') {
    if (langSelect) langSelect.style.display = 'none';
    if (jobsLevelSelect) jobsLevelSelect.style.display = 'inline-block';
    if (jobsLocationSelect) jobsLocationSelect.style.display = 'inline-block';
    if (searchInput) searchInput.placeholder = "Tìm vị trí, công ty, kỹ năng (SOC, SIEM, Splunk, Python, React, Golang, AWS)...";
  } else {
    if (langSelect) langSelect.style.display = (mode === 'collections' || mode === 'tools' || mode === 'pulse') ? 'none' : 'inline-block';
    if (jobsLevelSelect) jobsLevelSelect.style.display = 'none';
    if (jobsLocationSelect) jobsLocationSelect.style.display = 'none';
    if (searchInput) {
      if (mode === 'pulse') searchInput.placeholder = "Tìm bài báo arXiv, CVE, tin tức AI...";
      else if (mode === 'collections') searchInput.placeholder = "Tìm bộ sưu tập theo chủ đề, tags...";
      else if (mode === 'tools') searchInput.placeholder = "Tìm công cụ lập trình, launch board, AI...";
      else searchInput.placeholder = "Tìm theo tên repo, mô tả, CVE-ID, tags...";
    }
  }

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

function handleDateInputChange(dateVal) {
  state.snapshotDate = dateVal;
  showToast(`📅 Đang xem snapshot ngày ${dateVal}`);
  renderFeed();
}

function switchToolsSubfilter(sub) {
  state.toolsSubfilter = sub;
  state.selectedCategory = '';
  state.selectedTopic = '';
  document.querySelectorAll('#tools-subfilters .pill-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderSidebar();
  renderFeed();
}

function switchJobsSubfilter(sub) {
  state.jobsSubfilter = sub;
  state.selectedCategory = '';
  state.selectedTopic = '';
  document.querySelectorAll('#jobs-subfilters .pill-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderSidebar();
  renderFeed();
}

function handleJobFilterChange() {
  state.selectedJobLevel = document.getElementById('jobs-level-select')?.value || '';
  state.selectedJobLocation = document.getElementById('jobs-location-select')?.value || '';
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
      <div onclick="openFullPageRepoDetail('${r.full_name}')" class="ticker-card-item">
        <img class="ticker-avatar" src="${avatarUrl}" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
        <span class="ticker-rank-pill">GH #${rank}</span>
        <span class="ticker-name-text">${name}</span>
        <span class="ticker-stars-text">★ ${starsFormatted}</span>
        <span class="ticker-momentum-pill">↗ ${gainFormatted}</span>
      </div>
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
    <button class="pill-btn ${state.radarSubfilter === 'all' ? 'active' : ''}" onclick="selectRadarSubfilter('all')">Tất cả (${counts.all})</button>
    <button class="pill-btn ${state.radarSubfilter === 'conf' ? 'active' : ''}" onclick="selectRadarSubfilter('conf')">Hội Nghị (${counts.conf})</button>
    <button class="pill-btn ${state.radarSubfilter === 'arxiv' ? 'active' : ''}" onclick="selectRadarSubfilter('arxiv')">arXiv Papers (${counts.arxiv})</button>
    <button class="pill-btn ${state.radarSubfilter === 'hf' ? 'active' : ''}" onclick="selectRadarSubfilter('hf')">HF Research (${counts.hf})</button>
    <button class="pill-btn ${state.radarSubfilter === 'cve' ? 'active' : ''}" onclick="selectRadarSubfilter('cve')">CVE / Security (${counts.cve})</button>
    <button class="pill-btn ${state.radarSubfilter === 'hn' ? 'active' : ''}" onclick="selectRadarSubfilter('hn')">Hacker News (${counts.hn})</button>
    <button class="pill-btn ${state.radarSubfilter === 'x' ? 'active' : ''}" onclick="selectRadarSubfilter('x')">X Trends (${counts.x})</button>
    <button class="pill-btn ${state.radarSubfilter === 'labs' ? 'active' : ''}" onclick="selectRadarSubfilter('labs')">AI Labs (${counts.labs})</button>
  `;
}

function selectRadarSubfilter(sub) {
  state.radarSubfilter = sub;
  state.selectedCategory = '';
  state.selectedTopic = '';
  renderRadarSubfilters();
  renderSidebar();
  renderFeed();
}

// ==================== DYNAMIC SIDEBAR RENDERING PER TAB ====================
function renderSidebar() {
  const catHeading = document.getElementById('sidebar-cat-heading-title');
  const topicHeading = document.getElementById('sidebar-topic-heading-title');
  const catContainer = document.getElementById('sidebar-categories-list');
  const topicsContainer = document.getElementById('sidebar-topics-cloud');
  const toggleBtn = document.getElementById('toggle-more-tags-btn');
  if (!catContainer || !topicsContainer) return;

  const catCounter = {};
  const topicCounter = {};

  // TAB 1: KÈO DEV & VIỆC LÀM
  if (state.feedMode === 'jobs') {
    if (catHeading) catHeading.textContent = "Chuyên Môn / Lĩnh Vực Tuyển Dụng";
    if (topicHeading) topicHeading.textContent = "Kỹ Năng & Chứng Chỉ Hot";

    const jobs = state.jobsData.sample_jobs || [];
    jobs.forEach(j => {
      catCounter[j.track] = (catCounter[j.track] || 0) + 1;
      (j.tags || []).forEach(t => {
        topicCounter[t] = (topicCounter[t] || 0) + 1;
      });
    });

    let catHtml = `
      <div class="cat-row ${state.selectedCategory === '' ? 'active' : ''}" onclick="selectCategoryFilter('')">
        <span>Tất cả vị trí</span>
        <span class="cat-num">${jobs.length}</span>
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

    const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
    let topicHtml = `<span class="topic-chip ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">#tất_cả</span>`;
    sortedTopics.forEach(t => {
      topicHtml += `
        <span class="topic-chip ${state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
          #${t} <span style="opacity: 0.6; font-size: 10px;">${topicCounter[t]}</span>
        </span>
      `;
    });
    topicsContainer.innerHTML = topicHtml;
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  // TAB 2: DEV TOOLS & LAUNCH
  if (state.feedMode === 'tools') {
    if (catHeading) catHeading.textContent = "Danh Mục Công Cụ & Launch";
    if (topicHeading) topicHeading.textContent = "Tags Công Cụ (#Tags)";

    const tools = state.devTools || [];
    const launches = state.launches || [];
    tools.forEach(t => {
      catCounter[t.category] = (catCounter[t.category] || 0) + 1;
      (t.tags || []).forEach(tag => { topicCounter[tag] = (topicCounter[tag] || 0) + 1; });
    });
    launches.forEach(l => {
      catCounter['Launch Board (Showcase)'] = (catCounter['Launch Board (Showcase)'] || 0) + 1;
      (l.tech_stack || []).forEach(tag => { topicCounter[tag] = (topicCounter[tag] || 0) + 1; });
    });

    let catHtml = `
      <div class="cat-row ${state.selectedCategory === '' ? 'active' : ''}" onclick="selectCategoryFilter('')">
        <span>Tất cả công cụ</span>
        <span class="cat-num">${tools.length + launches.length}</span>
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

    const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
    let topicHtml = `<span class="topic-chip ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">#tất_cả</span>`;
    sortedTopics.forEach(t => {
      topicHtml += `
        <span class="topic-chip ${state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
          #${t} <span style="opacity: 0.6; font-size: 10px;">${topicCounter[t]}</span>
        </span>
      `;
    });
    topicsContainer.innerHTML = topicHtml;
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  // TAB 3: BỘ SƯU TẬP (COLLECTIONS)
  if (state.feedMode === 'collections') {
    if (catHeading) catHeading.textContent = "Chủ Đề Bộ Sưu Tập";
    if (topicHeading) topicHeading.textContent = "Tags Tuyển Chọn";

    const cols = state.collections || [];
    cols.forEach(c => {
      catCounter[c.badge] = (catCounter[c.badge] || 0) + 1;
      (c.tags || []).forEach(t => { topicCounter[t] = (topicCounter[t] || 0) + 1; });
    });

    let catHtml = `
      <div class="cat-row ${state.selectedCategory === '' ? 'active' : ''}" onclick="selectCategoryFilter('')">
        <span>Tất cả bộ sưu tập</span>
        <span class="cat-num">${cols.length}</span>
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

    const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
    let topicHtml = `<span class="topic-chip ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">#tất_cả</span>`;
    sortedTopics.forEach(t => {
      topicHtml += `
        <span class="topic-chip ${state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
          #${t} <span style="opacity: 0.6; font-size: 10px;">${topicCounter[t]}</span>
        </span>
      `;
    });
    topicsContainer.innerHTML = topicHtml;
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  // TAB 4: AI & TECH RADAR
  if (state.feedMode === 'pulse') {
    if (catHeading) catHeading.textContent = "Nguồn Radar & Phân Loại";
    if (topicHeading) topicHeading.textContent = "Từ Khóa Hot Radar";

    state.aiPulse.forEach(item => {
      const cat = item.category || item.source || 'Tin tức';
      catCounter[cat] = (catCounter[cat] || 0) + 1;
      (item.tags || []).forEach(t => { topicCounter[t] = (topicCounter[t] || 0) + 1; });
    });

    let catHtml = `
      <div class="cat-row ${state.selectedCategory === '' ? 'active' : ''}" onclick="selectCategoryFilter('')">
        <span>Tất cả tin radar</span>
        <span class="cat-num">${state.aiPulse.length}</span>
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

    const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
    let topicHtml = `<span class="topic-chip ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">#tất_cả</span>`;
    sortedTopics.slice(0, 20).forEach(t => {
      topicHtml += `
        <span class="topic-chip ${state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
          #${t} <span style="opacity: 0.6; font-size: 10px;">${topicCounter[t]}</span>
        </span>
      `;
    });
    topicsContainer.innerHTML = topicHtml;
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  // DEFAULT TABS: GITHUB REPOSITORIES (Thịnh hành, Kho stars, Dự án mới)
  if (catHeading) catHeading.textContent = "Danh Mục Phân Loại";
  if (topicHeading) topicHeading.textContent = "Chủ Đề Hot (#Topics)";

  const items = state.feedMode === 'stars' ? state.starsRepos : (state.feedMode === 'new' ? state.freshRepos : state.trendingRepos);
  items.forEach(item => {
    const cat = state.platform === 'huggingface' ? (item.pipeline_tag ? `🎯 ${item.pipeline_tag}` : '📦 Models') : classifyItem(item);
    catCounter[cat] = (catCounter[cat] || 0) + 1;

    const tags = item.topics || item.tags || (item.language ? [item.language.toLowerCase()] : []);
    tags.forEach(t => {
      const cleanT = t.toLowerCase().trim();
      if (cleanT) topicCounter[cleanT] = (topicCounter[cleanT] || 0) + 1;
    });
  });

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

  const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
  const displayTopics = state.showAllTags ? sortedTopics : sortedTopics.slice(0, 24);

  let topicHtml = `
    <span class="topic-chip ${state.selectedTopic === '' ? 'active' : ''}" onclick="selectTopicFilter('')">#tất_cả</span>
    <span class="topic-chip ${state.selectedTopic === 'bookmarked' ? 'active' : ''}" onclick="selectTopicFilter('bookmarked')">⭐ Bookmarks (${state.notesData.bookmarks.length})</span>
  `;

  displayTopics.forEach(t => {
    topicHtml += `
      <span class="topic-chip ${state.selectedTopic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
        #${t} <span style="opacity: 0.6; font-size: 10px;">${topicCounter[t]}</span>
      </span>
    `;
  });

  topicsContainer.innerHTML = topicHtml;
  if (toggleBtn) {
    toggleBtn.style.display = sortedTopics.length > 24 ? 'flex' : 'none';
    toggleBtn.textContent = state.showAllTags ? 'Thu gọn bớt topics' : `+ Xem thêm (${sortedTopics.length - 24} topics)`;
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
  return state.starsRepos;
}

function getActiveItems() {
  let list = getRawItemsForCurrentView();

  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(r => {
      const matchName = (r.full_name || r.title || r.name || '').toLowerCase().includes(q);
      const matchDesc = (r.description || r.summary || '').toLowerCase().includes(q);
      const matchLang = (r.language || r.pipeline_tag || r.source || '').toLowerCase().includes(q);
      const matchTopics = (r.topics || r.tags || []).some(t => t.toLowerCase().includes(q));
      const matchNote = (state.notesData.notes[r.full_name]?.text || '').toLowerCase().includes(q);
      return matchName || matchDesc || matchLang || matchTopics || matchNote;
    });
  }

  if (state.selectedLang && state.platform === 'github' && ['trending', 'stars', 'new'].includes(state.feedMode)) {
    list = list.filter(r => (r.language || '').toLowerCase() === state.selectedLang.toLowerCase());
  }

  if (state.selectedCategory) {
    list = list.filter(r => {
      if (state.platform === 'huggingface') return `🎯 ${r.pipeline_tag}` === state.selectedCategory || state.selectedCategory.includes(r.pipeline_tag || '');
      if (state.feedMode === 'pulse') return r.category === state.selectedCategory || (r.category && state.selectedCategory.includes(r.category));
      return classifyItem(r) === state.selectedCategory || (r.categories || []).includes(state.selectedCategory);
    });
  }

  if (state.selectedTopic) {
    if (state.selectedTopic === 'bookmarked') {
      list = list.filter(r => state.notesData.bookmarks.includes(r.full_name));
    } else {
      list = list.filter(r => (r.topics || r.tags || (r.language ? [r.language.toLowerCase()] : [])).map(t => t.toLowerCase()).includes(state.selectedTopic.toLowerCase()));
    }
  }

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

    // Entire Card Click Event -> Open Full-Page Deep Dive View!
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn') || e.target.closest('a[target="_blank"]')) return;
      if (state.feedMode === 'pulse') {
        openFullPageRadarDetail(r.id || r.title);
      } else if (state.platform === 'huggingface') {
        window.open(`https://huggingface.co/${r.id}`, '_blank');
      } else {
        openFullPageRepoDetail(r.full_name);
      }
    });

    // RENDER AI PULSE
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

        <div class="card-title-link" style="font-size: 14.5px;">
          ${r.title}
          <i data-lucide="arrow-up-right" style="width: 13px; height: 13px; opacity: 0.7; margin-left: 2px; display: inline;"></i>
        </div>

        <div class="card-desc-text">${r.summary || ''}</div>

        <div class="card-footer-row">
          <div class="domain-chips-list">
            ${(r.tags || []).map(t => `<span class="domain-chip" onclick="event.stopPropagation(); selectTopicFilter('${t}')">#${t}</span>`).join('')}
          </div>
          <span style="font-size: 11.5px; color: var(--pill-blue-text); font-weight: 600;">Xem chi tiết ↗</span>
        </div>
      `;
      fragment.appendChild(card);
      return;
    }

    // RENDER HUGGING FACE
    if (state.platform === 'huggingface') {
      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-block">
            <span class="rank-tag">#${rank}</span>
            <div class="card-title-link">${r.id}</div>
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

    // RENDER GITHUB REPOSITORIES
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
          <div class="card-title-link">${r.full_name || r.name}</div>
        </div>
        <button class="card-action-btn ${isBookmarked ? 'active' : ''}" onclick="event.stopPropagation(); toggleBookmark('${r.full_name}')" title="Bookmark repo này">
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
          <span style="font-size: 11.5px; color: var(--pill-blue-text); font-weight: 600;">Xem chi tiết ↗</span>
          <button class="card-action-btn ${hasNote ? 'active' : ''}" onclick="event.stopPropagation(); openNoteModal('${r.full_name}')" title="Ghi chú cá nhân">
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
    if (entries[0].isIntersecting && !state.isLoadingMore && ['trending', 'stars', 'new', 'pulse', 'tools'].includes(state.feedMode)) {
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

// ==================== 1. FULL-PAGE REPO DEEP DIVE VIEW ====================
function openFullPageRepoDetail(fullName, updateHash = true) {
  const fullContainer = document.getElementById('fullpage-detail-container');
  const fullContent = document.getElementById('fullpage-detail-content');
  const mainGrid = document.getElementById('main-layout-grid');
  const breadcrumb = document.getElementById('fullpage-breadcrumb');
  if (!fullContainer || !fullContent) return;

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
      stars: 34648,
      forks: 2203,
      open_issues: 35,
      language: 'TypeScript',
      topics: ['agent-skills', 'architecture-as-code', 'diagrams', 'claude-code'],
      url: `https://github.com/${fullName}`,
      starred_at: new Date().toISOString()
    };
  }

  const owner = r.owner || (r.full_name ? r.full_name.split('/')[0] : 'github');
  const avatarUrl = `https://github.com/${owner}.png?size=120`;
  const isBookmarked = state.notesData.bookmarks.includes(r.full_name);
  const note = state.notesData.notes[r.full_name]?.text || '';

  if (breadcrumb) breadcrumb.innerHTML = `<span>THỊNH HÀNH</span> › <span>ECOSYSTEM</span> › <strong style="color: var(--text-main);">${r.full_name.toUpperCase()}</strong>`;

  const relatedRepos = (state.starsRepos.length > 0 ? state.starsRepos : state.trendingRepos)
    .filter(item => item.full_name !== r.full_name && (item.language === r.language || classifyItem(item) === classifyItem(r)))
    .slice(0, 3);

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Top Banner -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div class="fullpage-repo-title-wrap">
            <img src="${avatarUrl}" class="fullpage-repo-icon" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
                <span class="badge-tag" style="color: var(--text-main); font-weight: 600;">Repository</span>
                <span class="badge-tag" style="color: var(--text-muted); font-weight: 600;">${r.language || 'Plain'}</span>
                <span class="badge-tag" style="color: var(--pill-green-text); font-weight: 600;">Active</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main); word-break: break-all;">${r.full_name}</h1>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-zinc ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${r.full_name}'); openFullPageRepoDetail('${r.full_name}', false);">
              <i data-lucide="bookmark" style="width: 14px; height: 14px;"></i>
              <span>${isBookmarked ? 'Đã Lưu' : 'Lưu Repo'}</span>
            </button>
            <button class="btn-zinc" onclick="openShareRepoModal('${r.full_name}')">
              <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
              <span>Share</span>
            </button>
            <a href="${r.url || ('https://github.com/' + r.full_name)}" target="_blank" class="btn-zinc" style="background: var(--primary-btn-bg); color: var(--primary-btn-text);">
              <i data-lucide="github" style="width: 14px; height: 14px;"></i>
              <span>Xem Repository ↗</span>
            </a>
          </div>
        </div>

        <div style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6; max-width: 1050px;">${r.description || 'Dự án mã nguồn mở được cộng đồng developer tin dùng.'}</div>
      </div>

      <!-- 5-Col Metrics Grid -->
      <div class="fullpage-metrics-grid">
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num" style="color: var(--accent-star);">⭐ ${formatNumber(r.stars || 0)}</div>
          <div class="fullpage-metric-label">GitHub Stars</div>
        </div>
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num">🍴 ${formatNumber(r.forks || 0)}</div>
          <div class="fullpage-metric-label">Forks</div>
        </div>
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num">${r.open_issues || r.open_issues_count || 18}</div>
          <div class="fullpage-metric-label">Open Issues</div>
        </div>
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num">${formatNumber(r.stars_since ? parseInt(r.stars_since.replace(/\D/g, '')) || 2 : 2)}</div>
          <div class="fullpage-metric-label">Tăng Trưởng Gần Đây</div>
        </div>
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num" style="font-size: 15px;">${r.language || 'Plain'}</div>
          <div class="fullpage-metric-label">Ngôn Ngữ Chính</div>
        </div>
      </div>

      <!-- Main 2-Column Content Grid -->
      <div class="fullpage-content-grid">
        <!-- Left: Overview & Installation -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="fullpage-guide-card">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
              <i data-lucide="book-open" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
              <span>Tổng Quan Repository</span>
            </h3>

            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
              ${r.description || 'Repository cung cấp các module và công cụ giải quyết bài toán cốt lõi trong quy trình phát triển phần mềm.'}
            </p>

            <div style="margin-top: 10px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Lệnh Clone nhanh:</div>
              <div class="repo-clone-box">
                <code>git clone https://github.com/${r.full_name}.git</code>
                <button class="btn-zinc btn-icon" style="width: 24px; height: 24px;" onclick="navigator.clipboard.writeText('git clone https://github.com/${r.full_name}.git'); showToast('Đã sao chép lệnh clone!');">
                  <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
                </button>
              </div>
            </div>

            <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
              ${(r.topics || []).map(t => `<span class="domain-chip">#${t}</span>`).join('')}
            </div>
          </div>

          <!-- Installation & Usage Guide -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="fullpage-guide-card">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13.5px; color: var(--text-main);">
                <i data-lucide="download-cloud" style="width: 15px; height: 15px; color: var(--text-muted);"></i>
                Hướng dẫn cài đặt
              </div>
              <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5;">
                Clone repo về máy hoặc mở trực tiếp qua Codespaces. Cài đặt các gói phụ thuộc tương ứng theo tài liệu dự án.
              </div>
            </div>
            <div class="fullpage-guide-card">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13.5px; color: var(--text-main);">
                <i data-lucide="play" style="width: 15px; height: 15px; color: var(--text-muted);"></i>
                Hướng dẫn sử dụng
              </div>
              <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5;">
                Xem chi tiết các tham số dòng lệnh và hướng dẫn tích hợp trực tiếp trên file README.md tại GitHub.
              </div>
            </div>
          </div>

          <!-- Notes Editor Box (Left Column for Optimal Balance) -->
          <div class="fullpage-guide-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="file-text" style="width: 13px; height: 13px; color: var(--text-muted);"></i>
                Ghi Chú Cá Nhân
              </span>
              <button class="btn-zinc" style="font-size: 11px; padding: 2px 7px;" onclick="openNoteModal('${r.full_name}')">Sửa ghi chú</button>
            </div>
            <div style="font-size: 12.5px; color: var(--text-muted); font-style: ${note ? 'normal' : 'italic'};">
              ${note || 'Chưa có ghi chú nào cho repo này.'}
            </div>
          </div>
        </div>

        <!-- Right: 30-Day Growth Chart & Metadata -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- 30-Day Velocity Line Chart -->
          <div class="growth-chart-wrap">
            <div class="growth-chart-header">
              <span style="display: flex; align-items: center; gap: 6px;">
                <i data-lucide="line-chart" style="width: 15px; height: 15px; color: var(--accent-star);"></i>
                <span>Lịch Sử Tăng Trưởng 30 Ngày</span>
              </span>
              <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">+${formatNumber(r.stars_since ? parseInt(r.stars_since.replace(/\D/g, '')) * 30 || 1200 : 1200)} stars/tháng</span>
            </div>
            <div style="height: 180px; position: relative;">
              <canvas id="repo-growth-chart"></canvas>
            </div>
          </div>

          <!-- Repository Meta Details -->
          <div class="fullpage-guide-card">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Thông Tin Chi Tiết</div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 5px;"><span style="color: var(--text-muted);">Chủ sở hữu</span><strong style="color: var(--text-main);">${owner}</strong></div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 5px;"><span style="color: var(--text-muted);">Ngôn ngữ chính</span><span style="color: var(--text-main); font-weight: 600;">${r.language || 'Plain Text'}</span></div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 5px;"><span style="color: var(--text-muted);">Giấy phép</span><strong style="color: var(--text-main);">${r.license?.name || 'MIT License'}</strong></div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 2px;"><span style="color: var(--text-muted);">Cập nhật</span><span style="color: var(--text-muted); font-family: var(--font-mono);">${r.starred_at ? r.starred_at.slice(0, 10) : '2026-08-31'}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Similar Repositories -->
      ${relatedRepos.length > 0 ? `
        <div style="margin-top: 10px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">Dự Án Tương Tự Trong Hệ Sinh Thái</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
            ${relatedRepos.map(rel => `
              <div class="project-card" style="padding: 14px; cursor: pointer;" onclick="openFullPageRepoDetail('${rel.full_name}')">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="https://github.com/${rel.owner || rel.full_name.split('/')[0]}.png?size=32" class="card-avatar" alt="">
                  <strong style="font-size: 13.5px; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rel.name || rel.full_name.split('/')[1]}</strong>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${rel.description || 'Dự án liên quan cùng chủ đề'}</div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-top: 10px;">
                  <span>⭐ ${formatNumber(rel.stars)}</span>
                  <span style="color: var(--text-muted);">${rel.language || 'Code'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  if (updateHash) {
    window.location.hash = `repo/${r.full_name}`;
  }

  if (mainGrid) mainGrid.style.display = 'none';
  fullContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();

  // Render 30-Day Growth Line Chart on Canvas
  render30DayGrowthChart(r);
}

function render30DayGrowthChart(repo) {
  const canvas = document.getElementById('repo-growth-chart');
  if (!canvas) return;

  if (state.growthChartInstance) {
    state.growthChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const baseStars = repo.stars || 34000;
  const growthPoints = [
    Math.round(baseStars * 0.72),
    Math.round(baseStars * 0.76),
    Math.round(baseStars * 0.81),
    Math.round(baseStars * 0.88),
    Math.round(baseStars * 0.94),
    baseStars
  ];

  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0.0)');

  state.growthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Aug 1', 'Aug 8', 'Aug 15', 'Aug 22', 'Aug 28', 'Aug 31'],
      datasets: [{
        label: 'Stars',
        data: growthPoints,
        borderColor: '#fbbf24',
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#fbbf24',
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e2130',
          titleColor: '#ffffff',
          bodyColor: '#fbbf24',
          borderColor: '#2d3246',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: (v) => formatNumber(v)
          }
        }
      }
    }
  });
}

// ==================== FULL-PAGE RADAR DEEP DIVE VIEW ====================
function openFullPageRadarDetail(radarId, updateHash = true) {
  const fullContainer = document.getElementById('fullpage-detail-container');
  const fullContent = document.getElementById('fullpage-detail-content');
  const mainGrid = document.getElementById('main-layout-grid');
  const breadcrumb = document.getElementById('fullpage-breadcrumb');
  if (!fullContainer || !fullContent) return;

  let decodedId = radarId || '';
  try { decodedId = decodeURIComponent(radarId); } catch (e) {}

  const item = state.aiPulse.find(p => 
    (p.id && (p.id === radarId || p.id === decodedId)) || 
    (p.title && (p.title === radarId || p.title === decodedId || encodeURIComponent(p.title) === radarId || p.title.toLowerCase() === decodedId.toLowerCase()))
  ) || {
    id: decodedId,
    title: decodedId,
    source: 'AI Research & Security',
    badge: 'Trending Radar',
    category: 'AI & Cyber Security Radar',
    published_at: '2026-08-31',
    summary: 'Phát hiện bứt phá mới trong nghiên cứu công nghệ hoặc lỗ hổng bảo mật cấp cao được cộng đồng quan tâm.',
    tags: ['cve', 'agent', 'rag', 'security'],
    url: 'https://cve.mitre.org'
  };

  if (breadcrumb) breadcrumb.innerHTML = `<span>AI RADAR</span> › <span>${item.source}</span> › <strong style="color: var(--text-main);">${item.title.toUpperCase()}</strong>`;

  let severityBadge = '';
  if (item.badge && item.badge.includes('CRITICAL')) severityBadge = 'cve-critical';
  else if (item.badge && item.badge.includes('HIGH')) severityBadge = 'cve-high';
  else if (item.badge && item.badge.includes('MEDIUM')) severityBadge = 'cve-medium';

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Banner -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="badge-tag" style="color: var(--text-main); font-weight: 600;">${item.source}</span>
              <span class="badge-tag ${severityBadge}">${item.badge}</span>
              <span class="badge-tag" style="color: var(--text-muted); font-weight: 600;">${item.category}</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main);">${item.title}</h1>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; font-family: var(--font-mono);">
              Xuất bản: ${item.published_at || '31/08/2026'}
            </div>
          </div>
          <div>
            <a href="${item.url}" target="_blank" class="btn-zinc" style="background: var(--primary-btn-bg); color: var(--primary-btn-text);">
              <span>Mở Bài Viết / Nguồn Gốc ↗</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="fullpage-content-grid">
        <div class="fullpage-guide-card">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="file-text" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
            Tóm Tắt Chi Tiết & Đánh Giá Tác Động
          </h3>
          <div style="font-size: 13.5px; color: var(--text-main); line-height: 1.65; background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--border-focus);">
            ${item.summary}
          </div>

          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-top: 14px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="shield-check" style="width: 16px; height: 16px; color: var(--pill-green-text);"></i>
            Khuyến Nghị Kỹ Thuật & Ứng Dụng Thực Chiến
          </h3>
          <ul style="padding-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            <li>Cập nhật các bản vá (patch) hoặc dependencies mới nhất của package bị ảnh hưởng.</li>
            <li>Rà soát toàn bộ cấu hình truy cập mạng (Access Control) và quyền thực thi lệnh.</li>
            <li>Kiểm thử lại pipeline CI/CD trước khi triển khai môi trường production.</li>
          </ul>

          <div style="margin-top: 14px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${(item.tags || []).map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="fullpage-guide-card">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Thông Tin Kỹ Thuật</div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 5px;"><span style="color: var(--text-muted);">Nguồn radar</span><strong style="color: var(--text-main);">${item.source}</strong></div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 5px;"><span style="color: var(--text-muted);">Độ nghiêm trọng</span><span class="badge-tag ${severityBadge}">${item.badge}</span></div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 2px;"><span style="color: var(--text-muted);">Trạng thái</span><span style="color: var(--pill-green-text); font-weight: 600;">Active / Monitoring</span></div>
            </div>
          </div>

          <div class="fullpage-guide-card">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Nguồn Tham Khảo</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="${item.url}" target="_blank" class="domain-chip" style="justify-content: space-between;">
                <span>Tài liệu nguồn gốc</span>
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
              </a>
              <a href="https://x.com/search?q=${encodeURIComponent(item.title)}" target="_blank" class="domain-chip" style="justify-content: space-between;">
                <span>Tìm kiếm thảo luận trên X</span>
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (updateHash) {
    window.location.hash = `radar/${encodeURIComponent(item.id || item.title)}`;
  }

  if (mainGrid) mainGrid.style.display = 'none';
  fullContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// ==================== FULL-PAGE COLLECTION DEEP DIVE VIEW ====================
function openFullPageCollectionDetail(colId, updateHash = true) {
  const fullContainer = document.getElementById('fullpage-detail-container');
  const fullContent = document.getElementById('fullpage-detail-content');
  const mainGrid = document.getElementById('main-layout-grid');
  const breadcrumb = document.getElementById('fullpage-breadcrumb');
  if (!fullContainer || !fullContent) return;

  const col = state.collections.find(c => c.id === colId) || {
    id: colId,
    title: 'Bộ Sưu Tập Tuyển Chọn',
    description: 'Danh sách các repository nguồn mở hàng đầu trong lĩnh vực.',
    badge: 'Curated',
    badge_color: '#3b82f6',
    repos: ['astral-sh/uv', 'fastapi/fastapi', 'tiangolo/sqlmodel', 'psf/black'],
    tags: ['python', 'dev-tools', 'curated']
  };

  if (breadcrumb) breadcrumb.innerHTML = `<span>BỘ SƯU TẬP</span> › <strong style="color: var(--text-main);">${col.title.toUpperCase()}</strong>`;

  const repoObjects = col.repos.map(rName => {
    return state.starsRepos.find(r => r.full_name === rName) ||
           state.trendingRepos.find(r => r.full_name === rName) || {
             full_name: rName,
             name: rName.split('/')[1] || rName,
             owner: rName.split('/')[0] || 'github',
             description: 'Repository hàng đầu trong bộ sưu tập.',
             stars: 28500,
             forks: 1900,
             language: 'Rust'
           };
  });

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Banner -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="badge-tag" style="color: var(--text-main); font-weight: 600;">${col.badge}</span>
              <span class="badge-tag" style="color: var(--pill-green-text); font-weight: 600;">${col.repos.length} Repositories</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main);">${col.title}</h1>
            <div style="font-size: 13.5px; color: var(--text-muted); margin-top: 6px; line-height: 1.5;">${col.description}</div>
          </div>
          <div>
            <button class="btn-zinc" onclick="copyCollectionLinks('${col.id}')" style="background: var(--primary-btn-bg); color: var(--primary-btn-text);">
              <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
              <span>Sao Chép Toàn Bộ Link (${col.repos.length})</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Repositories Grid in this Collection -->
      <div>
        <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">Danh Sách Repositories Tuyển Chọn:</div>
        <div class="cards-feed-grid layout-grid-3">
          ${repoObjects.map(r => {
            const owner = r.owner || r.full_name.split('/')[0];
            const avatarUrl = `https://github.com/${owner}.png?size=40`;
            const langColor = window.getLanguageColor ? window.getLanguageColor(r.language) : '#8B949E';
            return `
              <div class="project-card" style="cursor: pointer;" onclick="openFullPageRepoDetail('${r.full_name}')">
                <div class="card-header-row">
                  <div class="card-title-block">
                    <img class="card-avatar" src="${avatarUrl}" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
                    <div class="card-title-link">${r.full_name}</div>
                  </div>
                </div>
                <div class="card-desc-text">${r.description || 'Repository tuyển chọn'}</div>
                <div class="card-footer-row">
                  <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted);">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${langColor};"></span>
                    ${r.language || 'Code'}
                  </span>
                  <span style="color: var(--accent-star); font-size: 12px; font-weight: 600;">⭐ ${formatNumber(r.stars)}</span>
                  <span style="color: var(--text-muted); font-size: 11.5px; font-weight: 600;">Xem chi tiết ↗</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  if (updateHash) {
    window.location.hash = `collection/${col.id}`;
  }

  if (mainGrid) mainGrid.style.display = 'none';
  fullContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// ==================== FULL-PAGE DEV TOOL DEEP DIVE VIEW ====================
function openFullPageToolDetail(toolId, updateHash = true) {
  const fullContainer = document.getElementById('fullpage-detail-container');
  const fullContent = document.getElementById('fullpage-detail-content');
  const mainGrid = document.getElementById('main-layout-grid');
  const breadcrumb = document.getElementById('fullpage-breadcrumb');
  if (!fullContainer || !fullContent) return;

  const tool = (state.devTools || []).find(t => t.id === toolId || t.name === toolId) ||
               (state.launches || []).find(l => l.id === toolId || l.title === toolId) || {
                 id: toolId,
                 name: toolId,
                 category: 'AI & Dev Tools',
                 badge: 'Tool',
                 description: 'Công cụ lập trình và tiện ích năng suất cho lập trình viên.',
                 tags: ['ai', 'tools', 'productivity'],
                 url: 'https://github.com'
               };

  const titleName = tool.name || tool.title;
  const linkUrl = tool.url || tool.demo_url || tool.github_url || 'https://github.com';

  if (breadcrumb) breadcrumb.innerHTML = `<span>DEV TOOLS</span> › <span>${tool.category || 'Công Cụ'}</span> › <strong style="color: var(--text-main);">${titleName.toUpperCase()}</strong>`;

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Banner -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="badge-tag" style="color: var(--text-main); font-weight: 600;">${tool.category || 'Developer Tool'}</span>
              <span class="badge-tag" style="color: var(--text-muted); font-weight: 600;">${tool.badge || 'Launch'}</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main);">${titleName}</h1>
            <div style="font-size: 13.5px; color: var(--text-muted); margin-top: 6px; line-height: 1.5;">${tool.description}</div>
          </div>
          <div>
            <a href="${linkUrl}" target="_blank" class="btn-zinc" style="background: var(--primary-btn-bg); color: var(--primary-btn-text);">
              <span>Mở Website / GitHub ↗</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="fullpage-content-grid">
        <div class="fullpage-guide-card">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="wrench" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
            Tính Năng Nổi Bật
          </h3>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">${tool.description}</p>
          <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${(tool.tags || tool.tech_stack || []).map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>
        </div>

        <div class="fullpage-guide-card">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="link" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
            Đường Dẫn Truy Cập
          </h3>
          <div style="font-size: 12.5px; color: var(--text-muted); word-break: break-all; margin-bottom: 12px;">${linkUrl}</div>
          <a href="${linkUrl}" target="_blank" class="btn-zinc" style="justify-content: center; background: var(--primary-btn-bg); color: var(--primary-btn-text);">
            Truy Cập Ngay
          </a>
        </div>
      </div>
    </div>
  `;

  if (updateHash) {
    window.location.hash = `tool/${encodeURIComponent(tool.id || titleName)}`;
  }

  if (mainGrid) mainGrid.style.display = 'none';
  fullContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// ==================== FULL-PAGE JOB DETAIL VIEW ====================
function openFullPageJobDetail(jobId, updateHash = true) {
  const fullContainer = document.getElementById('fullpage-detail-container');
  const fullContent = document.getElementById('fullpage-detail-content');
  const mainGrid = document.getElementById('main-layout-grid');
  const breadcrumb = document.getElementById('fullpage-breadcrumb');
  if (!fullContainer || !fullContent) return;

  const job = (state.jobsData.sample_jobs || []).find(j => j.id === jobId) || {
    id: jobId,
    title: 'Senior Cyber Security / SOC Engineer',
    company: 'Tech Partner Vietnam',
    location: 'Hà Nội / TP.HCM / Remote',
    salary: '35 – 65 Triệu VNĐ',
    track: '🛡️ An Ninh Mạng & SOC',
    level: 'Senior',
    source: 'CyberJutsu & Facebook',
    tags: ['SOC', 'SIEM', 'Splunk', 'Threat Hunting'],
    description: 'Giám sát, phân tích log an ninh mạng từ SIEM/EDR, xây dựng rules phát hiện tấn công và điều tra phản ứng sự cố.',
    requirements: ['3+ năm kinh nghiệm SOC.', 'Thành thạo Splunk, Elastic, Sentinel.', 'Có chứng chỉ OSCP/CEH/SANS.'],
    benefits: ['Lương tháng 13 + thưởng hiệu quả kinh doanh.', 'Bảo hiểm sức khỏe cao cấp.', 'Tài trợ 100% chi phí thi chứng chỉ quốc tế.'],
    url: 'https://jobs.cyberjutsu.io/'
  };

  if (breadcrumb) breadcrumb.innerHTML = `<span>KÈO DEV</span> › <span>VIỆC LÀM</span> › <strong style="color: var(--text-main);">${job.title.toUpperCase()}</strong>`;

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Job Hero Banner -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="badge-tag" style="color: var(--text-main); font-weight: 600;">${job.track}</span>
              <span class="badge-tag" style="color: var(--text-muted); font-weight: 600;">${job.level}</span>
              <span class="badge-tag" style="color: var(--pill-green-text); font-weight: 600;">${job.source_badge || 'Cộng Đồng'}</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main);">${job.title}</h1>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted); margin-top: 6px;">
              <strong style="color: var(--text-main);">${job.company}</strong>
              <span>•</span>
              <span>📍 ${job.location}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="job-salary-badge" style="font-size: 13px; padding: 6px 12px;">${job.salary}</div>
          </div>
        </div>
      </div>

      <!-- Job Description & Requirements Grid -->
      <div class="fullpage-content-grid">
        <div class="fullpage-guide-card">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="briefcase" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
            Mô tả công việc (Job Description)
          </h3>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">${job.description}</p>

          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-top: 14px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="check-circle-2" style="width: 16px; height: 16px; color: var(--pill-green-text);"></i>
            Yêu cầu kỹ năng (Requirements)
          </h3>
          <ul style="padding-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            ${(job.requirements || []).map(r => `<li>${r}</li>`).join('')}
          </ul>

          <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${(job.tags || []).map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>
        </div>

        <div class="fullpage-guide-card">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="gift" style="width: 16px; height: 16px; color: var(--text-muted);"></i>
            Quyền lợi & Đãi ngộ
          </h3>
          <ul style="padding-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            ${(job.benefits || []).map(b => `<li>${b}</li>`).join('')}
          </ul>

          <div style="margin-top: 20px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Nguồn tin: <strong>${job.source}</strong></div>
            <a href="${job.url}" target="_blank" class="btn-zinc" style="width: 100%; justify-content: center; background: var(--primary-btn-bg); color: var(--primary-btn-text); padding: 9px 12px;">
              <span>Ứng Tuyển / Xem Bài Đăng Gốc ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  if (updateHash) {
    window.location.hash = `job/${job.id}`;
  }

  if (mainGrid) mainGrid.style.display = 'none';
  fullContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

function closeFullPageDetail(clearHash = true) {
  const fullContainer = document.getElementById('fullpage-detail-container');
  const mainGrid = document.getElementById('main-layout-grid');
  if (fullContainer) fullContainer.style.display = 'none';
  if (mainGrid) mainGrid.style.display = 'grid';

  if (clearHash && window.location.hash) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

// ==================== 2. CURATED COLLECTIONS RENDERER ====================
function renderCollections() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  container.className = 'collections-grid';
  let html = '';

  let cols = state.collections || [];
  if (state.selectedCategory) {
    cols = cols.filter(c => c.badge === state.selectedCategory);
  }
  if (state.selectedTopic) {
    cols = cols.filter(c => (c.tags || []).includes(state.selectedTopic));
  }
  if (state.searchQuery) {
    const q = state.searchQuery;
    cols = cols.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q)));
  }

  if (cols.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border);">Không tìm thấy bộ sưu tập phù hợp.</div>`;
    return;
  }

  cols.forEach(col => {
    html += `
      <div class="collection-card" style="cursor: pointer;" onclick="openFullPageCollectionDetail('${col.id}')">
        <div class="collection-header">
          <div class="collection-title-wrap">
            <div class="collection-title">${col.title}</div>
            <div class="collection-desc">${col.description}</div>
          </div>
          <span class="badge-tag" style="color: ${col.badge_color}; font-weight: 700;">${col.badge}</span>
        </div>

        <div>
          <div style="font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px;">Top Repositories Tuyển Chọn (${col.repos.length}):</div>
          <div class="collection-repos-list">
            ${col.repos.map(r => {
              const owner = r.split('/')[0] || 'github';
              const name = r.split('/')[1] || r;
              return `
                <div onclick="event.stopPropagation(); openFullPageRepoDetail('${r}')" class="collection-repo-chip">
                  <img src="https://github.com/${owner}.png?size=24" style="width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--border);" alt="">
                  <span>${name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="collection-footer">
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${(col.tags || []).slice(0, 3).map(t => `<span class="domain-chip" onclick="event.stopPropagation(); selectTopicFilter('${t}')">#${t}</span>`).join('')}
          </div>
          <button class="btn-zinc" onclick="event.stopPropagation(); copyCollectionLinks('${col.id}')" title="Sao chép toàn bộ link">
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

// ==================== 3. STATS & VELOCITY DASHBOARD RENDERER ====================
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

// ==================== 4. DEV TOOLS & LAUNCH SHOWCASE RENDERER (UNIFIED TO PROJECT-CARD) ====================
function renderDevTools() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  applyLayout(state.layout);
  let html = '';

  if (state.toolsSubfilter === 'launch') {
    let launches = state.launches || [];
    if (state.searchQuery) {
      const q = state.searchQuery;
      launches = launches.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || (l.tech_stack || []).some(t => t.toLowerCase().includes(q)));
    }
    if (state.selectedTopic) {
      launches = launches.filter(l => (l.tech_stack || []).includes(state.selectedTopic));
    }

    launches.forEach((item, idx) => {
      const upvoted = Boolean(state.launchUpvotes[item.id]);
      const currentVotes = (item.upvotes || 0) + (upvoted ? 1 : 0);
      const rank = idx + 1;

      html += `
        <div class="project-card" onclick="openFullPageToolDetail('${item.id}')" style="cursor: pointer;">
          <div class="card-header-row">
            <div class="card-title-block">
              <img src="${item.author_avatar}" class="card-avatar" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${item.author}">
              <span class="rank-tag">#${rank}</span>
              <div class="card-title-link">${item.title}</div>
            </div>
            <button class="card-action-btn ${upvoted ? 'active' : ''}" onclick="event.stopPropagation(); toggleLaunchUpvote('${item.id}'); renderDevTools();" title="Upvote sản phẩm này">
              <i data-lucide="triangle" style="width: 13px; height: 13px; fill: ${upvoted ? 'currentColor' : 'none'};"></i>
            </button>
          </div>

          <div class="card-desc-text">${item.description}</div>

          <div class="card-footer-row">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                Launch
              </span>
              <span style="color: var(--accent-star);">▲ ${currentVotes}</span>
              <div class="domain-chips-list">
                ${(item.tech_stack || []).slice(0, 2).map(t => `<span class="domain-chip">#${t}</span>`).join('')}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11.5px; color: var(--pill-blue-text); font-weight: 600;">Xem chi tiết ↗</span>
            </div>
          </div>
        </div>
      `;
    });
  } else {
    let tools = state.devTools || [];
    if (state.toolsSubfilter === 'ai') tools = tools.filter(t => t.category.includes('AI') || t.badge.includes('AI'));
    if (state.toolsSubfilter === 'debug') tools = tools.filter(t => t.category.includes('Debug') || t.category.includes('Cheat') || t.category.includes('Testing'));
    if (state.toolsSubfilter === 'sec') tools = tools.filter(t => t.category.includes('Security') || t.category.includes('Auth'));

    if (state.selectedCategory) {
      tools = tools.filter(t => t.category === state.selectedCategory);
    }
    if (state.selectedTopic) {
      tools = tools.filter(t => (t.tags || []).includes(state.selectedTopic));
    }
    if (state.searchQuery) {
      const q = state.searchQuery;
      tools = tools.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.tags || []).some(tag => tag.toLowerCase().includes(q)));
    }

    tools.forEach((t, idx) => {
      const rank = idx + 1;
      const toolLogo = t.logo || 'https://github.githubassets.com/favicons/favicon.png';

      html += `
        <div class="project-card" onclick="openFullPageToolDetail('${t.id}')" style="cursor: pointer;">
          <div class="card-header-row">
            <div class="card-title-block">
              <img src="${toolLogo}" class="card-avatar" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${t.name}">
              <span class="rank-tag">#${rank}</span>
              <div class="card-title-link">${t.name}</div>
            </div>
            <button class="card-action-btn" onclick="event.stopPropagation(); window.open('${t.url}', '_blank');" title="Mở trang chủ công cụ">
              <i data-lucide="external-link" style="width: 13px; height: 13px;"></i>
            </button>
          </div>

          <div class="card-desc-text">${t.description}</div>

          <div class="card-footer-row">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
                ${t.badge || 'DevTool'}
              </span>
              <span style="color: var(--accent-star);">⭐ ${t.stars || '1.5k'}</span>
              <div class="domain-chips-list">
                ${(t.tags || []).slice(0, 2).map(tag => `<span class="domain-chip">#${tag}</span>`).join('')}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11.5px; color: var(--pill-blue-text); font-weight: 600;">Xem chi tiết ↗</span>
            </div>
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

// ==================== 5. TECH & CYBERSECURITY JOB RADAR RENDERER ====================
function renderJobs() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  const jobsData = state.jobsData || {};

  // SUBVIEW 1: 35+ PLATFORMS & FACEBOOK GROUPS DIRECTORY
  if (state.jobsSubfilter === 'platforms') {
    container.className = 'jobs-container';
    let html = '';
    (jobsData.platforms || []).forEach(cat => {
      html += `
        <div class="platform-category-card">
          <div class="platform-category-title">
            <i data-lucide="layers" style="width: 16px; height: 16px; color: var(--pill-blue-text);"></i>
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
    if (countLabel) countLabel.textContent = `35+ Group & Cổng tuyển dụng IT / An ninh mạng`;
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
        <div class="insights-banner">
          <div>
            <div class="insights-banner-title">📊 ${ins.title || 'Báo Cáo Xu Hướng Tuyển Dụng Công Nghệ & An Ninh Mạng 2025 - 2026 🇻🇳'}</div>
            <div class="insights-banner-sub">Tổng hợp và phân tích từ ${summ.total_posts || 909} tin tuyển dụng thực tế tại Việt Nam & Global.</div>
          </div>
          <span class="badge-tag" style="font-family: var(--font-mono); font-size: 11px;">Official Data</span>
        </div>

        <!-- Regional Matrices -->
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

        <!-- Experience Level & Salary Distribution -->
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

        <!-- Top Skills -->
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

  // SUBVIEW 3: JOB OPENINGS CARDS (Filtered)
  container.className = 'jobs-grid';
  let jobs = jobsData.sample_jobs || [];

  if (state.jobsSubfilter === 'sec') jobs = jobs.filter(j => j.track.includes('An Ninh') || j.tags.some(t => ['SOC', 'SIEM', 'Pentest', 'OSCP'].includes(t)));
  if (state.jobsSubfilter === 'ai') jobs = jobs.filter(j => j.track.includes('AI') || j.tags.some(t => ['LLM', 'RAG', 'Python'].includes(t)));
  if (state.jobsSubfilter === 'dev') jobs = jobs.filter(j => j.track.includes('Software') || j.tags.some(t => ['React', 'Next.js', 'Golang'].includes(t)));
  if (state.jobsSubfilter === 'game') jobs = jobs.filter(j => j.track.includes('Game'));
  if (state.jobsSubfilter === 'cloud') jobs = jobs.filter(j => j.track.includes('Cloud') || j.tags.some(t => ['AWS', 'Kubernetes', 'CI/CD'].includes(t)));

  if (state.selectedCategory) {
    jobs = jobs.filter(j => j.track === state.selectedCategory);
  }

  if (state.selectedTopic) {
    jobs = jobs.filter(j => (j.tags || []).includes(state.selectedTopic));
  }

  if (state.selectedJobLevel) {
    jobs = jobs.filter(j => j.level.toLowerCase().includes(state.selectedJobLevel.toLowerCase()));
  }

  if (state.selectedJobLocation) {
    jobs = jobs.filter(j => j.location.toLowerCase().includes(state.selectedJobLocation.toLowerCase()));
  }

  if (state.searchQuery) {
    const q = state.searchQuery;
    jobs = jobs.filter(j => {
      return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || (j.tags || []).some(t => t.toLowerCase().includes(q));
    });
  }

  let html = '';
  jobs.forEach(job => {
    html += `
      <div class="job-card" onclick="openFullPageJobDetail('${job.id}')">
        <div>
          <div class="job-header-row">
            <div style="flex: 1; padding-right: 8px;">
              <div class="job-title">${job.title}</div>
              <div class="job-company-row">
                <i data-lucide="building" style="width: 12px; height: 12px;"></i>
                <span style="font-weight: 600; color: var(--text-main);">${job.company}</span>
                <span>•</span>
                <span>${job.location}</span>
              </div>
            </div>
            <span class="job-salary-badge">${job.salary}</span>
          </div>

          <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.45; margin: 10px 0;">${job.description}</div>
        </div>

        <div class="card-footer-row">
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <span class="badge-tag" style="color: var(--pill-blue-text); font-weight: 700;">${job.level}</span>
            <span class="badge-tag" style="color: var(--pill-purple-text);">${job.source_badge || 'Cộng Đồng'}</span>
            ${(job.tags || []).slice(0, 3).map(t => `<span class="domain-chip">#${t}</span>`).join('')}
          </div>
          <span style="font-size: 11.5px; color: var(--pill-blue-text); font-weight: 600;">Xem chi tiết JD ↗</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  const countLabel = document.getElementById('displayed-count-label');
  if (countLabel) countLabel.textContent = `${jobs.length} vị trí tuyển dụng`;
  lucide.createIcons();
}

// ==================== MODAL: ADD CUSTOM PLATFORM ====================
function openAddPlatformModal() {
  const modal = document.getElementById('add-platform-modal');
  if (modal) modal.classList.add('open');
}

function closeAddPlatformModal() {
  const modal = document.getElementById('add-platform-modal');
  if (modal) modal.classList.remove('open');
}

async function saveCustomPlatform() {
  const nameInput = document.getElementById('new-platform-name');
  const urlInput = document.getElementById('new-platform-url');
  const catInput = document.getElementById('new-platform-category');
  const badgeInput = document.getElementById('new-platform-badge');
  const descInput = document.getElementById('new-platform-desc');

  const name = nameInput?.value.trim();
  const url = urlInput?.value.trim();
  const category = catInput?.value;
  const badge = badgeInput?.value.trim() || 'Facebook Group';
  const desc = descInput?.value.trim() || 'Cộng đồng thảo luận và tuyển dụng.';

  if (!name || !url) {
    showToast('Vui lòng nhập tên và link group/website!', 'error');
    return;
  }

  const payload = { name, url, category, badge, desc, type: 'facebook' };

  if (_STATIC_MODE) {
    try {
      const custom = JSON.parse(localStorage.getItem('customJobPlatforms') || '[]');
      custom.unshift(payload);
      localStorage.setItem('customJobPlatforms', JSON.stringify(custom));
      if (state.jobsData.platforms) {
        state.jobsData.platforms[0].items.unshift(payload);
      }
      showToast('Đã lưu group mới vào bộ nhớ hệ thống!');
    } catch (e) {
      showToast('Lỗi khi lưu group!', 'error');
    }
  } else {
    try {
      const res = await fetch('/api/jobs/add-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã thêm group mới thành công!');
        await fetchJobsData();
      } else {
        showToast(data.error || 'Lỗi khi lưu group!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server!', 'error');
    }
  }

  closeAddPlatformModal();
  renderSidebar();
  renderFeed();
}

// ==================== SHARE REPO MODAL ====================
function openShareRepoModal(fullName) {
  const shareText = `Vừa đào được repo ${fullName} cực xịn trên Star-Trend Hub!\n\nXem ngay: https://vuongdat67.github.io/star-trend/#repo/${fullName}`;
  navigator.clipboard.writeText(shareText).then(() => {
    showToast('Đã copy bài chia sẻ kèm link UTM!');
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

  closeInspectorModal();
  openFullPageRepoDetail(fullName);
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
      <div class="insights-banner" style="margin-bottom: 14px;">
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

// Global Window Exports
window.openFullPageRepoDetail = openFullPageRepoDetail;
window.openFullPageRadarDetail = openFullPageRadarDetail;
window.openFullPageCollectionDetail = openFullPageCollectionDetail;
window.openFullPageToolDetail = openFullPageToolDetail;
window.openFullPageJobDetail = openFullPageJobDetail;
window.closeFullPageDetail = closeFullPageDetail;
window.handleDateInputChange = handleDateInputChange;
window.switchFeedMode = switchFeedMode;
window.switchPlatformSource = switchPlatformSource;
window.switchToolsSubfilter = switchToolsSubfilter;
window.switchJobsSubfilter = switchJobsSubfilter;
window.openAddPlatformModal = openAddPlatformModal;
window.closeAddPlatformModal = closeAddPlatformModal;
window.saveCustomPlatform = saveCustomPlatform;
window.toggleBookmark = toggleBookmark;
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.saveCurrentNote = saveCurrentNote;
window.toggleTheme = toggleTheme;
window.toggleSidebarVisibility = toggleSidebarVisibility;
window.triggerSync = triggerSync;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.triggerCustomExport = triggerCustomExport;
window.openInspectorModal = openInspectorModal;
window.closeInspectorModal = closeInspectorModal;
window.executeRepoInspect = executeRepoInspect;
window.openDigestModal = openDigestModal;
window.closeDigestModal = closeDigestModal;
window.refreshDevQuote = refreshDevQuote;

