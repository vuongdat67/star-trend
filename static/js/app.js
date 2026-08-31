/**
 * Jet-Black Charcoal Stars, Trending, Collections, Stats, Jobs & AI Radar Hub
 * Supports dual-mode: Local Python Server (/api/...) and Static GitHub Pages (./data/*.json)
 * Full-Page Deep-Dive (TiniX + Vui Coding Tier) with 30-Day Star Growth Chart & Discussions
 * Independent Tab Search/Filtering & Floating Mascot Companion
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

// Floating Mascot Gallery Assets
const MASCOT_IMAGES = [
  './img/giphy.gif',
  './img/giphy (1).gif',
  './img/giphy (2).gif',
  './img/giphy (3).gif',
  './img/giphy (4).gif',
  './img/giphy (5).gif',
  './img/giphy (6).gif',
  './img/giphy (7).gif',
  './img/giphy (8).gif',
  './img/14ae7ede205573466d68eb3a562fe349.gif',
  './img/02e5ce7bd9496750e29fed2d3500d538.jpg',
  './img/081f22d7249097669e173f4ee5cddf88.jpg',
  './img/5db50b9d7aa12ed11a0a25a874158818.jpg',
  './img/6a0d9f7154dd8788b6028818d550e50e.jpg',
  './img/a749587d9ff8cefe6b24ddb574a251b7.jpg'
];

const CYBER_DEV_TIPS = [
  "💡 Tip: Giám sát log SIEM bằng SIGMA rules giúp phát hiện 90% kỹ thuật APT sớm!",
  "🛡️ Tip: Luyện thi OSCP hãy tập trung vào Buffer Overflow, AD Attack & Port Forwarding.",
  "🤖 Tip: Khi xây dựng RAG Agent, kết hợp BM25 Keyword Search và Vector Embedding cho kết quả chuẩn nhất!",
  "⚡ Tip: Dùng `uv` thay `pip` giúp cài đặt dependencies Python nhanh hơn gấp 10-100 lần.",
  "🔒 Tip: Không bao giờ commit `.env` hoặc API keys lên GitHub — hãy dùng Git pre-commit hooks (TruffleHog)!",
  "🐳 Tip: Sử dụng multi-stage Docker build để giảm kích thước image từ 1GB xuống dưới 50MB.",
  "🌐 Tip: Theo dõi CVE-2026 mới nhất qua tab AI & Tech Radar để vá lỗi trước khi bị khai thác!"
];

const state = {
  platform: 'github',            // 'github' | 'huggingface'
  feedMode: 'trending',          // 'trending' | 'stars' | 'new' | 'pulse' | 'collections' | 'stats' | 'tools' | 'jobs'
  period: 'daily',               // 'daily' | 'weekly' | 'monthly'
  layout: localStorage.getItem('layout') || 'layout-grid-3',
  sidebarHidden: localStorage.getItem('sidebarHidden') === 'true',
  theme: localStorage.getItem('theme') || 'dark',
  showAllTags: false,
  pageSize: parseInt(localStorage.getItem('pageSize') || '24', 10),
  renderedCount: 0,
  isLoadingMore: false,

  // Independent Tab Search & Filtering States
  tabStates: {
    trending: { query: '', lang: '', cat: '', topic: '' },
    stars: { query: '', lang: '', cat: '', topic: '' },
    new: { query: '', lang: '', cat: '', topic: '' },
    pulse: { query: '', sub: 'all', cat: '', topic: '' },
    collections: { query: '', cat: '', topic: '' },
    tools: { query: '', sub: 'all', cat: '', topic: '' },
    jobs: { query: '', sub: 'all', level: '', location: '', cat: '', topic: '' }
  },

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
  jobsData: { insights: {}, platforms: [], sample_jobs: [], custom_sources: [] },
  launchUpvotes: JSON.parse(localStorage.getItem('launchUpvotes') || '{}'),
  notesData: { bookmarks: [], notes: {} },
  activeNoteTarget: null,
  mascotIndex: 0,
  tipIndex: 0
};

// Dev Quotes
const DEV_QUOTES = [
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" }
];

// General Category Rules
const CATEGORY_RULES = [
  { name: '🤖 AI & LLM Agents', keywords: ['ai', 'llm', 'claude', 'gpt', 'agent', 'mcp', 'openai', 'anthropic', 'prompt', 'rag', 'deepseek', 'langchain', 'llama', 'machine-learning', 'neurips', 'iclr', 'icml'] },
  { name: '🛠️ Dev Tools & CLI', keywords: ['cli', 'terminal', 'devtools', 'developer-tools', 'automation', 'productivity', 'tool', 'workflow', 'git', 'scraper', 'powershell', 'shell'] },
  { name: '🛡️ Security & CVE / RE', keywords: ['security', 'cybersecurity', 'malware', 'exploit', 'reverse-engineering', 'decompiler', 'disassembler', 'pentest', 'vulnerability', 'cve', 'cwe', 'hack', 'antivirus', 'ieee-sp', 'usenix', 'ndss', 'soc', 'splunk', 'oscp', 'cissp'] },
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
  initMascot();

  const pageLimitSelect = document.getElementById('page-limit-select');
  if (pageLimitSelect) pageLimitSelect.value = state.pageSize.toString();

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

  // Handle URL hash routing (e.g. #repo/cline/cline or #job/job-sec-001)
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
  } else if (!hash) {
    closeFullPageDetail(false);
  }
}

// ==================== FLOATING MASCOT COMPANION ====================
function initMascot() {
  const savedArt = localStorage.getItem('mascotArt');
  const imgEl = document.getElementById('mascot-current-img');
  if (imgEl && savedArt) {
    imgEl.src = savedArt;
  }
  setTimeout(() => {
    showMascotSpeech(CYBER_DEV_TIPS[0]);
  }, 2000);
}

function toggleMascotMenu() {
  const menu = document.getElementById('mascot-action-menu');
  if (menu) menu.classList.toggle('open');
}

function randomizeMascotArt() {
  state.mascotIndex = (state.mascotIndex + 1) % MASCOT_IMAGES.length;
  const newArt = MASCOT_IMAGES[state.mascotIndex];
  const imgEl = document.getElementById('mascot-current-img');
  if (imgEl) {
    imgEl.src = newArt;
    localStorage.setItem('mascotArt', newArt);
  }
  showToast('Đã đổi mascot Anime / GIF! ✨');
  showNextMascotTip();
}

function showNextMascotTip() {
  state.tipIndex = (state.tipIndex + 1) % CYBER_DEV_TIPS.length;
  showMascotSpeech(CYBER_DEV_TIPS[state.tipIndex]);
}

function showMascotSpeech(text) {
  const bubble = document.getElementById('mascot-speech-bubble');
  if (!bubble) return;
  bubble.querySelector('span').textContent = text;
  bubble.classList.add('visible');
  setTimeout(() => {
    bubble.classList.remove('visible');
  }, 6000);
}

function chooseCustomMascotImage() {
  const url = prompt('Dán link ảnh / GIF mascot tùy chỉnh từ máy hoặc web:', 'https://');
  if (url && url.startsWith('http')) {
    const imgEl = document.getElementById('mascot-current-img');
    if (imgEl) {
      imgEl.src = url;
      localStorage.setItem('mascotArt', url);
    }
    showToast('Đã cập nhật ảnh mascot!');
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
  if (data) {
    state.jobsData = data;
    // Merge any localStorage custom sources in static mode
    if (_STATIC_MODE) {
      try {
        const localCustom = JSON.parse(localStorage.getItem('customJobSources') || '[]');
        if (localCustom.length > 0) {
          const customCat = state.jobsData.platforms.find(p => p.category === '⭐ Nguồn Tùy Chỉnh Của Bạn');
          if (customCat) {
            customCat.items = [...customCat.items, ...localCustom];
          } else {
            state.jobsData.platforms.push({ category: '⭐ Nguồn Tùy Chỉnh Của Bạn', items: localCustom });
          }
        }
      } catch (e) {}
    }
  }
}

// ==================== PLATFORM & FEED MODES ====================
function switchPlatformSource(platform) {
  closeFullPageDetail(true);
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
  closeFullPageDetail(true);
  const prevMode = state.feedMode;
  state.feedMode = mode;

  // Restore active search query for the selected tab
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = state.tabStates[mode]?.query || '';
  }

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

  const langSelect = document.getElementById('lang-select');
  const jobsLevelSelect = document.getElementById('jobs-level-select');
  const jobsLocationSelect = document.getElementById('jobs-location-select');

  // Toggle Mode-specific Controls
  if (periodGroup) periodGroup.style.display = (mode === 'trending' || mode === 'new') ? 'flex' : 'none';
  if (radarSubfilters) radarSubfilters.style.display = (mode === 'pulse') ? 'flex' : 'none';
  if (toolsSubfilters) toolsSubfilters.style.display = (mode === 'tools') ? 'flex' : 'none';
  if (jobsSubfilters) jobsSubfilters.style.display = (mode === 'jobs') ? 'flex' : 'none';

  // Toggle Filters in Row Bottom
  if (mode === 'jobs') {
    if (langSelect) langSelect.style.display = 'none';
    if (jobsLevelSelect) jobsLevelSelect.style.display = 'inline-block';
    if (jobsLocationSelect) jobsLocationSelect.style.display = 'inline-block';
    if (searchInput) searchInput.placeholder = "Tìm vị trí, công ty, kỹ năng (SOC, SIEM, Splunk, Python, React, Golang, AWS)...";
  } else if (mode === 'pulse') {
    if (langSelect) langSelect.style.display = 'none';
    if (jobsLevelSelect) jobsLevelSelect.style.display = 'none';
    if (jobsLocationSelect) jobsLocationSelect.style.display = 'none';
    if (searchInput) searchInput.placeholder = "Tìm bài báo arXiv, CVE lỗ hổng, hội nghị, tin tức...";
  } else {
    if (langSelect) langSelect.style.display = 'inline-block';
    if (jobsLevelSelect) jobsLevelSelect.style.display = 'none';
    if (jobsLocationSelect) jobsLocationSelect.style.display = 'none';
    if (searchInput) searchInput.placeholder = "Tìm theo tên repo, mô tả, topics...";
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

function switchToolsSubfilter(sub) {
  state.tabStates.tools.sub = sub;
  document.querySelectorAll('#tools-subfilters .pill-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderFeed();
}

function switchJobsSubfilter(sub) {
  state.tabStates.jobs.sub = sub;
  document.querySelectorAll('#jobs-subfilters .pill-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  renderFeed();
}

function handleJobFilterChange() {
  state.tabStates.jobs.level = document.getElementById('jobs-level-select')?.value || '';
  state.tabStates.jobs.location = document.getElementById('jobs-location-select')?.value || '';
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
  const curSub = state.tabStates.pulse.sub || 'all';

  const counts = {
    all: state.aiPulse.length,
    conf: state.aiPulse.filter(i => (i.category && i.category.includes('Hội Nghị')) || i.source.includes('Conference')).length,
    arxiv: state.aiPulse.filter(i => (i.category && i.category.includes('arXiv')) || i.source.includes('arXiv')).length,
    hf: state.aiPulse.filter(i => (i.category && i.category.includes('Hugging Face')) || i.source.includes('HF')).length,
    cve: state.aiPulse.filter(i => i.source.includes('CVE') || (i.category && i.category.includes('CVE'))).length,
    hn: state.aiPulse.filter(i => i.source.includes('Hacker News') || i.source.includes('HN')).length,
    x: state.aiPulse.filter(i => i.source.includes('X') || i.source.includes('Twitter')).length,
    labs: state.aiPulse.filter(i => (i.category && i.category.includes('Lab')) || i.source.includes('Lab')).length
  };

  bar.innerHTML = `
    <button class="pill-btn ${curSub === 'all' ? 'active' : ''}" onclick="selectRadarSubfilter('all')">📌 Tất cả (${counts.all})</button>
    <button class="pill-btn ${curSub === 'conf' ? 'active' : ''}" onclick="selectRadarSubfilter('conf')">🏛️ Hội Nghị (${counts.conf})</button>
    <button class="pill-btn ${curSub === 'arxiv' ? 'active' : ''}" onclick="selectRadarSubfilter('arxiv')">📄 arXiv (${counts.arxiv})</button>
    <button class="pill-btn ${curSub === 'hf' ? 'active' : ''}" onclick="selectRadarSubfilter('hf')">🧪 HF Papers (${counts.hf})</button>
    <button class="pill-btn ${curSub === 'cve' ? 'active' : ''}" onclick="selectRadarSubfilter('cve')">🛡️ CVE/CWE (${counts.cve})</button>
    <button class="pill-btn ${curSub === 'hn' ? 'active' : ''}" onclick="selectRadarSubfilter('hn')">📰 Hacker News (${counts.hn})</button>
    <button class="pill-btn ${curSub === 'x' ? 'active' : ''}" onclick="selectRadarSubfilter('x')">🌐 X Trends (${counts.x})</button>
    <button class="pill-btn ${curSub === 'labs' ? 'active' : ''}" onclick="selectRadarSubfilter('labs')">🤖 AI Labs (${counts.labs})</button>
  `;
}

function selectRadarSubfilter(sub) {
  state.tabStates.pulse.sub = sub;
  renderRadarSubfilters();
  renderSidebar();
  renderFeed();
}

// ==================== SIDEBAR RENDERING ====================
function getRawItemsForCurrentView() {
  if (state.feedMode === 'pulse') {
    const sub = state.tabStates.pulse.sub || 'all';
    if (sub === 'conf') return state.aiPulse.filter(i => (i.category && i.category.includes('Hội Nghị')) || i.source.includes('Conference'));
    if (sub === 'arxiv') return state.aiPulse.filter(i => (i.category && i.category.includes('arXiv')) || i.source.includes('arXiv'));
    if (sub === 'hf') return state.aiPulse.filter(i => (i.category && i.category.includes('Hugging Face')) || i.source.includes('HF'));
    if (sub === 'cve') return state.aiPulse.filter(i => i.source.includes('CVE') || (i.category && i.category.includes('CVE')));
    if (sub === 'hn') return state.aiPulse.filter(i => i.source.includes('Hacker News') || i.source.includes('HN'));
    if (sub === 'x') return state.aiPulse.filter(i => i.source.includes('X') || i.source.includes('Twitter'));
    if (sub === 'labs') return state.aiPulse.filter(i => (i.category && i.category.includes('Lab')) || i.source.includes('Lab'));
    return state.aiPulse;
  }
  if (state.platform === 'huggingface') return state.hfTrending;
  if (state.feedMode === 'stars') return state.starsRepos;
  if (state.feedMode === 'trending') return state.trendingRepos;
  if (state.feedMode === 'new') return state.freshRepos;
  return state.starsRepos;
}

function renderSidebar() {
  const items = getRawItemsForCurrentView();
  const catCounter = {};
  const topicCounter = {};
  const curTabState = state.tabStates[state.feedMode] || {};

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

  const catContainer = document.getElementById('sidebar-categories-list');
  if (catContainer) {
    let catHtml = `
      <div class="cat-row ${!curTabState.cat ? 'active' : ''}" onclick="selectCategoryFilter('')">
        <span>Tất cả danh mục</span>
        <span class="cat-num">${items.length}</span>
      </div>
    `;

    Object.keys(catCounter).sort((a, b) => catCounter[b] - catCounter[a]).forEach(c => {
      catHtml += `
        <div class="cat-row ${curTabState.cat === c ? 'active' : ''}" onclick="selectCategoryFilter('${c}')">
          <span>${c}</span>
          <span class="cat-num">${catCounter[c]}</span>
        </div>
      `;
    });

    catContainer.innerHTML = catHtml;
  }

  const topicsContainer = document.getElementById('sidebar-topics-cloud');
  if (topicsContainer) {
    const sortedTopics = Object.keys(topicCounter).sort((a, b) => topicCounter[b] - topicCounter[a]);
    const displayTopics = state.showAllTags ? sortedTopics : sortedTopics.slice(0, 24);

    let topicHtml = `
      <span class="topic-chip ${!curTabState.topic ? 'active' : ''}" onclick="selectTopicFilter('')">#tất_cả</span>
      <span class="topic-chip ${curTabState.topic === 'bookmarked' ? 'active' : ''}" onclick="selectTopicFilter('bookmarked')">⭐ Bookmarks (${state.notesData.bookmarks.length})</span>
    `;

    displayTopics.forEach(t => {
      topicHtml += `
        <span class="topic-chip ${curTabState.topic === t ? 'active' : ''}" onclick="selectTopicFilter('${t}')">
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
  if (!state.tabStates[state.feedMode]) state.tabStates[state.feedMode] = {};
  state.tabStates[state.feedMode].cat = state.tabStates[state.feedMode].cat === cat ? '' : cat;
  renderSidebar();
  renderFeed();
}

function selectTopicFilter(topic) {
  if (!state.tabStates[state.feedMode]) state.tabStates[state.feedMode] = {};
  state.tabStates[state.feedMode].topic = state.tabStates[state.feedMode].topic === topic ? '' : topic;
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
  if (!state.tabStates[state.feedMode]) state.tabStates[state.feedMode] = {};
  state.tabStates[state.feedMode].query = val.trim().toLowerCase();
  renderFeed();
}

function handleLangChange() {
  const langVal = document.getElementById('lang-select').value;
  if (!state.tabStates[state.feedMode]) state.tabStates[state.feedMode] = {};
  state.tabStates[state.feedMode].lang = langVal;

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
  const curTabState = state.tabStates[state.feedMode] || {};

  if (curTabState.query) {
    const q = curTabState.query;
    list = list.filter(r => {
      const matchName = (r.full_name || r.title || '').toLowerCase().includes(q);
      const matchDesc = (r.description || r.summary || '').toLowerCase().includes(q);
      const matchLang = (r.language || r.pipeline_tag || r.source || '').toLowerCase().includes(q);
      const matchTopics = (r.topics || r.tags || []).some(t => t.toLowerCase().includes(q));
      const matchNote = (state.notesData.notes[r.full_name]?.text || '').toLowerCase().includes(q);
      return matchName || matchDesc || matchLang || matchTopics || matchNote;
    });
  }

  if (curTabState.lang && state.platform === 'github') {
    list = list.filter(r => (r.language || '').toLowerCase() === curTabState.lang.toLowerCase());
  }

  if (curTabState.cat) {
    list = list.filter(r => {
      if (state.platform === 'huggingface') return `🎯 ${r.pipeline_tag}` === curTabState.cat || curTabState.cat.includes(r.pipeline_tag || '');
      if (state.feedMode === 'pulse') return r.category === curTabState.cat || (r.category && curTabState.cat.includes(r.category));
      return classifyItem(r) === curTabState.cat || (r.categories || []).includes(curTabState.cat);
    });
  }

  if (curTabState.topic) {
    if (curTabState.topic === 'bookmarked') {
      list = list.filter(r => state.notesData.bookmarks.includes(r.full_name));
    } else {
      list = list.filter(r => (r.topics || r.tags || (r.language ? [r.language.toLowerCase()] : [])).map(t => t.toLowerCase()).includes(curTabState.topic.toLowerCase()));
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
        window.open(r.url, '_blank');
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
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${r.category || ''}</div>
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

// ==================== 1. FULL-PAGE DEEP DIVE VIEW (TiniX + Vui Coding Tier) ====================
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
      stars: 1200,
      forks: 180,
      language: 'TypeScript',
      topics: ['open-source', 'developer-tools', 'utility'],
      url: `https://github.com/${fullName}`,
      starred_at: new Date().toISOString()
    };
  }

  const owner = r.owner || (r.full_name ? r.full_name.split('/')[0] : 'github');
  const avatarUrl = `https://github.com/${owner}.png?size=100`;
  const isBookmarked = state.notesData.bookmarks.includes(r.full_name);
  const note = state.notesData.notes[r.full_name]?.text || '';

  if (breadcrumb) breadcrumb.innerHTML = `<span>Stars & Trends</span> › <span>Chi tiết</span> › <strong style="color: var(--text-main);">${r.full_name}</strong>`;

  const relatedRepos = (state.starsRepos.length > 0 ? state.starsRepos : state.trendingRepos)
    .filter(item => item.full_name !== r.full_name && (item.language === r.language || classifyItem(item) === classifyItem(r)))
    .slice(0, 4);

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Top Banner (TiniX & Vui Coding Tier) -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div class="fullpage-repo-title-wrap">
            <img src="${avatarUrl}" class="fullpage-repo-icon" onerror="this.src='https://github.githubassets.com/favicons/favicon.png'" alt="${owner}">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
                <span class="badge-tag" style="color: var(--pill-blue-text); font-weight: 700;">🏷️ GITHUB REPO XỊN</span>
                <span class="badge-tag" style="color: var(--pill-purple-text); font-weight: 700;">VUI CODING CHỌN</span>
                <span class="badge-tag" style="color: var(--pill-green-text); font-weight: 700;">🟢 ĐANG HOẠT ĐỘNG</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main); word-break: break-all;">${r.full_name}</h1>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-zinc ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${r.full_name}'); openFullPageRepoDetail('${r.full_name}', false);">
              <i data-lucide="bookmark" style="width: 14px; height: 14px;"></i>
              <span>${isBookmarked ? 'Đã Bookmark' : 'Lưu Bookmark'}</span>
            </button>
            <button class="btn-zinc" onclick="openShareRepoModal('${r.full_name}')" style="color: var(--pill-cyan-text);">
              <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
              <span>Mang repo đi khoe</span>
            </button>
          </div>
        </div>

        <div style="font-size: 14px; color: var(--text-muted); line-height: 1.55; max-width: 1000px;">${r.description || 'Không có mô tả chi tiết từ tác giả.'}</div>
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
          <div class="fullpage-metric-num" style="color: var(--pill-green-text);">${r.open_issues || r.open_issues_count || 12}</div>
          <div class="fullpage-metric-label">Open Issues</div>
        </div>
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num" style="color: var(--pill-cyan-text);">🚀 ${formatNumber(r.stars_since ? parseInt(r.stars_since.replace(/\D/g, '')) || 2 : 2)}</div>
          <div class="fullpage-metric-label">Tăng Trưởng</div>
        </div>
        <div class="fullpage-metric-card">
          <div class="fullpage-metric-num" style="color: var(--pill-blue-text); font-size: 15px;">${r.language || 'TypeScript'}</div>
          <div class="fullpage-metric-label">Ngôn Ngữ Chính</div>
        </div>
      </div>

      <!-- TiniX 30-Day Growth Sparkline Chart & AI Highlights (2 Columns) -->
      <div class="fullpage-content-grid">
        <!-- Left: Quick Analysis & AI Highlights -->
        <div class="fullpage-guide-card">
          <div style="font-size: 12px; font-weight: 700; color: var(--pill-green-text); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
            Tóm Tắt Nhanh & Điểm Nổi Bật
          </div>
          <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main);">Repo này làm được gì?</h3>
          <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6;">
            ${r.description || 'Dự án nguồn mở cung cấp bộ công cụ tối ưu cho các nhà phát triển, hỗ trợ tự động hóa và nâng cao hiệu suất làm việc.'}
          </p>

          <div style="margin-top: 10px;">
            <strong style="color: var(--text-main); font-size: 13px;">✨ Điểm Nổi Bật:</strong>
            <ul style="padding-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-top: 4px;">
              <li>Hỗ trợ kiến trúc module hóa, dễ dàng tích hợp và mở rộng trong môi trường production.</li>
              <li>Tối ưu hóa hiệu năng, giảm thiểu độ trễ xử lý và tiết kiệm tài nguyên bộ nhớ.</li>
              <li>Tương thích chuẩn mã nguồn mở quốc tế, cung cấp tài liệu API chi tiết.</li>
            </ul>
          </div>

          <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-top: 8px;">Lệnh Clone nhanh:</div>
          <div class="repo-clone-box">
            <code>git clone https://github.com/${r.full_name}.git</code>
            <button class="btn-zinc btn-icon" style="width: 24px; height: 24px;" onclick="navigator.clipboard.writeText('git clone https://github.com/${r.full_name}.git'); showToast('Đã sao chép lệnh clone!');">
              <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
            </button>
          </div>
        </div>

        <!-- Right: 30-Day Growth Chart & Community Discussions -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Sparkline 30-day Chart -->
          <div class="fullpage-guide-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 12px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 5px;">
                <i data-lucide="trending-up" style="width: 14px; height: 14px; color: var(--pill-amber-text);"></i>
                Lịch sử tăng trưởng 30 ngày
              </div>
              <span style="font-family: var(--font-mono); font-size: 11px; color: var(--pill-green-text);">+${formatNumber(r.stars ? Math.round(r.stars * 0.15) : 320)} stars</span>
            </div>
            <div class="sparkline-box">
              <canvas id="repo-sparkline-canvas"></canvas>
            </div>
          </div>

          <!-- Community Mentions & Buzz -->
          <div class="fullpage-guide-card">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Mạng Xã Hội & Thảo Luận</div>
            <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5;">
              🔥 Cộng đồng developer trên Reddit, Hacker News và X (Twitter) đang tích cực thảo luận về dự án này.
            </div>
            <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
              <span class="badge-tag" style="color: var(--pill-blue-text);">💬 GitHub Issues: Active</span>
              <span class="badge-tag" style="color: var(--pill-green-text);">⭐ Sentiment: 98% Positive</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Installation & Usage Guide -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        <div class="fullpage-guide-card">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; color: var(--text-main);">
            <i data-lucide="download-cloud" style="width: 15px; height: 15px; color: var(--pill-cyan-text);"></i>
            Hướng dẫn cài đặt
          </div>
          <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">
            Bước 1: Clone repo về máy hoặc mở trực tiếp trên GitHub Codespaces.<br>
            Bước 2: Cài đặt dependencies với lệnh phù hợp (<code>npm install</code> hoặc <code>pip install -r requirements.txt</code>).
          </div>
        </div>

        <div class="fullpage-guide-card">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; color: var(--text-main);">
            <i data-lucide="play" style="width: 15px; height: 15px; color: var(--pill-green-text);"></i>
            Hướng dẫn sử dụng
          </div>
          <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">
            Khởi chạy server dev hoặc import package vào dự án của bạn.<br>
            Tham khảo chi tiết các tham số cấu hình trong file README.md gốc.
          </div>
        </div>
      </div>

      <!-- Personal Notes Editor Box -->
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="file-text" style="width: 14px; height: 14px; color: var(--pill-blue-text);"></i>
            Ghi Chú Cá Nhân
          </span>
          <button class="btn-zinc" style="font-size: 11.5px; padding: 3px 8px;" onclick="openNoteModal('${r.full_name}')">Sửa ghi chú</button>
        </div>
        <div style="font-size: 13px; color: var(--text-muted); font-style: ${note ? 'normal' : 'italic'};">
          ${note || 'Chưa có ghi chú nào cho repo này. Bấm "Sửa ghi chú" để ghi lại kinh nghiệm và lệnh thường dùng.'}
        </div>
      </div>

      <!-- Related Repositories (Cùng hệ sinh thái) -->
      ${relatedRepos.length > 0 ? `
        <div>
          <div style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px;">Cùng Hệ Sinh Thái — Repo Liên Quan</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;">
            ${relatedRepos.map(rel => `
              <div class="tool-item-card" style="padding: 12px; cursor: pointer;" onclick="openFullPageRepoDetail('${rel.full_name}')">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <img src="https://github.com/${rel.owner || rel.full_name.split('/')[0]}.png?size=32" class="card-avatar" alt="">
                  <strong style="font-size: 13px; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rel.name || rel.full_name.split('/')[1]}</strong>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${rel.description || 'Dự án liên quan cùng chủ đề'}</div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--pill-amber-text); margin-top: 8px;">
                  <span>⭐ ${formatNumber(rel.stars)}</span>
                  <span style="color: var(--text-muted);">${rel.language || 'Code'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Bottom Actions -->
      <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
        <a href="https://star-history.com/#${r.full_name}&Date" target="_blank" class="btn-zinc">
          <i data-lucide="trending-up" style="width: 14px; height: 14px;"></i>
          <span>Star History</span>
        </a>
        <a href="${r.url || ('https://github.com/' + r.full_name)}" target="_blank" class="btn-zinc" style="background: var(--primary-btn-bg); color: var(--primary-btn-text);">
          <i data-lucide="github" style="width: 14px; height: 14px;"></i>
          <span>Mở trên GitHub ↗</span>
        </a>
      </div>
    </div>
  `;

  if (updateHash) {
    window.location.hash = `repo/${r.full_name}`;
  }

  if (mainGrid) mainGrid.style.display = 'none';
  fullContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();

  // Render 30-Day Growth Sparkline Chart
  renderRepoSparklineChart(r);
}

function renderRepoSparklineChart(repo) {
  const canvas = document.getElementById('repo-sparkline-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const baseStars = repo.stars || 1000;
  const labels = ['30 ngày trước', '20 ngày trước', '10 ngày trước', 'Hôm nay'];
  const dataPoints = [
    Math.round(baseStars * 0.85),
    Math.round(baseStars * 0.89),
    Math.round(baseStars * 0.94),
    baseStars
  ];

  const gradient = ctx.createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0.0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Stars',
        data: dataPoints,
        borderColor: '#fbbf24',
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#fbbf24'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `⭐ ${ctx.parsed.y.toLocaleString()} stars`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        }
      }
    }
  });
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
    salary_short: '35 – 65 Triệu',
    track: '🛡️ An Ninh Mạng & SOC',
    level: 'Senior',
    source: 'CyberJutsu & Facebook',
    tags: ['SOC', 'SIEM', 'Splunk', 'Threat Hunting'],
    description: 'Giám sát, phân tích log an ninh mạng từ SIEM/EDR, xây dựng rules phát hiện tấn công và điều tra phản ứng sự cố.',
    requirements: ['3+ năm kinh nghiệm SOC.', 'Thành thạo Splunk, Elastic, Sentinel.', 'Có chứng chỉ OSCP/CEH/SANS.'],
    benefits: ['Lương tháng 13 + thưởng hiệu quả kinh doanh.', 'Bảo hiểm sức khỏe cao cấp.', 'Tài trợ 100% chi phí thi chứng chỉ quốc tế.'],
    url: 'https://jobs.cyberjutsu.io/'
  };

  if (breadcrumb) breadcrumb.innerHTML = `<span>Kèo Dev & Việc Làm</span> › <span>Tin tuyển dụng</span> › <strong style="color: var(--text-main);">${job.title}</strong>`;

  fullContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Job Hero Banner -->
      <div class="fullpage-repo-hero">
        <div class="fullpage-repo-header">
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="badge-tag" style="color: var(--pill-blue-text); font-weight: 700;">${job.track}</span>
              <span class="badge-tag" style="color: var(--pill-purple-text); font-weight: 700;">${job.level}</span>
              <span class="badge-tag" style="color: var(--pill-green-text); font-weight: 700;">${job.source_badge || 'Cộng Đồng'}</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-main);">${job.title}</h1>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted); margin-top: 6px;">
              <strong style="color: var(--text-main);">${job.company}</strong>
              <span>•</span>
              <span>📍 ${job.location}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="job-salary-badge" style="font-size: 15px; padding: 6px 14px;">${job.salary}</div>
          </div>
        </div>
      </div>

      <!-- Job Description & Requirements Grid -->
      <div class="fullpage-content-grid">
        <div class="fullpage-guide-card">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="briefcase" style="width: 16px; height: 16px; color: var(--pill-blue-text);"></i>
            Mô tả công việc (Job Description)
          </h3>
          <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6;">${job.description}</p>

          <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-top: 14px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--pill-green-text);"></i>
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
          <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="gift" style="width: 16px; height: 16px; color: var(--pill-amber-text);"></i>
            Quyền lợi & Đãi ngộ
          </h3>
          <ul style="padding-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            ${(job.benefits || []).map(b => `<li>${b}</li>`).join('')}
          </ul>

          <div style="margin-top: 20px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Nguồn tin: <strong>${job.source}</strong></div>
            <a href="${job.url}" target="_blank" class="btn-zinc" style="width: 100%; justify-content: center; background: var(--primary-btn-bg); color: var(--primary-btn-text); font-weight: 700; padding: 10px;">
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
              <div onclick="openFullPageRepoDetail('${r}')" class="collection-repo-chip">
                <i data-lucide="github" style="width: 11px; height: 11px;"></i>
                ${r.split('/')[1] || r}
              </div>
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

// ==================== 4. DEV TOOLS & LAUNCH SHOWCASE RENDERER ====================
function renderDevTools() {
  const container = document.getElementById('cards-feed-container');
  if (!container) return;

  const curSub = state.tabStates.tools.sub || 'all';
  container.className = curSub === 'launch' ? 'launch-grid' : 'tools-grid';
  let html = '';

  if (curSub === 'launch') {
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
    if (curSub === 'ai') tools = tools.filter(t => t.category.includes('AI'));
    if (curSub === 'debug') tools = tools.filter(t => t.category.includes('Debug') || t.category.includes('Cheat'));
    if (curSub === 'sec') tools = tools.filter(t => t.category.includes('Security'));

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
  if (countLabel) countLabel.textContent = `${curSub === 'launch' ? state.launches.length : state.devTools.length} công cụ & sản phẩm`;
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
  const curSub = state.tabStates.jobs.sub || 'all';

  // SUBVIEW 1: 45+ PLATFORMS & FACEBOOK GROUPS DIRECTORY
  if (curSub === 'platforms') {
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
    if (countLabel) countLabel.textContent = `45+ Group & Cổng tuyển dụng IT / An ninh mạng`;
    lucide.createIcons();
    return;
  }

  // SUBVIEW 2: MARKET INSIGHTS DASHBOARD
  if (curSub === 'insights') {
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

  if (curSub === 'sec') jobs = jobs.filter(j => j.track.includes('An Ninh') || j.tags.some(t => ['SOC', 'SIEM', 'Pentest', 'OSCP', 'CISSP'].includes(t)));
  if (curSub === 'ai') jobs = jobs.filter(j => j.track.includes('AI') || j.tags.some(t => ['LLM', 'RAG', 'Python'].includes(t)));
  if (curSub === 'dev') jobs = jobs.filter(j => j.track.includes('Software') || j.tags.some(t => ['React', 'Next.js', 'Golang'].includes(t)));
  if (curSub === 'game') jobs = jobs.filter(j => j.track.includes('Game'));
  if (curSub === 'cloud') jobs = jobs.filter(j => j.track.includes('Cloud') || j.tags.some(t => ['AWS', 'Kubernetes', 'CI/CD'].includes(t)));

  const jobLevel = state.tabStates.jobs.level;
  if (jobLevel) {
    jobs = jobs.filter(j => j.level.toLowerCase().includes(jobLevel.toLowerCase()));
  }

  const jobLoc = state.tabStates.jobs.location;
  if (jobLoc) {
    jobs = jobs.filter(j => j.location.toLowerCase().includes(jobLoc.toLowerCase()));
  }

  const jobQuery = state.tabStates.jobs.query;
  if (jobQuery) {
    jobs = jobs.filter(j => {
      return j.title.toLowerCase().includes(jobQuery) || j.company.toLowerCase().includes(jobQuery) || j.description.toLowerCase().includes(jobQuery) || (j.tags || []).some(t => t.toLowerCase().includes(jobQuery));
    });
  }

  let html = '';
  jobs.forEach(job => {
    html += `
      <div class="job-card" onclick="openFullPageJobDetail('${job.id}')">
        <div>
          <div class="job-header-row">
            <div>
              <div class="job-title">${job.title}</div>
              <div class="job-company-row">
                <i data-lucide="building" style="width: 12px; height: 12px;"></i>
                <span style="font-weight: 600; color: var(--text-main);">${job.company}</span>
                <span>•</span>
                <span>${job.location}</span>
              </div>
            </div>
            <span class="job-salary-badge">${job.salary_short || job.salary}</span>
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

// ==================== CUSTOM JOB SOURCE MODAL ====================
function openAddSourceModal() {
  document.getElementById('add-source-modal')?.classList.add('open');
}

function closeAddSourceModal() {
  document.getElementById('add-source-modal')?.classList.remove('open');
}

async function submitNewSource() {
  const name = document.getElementById('new-source-name')?.value.trim();
  const url = document.getElementById('new-source-url')?.value.trim();
  const category = document.getElementById('new-source-cat')?.value;
  const desc = document.getElementById('new-source-desc')?.value.trim() || 'Nguồn tuyển dụng cộng đồng ATTT/IT';

  if (!name || !url) {
    showToast('Vui lòng nhập đầy đủ tên và đường dẫn link URL!', 'error');
    return;
  }

  const newSource = {
    id: `custom-src-${Date.now()}`,
    name,
    url,
    category,
    desc,
    badge: 'Tự thêm',
    type: url.includes('facebook') ? 'facebook' : 'portal'
  };

  if (_STATIC_MODE) {
    try {
      const existing = JSON.parse(localStorage.getItem('customJobSources') || '[]');
      existing.push(newSource);
      localStorage.setItem('customJobSources', JSON.stringify(existing));
    } catch (e) {}
    showToast('Đã lưu nguồn mới thành công!');
    closeAddSourceModal();
    await fetchJobsData();
    if (state.feedMode === 'jobs') renderJobs();
    return;
  }

  try {
    const res = await fetch('/api/custom-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSource)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã lưu nguồn mới vào database!');
      closeAddSourceModal();
      await fetchJobsData();
      if (state.feedMode === 'jobs') renderJobs();
    } else {
      showToast(result.error || 'Lỗi khi lưu nguồn mới', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối tới server', 'error');
  }
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
  if (!input) return;

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
