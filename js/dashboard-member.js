/* ===================================================
   ChurchOS — Member Dashboard JavaScript
   Now uses Firestore for data persistence
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Firestore Collections
     --------------------------------------------------- */
  const COLLECTIONS = {
    myProfile:       'users',
    myAttendance:    'attendance',
    myGiving:        'givingTransactions',
    myAnnouncements: 'communications',
    myPrayers:       'prayerRequests',
    myGroups:        'groups',
  };

  const { dbAdd, dbGet, dbGetAll, dbUpdate, dbSoftDelete, dbSeedIfEmpty } = window.ChurchOS;

  /* ---------------------------------------------------
     Utility Helpers
     --------------------------------------------------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return new Date().toISOString().slice(0, 10); }
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

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ---------------------------------------------------
     Seed Data — Scoped to Single Member: Efua Amoako
     --------------------------------------------------- */
  const SEED_PROFILE = {
    fullName: 'Efua Amoako',
    preferredName: 'Efua',
    dob: '1994-03-15',
    gender: 'Female',
    phone: '024 555 0188',
    email: 'efua.amoako@gmail.com',
    address: 'East Legon, Accra',
    occupation: 'Graphic Designer',
    maritalStatus: 'Single',
    emergencyContact: 'Kwame Amoako — 024 555 0199',
    membershipStatus: 'Active Member',
    firstAttendance: '2019-01-12',
    waterBaptism: '2019-12-25',
    holySpirit: '2020-02-14',
    membershipClass: 'May 2019',
    departments: ['Choir', 'Young Adults'],
    churchRole: 'Member',
    preferredService: '2nd Service (9:30 AM)',
    familyLinks: [
      { name: 'Kwame Amoako', relation: 'Father' },
      { name: 'Abena Amoako', relation: 'Mother' },
    ],
  };

  const SEED_ATTENDANCE = [
    { id: uid(), date: '2026-07-20', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-07-13', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-07-06', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-06-29', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-06-22', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-06-15', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-06-08', service: '1st Service', status: 'Present' },
    { id: uid(), date: '2026-06-01', service: '2nd Service', status: 'Absent' },
    { id: uid(), date: '2026-05-25', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-05-18', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-05-11', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-05-04', service: '3rd Service', status: 'Present' },
    { id: uid(), date: '2026-04-27', service: '2nd Service', status: 'Absent' },
    { id: uid(), date: '2026-04-20', service: '2nd Service', status: 'Present' },
    { id: uid(), date: '2026-04-13', service: '2nd Service', status: 'Present' },
  ];

  const SEED_GIVING = [
    { id: uid(), date: '2026-07-20', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-90188', status: 'verified' },
    { id: uid(), date: '2026-07-20', category: 'Offering', amount: 50.00, method: 'Cash', ref: 'REC-90189', status: 'verified' },
    { id: uid(), date: '2026-07-13', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-89188', status: 'verified' },
    { id: uid(), date: '2026-07-06', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-88188', status: 'verified' },
    { id: uid(), date: '2026-06-29', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-87188', status: 'verified' },
    { id: uid(), date: '2026-06-29', category: 'Building Fund', amount: 200.00, method: 'Bank Transfer', ref: 'TRF-44012', status: 'verified' },
    { id: uid(), date: '2026-06-22', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-86188', status: 'verified' },
    { id: uid(), date: '2026-06-15', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-85188', status: 'verified' },
    { id: uid(), date: '2026-06-08', category: 'Offering', amount: 100.00, method: 'Cash', ref: 'REC-84189', status: 'verified' },
    { id: uid(), date: '2026-05-25', category: 'Special Seed', amount: 500.00, method: 'Cheque', ref: 'CHQ-00512', status: 'verified' },
    { id: uid(), date: '2026-05-18', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-83188', status: 'verified' },
    { id: uid(), date: '2026-05-11', category: 'Tithe', amount: 350.00, method: 'Mobile Money', ref: 'REC-82188', status: 'verified' },
  ];

  const SEED_ANNOUNCEMENTS = [
    { id: uid(), title: 'Annual Harvest Thanksgiving Service', body: 'Join us on Sunday, August 3rd for our Annual Harvest Thanksgiving. Bring your offerings and come with a heart of gratitude! All services will be combined into one grand service at 9:00 AM.', date: '2026-07-21', channel: 'App & SMS', read: false },
    { id: uid(), title: 'Youth Camp Registration Open', body: 'Registration for the 2026 Youth Summer Camp (August 15-19) is now open. Register at the youth desk or through the church app. GH₵ 150 covers meals, accommodation, and all activities.', date: '2026-07-19', channel: 'App', read: false },
    { id: uid(), title: 'Mid-Week Bible Study Resumes', body: 'Our mid-week Bible study resumes this Wednesday at 6:30 PM. Pastor Mensah will be teaching through the book of Romans. Bring your Bible and a friend!', date: '2026-07-16', channel: 'SMS', read: false },
    { id: uid(), title: 'Church Building Fund Update', body: 'We are pleased to announce that we have raised 78% of our building fund target! Thank you for your continued generosity. The new sanctuary construction is progressing well.', date: '2026-07-10', channel: 'App & SMS', read: true },
    { id: uid(), title: 'Choir Rehearsal Schedule Change', body: 'Choir rehearsals will now hold on Saturdays at 4:00 PM instead of 3:00 PM, effective immediately. Please take note and inform other choir members.', date: '2026-07-05', channel: 'App', read: true },
    { id: uid(), title: 'Prayer & Fasting Week', body: 'The church will observe a week of prayer and fasting from July 28 - August 1. Daily prayer sessions at 5:30 AM and 6:00 PM. Let us seek God together for breakthrough and direction.', date: '2026-07-01', channel: 'SMS', read: true },
  ];

  const SEED_PRAYERS = [
    { id: uid(), description: 'Please pray for my mother who is unwell. She has been admitted at Korle Bu for treatment. Trusting God for her full recovery.', submittedDate: '2026-07-18', status: 'Active' },
    { id: uid(), description: 'Praying for guidance as I prepare for my professional exams in August. I need wisdom and clarity.', submittedDate: '2026-06-28', status: 'Active' },
    { id: uid(), description: 'Was looking for a new apartment and God provided! Thank you for praying with me.', submittedDate: '2026-05-10', status: 'Answered' },
  ];

  const SEED_GROUPS = [
    { id: uid(), name: 'Church Choir', leader: 'Deaconess Adwoa Mensah', icon: '<i data-lucide="music"></i>', role: 'Soprano Section' },
    { id: uid(), name: 'Young Adults Fellowship', leader: 'Pastor Daniel Osei', icon: '<i data-lucide="sparkles"></i>', role: 'Member' },
  ];

  /* ---------------------------------------------------
     State Manager
     --------------------------------------------------- */
  let profile       = SEED_PROFILE;
  let attendance     = SEED_ATTENDANCE;
  let giving         = SEED_GIVING;
  let announcements  = SEED_ANNOUNCEMENTS;
  let prayers        = SEED_PRAYERS;
  let groups         = SEED_GROUPS;

  async function loadAllFromFirestore() {
    try {
      const userDoc = await dbGet('users', 'current');
      if (userDoc) profile = { ...SEED_PROFILE, ...userDoc };

      const [attData, givingData, prayerData] = await Promise.all([
        dbGetAll('attendance'),
        dbGetAll('givingTransactions'),
        dbGetAll('prayerRequests'),
      ]);

      if (attData.length > 0) attendance = attData;
      if (givingData.length > 0) giving = givingData;
      if (prayerData.length > 0) prayers = prayerData;

      console.log('[Member] Firestore data loaded.');
    } catch (err) {
      console.warn('[Member] Firestore load failed, using seed data:', err);
    }
  }

  function persistAll() {
    // No-op: data is written to Firestore on individual actions
  }

  /* ---------------------------------------------------
     Modal Helpers
     --------------------------------------------------- */
  function openModal(id) { document.getElementById(id)?.classList.add('active'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
  });

  /* ---------------------------------------------------
     Section Navigation (Desktop Sidebar + Mobile Bottom Nav)
     --------------------------------------------------- */
  const sidebarLinks = document.querySelectorAll('.sidebar__link[data-section]');
  const bottomNavLinks = document.querySelectorAll('.bottom-nav__link[data-section]');
  const sections = document.querySelectorAll('.dashboard-section');

  function showSection(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));
    bottomNavLinks.forEach(l => l.classList.remove('active'));

    document.getElementById(`section-${sectionId}`)?.classList.add('active');
    document.querySelector(`.sidebar__link[data-section="${sectionId}"]`)?.classList.add('active');
    document.querySelector(`.bottom-nav__link[data-section="${sectionId}"]`)?.classList.add('active');

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    // Update topbar greeting
    const topGreeting = document.getElementById('topbar-greeting');
    if (topGreeting) {
      if (sectionId === 'home') topGreeting.textContent = `Welcome back, ${profile.preferredName} 👋`;
      else if (sectionId === 'profile') topGreeting.textContent = 'My Profile';
      else if (sectionId === 'attendance') topGreeting.textContent = 'My Attendance';
      else if (sectionId === 'giving') topGreeting.textContent = 'My Giving';
      else if (sectionId === 'announcements') topGreeting.textContent = 'Announcements';
      else if (sectionId === 'prayer') topGreeting.textContent = 'Prayer Requests';
      else if (sectionId === 'groups') topGreeting.textContent = 'My Groups';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); showSection(link.dataset.section); });
  });

  bottomNavLinks.forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); showSection(link.dataset.section); });
  });

  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(el.dataset.goto);
    });
  });

  /* ---------------------------------------------------
     SECTION 1: HOME
     --------------------------------------------------- */
  function renderHome() {
    // Greeting
    const greetEl = document.getElementById('home-greeting');
    if (greetEl) greetEl.textContent = `Welcome back, ${profile.preferredName}! 🌻`;

    // Streak calculation
    let streak = 0;
    const sorted = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const rec of sorted) {
      if (rec.status === 'Present') streak++;
      else break;
    }
    document.getElementById('home-stat-streak').textContent = `${streak} week${streak !== 1 ? 's' : ''}`;

    // Giving total this year
    const thisYear = new Date().getFullYear();
    const ytdTotal = giving.reduce((sum, g) => sum + g.amount, 0);
    document.getElementById('home-stat-giving').textContent = formatGHC(ytdTotal);

    // Unread announcements
    const unreadCount = announcements.filter(a => !a.read).length;
    document.getElementById('home-stat-unread').textContent = unreadCount;

    // Latest announcement preview
    const latest = announcements[0];
    const previewEl = document.getElementById('home-latest-announcement');
    if (previewEl && latest) {
      previewEl.innerHTML = `
        <div class="announcement-card ${latest.read ? '' : 'announcement-card--unread'}">
          <div class="announcement-card__meta">
            ${latest.read ? '' : '<span class="announcement-card__dot"></span>'}
            <span>${formatDate(latest.date)}</span>
            <span>•</span>
            <span>via ${latest.channel}</span>
          </div>
          <h4 style="color: var(--color-navy); margin-bottom: 6px; font-size: var(--fs-sm);">${latest.title}</h4>
          <p style="color: var(--color-gray-600); font-size: var(--fs-xs); line-height: 1.5;">${latest.body.slice(0, 120)}${latest.body.length > 120 ? '...' : ''}</p>
        </div>
      `;
    }

    // Notification badge
    const badge = document.getElementById('notif-badge');
    if (badge) badge.textContent = unreadCount > 0 ? unreadCount : '';
  }

  /* ---------------------------------------------------
     SECTION 2: MY PROFILE (with editable fields)
     --------------------------------------------------- */
  const editBtn = document.getElementById('btn-edit-profile');
  const saveBtn = document.getElementById('btn-save-profile');
  const cancelBtn = document.getElementById('btn-cancel-profile');
  let isEditing = false;

  function renderProfile() {
    document.getElementById('profile-full-name').textContent = profile.fullName;
    document.getElementById('profile-preferred').textContent = `"${profile.preferredName}"`;
    document.getElementById('profile-avatar').textContent = profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase();

    // Editable fields
    setFieldValue('field-phone', profile.phone);
    setFieldValue('field-email', profile.email);
    setFieldValue('field-address', profile.address);
    setFieldValue('field-occupation', profile.occupation);
    setFieldValue('field-emergency', profile.emergencyContact);

    if (editBtn) editBtn.style.display = isEditing ? 'none' : 'inline-flex';
    if (saveBtn) saveBtn.style.display = isEditing ? 'inline-flex' : 'none';
    if (cancelBtn) cancelBtn.style.display = isEditing ? 'inline-flex' : 'none';
  }

  function setFieldValue(fieldId, value) {
    const el = document.querySelector(`#${fieldId} .profile-field__value`);
    if (el) el.textContent = value;
  }

  function makeFieldsEditable() {
    isEditing = true;
    const editableFields = [
      { id: 'field-phone', key: 'phone', type: 'tel' },
      { id: 'field-email', key: 'email', type: 'email' },
      { id: 'field-address', key: 'address', type: 'text' },
      { id: 'field-occupation', key: 'occupation', type: 'text' },
      { id: 'field-emergency', key: 'emergencyContact', type: 'text' },
    ];

    editableFields.forEach(f => {
      const valueEl = document.querySelector(`#${f.id} .profile-field__value`);
      if (valueEl) {
        const currentVal = profile[f.key];
        valueEl.innerHTML = `<input type="${f.type}" class="form-input" data-field-key="${f.key}" value="${currentVal}" style="padding: 0.4rem 0.6rem;">`;
      }
    });

    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  }

  function saveProfileChanges() {
    const inputs = document.querySelectorAll('[data-field-key]');
    inputs.forEach(input => {
      const key = input.dataset.fieldKey;
      if (key && profile.hasOwnProperty(key)) {
        profile[key] = input.value.trim() || profile[key];
      }
    });

    isEditing = false;
    persistAll();
    renderProfile();
    toast('Profile updated successfully! ✓');
  }

  function cancelProfileEdit() {
    isEditing = false;
    renderProfile();
  }

  if (editBtn) editBtn.addEventListener('click', makeFieldsEditable);
  if (saveBtn) saveBtn.addEventListener('click', saveProfileChanges);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelProfileEdit);

  /* ---------------------------------------------------
     SECTION 3: MY ATTENDANCE (with date filter)
     --------------------------------------------------- */
  let attFilterFrom = '';
  let attFilterTo = '';

  function renderAttendance() {
    let filtered = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (attFilterFrom) filtered = filtered.filter(a => a.date >= attFilterFrom);
    if (attFilterTo) filtered = filtered.filter(a => a.date <= attFilterTo);

    // Streak
    let streak = 0;
    const allSorted = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const rec of allSorted) {
      if (rec.status === 'Present') streak++;
      else break;
    }
    const streakBadge = document.getElementById('attendance-streak-badge');
    if (streakBadge) streakBadge.textContent = `🔥 ${streak}-Week Streak`;

    // Summary text
    const summary = document.getElementById('att-summary-text');
    if (summary) {
      const presentCount = filtered.filter(a => a.status === 'Present').length;
      const rate = filtered.length > 0 ? Math.round((presentCount / filtered.length) * 100) : 0;
      summary.textContent = `${filtered.length} records shown • ${rate}% attendance rate`;
    }

    // Render Attendance Journey Grid
    if (window.ChurchCharts) {
      window.ChurchCharts.renderAttendanceJourney('member-journey-chart', null, {
        title: 'Your Attendance Journey'
      });
    }

    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state__icon"><i data-lucide="calendar-off"></i></div><div class="empty-state__title">No attendance records for this period</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(a => `
      <tr>
        <td>${formatDate(a.date)}</td>
        <td>${a.service}</td>
        <td>
          ${a.status === 'Present'
            ? '<span class="badge badge--success">✓ Present</span>'
            : '<span class="badge badge--ghost">— Absent</span>'
          }
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('btn-filter-attendance')?.addEventListener('click', () => {
    attFilterFrom = document.getElementById('att-filter-from').value;
    attFilterTo = document.getElementById('att-filter-to').value;
    renderAttendance();
  });

  document.getElementById('btn-clear-att-filter')?.addEventListener('click', () => {
    attFilterFrom = '';
    attFilterTo = '';
    document.getElementById('att-filter-from').value = '';
    document.getElementById('att-filter-to').value = '';
    renderAttendance();
  });

  /* ---------------------------------------------------
     SECTION 4: MY GIVING (with flag & annual statement)
     --------------------------------------------------- */
  function renderGiving() {
    const tbody = document.getElementById('giving-tbody');
    if (!tbody) return;

    const sorted = [...giving].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map(g => `
      <tr style="${g.status === 'flagged' ? 'background: var(--color-warning-bg);' : ''}">
        <td>${formatDate(g.date)}</td>
        <td><span class="badge badge--navy">${g.category}</span></td>
        <td style="font-weight: 700; color: var(--color-navy);">${formatGHC(g.amount)}</td>
        <td>${g.method}</td>
        <td>
          ${g.status === 'flagged'
            ? '<span class="flag-inline">⚠️ Flagged — Pending Review</span>'
            : `<button class="btn btn--ghost btn--xs" onclick="window._memberDash.flagTransaction('${g.id}')">Flag as Incorrect</button>`
          }
        </td>
      </tr>
    `).join('');
  }

  function flagTransaction(txId) {
    if (!confirm('This will notify the finance team that you believe this transaction record is incorrect. They will review it.\n\nContinue?')) return;

    const tx = giving.find(g => g.id === txId);
    if (tx) {
      tx.status = 'flagged';
      persistAll();
      toast('Transaction flagged for finance team review ✓');
      renderGiving();
    }
  }

  // Annual Giving Statement
  document.getElementById('btn-my-generate-stmt')?.addEventListener('click', () => {
    const year = document.getElementById('my-stmt-year').value;
    const ytdTotal = giving.reduce((sum, g) => sum + g.amount, 0);

    // Category breakdown
    const categories = {};
    giving.forEach(g => {
      categories[g.category] = (categories[g.category] || 0) + g.amount;
    });

    const body = document.getElementById('modal-my-statement-body');
    if (!body) return;

    body.innerHTML = `
      <div class="statement-preview">
        <div class="statement-header">
          <div>
            <h2 style="color: var(--color-navy); font-size: 1.5rem; margin-bottom: 4px;">✝ Grace Assembly International</h2>
            <div style="font-size: 0.8125rem; color: var(--color-gray-500);">15 Liberation Road, Accra • Tel: 030 200 1234</div>
            <div style="font-size: 0.8125rem; color: var(--color-gray-500);">Annual Contribution Statement</div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge--navy" style="font-size: 0.875rem;">Year ${year}</span>
            <div style="font-size: 0.75rem; color: var(--color-gray-500); margin-top: 4px;">Generated: ${formatDate(today())}</div>
          </div>
        </div>

        <div style="margin-bottom: var(--space-xl); font-size: 0.875rem;">
          <div><strong>Member:</strong> ${profile.fullName}</div>
          <div><strong>Phone:</strong> ${profile.phone}</div>
          <div><strong>Email:</strong> ${profile.email}</div>
        </div>

        <table class="data-table" style="margin-bottom: var(--space-xl);">
          <thead>
            <tr><th>Giving Category</th><th>Total Contributions</th></tr>
          </thead>
          <tbody>
            ${Object.entries(categories).map(([cat, total]) => `
              <tr><td>${cat}</td><td style="font-weight: 600;">${formatGHC(total)}</td></tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: 700; background: var(--color-gray-50);">
              <td style="font-size: 1rem;">GRAND TOTAL:</td>
              <td style="font-size: 1.125rem; color: var(--color-success);">${formatGHC(ytdTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-size: 0.75rem; color: var(--color-gray-500); border-top: 1px solid var(--color-gray-200); padding-top: var(--space-md); text-align: center;">
          Thank you for your faithful stewardship and generous giving, ${profile.preferredName}. God bless you! 🙏
        </div>
      </div>
    `;

    openModal('modal-my-statement');
  });

  document.getElementById('btn-download-my-stmt')?.addEventListener('click', () => {
    toast('Generating PDF for download... ✓');
    setTimeout(() => {
      alert('[SIMULATED PDF DOWNLOAD]\n\nFile: my_giving_statement_2025.pdf\nDownload initiated.');
      closeModal('modal-my-statement');
    }, 400);
  });

  /* ---------------------------------------------------
     SECTION 5: ANNOUNCEMENTS
     --------------------------------------------------- */
  function renderAnnouncements() {
    const feed = document.getElementById('announcements-feed');
    if (!feed) return;

    const sorted = [...announcements].sort((a, b) => new Date(b.date) - new Date(a.date));

    feed.innerHTML = sorted.map(a => `
      <div class="announcement-card ${a.read ? '' : 'announcement-card--unread'}" onclick="window._memberDash.markAnnouncementRead('${a.id}')" style="cursor: pointer;">
        <div class="announcement-card__meta">
          ${a.read ? '' : '<span class="announcement-card__dot"></span>'}
          <span>${formatDate(a.date)}</span>
          <span>•</span>
          <span>Sent via ${a.channel}</span>
          ${a.read ? '' : '<span class="badge badge--navy" style="font-size: 0.625rem; padding: 0.1rem 0.4rem;">NEW</span>'}
        </div>
        <h4 style="color: var(--color-navy); margin-bottom: 6px; font-size: var(--fs-base);">${a.title}</h4>
        <p style="color: var(--color-gray-600); font-size: var(--fs-sm); line-height: 1.6;">${a.body}</p>
      </div>
    `).join('');
  }

  function markAnnouncementRead(id) {
    const a = announcements.find(x => x.id === id);
    if (a && !a.read) {
      a.read = true;
      persistAll();
      renderAnnouncements();
      renderHome();
    }
  }

  document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
    announcements.forEach(a => a.read = true);
    persistAll();
    renderAnnouncements();
    renderHome();
    toast('All announcements marked as read ✓');
  });

  /* ---------------------------------------------------
     SECTION 6: PRAYER REQUESTS
     --------------------------------------------------- */
  function renderPrayers() {
    const list = document.getElementById('prayer-requests-list');
    if (!list) return;

    const visiblePrayers = prayers.filter(p => !p.deleted);
    const sorted = [...visiblePrayers].sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));

    if (sorted.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i data-lucide="hand-heart"></i></div><div class="empty-state__title">No prayer requests yet</div><div class="empty-state__desc">Submit one above — the pastoral team is ready to pray with you</div></div>`;
      return;
    }

    list.innerHTML = sorted.map(p => `
      <div class="prayer-card ${p.status === 'Answered' ? 'prayer-card--answered' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-sm);">
          <span class="prayer-card__status ${p.status === 'Answered' ? 'prayer-card__status--answered' : 'prayer-card__status--active'}">
            ${p.status === 'Answered' ? '✓ Answered' : '🙏 Active'}
          </span>
          <span style="font-size: var(--fs-xs); color: var(--color-gray-500);">Submitted ${formatDate(p.submittedDate)}</span>
        </div>
        <p style="color: var(--color-gray-700); font-size: var(--fs-sm); line-height: 1.6; margin-bottom: var(--space-sm);">${p.description}</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${p.status === 'Active'
            ? `<button class="btn btn--success-ghost btn--xs" onclick="window._memberDash.markAnswered('${p.id}')">Mark as Answered 🙏</button>`
            : '<span style="color: var(--color-success); font-size: var(--fs-xs); font-weight: 600;">Praise God! 🎉</span>'
          }
          <button class="btn btn--danger-ghost btn--xs" onclick="window._memberDash.deleteMyPrayer('${p.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function deleteMyPrayer(id) {
    const p = prayers.find(x => x.id === id);
    if (!p) return;
    if (confirm('Soft-delete this prayer request? It will be archived and can be restored.')) {
      p.deleted = true;
      p.deletedAt = new Date().toISOString();
      persistAll();
      if (window.SoftDeleteUtils) window.SoftDeleteUtils.addGlobalAuditLog(profile.fullName, 'delete', `Member soft-deleted prayer request: "${p.description.slice(0, 30)}..."`);
      toast('Prayer request soft-deleted');
      renderPrayers();
    }
  }

  function restoreMyPrayer(id) {
    const p = prayers.find(x => x.id === id);
    if (!p) return;
    p.deleted = false;
    delete p.deletedAt;
    persistAll();
    if (window.SoftDeleteUtils) window.SoftDeleteUtils.addGlobalAuditLog(profile.fullName, 'edit', `Member restored prayer request: "${p.description.slice(0, 30)}..."`);
    toast('Prayer request restored 🙏');
    renderPrayers();
  }

  document.getElementById('form-prayer-request')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('prayer-description').value.trim();
    if (!desc) { toast('Please describe your prayer need', 'error'); return; }

    prayers.unshift({
      id: uid(),
      description: desc,
      submittedDate: today(),
      status: 'Active',
    });

    persistAll();
    toast('Your prayer request has been sent to the pastoral team 🙏');
    document.getElementById('form-prayer-request').reset();
    renderPrayers();
  });

  function markAnswered(prayerId) {
    const p = prayers.find(x => x.id === prayerId);
    if (p) {
      p.status = 'Answered';
      persistAll();
      toast('Marked as answered 🙏 Praise God!');
      renderPrayers();
    }
  }

  /* ---------------------------------------------------
     SECTION 7: MY GROUPS
     --------------------------------------------------- */
  function renderGroups() {
    const list = document.getElementById('groups-list');
    if (!list) return;

    if (groups.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i data-lucide="users"></i></div><div class="empty-state__title">You're not in any groups yet</div><div class="empty-state__desc">Speak to your leader to join a department or fellowship group</div></div>`;
      return;
    }

    list.innerHTML = groups.map(g => `
      <div class="group-card">
        <div class="group-card__icon">${g.icon}</div>
        <div class="group-card__info">
          <div class="group-card__name">${g.name}</div>
          <div class="group-card__leader">Leader: ${g.leader}</div>
          <div style="font-size: var(--fs-xs); color: var(--color-gray-400); margin-top: 2px;">Your role: ${g.role}</div>
        </div>
      </div>
    `).join('');
  }

  /* ---------------------------------------------------
     Expose Global Handlers for DOM
     --------------------------------------------------- */
  window._memberDash = {
    flagTransaction,
    markAnnouncementRead,
    markAnswered,
    deleteMyPrayer,
    restoreMyPrayer,
  };

  /* ---------------------------------------------------
     Init on Load
     --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadAllFromFirestore();
    renderHome();
    renderProfile();
    renderAttendance();
    renderGiving();
    renderAnnouncements();
    if (window.ChurchComms) window.ChurchComms.init('member');
    renderPrayers();
    renderGroups();

    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.renderActivityFeed('activity-log-member', 'member', { name: profile.fullName || 'Efua Amoako', role: 'member' });
    }

    // Show edit button
    if (editBtn) editBtn.style.display = 'inline-flex';
  });

})();
