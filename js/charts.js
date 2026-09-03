/* ===================================================
   ChurchOS — Shared Charts & Analytics Module
   Dependency-free, SVG & CSS hand-built visual charts
   Reused across Senior Pastor, Admin, Finance, & Member dashboards
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Color Palette Tokens (Matches CSS variables)
     --------------------------------------------------- */
  const PALETTE = {
    navy: '#1B2A4A',
    navyLight: '#2C3E66',
    gold: '#D4A843',
    goldDark: '#B88E30',
    success: '#2D9F6F',
    info: '#3B82C4',
    warning: '#E6A817',
    danger: '#D9534F',
    gray200: '#E2E8F0',
    gray400: '#94A3B8',
    gray600: '#475569',
  };

  /* ---------------------------------------------------
     Trend Helper
     --------------------------------------------------- */
  function computeTrend(values) {
    if (!values || values.length < 2) return { direction: 'flat', pct: '0%', html: '<span class="trend-badge trend-badge--flat">➡️ 0%</span>' };
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return { direction: 'up', pct: '+100%', html: '<span class="trend-badge trend-badge--up">📈 +100%</span>' };

    const diffPct = (((last - first) / first) * 100).toFixed(1);
    if (diffPct > 0) {
      return {
        direction: 'up',
        pct: `+${diffPct}%`,
        html: `<span class="trend-badge trend-badge--up">📈 +${diffPct}% Growth</span>`,
      };
    } else if (diffPct < 0) {
      return {
        direction: 'down',
        pct: `${diffPct}%`,
        html: `<span class="trend-badge trend-badge--down">📉 ${diffPct}%</span>`,
      };
    }
    return {
      direction: 'flat',
      pct: '0%',
      html: `<span class="trend-badge trend-badge--flat">➡️ Stable (0%)</span>`,
    };
  }

  /* ---------------------------------------------------
     1. Line Chart (Attendance / Growth Trend)
     --------------------------------------------------- */
  function renderLineChart(containerId, rawData, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opts = options || {};
    const data = rawData || generateMockTimeSeries('attendance_trend', 'year');
    const width = 640;
    const height = 240;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };

    // Empty state check
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📈</div>
          <div class="empty-state__title">No attendance data yet</div>
          <div class="empty-state__desc">Data will appear here once service attendance is recorded.</div>
        </div>
      `;
      return;
    }

    const values = data.map(d => d.val);
    const maxVal = Math.max(...values, 100) * 1.15;
    const minVal = 0;
    const trend = computeTrend(values);

    const graphW = width - padding.left - padding.right;
    const graphH = height - padding.top - padding.bottom;

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * graphW;
      const y = padding.top + graphH - ((d.val - minVal) / (maxVal - minVal)) * graphH;
      return { x, y, val: d.val, label: d.label };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    const gradientId = `line-grad-${Math.random().toString(36).substr(2, 6)}`;

    // Y-Axis Ticks (4 lines)
    const yTicks = [0, 0.33, 0.66, 1].map(ratio => {
      const val = Math.round(minVal + ratio * (maxVal - minVal));
      const y = padding.top + graphH - ratio * graphH;
      return { val, y };
    });

    container.innerHTML = `
      <div class="chart-canvas-container">
        ${opts.showTrendHeader !== false ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
            <div>
              <strong style="color: var(--color-navy); font-size: var(--fs-sm);">${opts.title || 'Attendance Trajectory'}</strong>
              <div style="font-size: var(--fs-xs); color: var(--color-gray-500);">${opts.subtitle || 'Average Sunday attendance trend over time'}</div>
            </div>
            <div>${trend.html}</div>
          </div>
        ` : ''}

        <div style="position: relative;">
          <div class="chart-tooltip" id="tooltip-${containerId}"></div>
          <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${PALETTE.gold}" stop-opacity="0.35" />
                <stop offset="100%" stop-color="${PALETTE.gold}" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            <!-- Y-Axis Gridlines & Labels -->
            ${yTicks.map(t => `
              <line x1="${padding.left}" y1="${t.y}" x2="${width - padding.right}" y2="${t.y}" stroke="${PALETTE.gray200}" stroke-dasharray="3 3" />
              <text x="${padding.left - 8}" y="${t.y + 4}" font-size="10" fill="${PALETTE.gray400}" text-anchor="end">${t.val.toLocaleString()}</text>
            `).join('')}

            <!-- Area Gradient Fill -->
            <path d="${areaD}" fill="url(#${gradientId})" />

            <!-- Trend Path Line -->
            <path d="${pathD}" fill="none" stroke="${PALETTE.navy}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Data Point Circles -->
            ${points.map(p => `
              <circle class="chart-point" cx="${p.x}" cy="${p.y}" r="5" fill="${PALETTE.gold}" stroke="${PALETTE.navy}" stroke-width="2.5" style="cursor: pointer; transition: r 0.2s;"
                data-val="${p.val}" data-label="${p.label}" data-x="${p.x}" data-y="${p.y}" />
            `).join('')}

            <!-- X-Axis Labels -->
            ${points.map(p => `
              <text x="${p.x}" y="${height - padding.bottom + 18}" font-size="10" fill="${PALETTE.gray600}" text-anchor="middle" font-weight="600">${p.label}</text>
            `).join('')}
          </svg>
        </div>
      </div>
    `;

    // Tooltip event listeners
    const tt = document.getElementById(`tooltip-${containerId}`);
    container.querySelectorAll('.chart-point').forEach(pt => {
      pt.addEventListener('mouseenter', (e) => {
        pt.setAttribute('r', '7.5');
        const val = parseInt(e.target.dataset.val).toLocaleString();
        const label = e.target.dataset.label;
        tt.innerHTML = `<strong>${label}:</strong> ${val} ${opts.unit || 'attendees'}`;
        tt.style.left = `${(e.target.dataset.x / width) * 100}%`;
        tt.style.top = `${(e.target.dataset.y / height) * 100}%`;
        tt.classList.add('visible');
      });
      pt.addEventListener('mouseleave', () => {
        pt.setAttribute('r', '5');
        tt.classList.remove('visible');
      });
    });
  }

  /* ---------------------------------------------------
     2. Stacked Bar Chart (Giving Trends / Categories)
     --------------------------------------------------- */
  function renderStackedBarChart(containerId, rawData, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opts = options || {};
    const data = rawData || generateMockTimeSeries('giving_stacked', 'year');
    const width = 640;
    const height = 260;
    const padding = { top: 40, right: 30, bottom: 40, left: 60 };

    if (!data || data.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📊</div><div class="empty-state__title">No giving data yet</div></div>`;
      return;
    }

    // Determine category keys and colors
    const categoryKeys = opts.categories || [
      { key: 'tithe', name: 'Tithes', color: PALETTE.navy },
      { key: 'offering', name: 'Offerings', color: PALETTE.gold },
      { key: 'building', name: 'Building Fund', color: PALETTE.success },
      { key: 'missions', name: 'Missions', color: PALETTE.info },
    ];

    // Compute month totals & max Y
    const monthTotals = data.map(d => {
      let sum = 0;
      categoryKeys.forEach(c => { sum += (d.segments[c.key] || 0); });
      return sum;
    });

    const maxVal = Math.max(...monthTotals, 1000) * 1.15;
    const graphW = width - padding.left - padding.right;
    const graphH = height - padding.top - padding.bottom;
    const barWidth = Math.min(32, (graphW / data.length) * 0.65);

    const yTicks = [0, 0.33, 0.66, 1].map(ratio => {
      const val = Math.round(ratio * maxVal);
      const y = padding.top + graphH - ratio * graphH;
      return { val, y };
    });

    container.innerHTML = `
      <div class="chart-canvas-container">
        <!-- Header & Legend -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); flex-wrap: wrap; gap: var(--space-sm);">
          <div>
            <strong style="color: var(--color-navy); font-size: var(--fs-sm);">${opts.title || 'Giving Breakdown Trends'}</strong>
            <div style="font-size: var(--fs-xs); color: var(--color-gray-500);">${opts.subtitle || 'Month-by-month breakdown by contribution category'}</div>
          </div>

          <!-- Color Legend -->
          <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
            ${categoryKeys.map(c => `
              <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--color-navy);">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: ${c.color};"></span>
                ${c.name}
              </div>
            `).join('')}
          </div>
        </div>

        <div style="position: relative;">
          <div class="chart-tooltip" id="tooltip-${containerId}"></div>
          <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
            <!-- Y Gridlines & Labels -->
            ${yTicks.map(t => `
              <line x1="${padding.left}" y1="${t.y}" x2="${width - padding.right}" y2="${t.y}" stroke="${PALETTE.gray200}" stroke-dasharray="3 3" />
              <text x="${padding.left - 8}" y="${t.y + 4}" font-size="10" fill="${PALETTE.gray400}" text-anchor="end">GH₵ ${(t.val / 1000).toFixed(0)}k</text>
            `).join('')}

            <!-- Stacked Bars -->
            ${data.map((d, i) => {
              const x = padding.left + (i + 0.5) * (graphW / data.length) - barWidth / 2;
              let currentY = padding.top + graphH;

              const stackRects = categoryKeys.map(c => {
                const segVal = d.segments[c.key] || 0;
                const segH = (segVal / maxVal) * graphH;
                currentY -= segH;
                return { y: currentY, h: segH, val: segVal, name: c.name, color: c.color };
              });

              const totalMonthVal = monthTotals[i];

              return `
                <g class="bar-group" data-month="${d.label}" data-total="${totalMonthVal}">
                  ${stackRects.map(r => `
                    <rect x="${x}" y="${r.y}" width="${barWidth}" height="${r.h}" fill="${r.color}" rx="2" style="cursor: pointer; transition: opacity 0.2s;" />
                  `).join('')}
                  <text x="${x + barWidth / 2}" y="${height - padding.bottom + 18}" font-size="10" fill="${PALETTE.gray600}" text-anchor="middle" font-weight="600">${d.label}</text>
                </g>
              `;
            }).join('')}
          </svg>
        </div>
      </div>
    `;

    // Tooltip event listeners
    const tt = document.getElementById(`tooltip-${containerId}`);
    container.querySelectorAll('.bar-group').forEach(bg => {
      bg.addEventListener('mouseenter', (e) => {
        const month = bg.dataset.month;
        const total = parseFloat(bg.dataset.total).toLocaleString('en-US', { minimumFractionDigits: 2 });
        tt.innerHTML = `<strong>${month} Total:</strong> GH₵ ${total}`;
        tt.style.left = `${(e.clientX - container.getBoundingClientRect().left)}px`;
        tt.style.top = `${(e.clientY - container.getBoundingClientRect().top - 20)}px`;
        tt.classList.add('visible');
      });
      bg.addEventListener('mouseleave', () => {
        tt.classList.remove('visible');
      });
    });
  }

  /* ---------------------------------------------------
     3. Member Attendance Journey Grid (Consistency View)
     --------------------------------------------------- */
  function renderAttendanceJourney(containerId, rawData, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opts = options || {};
    const data = rawData || generateMockTimeSeries('member_journey', 'year');

    const attendedCount = data.filter(d => d.attended).length;
    const totalCount = data.length;
    const pct = Math.round((attendedCount / totalCount) * 100);

    container.innerHTML = `
      <div class="journey-container">
        <div class="journey-header">
          <div>
            <h3 style="color: var(--color-navy); font-size: var(--fs-base); font-weight: 700; margin-bottom: 2px;">
              ✨ ${opts.title || 'Your Attendance Journey'}
            </h3>
            <div style="font-size: var(--fs-xs); color: var(--color-gray-600);">
              You've attended <strong>${attendedCount} of ${totalCount}</strong> services this year (${pct}% consistency)!
            </div>
          </div>
          <div class="streak-badge">
            🔥 6-Week Attendance Streak
          </div>
        </div>

        <div style="position: relative;">
          <div class="chart-tooltip" id="tooltip-${containerId}"></div>
          <div class="journey-grid">
            ${data.map(d => `
              <div class="journey-cell ${d.attended ? 'journey-cell--attended' : 'journey-cell--missed'}"
                data-date="${d.date}" data-name="${d.name}" data-attended="${d.attended}">
                ${d.attended ? '✓' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; gap: var(--space-lg); margin-top: var(--space-lg); font-size: var(--fs-xs); color: var(--color-gray-500); justify-content: flex-end;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 12px; border-radius: 3px; background: var(--color-gold);"></span>
            Attended Service
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 12px; border-radius: 3px; border: 1.5px dashed var(--color-gray-300); background: #fff;"></span>
            Missed Service
          </div>
        </div>
      </div>
    `;

    // Tooltip listener for journey cells
    const tt = document.getElementById(`tooltip-${containerId}`);
    container.querySelectorAll('.journey-cell').forEach(cell => {
      cell.addEventListener('mouseenter', (e) => {
        const dDate = cell.dataset.date;
        const dName = cell.dataset.name;
        const attended = cell.dataset.attended === 'true';
        tt.innerHTML = `<strong>${dDate}:</strong> ${dName} (${attended ? 'Attended ✓' : 'Missed'})`;
        const rect = cell.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();
        tt.style.left = `${rect.left - parentRect.left + rect.width / 2}px`;
        tt.style.top = `${rect.top - parentRect.top}px`;
        tt.classList.add('visible');
      });
      cell.addEventListener('mouseleave', () => {
        tt.classList.remove('visible');
      });
    });
  }

  /* ---------------------------------------------------
     Mock Time-Series Generator
     --------------------------------------------------- */
  function generateMockTimeSeries(type, period) {
    if (type === 'attendance_trend') {
      return [
        { label: 'Jan', val: 1210 },
        { label: 'Feb', val: 1250 },
        { label: 'Mar', val: 1280 },
        { label: 'Apr', val: 1310 },
        { label: 'May', val: 1340 },
        { label: 'Jun', val: 1390 },
        { label: 'Jul', val: 1420 },
      ];
    }

    if (type === 'giving_stacked') {
      return [
        { label: 'Jan', segments: { tithe: 24000, offering: 9500, building: 2200, missions: 1400 } },
        { label: 'Feb', segments: { tithe: 25500, offering: 10100, building: 2400, missions: 1500 } },
        { label: 'Mar', segments: { tithe: 26200, offering: 10500, building: 2500, missions: 1600 } },
        { label: 'Apr', segments: { tithe: 27100, offering: 10800, building: 2600, missions: 1700 } },
        { label: 'May', segments: { tithe: 28000, offering: 11000, building: 2650, missions: 1750 } },
        { label: 'Jun', segments: { tithe: 28900, offering: 11200, building: 2700, missions: 1800 } },
        { label: 'Jul', segments: { tithe: 29380, offering: 11300, building: 2710, missions: 1810 } },
      ];
    }

    if (type === 'member_journey') {
      const dates = [
        '05 Jan', '12 Jan', '19 Jan', '26 Jan',
        '02 Feb', '09 Feb', '16 Feb', '23 Feb',
        '02 Mar', '09 Mar', '16 Mar', '23 Mar', '30 Mar',
        '06 Apr', '13 Apr', '20 Apr', '27 Apr',
        '04 May', '11 May', '18 May', '25 May',
        '01 Jun', '08 Jun', '15 Jun', '22 Jun', '29 Jun',
        '06 Jul', '13 Jul', '20 Jul',
      ];

      // 88% attendance consistency for Kwame Asante
      return dates.map((d, i) => ({
        date: d,
        name: 'Sunday Service',
        attended: i !== 3 && i !== 11 && i !== 19, // Missed 3 of 29
      }));
    }

    return [];
  }

  /* ---------------------------------------------------
     EXPOSE PUBLIC API
     --------------------------------------------------- */
  window.ChurchCharts = {
    computeTrend,
    renderLineChart,
    renderStackedBarChart,
    renderAttendanceJourney,
    generateMockTimeSeries,
  };

})();
