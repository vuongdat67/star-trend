/**
 * Charts Manager - Minimalist Theme Adapter
 */

let langChartInstance = null;
let timelineChartInstance = null;

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
  renderLanguageChart(statsData.languages, theme);
  renderTimelineChart(statsData.years, theme);
  renderTopStarredTable(topRepos);
}
window.initCharts = initCharts;

function updateChartsTheme(theme) {
  if (langChartInstance) {
    const textColor = theme === 'dark' ? '#8b949e' : '#656d76';
    const borderColor = theme === 'dark' ? '#161b22' : '#ffffff';
    langChartInstance.options.plugins.legend.labels.color = textColor;
    langChartInstance.data.datasets[0].borderColor = borderColor;
    langChartInstance.update();
  }

  if (timelineChartInstance) {
    const textColor = theme === 'dark' ? '#8b949e' : '#656d76';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    timelineChartInstance.options.scales.x.ticks.color = textColor;
    timelineChartInstance.options.scales.x.grid.color = gridColor;
    timelineChartInstance.options.scales.y.ticks.color = textColor;
    timelineChartInstance.options.scales.y.grid.color = gridColor;
    timelineChartInstance.update();
  }
}
window.updateChartsTheme = updateChartsTheme;

function renderLanguageChart(languages, theme = 'dark') {
  const ctx = document.getElementById('chart-languages');
  if (!ctx || !languages) return;

  if (langChartInstance) {
    langChartInstance.destroy();
  }

  const labels = Object.keys(languages).slice(0, 8);
  const dataValues = labels.map(l => languages[l]);
  const backgroundColors = labels.map(l => getLanguageColor(l));
  const textColor = theme === 'dark' ? '#8b949e' : '#656d76';
  const cardBorder = theme === 'dark' ? '#161b22' : '#ffffff';

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
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#1c2128' : '#ffffff',
          titleColor: theme === 'dark' ? '#f0f6fc' : '#1f2328',
          bodyColor: theme === 'dark' ? '#8b949e' : '#656d76',
          borderColor: theme === 'dark' ? '#30363d' : '#d0d7de',
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
      cutout: '72%'
    }
  });
}

function renderTimelineChart(yearsData, theme = 'dark') {
  const ctx = document.getElementById('chart-timeline');
  if (!ctx || !yearsData) return;

  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }

  const labels = Object.keys(yearsData).sort();
  const dataValues = labels.map(y => yearsData[y]);
  const textColor = theme === 'dark' ? '#8b949e' : '#656d76';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  timelineChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Số Repo Đã Star',
        data: dataValues,
        backgroundColor: theme === 'dark' ? '#388bfd' : '#0969da',
        borderColor: 'transparent',
        borderRadius: 4
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
          backgroundColor: theme === 'dark' ? '#1c2128' : '#ffffff',
          titleColor: theme === 'dark' ? '#f0f6fc' : '#1f2328',
          bodyColor: theme === 'dark' ? '#8b949e' : '#656d76',
          borderColor: theme === 'dark' ? '#30363d' : '#d0d7de',
          borderWidth: 1,
          padding: 10
        }
      }
    }
  });
}

function renderTopStarredTable(topRepos) {
  const container = document.getElementById('top-starred-table-container');
  if (!container || !topRepos) return;

  let html = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px;">#</th>
            <th style="padding: 10px;">Repository</th>
            <th style="padding: 10px;">Ngôn Ngữ</th>
            <th style="padding: 10px;">⭐ Stars</th>
            <th style="padding: 10px;">🍴 Forks</th>
            <th style="padding: 10px;">Mô Tả</th>
          </tr>
        </thead>
        <tbody>
  `;

  topRepos.slice(0, 10).forEach((r, idx) => {
    const starStr = r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars;
    const forkStr = r.forks >= 1000 ? `${(r.forks / 1000).toFixed(1)}k` : r.forks;
    const langColor = getLanguageColor(r.language);

    html += `
      <tr style="border-bottom: 1px solid var(--border-muted); transition: background 0.1s;" onmouseover="this.style.background='var(--bg-badge)'" onmouseout="this.style.background='transparent'">
        <td style="padding: 10px; font-family: var(--font-mono); color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
        <td style="padding: 10px;">
          <a href="${r.html_url}" target="_blank" style="color: var(--accent-primary); font-weight: 600;">
            ${r.full_name}
          </a>
        </td>
        <td style="padding: 10px;">
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${langColor};"></span>
            ${r.language || 'Others'}
          </span>
        </td>
        <td style="padding: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--accent-star);">⭐ ${starStr}</td>
        <td style="padding: 10px; font-family: var(--font-mono); color: var(--text-muted);">🍴 ${forkStr}</td>
        <td style="padding: 10px; color: var(--text-muted); max-width: 450px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.description || '-'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}
