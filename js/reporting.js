/* ===================================================
   ChurchOS — Shared Reporting & Export Module
   Generate → Preview → Export (PDF / CSV) simulation
   Reused across Admin, Pastor, Finance, and Leader dashboards
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Helpers
     --------------------------------------------------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function nowStr() { return new Date().toISOString().replace('T', ' ').slice(0, 16); }
  // localStorage helpers removed — data now persists via Firestore (see db.js)

  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function formatGHC(amount) {
    return 'GH₵ ' + parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ---------------------------------------------------
     11 Standard Report Definitions
     --------------------------------------------------- */
  const REPORTS_CATALOGUE = [
    {
      id: 'weekly_attendance',
      name: 'Weekly Attendance Report',
      icon: 'layout-dashboard',
      desc: 'Detailed breakdown of attendance across all Sunday and mid-week services for a selected week.',
      roles: ['admin', 'pastor'],
      filterType: 'week',
    },
    {
      id: 'monthly_attendance',
      name: 'Monthly Attendance Summary',
      icon: 'trending-up',
      desc: 'Comparative monthly attendance analysis, attendance rates, and month-over-month growth trends.',
      roles: ['admin', 'pastor'],
      filterType: 'month',
    },
    {
      id: 'new_members',
      name: 'New Member Report',
      icon: 'user-plus',
      desc: 'Roster of new members registered within a selected timeframe including contact and department info.',
      roles: ['admin', 'pastor'],
      filterType: 'daterange',
    },
    {
      id: 'inactive_members',
      name: 'Inactive Member Report',
      icon: 'alert-triangle',
      desc: 'Members absent for 4+ consecutive weeks requiring pastoral follow-up and outreach.',
      roles: ['admin', 'pastor'],
      filterType: 'threshold',
    },
    {
      id: 'visitor_conversion',
      name: 'Visitor Conversion Report',
      icon: 'target',
      desc: 'Track first-time visitors, follow-up progress, and conversion rates to active membership.',
      roles: ['admin', 'pastor'],
      filterType: 'daterange',
    },
    {
      id: 'giving_summary',
      name: 'Giving Summary Report',
      icon: 'banknote',
      desc: 'Congregation-wide giving totals by category (Tithes, Offerings, Building Fund, Missions) and payment methods.',
      roles: ['admin', 'pastor', 'finance'],
      filterType: 'giving_filter',
    },
    {
      id: 'individual_giving',
      name: 'Individual Member Giving Report',
      icon: 'credit-card',
      desc: 'Detailed reverse-chronological contribution history for a selected church member.',
      roles: ['finance', 'pastor'],
      filterType: 'member_select',
    },
    {
      id: 'dept_activity',
      name: 'Department Activity Report',
      icon: 'tag',
      desc: 'Roster size, meeting attendance, visitors, and care tasks for a specific department/group.',
      roles: ['admin', 'pastor', 'leader'],
      filterType: 'dept_filter',
    },
    {
      id: 'pastoral_care',
      name: 'Pastoral Care & Follow-Up Report',
      icon: 'heart',
      desc: 'Status of pastoral care visits, flagged members, prayer requests, and life event follow-ups.',
      roles: ['pastor'],
      filterType: 'status_filter',
    },
    {
      id: 'birthdays_anniversaries',
      name: 'Birthday & Anniversary Report',
      icon: 'cake',
      desc: 'Upcoming birthdays and membership anniversaries for the next 30 days.',
      roles: ['admin', 'pastor'],
      filterType: 'none',
    },
    {
      id: 'leader_accountability',
      name: 'Leader Accountability Report',
      icon: 'clipboard-list',
      desc: 'Monthly department performance and attendance report submitted by group leaders for pastoral review.',
      roles: ['leader'],
      filterType: 'daterange',
    },
  ];

  /* ---------------------------------------------------
     Mock Data Provider for Reports
     --------------------------------------------------- */
  function generateMockReportData(reportId, filters, role, lockedDept) {
    const todayStr = today();
    const churchName = 'Grace Assembly International';
    const userName = (role === 'admin' ? 'Church Administrator' :
                     role === 'pastor' ? 'Rev. Daniel Mensah' :
                     role === 'finance' ? 'Abena Osei (Finance Team)' :
                     'Kofi Darko (Youth Leader)');

    if (reportId === 'weekly_attendance') {
      return {
        title: 'Weekly Attendance Report',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Week of ${filters.date || todayStr}`,
        stats: [
          { label: 'Total Attendance', val: '1,420' },
          { label: '1st Service (7:00 AM)', val: '450' },
          { label: '2nd Service (9:30 AM)', val: '680' },
          { label: '3rd Service (12:00 PM)', val: '290' },
          { label: 'Attendance Rate', val: '88%' }
        ],
        headers: ['Service Session', 'Date', 'Male', 'Female', 'Children', 'Total Count'],
        rows: [
          ['1st Sunday Service', filters.date || todayStr, '190', '220', '40', '450'],
          ['2nd Sunday Service', filters.date || todayStr, '280', '340', '60', '680'],
          ['3rd Sunday Service', filters.date || todayStr, '110', '150', '30', '290'],
          ['Mid-Week Bible Study', '2026-07-16', '95', '135', '15', '245'],
          ['Friday Prayer Night', '2026-07-18', '115', '165', '20', '300'],
        ]
      };
    }

    if (reportId === 'monthly_attendance') {
      return {
        title: 'Monthly Attendance Summary',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Period: ${filters.month || 'July 2026'}`,
        stats: [
          { label: 'Avg Sunday Attendance', val: '1,385' },
          { label: 'Peak Sunday', val: '1,490' },
          { label: 'Lowest Sunday', val: '1,280' },
          { label: 'Month-over-Month Growth', val: '+4.2%' }
        ],
        headers: ['Sunday Date', '1st Service', '2nd Service', '3rd Service', 'Total Attendance', 'vs Prior Week'],
        rows: [
          ['05 Jul 2026', '420', '650', '270', '1,340', 'Base'],
          ['12 Jul 2026', '440', '670', '280', '1,390', '+3.7%'],
          ['19 Jul 2026', '450', '680', '290', '1,420', '+2.1%'],
          ['26 Jul 2026 (Est)', '460', '710', '320', '1,490', '+4.9%'],
        ]
      };
    }

    if (reportId === 'new_members') {
      return {
        title: 'New Member Registration Report',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Date Range: ${filters.from || '2026-06-01'} to ${filters.to || todayStr}`,
        stats: [
          { label: 'New Members Added', val: '18' },
          { label: 'Assigned to Depts', val: '15' },
          { label: 'Baptism Pending', val: '4' }
        ],
        headers: ['Member Name', 'Phone', 'Date Joined', 'Department', 'Membership Class'],
        rows: [
          ['Emmanuel Tetteh', '024 555 0105', '2026-06-04', 'Media & Tech', 'Completed'],
          ['Grace Adjei', '027 555 0108', '2026-06-12', 'Choir', 'Completed'],
          ['Samuel Ofori', '020 555 0109', '2026-06-18', 'Ushering', 'In Progress'],
          ['Rita Boateng', '050 555 0110', '2026-07-02', 'Youth Ministry', 'Completed'],
          ['David Kwarteng', '024 555 0111', '2026-07-15', 'Men\'s Fellowship', 'Pending'],
        ]
      };
    }

    if (reportId === 'inactive_members') {
      return {
        title: 'Inactive Member Follow-Up Report',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Threshold: ${filters.threshold || '4'} weeks inactive`,
        stats: [
          { label: 'Flagged Inactive', val: '12' },
          { label: 'Care Tasks Assigned', val: '10' },
          { label: 'Contacted This Week', val: '7' }
        ],
        headers: ['Member Name', 'Phone', 'Department', 'Consecutive Weeks Missed', 'Assigned Care Leader', 'Status'],
        rows: [
          ['Francis Owusu', '024 555 0190', 'Men\'s Fellowship', '5 weeks', 'Deacon Isaac', 'Task Assigned'],
          ['Mercy Addo', '020 555 0191', 'Women\'s Ministry', '4 weeks', 'Deaconess Mary', 'In Progress'],
          ['Bernard Appiah', '027 555 0192', 'Youth Ministry', '6 weeks', 'Kofi Darko', 'Overdue Follow-up'],
          ['Evelyn Mensah', '050 555 0193', 'Choir', '4 weeks', 'Pastor Daniel', 'Contacted'],
        ]
      };
    }

    if (reportId === 'visitor_conversion') {
      return {
        title: 'Visitor Conversion & Integration Report',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Period: ${filters.from || '2026-06-01'} to ${filters.to || todayStr}`,
        stats: [
          { label: 'Total First-Time Visitors', val: '24' },
          { label: 'Followed Up Within 48h', val: '22 (91%)' },
          { label: 'Converted to Members', val: '11 (45%)' }
        ],
        headers: ['Visitor Name', 'Phone', 'First Visit Date', 'How Heard', 'Follow-Up Status', 'Converted?'],
        rows: [
          ['Selina Agyei', '024 555 0201', '2026-06-07', 'Friend Invitation', 'Contacted', 'Yes (Member)'],
          ['Patrick Quaye', '020 555 0202', '2026-06-14', 'Social Media', 'Assigned', 'Pending'],
          ['Abigail Danquah', '027 555 0203', '2026-06-21', 'Walk-in', 'Visited at Home', 'Yes (Member)'],
          ['Gideon Larson', '050 555 0204', '2026-07-05', 'Church Flyer', 'Call Completed', 'Pending'],
        ]
      };
    }

    if (reportId === 'giving_summary') {
      return {
        title: 'Church Giving Summary Report',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Category: ${filters.category || 'All Categories'} | Date Range: ${filters.from || '2026-07-01'} to ${filters.to || todayStr}`,
        stats: [
          { label: 'Total Giving', val: 'GH₵ 45,200.00' },
          { label: 'Tithes', val: 'GH₵ 29,380.00' },
          { label: 'General Offerings', val: 'GH₵ 11,300.00' },
          { label: 'Building & Missions', val: 'GH₵ 4,520.00' }
        ],
        headers: ['Category', '1st Service', '2nd Service', '3rd Service', 'MoMo / Online', 'Total Amount'],
        rows: [
          ['Tithes', 'GH₵ 8,500.00', 'GH₵ 12,300.00', 'GH₵ 3,580.00', 'GH₵ 5,000.00', 'GH₵ 29,380.00'],
          ['General Offerings', 'GH₵ 2,450.00', 'GH₵ 3,820.00', 'GH₵ 1,650.00', 'GH₵ 3,380.00', 'GH₵ 11,300.00'],
          ['Building Fund', 'GH₵ 800.00', 'GH₵ 1,200.00', 'GH₵ 400.00', 'GH₵ 310.00', 'GH₵ 2,710.00'],
          ['Missions Seed', 'GH₵ 500.00', 'GH₵ 810.00', 'GH₵ 200.00', 'GH₵ 300.00', 'GH₵ 1,810.00'],
        ]
      };
    }

    if (reportId === 'individual_giving') {
      const memberName = filters.memberName || 'Kwame Asante';
      return {
        title: `Individual Member Giving History — ${memberName}`,
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Member: ${memberName} | Year: 2026`,
        stats: [
          { label: 'Total Contributions YTD', val: 'GH₵ 3,450.00' },
          { label: 'Tithes Total', val: 'GH₵ 2,900.00' },
          { label: 'Offerings & Seeds', val: 'GH₵ 550.00' }
        ],
        headers: ['Date Given', 'Category', 'Amount', 'Payment Method', 'Service Session', 'Receipt / Ref #'],
        rows: [
          ['2026-07-19', 'Tithe', 'GH₵ 500.00', 'Mobile Money', '1st Service', 'REC-99201'],
          ['2026-07-12', 'Tithe', 'GH₵ 500.00', 'Mobile Money', '1st Service', 'REC-98101'],
          ['2026-07-05', 'Tithe', 'GH₵ 500.00', 'Mobile Money', '1st Service', 'REC-97101'],
          ['2026-06-28', 'Building Fund', 'GH₵ 450.00', 'Bank Transfer', 'Direct', 'TRF-33012'],
          ['2026-06-21', 'Tithe', 'GH₵ 500.00', 'Mobile Money', '1st Service', 'REC-96101'],
          ['2026-06-14', 'Tithe', 'GH₵ 500.00', 'Mobile Money', '1st Service', 'REC-95101'],
          ['2026-06-07', 'Offering', 'GH₵ 500.00', 'Cash', '1st Service', 'REC-94101'],
        ]
      };
    }

    if (reportId === 'dept_activity' || reportId === 'leader_accountability') {
      const dept = lockedDept || filters.dept || 'Youth Ministry';
      return {
        title: `${dept} Monthly Activity & Accountability Report`,
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Department: ${dept} | Period: ${filters.from || '2026-07-01'} to ${filters.to || todayStr}`,
        stats: [
          { label: 'Active Group Roster', val: '34' },
          { label: 'Avg Meeting Attendance', val: '28 (82%)' },
          { label: 'New Visitors Registered', val: '5' },
          { label: 'Completed Care Tasks', val: '8' }
        ],
        headers: ['Meeting Date', 'Service / Event Name', 'Members Present', 'Visitors', 'Care Flags Raised', 'Leader Note'],
        rows: [
          ['2026-07-19', 'Sunday Youth Fellowship', '29', '2', '1', 'Great turnout, 2 first-time visitors welcomed.'],
          ['2026-07-12', 'Youth Prayer Night', '26', '1', '0', 'Fasting and prayer session focused on exams.'],
          ['2026-07-05', 'Sunday Youth Fellowship', '28', '2', '2', 'Visited 2 sick members during the week.'],
          ['2026-06-28', 'Mid-Year Youth Retreat', '31', '0', '0', '31 members attended the day retreat.'],
        ]
      };
    }

    if (reportId === 'pastoral_care') {
      return {
        title: 'Pastoral Care & Follow-Up Activity Report',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: `Status Filter: ${filters.status || 'All Statuses'} | Date Range: ${filters.from || '2026-07-01'} to ${filters.to || todayStr}`,
        stats: [
          { label: 'Total Care Tasks', val: '16' },
          { label: 'Completed Visits / Calls', val: '11' },
          { label: 'In Progress', val: '3' },
          { label: 'Overdue Follow-ups', val: '2' }
        ],
        headers: ['Member Name', 'Care Category', 'Assigned Leader / Pastor', 'Due Date', 'Status', 'Latest Pastoral Note'],
        rows: [
          ['Ama Serwaa', 'Hospital Visit', 'Rev. Daniel Mensah', '2026-07-20', 'Completed', 'Visited at Ridge Hospital. Recovering steadily.'],
          ['Bernard Appiah', 'Absenteeism Outreach', 'Kofi Darko', '2026-07-18', 'Overdue', 'Phone call unanswered. Home visit planned.'],
          ['Grace Adjei', 'Bereavement Support', 'Deaconess Mary', '2026-07-22', 'In Progress', 'Attended family funeral arrangements.'],
          ['Kofi Darko', 'New Visitor Welcome', 'Rev. Daniel Mensah', '2026-07-15', 'Completed', 'Welcomed into Youth Ministry fellowship.'],
        ]
      };
    }

    if (reportId === 'birthdays_anniversaries') {
      return {
        title: 'Upcoming Birthdays & Membership Anniversaries (Next 30 Days)',
        churchName, userName, generatedAt: nowStr(),
        filterLabel: 'Period: Next 30 Days (Jul 23 - Aug 22, 2026)',
        stats: [
          { label: 'Upcoming Birthdays', val: '14' },
          { label: 'Membership Anniversaries', val: '9' },
          { label: 'Automated SMS Queued', val: '23' }
        ],
        headers: ['Member Name', 'Event Type', 'Event Date', 'Phone Number', 'Department', 'Automated SMS Status'],
        rows: [
          ['Akosua Mensah', 'Birthday 🎂', '27 Jul 2026', '024 555 0106', 'Choir', 'Scheduled (Auto)'],
          ['Kwame Asante', 'Membership Anniversary (5 yrs) 🎉', '01 Aug 2026', '024 555 0101', 'Ushering', 'Scheduled (Auto)'],
          ['Efua Amoako', 'Birthday 🎂', '05 Aug 2026', '024 555 0188', 'Youth Ministry', 'Scheduled (Auto)'],
          ['Daniel Mensah', 'Membership Anniversary (10 yrs) 🎉', '12 Aug 2026', '020 555 0103', 'Pastoral Team', 'Scheduled (Auto)'],
          ['Nana Agyeman', 'Birthday 🎂', '18 Aug 2026', '050 555 0107', 'Men\'s Fellowship', 'Scheduled (Auto)'],
        ]
      };
    }

    // Default Fallback
    return {
      title: 'Church Activity Report',
      churchName, userName, generatedAt: nowStr(),
      filterLabel: 'Period: July 2026',
      stats: [{ label: 'Total Activity Count', val: '42' }],
      headers: ['Date', 'Category', 'Activity Summary', 'Status'],
      rows: [['2026-07-20', 'General', 'Weekly activity summary report generated.', 'Verified']]
    };
  }

  /* ---------------------------------------------------
     CSV Exporter (Pure Client-Side Blob Download)
     --------------------------------------------------- */
  function exportCSV(reportData) {
    let csvContent = '';
    csvContent += `"${reportData.churchName}"\n`;
    csvContent += `"${reportData.title}"\n`;
    csvContent += `"Generated By: ${reportData.userName}"\n`;
    csvContent += `"Generated At: ${reportData.generatedAt}"\n`;
    csvContent += `"Filters: ${reportData.filterLabel}"\n\n`;

    // Summary Stats
    if (reportData.stats && reportData.stats.length > 0) {
      csvContent += `"SUMMARY METRICS"\n`;
      reportData.stats.forEach(s => {
        csvContent += `"${s.label}","${s.val}"\n`;
      });
      csvContent += `\n`;
    }

    // Headers
    csvContent += reportData.headers.map(h => `"${h}"`).join(',') + '\n';

    // Rows
    reportData.rows.forEach(r => {
      csvContent += r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${reportData.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${today()}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log to Recent Exports
    logRecentExport(reportData.title, 'CSV / Excel', filename);
    toast(`CSV file "${filename}" downloaded ✓`);
  }

  /* ---------------------------------------------------
     PDF Exporter (Print Trigger)
     --------------------------------------------------- */
  function exportPDF(reportData) {
    toast('Preparing print-friendly view for PDF save... ✓');
    logRecentExport(reportData.title, 'PDF Document', `${reportData.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  /* ---------------------------------------------------
     Recent Exports Logger
     --------------------------------------------------- */
  function logRecentExport(reportName, format, filename) {
    let exportsList = load(KEYS.recentExports) || [
      { id: uid(), name: 'Weekly Attendance Report', format: 'PDF Document', date: '2026-07-20 10:15', filename: 'weekly_attendance_2026-07-20.pdf' },
      { id: uid(), name: 'Giving Summary Report', format: 'CSV / Excel', date: '2026-07-19 16:30', filename: 'giving_summary_2026-07-19.csv' },
    ];

    exportsList.unshift({
      id: uid(),
      name: reportName,
      format,
      date: nowStr(),
      filename,
    });

    save(KEYS.recentExports, exportsList);
    renderRecentExports();
  }

  function renderRecentExports() {
    const tbody = document.getElementById('recent-exports-tbody');
    if (!tbody) return;

    let exportsList = load(KEYS.recentExports) || [];
    const visibleExports = exportsList.filter(x => !x.deleted);

    if (visibleExports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-gray-400);">No recent exports</td></tr>`;
      return;
    }

    tbody.innerHTML = visibleExports.slice(0, 8).map((x, idx) => `
      <tr>
        <td><strong>${x.name}</strong></td>
        <td><span class="badge ${x.format.includes('PDF') ? 'badge--navy' : 'badge--success'}">${x.format}</span></td>
        <td style="font-size: var(--fs-xs); color: var(--color-gray-500);">${x.date}</td>
        <td>
          <div style="display: flex; gap: var(--space-xs); align-items: center;">
            <a href="#" class="btn btn--ghost btn--xs" onclick="event.preventDefault(); alert('Re-downloading ${x.filename} (simulated)')">Download File</a>
            <button class="btn btn--danger-ghost btn--xs" onclick="window.ChurchReporting.deleteExport(${idx})">Soft Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function deleteExport(idx) {
    let exportsList = load(KEYS.recentExports) || [];
    if (exportsList[idx]) {
      const exp = exportsList[idx];
      if (confirm(`Remove "${exp.name}" from recent exports history? It will be archived and can be restored.`)) {
        exp.deleted = true;
        exp.deletedAt = new Date().toISOString();
        save(KEYS.recentExports, exportsList);
        toast(`Export record "${exp.name}" soft-deleted`);
        renderRecentExports();
      }
    }
  }

  function restoreExport(idx) {
    let exportsList = load(KEYS.recentExports) || [];
    if (exportsList[idx]) {
      const exp = exportsList[idx];
      exp.deleted = false;
      delete exp.deletedAt;
      save(KEYS.recentExports, exportsList);
      toast(`Export record "${exp.name}" restored ✓`);
      renderRecentExports();
    }
  }

  /* ---------------------------------------------------
     Render Report Catalogue Cards
     --------------------------------------------------- */
  function renderCatalogue(containerId, role, lockedDept) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter reports accessible to role
    const availableReports = REPORTS_CATALOGUE.filter(r => r.roles.includes(role));

    container.innerHTML = `
      <!-- Leader Auto-Send Scheduler (Leader Dashboard Only) -->
      ${role === 'leader' ? `
        <div class="widget" style="margin-bottom: var(--space-2xl);">
          <div class="widget__header">
            <h3 class="widget__title">📅 Automatic Report Scheduling (Pastor Accountability)</h3>
          </div>
          <div class="widget__body">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap;">
              <div>
                <div style="font-weight: 600; color: var(--color-navy); margin-bottom: 4px;">Auto-send Youth Ministry Activity Report to Senior Pastor</div>
                <div style="font-size: var(--fs-xs); color: var(--color-gray-500);">Automatically compiles and emails your monthly attendance and visitor summary to Rev. Daniel Mensah.</div>
              </div>
              <div style="display: flex; align-items: center; gap: var(--space-md);">
                <select id="leader-schedule-freq" class="form-select" style="max-width: 140px;">
                  <option value="monthly" selected>Monthly (1st)</option>
                  <option value="weekly">Weekly (Mondays)</option>
                </select>
                <label class="auto-msg-toggle">
                  <input type="checkbox" id="leader-autosend-toggle">
                  <span class="auto-msg-toggle__slider"></span>
                </label>
              </div>
            </div>
            <div class="info-box info-box--success" id="leader-autosend-note" style="display: none; margin-top: var(--space-md);">
              <span><i data-lucide="check-circle"></i></span>
              <span>Your Youth Ministry activity report will be generated and sent to <strong>Rev. Daniel Mensah</strong> automatically on the 1st of every month.</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Report Catalogue Grid -->
      <h3 style="color: var(--color-navy); margin-bottom: var(--space-md);">📚 Available Standard Reports</h3>
      <div class="report-catalogue-grid">
        ${availableReports.map(r => `
          <div class="report-card">
            <div>
              <div class="report-card__header">
                <div class="report-card__icon"><i data-lucide="${r.icon}"></i></div>
                <div>
                  <div class="report-card__title">${r.name}</div>
                  <div class="report-card__desc">${r.desc}</div>
                </div>
              </div>

              <!-- Inline Filters -->
              <div class="report-card__filters">
                ${renderFilterInputs(r, lockedDept)}
              </div>
            </div>

            <div style="margin-top: var(--space-lg);">
              <button class="btn btn--primary btn--block btn--sm" onclick="window.ChurchReporting.generateReport('${r.id}', '${role}', '${lockedDept || ''}')">
                ⚡ Generate Report
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Report Preview Canvas Container -->
      <div id="report-preview-target"></div>

      <!-- Recent Exports History -->
      <div class="widget" style="margin-top: var(--space-2xl);">
        <div class="widget__header">
          <h3 class="widget__title">📁 Recent Generated & Exported Reports</h3>
        </div>
        <div class="widget__body widget__body--flush">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Format</th>
                  <th>Date Exported</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="recent-exports-tbody">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    renderRecentExports();

    // Wire up Leader Auto-Send Toggle
    if (role === 'leader') {
      const toggle = document.getElementById('leader-autosend-toggle');
      const note = document.getElementById('leader-autosend-note');
      const savedState = load(KEYS.leaderAutoSend);

      if (toggle && note) {
        if (savedState && savedState.enabled) {
          toggle.checked = true;
          note.style.display = 'flex';
        }

        toggle.addEventListener('change', () => {
          const isChecked = toggle.checked;
          note.style.display = isChecked ? 'flex' : 'none';
          save(KEYS.leaderAutoSend, { enabled: isChecked, freq: document.getElementById('leader-schedule-freq')?.value });
          toast(isChecked ? 'Auto-send to Rev. Daniel Mensah enabled ✓' : 'Auto-send disabled');
        });
      }
    }
  }

  /* ---------------------------------------------------
     Render Filter Inputs Per Report Type
     --------------------------------------------------- */
  function renderFilterInputs(r, lockedDept) {
    if (r.filterType === 'none') {
      return `<div style="font-size: 0.75rem; color: var(--color-gray-500); font-style: italic;">Auto-generated for the next 30 days</div>`;
    }
    if (r.filterType === 'week') {
      return `
        <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Select Week:</label>
        <input type="date" class="form-input" id="filter-date-${r.id}" value="${today()}" style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;">
      `;
    }
    if (r.filterType === 'month') {
      return `
        <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Select Month:</label>
        <select class="form-select" id="filter-month-${r.id}" style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;">
          <option value="July 2026" selected>July 2026</option>
          <option value="June 2026">June 2026</option>
          <option value="May 2026">May 2026</option>
          <option value="Q2 2026 Summary">Q2 2026 Summary</option>
        </select>
      `;
    }
    if (r.filterType === 'threshold') {
      return `
        <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Weeks Inactive Threshold:</label>
        <select class="form-select" id="filter-threshold-${r.id}" style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;">
          <option value="4" selected>4+ Weeks Missed</option>
          <option value="3">3+ Weeks Missed</option>
          <option value="6">6+ Weeks Missed</option>
        </select>
      `;
    }
    if (r.filterType === 'giving_filter') {
      return `
        <div style="display: flex; gap: 6px;">
          <div style="flex: 1;">
            <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">From:</label>
            <input type="date" class="form-input" id="filter-from-${r.id}" value="2026-07-01" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
          </div>
          <div style="flex: 1;">
            <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Category:</label>
            <select class="form-select" id="filter-category-${r.id}" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              <option value="">All Categories</option>
              <option value="Tithe">Tithes</option>
              <option value="Offering">Offerings</option>
              <option value="Building Fund">Building Fund</option>
            </select>
          </div>
        </div>
      `;
    }
    if (r.filterType === 'member_select') {
      return `
        <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Select Member:</label>
        <select class="form-select" id="filter-member-${r.id}" style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;">
          <option value="Kwame Asante">Kwame Asante (024 555 0101)</option>
          <option value="Ama Serwaa">Ama Serwaa (024 555 0102)</option>
          <option value="Kofi Darko">Kofi Darko (020 555 0103)</option>
          <option value="Efua Amoako">Efua Amoako (024 555 0188)</option>
        </select>
      `;
    }
    if (r.filterType === 'dept_filter') {
      return `
        <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Department Scope:</label>
        <input type="text" class="form-input" id="filter-dept-${r.id}" value="${lockedDept || 'Youth Ministry'}" ${lockedDept ? 'readonly style="background: var(--color-gray-100);"' : ''} style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;">
      `;
    }
    if (r.filterType === 'status_filter') {
      return `
        <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">Care Status:</label>
        <select class="form-select" id="filter-status-${r.id}" style="padding: 0.35rem 0.5rem; font-size: 0.8125rem;">
          <option value="All Statuses">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
          <option value="Overdue">Overdue Follow-up</option>
        </select>
      `;
    }

    // Default Date Range
    return `
      <div style="display: flex; gap: 6px;">
        <div style="flex: 1;">
          <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">From:</label>
          <input type="date" class="form-input" id="filter-from-${r.id}" value="2026-06-01" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
        </div>
        <div style="flex: 1;">
          <label class="form-label" style="font-size: 0.75rem; margin-bottom: 2px;">To:</label>
          <input type="date" class="form-input" id="filter-to-${r.id}" value="${today()}" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------
     Generate Report Handler & Printable Preview Canvas
     --------------------------------------------------- */
  function generateReport(reportId, role, lockedDept) {
    const target = document.getElementById('report-preview-target');
    if (!target) return;

    // Collect filters
    const filters = {
      date: document.getElementById(`filter-date-${reportId}`)?.value,
      month: document.getElementById(`filter-month-${reportId}`)?.value,
      threshold: document.getElementById(`filter-threshold-${reportId}`)?.value,
      from: document.getElementById(`filter-from-${reportId}`)?.value,
      to: document.getElementById(`filter-to-${reportId}`)?.value,
      category: document.getElementById(`filter-category-${reportId}`)?.value,
      memberName: document.getElementById(`filter-member-${reportId}`)?.value,
      dept: document.getElementById(`filter-dept-${reportId}`)?.value || lockedDept,
      status: document.getElementById(`filter-status-${reportId}`)?.value,
    };

    // Show loading indicator
    target.innerHTML = `
      <div class="widget" style="margin-top: var(--space-xl); text-align: center; padding: var(--space-2xl);">
        <div class="sending-overlay__spinner" style="margin: 0 auto var(--space-md);"></div>
        <div style="font-size: var(--fs-md); font-weight: 600; color: var(--color-navy);">Generating Report Data...</div>
        <div style="font-size: var(--fs-xs); color: var(--color-gray-500); margin-top: 4px;">Compiling church database records and formatting layout</div>
      </div>
    `;

    setTimeout(() => {
      const data = generateMockReportData(reportId, filters, role, lockedDept);
      window._activeReportData = data; // Store globally for export actions

      target.innerHTML = `
        <div class="report-preview-canvas" id="active-report-preview">
          <!-- Printable Header -->
          <div class="report-preview-header">
            <div>
              <h2 style="color: var(--color-navy); font-size: 1.6rem; font-family: var(--font-heading); margin-bottom: 4px;">
                ✝ ${data.churchName}
              </h2>
              <div style="font-size: var(--fs-xs); color: var(--color-gray-500);">15 Liberation Road, Accra • Tel: 030 200 1234</div>
              <div style="font-size: 1.125rem; font-weight: 700; color: var(--color-navy); margin-top: var(--space-md);">${data.title}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge badge--navy" style="font-size: 0.8125rem;">Official Report</span>
              <div style="font-size: 0.75rem; color: var(--color-gray-500); margin-top: 6px;"><strong>Generated By:</strong> ${data.userName}</div>
              <div style="font-size: 0.75rem; color: var(--color-gray-500);"><strong>Date:</strong> ${data.generatedAt}</div>
              <div style="font-size: 0.75rem; color: var(--color-gold-dark); font-weight: 600; margin-top: 4px;">${data.filterLabel}</div>
            </div>
          </div>

          <!-- Action Bar (Hidden in Print) -->
          <div class="report-preview-actions">
            <button class="btn btn--primary btn--sm" onclick="window.ChurchReporting.exportPDF()">
              <i data-lucide="printer" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Print / Save as PDF
            </button>
            <button class="btn btn--secondary btn--sm" onclick="window.ChurchReporting.exportCSV()">
              📥 Export CSV / Excel Data
            </button>
          </div>

          <!-- Summary Metric Cards -->
          ${data.stats && data.stats.length > 0 ? `
            <div class="report-stat-grid">
              ${data.stats.map(s => `
                <div class="report-stat-box">
                  <div class="report-stat-box__val">${s.val}</div>
                  <div class="report-stat-box__lbl">${s.label}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Data Table -->
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  ${data.headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.rows.map(r => `
                  <tr>
                    ${r.map((cell, idx) => `
                      <td style="${idx === 0 ? 'font-weight: 600; color: var(--color-navy);' : ''}">${cell}</td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Printable Footer -->
          <div style="font-size: 0.75rem; color: var(--color-gray-400); margin-top: var(--space-2xl); border-top: 1px solid var(--color-gray-200); padding-top: var(--space-md); text-align: center;">
            This report was generated from ChurchOS Church Management System. Certified authentic and ready for leadership review.
          </div>
        </div>
      `;

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(`Report "${data.title}" generated ✓`);
    }, 600);
  }

  /* ---------------------------------------------------
     Public Init
     --------------------------------------------------- */
  function init(role, options) {
    const opts = options || {};
    const containerId = opts.containerId || 'reporting-container';
    const lockedDept = opts.lockedDepartment || '';

    renderCatalogue(containerId, role || 'admin', lockedDept);
  }

  /* ---------------------------------------------------
     EXPOSE PUBLIC API
     --------------------------------------------------- */
  window.ChurchReporting = {
    init,
    generateReport,
    deleteExport,
    restoreExport,
    exportCSV: () => exportCSV(window._activeReportData || generateMockReportData('weekly_attendance', {}, 'admin')),
    exportPDF: () => exportPDF(window._activeReportData || generateMockReportData('weekly_attendance', {}, 'admin')),
  };

})();
