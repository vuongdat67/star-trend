/**
 * Charts & Analytics Manager - Minimalist Jet-Black Theme Adapter
 * Supports Language Distribution, Category Breakdown, Timeline History & Star Velocity Leaderboard
 */

let langChartInstance = null;
let timelineChartInstance = null;
let categoryChartInstance = null;

const LANG_COLORS = {
  'Python': '#3572A5',
  'TypeScript': '#3178C6',
  'JavaScript': '#F1E05A',
  'Rust': '#DEA584',
  'Go': '#00ADD8',
  'C++': '#F34B7D',
  'C': '#555555',
  'HTML': '#E34C26',
  'CSS': '#563D7C',
  'Jupyter Notebook': '#DA5B0B',
  'Shell': '#89E051',
  'C#': '#178600',
  'Java': '#B07219',
  'Swift': '#F05138',
  'Solidity': '#AA6746',
  'Others': '#8B949E'
};

function getLanguageColor(lang) {
  return LANG_COLORS[lang] || '#8B949E';
}
window.getLanguageColor = getLanguageColor;

function initCharts(statsData, topRepos, theme = 'dark') {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }
  renderLanguageChart(statsData?.languages || {}, theme);
  renderTimelineChart(statsData?.years || {}, theme);
  renderCategoryChart(statsData?.categories || {}, theme);
}
window.initCharts = initCharts;

function updateChartsTheme(theme) {
  if (typeof Chart === 'undefined') return;

  const textColor = theme === 'dark' ? '#94a3b8' : '#475569';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const cardBorder = theme === 'dark' ? '#14161f' : '#ffffff';

  if (langChartInstance) {
    langChartInstance.options.plugins.legend.labels.color = textColor;
    langChartInstance.data.datasets[0].borderColor = cardBorder;
    langChartInstance.update();
  }

  if (timelineChartInstance) {
    timelineChartInstance.options.scales.x.ticks.color = textColor;
    timelineChartInstance.options.scales.x.grid.color = gridColor;
    timelineChartInstance.options.scales.y.ticks.color = textColor;
    timelineChartInstance.options.scales.y.grid.color = gridColor;
    timelineChartInstance.update();
  }

  if (categoryChartInstance) {
    categoryChartInstance.options.scales.x.ticks.color = textColor;
    categoryChartInstance.options.scales.x.grid.color = gridColor;
    categoryChartInstance.options.scales.y.ticks.color = textColor;
    categoryChartInstance.options.scales.y.grid.color = gridColor;
    categoryChartInstance.update();
  }
}
window.updateChartsTheme = updateChartsTheme;

function renderLanguageChart(languages, theme = 'dark') {
  const ctx = document.getElementById('chart-languages');
  if (!ctx || !languages || Object.keys(languages).length === 0) return;

  if (langChartInstance) {
    langChartInstance.destroy();
  }

  const labels = Object.keys(languages).slice(0, 8);
  const dataValues = labels.map(l => languages[l]);
  const backgroundColors = labels.map(l => getLanguageColor(l));
  const textColor = theme === 'dark' ? '#94a3b8' : '#475569';
  const cardBorder = theme === 'dark' ? '#14161f' : '#ffffff';

  langChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: cardBorder,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#14161f' : '#ffffff',
          titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
          bodyColor: theme === 'dark' ? '#94a3b8' : '#475569',
          borderColor: theme === 'dark' ? '#232738' : '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.raw;
              const pct = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ${val} repos (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

function renderTimelineChart(yearsData, theme = 'dark') {
  const ctx = document.getElementById('chart-timeline');
  if (!ctx || !yearsData || Object.keys(yearsData).length === 0) return;

  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }

  const labels = Object.keys(yearsData).sort();
  const dataValues = labels.map(y => yearsData[y]);
  const textColor = theme === 'dark' ? '#94a3b8' : '#475569';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  timelineChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Số Repo Đã Star',
        data: dataValues,
        backgroundColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
        borderColor: 'transparent',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 11 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#14161f' : '#ffffff',
          titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
          bodyColor: theme === 'dark' ? '#94a3b8' : '#475569',
          borderColor: theme === 'dark' ? '#232738' : '#e2e8f0',
          borderWidth: 1,
          padding: 10
        }
      }
    }
  });
}

function renderCategoryChart(categoriesData, theme = 'dark') {
  const ctx = document.getElementById('chart-categories');
  if (!ctx || !categoriesData || Object.keys(categoriesData).length === 0) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const labels = Object.keys(categoriesData).slice(0, 6);
  const dataValues = labels.map(k => categoriesData[k]);
  const textColor = theme === 'dark' ? '#94a3b8' : '#475569';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  categoryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.replace(/^[^\s]+\s*/, '')), // strip emoji for axis
      datasets: [{
        label: 'Số lượng repo',
        data: dataValues,
        backgroundColor: [
          '#a855f7', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4'
        ],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#14161f' : '#ffffff',
          titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
          bodyColor: theme === 'dark' ? '#94a3b8' : '#475569',
          borderColor: theme === 'dark' ? '#232738' : '#e2e8f0',
          borderWidth: 1,
          padding: 10
        }
      }
    }
  });
}

function renderVelocityLeaderboard(trendingRepos) {
  const container = document.getElementById('velocity-leaderboard-container');
  if (!container) return;

  const list = (trendingRepos || []).slice(0, 8);
  if (list.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Chưa có dữ liệu bứt phá trong kỳ này.</div>`;
    return;
  }

  let html = `
    <div class="velocity-table-wrap">
      <table class="velocity-table">
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Repository</th>
            <th>Ngôn ngữ</th>
            <th style="text-align: right;">⭐ Tổng Stars</th>
            <th style="text-align: right;">🚀 Tăng trưởng</th>
          </tr>
        </thead>
        <tbody>
  `;

  list.forEach((r, idx) => {
    const starStr = r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : (r.stars || 0);
    const langColor = getLanguageColor(r.language);
    const gain = r.stars_since || r.period_stars || Math.floor((r.stars || 100) * 0.05);

    html += `
      <tr style="cursor: pointer;" onclick="openFullPageRepoDetail('${r.full_name}')">
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
        <td>
          <span class="velocity-repo-link" style="color: var(--text-main); font-weight: 700;">
            ${r.full_name || r.name}
          </span>
          <div class="velocity-repo-desc">${r.description || 'Không có mô tả'}</div>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${langColor};"></span>
            ${r.language || 'Others'}
          </span>
        </td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--pill-amber-text);">
          ⭐ ${starStr}
        </td>
        <td style="text-align: right;">
          <span class="velocity-badge">
            <i data-lucide="trending-up" style="width: 11px; height: 11px;"></i>
            +${gain}
          </span>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}
window.renderVelocityLeaderboard = renderVelocityLeaderboard;
