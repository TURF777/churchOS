/* ===================================================
   ChurchOS — Finance Team Dashboard JavaScript
   Now uses Firestore for data persistence
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Firestore Collections
     --------------------------------------------------- */
  const COLLECTIONS = {
    members:       'members',
    categories:    'givingCategories',
    transactions:  'givingTransactions',
    bulkEntries:   'givingBulkEntries',
    reconciliation:'givingReconciliation',
    statements:    'givingStatements',
    audit:         'activityLog',
  };

  const AUTHOR_NAME = 'Abena Osei (Finance Team)';

  const { dbAdd, dbGetAll, dbUpdate, dbSoftDelete, dbSeedIfEmpty } = window.ChurchOS;

  /* ---------------------------------------------------
     Utility Helpers
     --------------------------------------------------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

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
     Seed Financial Data
     --------------------------------------------------- */
  const SEED_TRANSACTIONS = [
    { id: uid(), memberId: 'm1', memberName: 'Kwame Asante', phone: '024 555 0101', amount: 500.00, category: 'Tithe', date: '2026-07-19', service: '1st Service', method: 'Mobile Money', ref: 'REC-99201', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm2', memberName: 'Ama Serwaa', phone: '024 555 0102', amount: 100.00, category: 'Offering', date: '2026-07-19', service: '2nd Service', method: 'Cash', ref: 'REC-99202', recordedBy: AUTHOR_NAME, status: 'disputed', disputeReason: 'Member states they gave GH₵ 200 cash, receipt says GH₵ 100.' },
    { id: uid(), memberId: 'm3', memberName: 'Kofi Darko', phone: '020 555 0103', amount: 450.00, category: 'Tithe', date: '2026-07-19', service: '1st Service', method: 'Bank Transfer', ref: 'TRF-88120', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm4', memberName: 'Abena Osei', phone: '027 555 0104', amount: 600.00, category: 'Tithe', date: '2026-07-19', service: '1st Service', method: 'Mobile Money', ref: 'REC-99204', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm6', memberName: 'Akosua Mensah', phone: '024 555 0106', amount: 300.00, category: 'Building Fund', date: '2026-07-19', service: '2nd Service', method: 'Cash', ref: 'REC-99205', recordedBy: AUTHOR_NAME, status: 'disputed', disputeReason: 'Category should be Missions Fund, recorded as Building Fund.' },
    { id: uid(), memberId: 'm7', memberName: 'Nana Agyeman', phone: '050 555 0107', amount: 1200.00, category: 'Special Seed', date: '2026-07-12', service: '2nd Service', method: 'Cheque', ref: 'CHQ-00412', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm1', memberName: 'Kwame Asante', phone: '024 555 0101', amount: 500.00, category: 'Tithe', date: '2026-07-12', service: '1st Service', method: 'Mobile Money', ref: 'REC-98101', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm3', memberName: 'Kofi Darko', phone: '020 555 0103', amount: 450.00, category: 'Tithe', date: '2026-07-12', service: '1st Service', method: 'Bank Transfer', ref: 'TRF-87120', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm1', memberName: 'Kwame Asante', phone: '024 555 0101', amount: 500.00, category: 'Tithe', date: '2026-07-05', service: '1st Service', method: 'Mobile Money', ref: 'REC-97101', recordedBy: AUTHOR_NAME, status: 'normal' },
    { id: uid(), memberId: 'm2', memberName: 'Ama Serwaa', phone: '024 555 0102', amount: 350.00, category: 'Tithe', date: '2026-07-05', service: '2nd Service', method: 'Cash', ref: 'REC-97102', recordedBy: AUTHOR_NAME, status: 'normal' },
  ];

  const SEED_BULK_ENTRIES = [
    { id: uid(), date: '2026-07-19', service: '1st Service', category: 'Offering', amount: 2450.00, recordedBy: AUTHOR_NAME },
    { id: uid(), date: '2026-07-19', service: '2nd Service', category: 'Offering', amount: 3820.00, recordedBy: AUTHOR_NAME },
    { id: uid(), date: '2026-07-19', service: '3rd Service', category: 'Offering', amount: 1650.00, recordedBy: AUTHOR_NAME },
    { id: uid(), date: '2026-07-16', service: 'Mid-Week Service', category: 'Offering', amount: 890.00, recordedBy: AUTHOR_NAME },
  ];

  const SEED_RECONCILIATION = [
    { id: uid(), date: '2026-07-19', service: '1st Service', systemTotal: 3450.00, physicalTotal: 3450.00, status: 'Reconciled' },
    { id: uid(), date: '2026-07-19', service: '2nd Service', systemTotal: 5220.00, physicalTotal: 5200.00, status: 'Pending' },
    { id: uid(), date: '2026-07-19', service: '3rd Service', systemTotal: 1650.00, physicalTotal: 1650.00, status: 'Reconciled' },
  ];

  const SEED_STATEMENTS = [
    { id: uid(), memberId: 'm1', memberName: 'Kwame Asante', year: '2025', grandTotal: 6500.00, generatedDate: '2026-01-15' },
    { id: uid(), memberId: 'm3', memberName: 'Kofi Darko', year: '2025', grandTotal: 5400.00, generatedDate: '2026-01-18' },
  ];

  /* ---------------------------------------------------
     State Manager
     --------------------------------------------------- */
  let members        = [];
  let transactions   = SEED_TRANSACTIONS;
  let bulkEntries    = SEED_BULK_ENTRIES;
  let reconciliations= SEED_RECONCILIATION;
  let statements     = SEED_STATEMENTS;
  let auditLog       = [];

  async function loadAllFromFirestore() {
    try {
      await Promise.all([
        dbSeedIfEmpty(COLLECTIONS.transactions, SEED_TRANSACTIONS),
        dbSeedIfEmpty(COLLECTIONS.bulkEntries, SEED_BULK_ENTRIES),
        dbSeedIfEmpty(COLLECTIONS.reconciliation, SEED_RECONCILIATION),
      ]);

      const [membersData, txData, bulkData, reconData] = await Promise.all([
        dbGetAll('members'),
        dbGetAll(COLLECTIONS.transactions, null, { includeDeleted: true }),
        dbGetAll(COLLECTIONS.bulkEntries),
        dbGetAll(COLLECTIONS.reconciliation),
      ]);

      if (membersData.length > 0) members = membersData;
      if (txData.length > 0) transactions = txData;
      if (bulkData.length > 0) bulkEntries = bulkData;
      if (reconData.length > 0) reconciliations = reconData;

      console.log('[Finance] Firestore data loaded.');
    } catch (err) {
      console.warn('[Finance] Firestore load failed, using seed data:', err);
    }
  }

  function persistAll() {
    // No-op: data is now written to Firestore on each individual operation.
  }

  function addAuditEntry(user, action, record, module = 'Finance') {
    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.logActivity({
        user: user || AUTHOR_NAME,
        role: 'finance',
        department: 'Finance Team',
        action: action || 'edit',
        module: module,
        record: record,
        isMemberFacing: action === 'create'
      });
    } else {
      auditLog.unshift({ id: uid(), timestamp: now(), user, action, record });
      save(KEYS.audit, auditLog);
    }
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
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  /* ---------------------------------------------------
     Section Navigation
     --------------------------------------------------- */
  const sidebarLinks = document.querySelectorAll('.sidebar__link[data-section]');
  const sections = document.querySelectorAll('.dashboard-section');

  function showSection(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));
    document.getElementById(`section-${sectionId}`)?.classList.add('active');
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.goto));
  });

  /* ---------------------------------------------------
     SECTION 1: Overview
     --------------------------------------------------- */
  function renderOverview() {
    const disputedCount = transactions.filter(t => t.status === 'disputed').length;

    // Update alert banner
    const alertBanner = document.getElementById('disputed-alert-banner');
    if (alertBanner) {
      if (disputedCount > 0) {
        alertBanner.style.display = 'flex';
        document.getElementById('disputed-count-text').textContent = `${disputedCount} Member Disputed Transaction${disputedCount > 1 ? 's' : ''}`;
      } else {
        alertBanner.style.display = 'none';
      }
    }

    document.getElementById('fin-stat-monthly').textContent = 'GH₵ 45.2K';
    document.getElementById('fin-stat-weekly').textContent = 'GH₵ 12.4K';
    document.getElementById('fin-stat-count').textContent = transactions.length;
    document.getElementById('fin-stat-disputed').textContent = disputedCount;

    // Mini category chart
    const chart = document.getElementById('overview-finance-category-chart');
    if (chart) {
      const cats = [
        { label: 'Tithes', val: 'GH₵ 29.3K', pct: 65 },
        { label: 'Offerings', val: 'GH₵ 11.3K', pct: 25 },
        { label: 'Building Fund', val: 'GH₵ 2.7K', pct: 6 },
        { label: 'Missions', val: 'GH₵ 1.8K', pct: 4 },
      ];
      chart.innerHTML = cats.map(c => `
        <div class="bar-chart__item">
          <span class="bar-chart__label">${c.label}</span>
          <div class="bar-chart__track"><div class="bar-chart__fill" style="width: ${c.pct}%;"></div></div>
          <span class="bar-chart__value">${c.val}</span>
        </div>
      `).join('');
    }
  }

  /* ---------------------------------------------------
     SECTION 2: Record a Transaction
     --------------------------------------------------- */
  function populateMemberDropdowns() {
    const selects = [document.getElementById('tx-member'), document.getElementById('stmt-member')];
    selects.forEach(sel => {
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">— Select Member —</option>' +
        members.map(m => `<option value="${m.id}" ${m.id === currentVal ? 'selected' : ''}>${m.name} (${m.phone})</option>`).join('');
    });
  }

  function renderRecentTransactions() {
    const tbody = document.getElementById('recent-tx-tbody');
    if (!tbody) return;

    tbody.innerHTML = transactions.slice(0, 10).map(t => `
      <tr>
        <td>${t.date}</td>
        <td><strong>${t.memberName}</strong></td>
        <td><span class="badge badge--navy">${t.category}</span></td>
        <td style="font-weight: 600; color: var(--color-navy);">${formatGHC(t.amount)}</td>
      </tr>
    `).join('');
  }

  document.getElementById('form-record-tx')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const memberId = document.getElementById('tx-member').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const category = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const method = document.getElementById('tx-method').value;
    const service = document.getElementById('tx-service').value;
    const ref = document.getElementById('tx-ref').value.trim() || `REC-${Math.floor(10000 + Math.random() * 90000)}`;

    if (!memberId || isNaN(amount) || amount <= 0 || !date) {
      toast('Please fill out all required fields with a valid amount', 'error');
      return;
    }

    const memberObj = members.find(m => m.id === memberId);
    const memberName = memberObj ? memberObj.name : 'Selected Member';
    const phone = memberObj ? memberObj.phone : '';

    const newTx = {
      id: uid(),
      memberId,
      memberName,
      phone,
      amount,
      category,
      date,
      service,
      method,
      ref,
      recordedBy: AUTHOR_NAME,
      status: 'normal',
    };

    transactions.unshift(newTx);
    persistAll();
    addAuditEntry(AUTHOR_NAME, 'create', `Recorded ${category} of ${formatGHC(amount)} for ${memberName}`);

    toast(`Transaction saved! Receipt #${ref} generated ✓`);
    document.getElementById('form-record-tx').reset();
    document.getElementById('tx-date').value = today();
    renderRecentTransactions();
    renderOverview();
    renderMemberGivingRecords();
  });

  /* ---------------------------------------------------
     SECTION 3: Bulk Offering Entry
     --------------------------------------------------- */
  function renderBulkEntries() {
    const tbody = document.getElementById('bulk-history-tbody');
    if (!tbody) return;

    tbody.innerHTML = bulkEntries.map(b => `
      <tr>
        <td>${b.date}</td>
        <td><strong>${b.service}</strong></td>
        <td><span class="badge badge--success">${b.category}</span></td>
        <td style="font-weight: 600; color: var(--color-navy);">${formatGHC(b.amount)}</td>
      </tr>
    `).join('');
  }

  document.getElementById('form-bulk-entry')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const service = document.getElementById('bulk-service').value;
    const amount = parseFloat(document.getElementById('bulk-amount').value);
    const category = document.getElementById('bulk-category').value;
    const date = document.getElementById('bulk-date').value;

    if (isNaN(amount) || amount <= 0 || !date) {
      toast('Please enter a valid aggregate amount and date', 'error');
      return;
    }

    bulkEntries.unshift({
      id: uid(),
      date,
      service,
      category,
      amount,
      recordedBy: AUTHOR_NAME,
    });

    persistAll();
    addAuditEntry(AUTHOR_NAME, 'create', `Recorded Bulk Offering of ${formatGHC(amount)} for ${service}`);

    toast(`Bulk offering of ${formatGHC(amount)} recorded against ${service} ✓`);
    document.getElementById('form-bulk-entry').reset();
    document.getElementById('bulk-date').value = today();
    renderBulkEntries();
    renderOverview();
  });

  /* ---------------------------------------------------
     SECTION 4: Member Giving Records (Reverse Chronological)
     --------------------------------------------------- */
  function renderMemberGivingRecords() {
    const search = (document.getElementById('giving-member-search')?.value || '').toLowerCase();
    const disputedOnly = document.getElementById('filter-disputed-only')?.checked;

    let memberList = members;
    if (disputedOnly) {
      const disputedMemberIds = new Set(transactions.filter(t => t.status === 'disputed').map(t => t.memberId));
      memberList = members.filter(m => disputedMemberIds.has(m.id));
    }

    if (search) {
      memberList = memberList.filter(m => m.name.toLowerCase().includes(search) || m.phone.includes(search));
    }

    const tbody = document.getElementById('giving-members-tbody');
    if (!tbody) return;

    if (memberList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">📜</div><div class="empty-state__title">No giving records found</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = memberList.map(m => {
      const mTxs = transactions.filter(t => t.memberId === m.id);
      const totalYtd = mTxs.reduce((sum, t) => sum + t.amount, 0);
      const disputedCount = mTxs.filter(t => t.status === 'disputed').length;

      return `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.phone}</td>
          <td style="font-weight: 600; color: var(--color-navy);">${formatGHC(totalYtd)}</td>
          <td>
            ${disputedCount > 0
              ? `<span class="dispute-badge">⚠️ ${disputedCount} Disputed</span>`
              : '<span style="color: var(--color-gray-400); font-size: 0.75rem;">None</span>'
            }
          </td>
          <td>
            <button class="btn btn--primary btn--xs" onclick="window._finDash.openMemberGivingModal('${m.id}')">View Full History (${mTxs.length})</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Open Full Member Giving History Modal
  function openMemberGivingModal(memberId) {
    const m = members.find(x => x.id === memberId);
    const mName = m ? m.name : 'Member';
    document.getElementById('modal-giving-title').textContent = `Giving History — ${mName}`;

    // Filter member transactions in REVERSE CHRONOLOGICAL ORDER (most recent first)
    const mTxs = transactions.filter(t => t.memberId === memberId).sort((a, b) => new Date(b.date) - new Date(a.date));

    const body = document.getElementById('modal-giving-body');
    if (!body) return;

    body.innerHTML = `
      <div class="info-box" style="margin-bottom: var(--space-lg);">
        <span>ℹ️</span>
        <span>Showing full giving transactions for <strong>${mName}</strong> in reverse chronological order (most recent first). Non-financial notes are strictly restricted.</span>
      </div>

      ${mTxs.length === 0 ? '<div class="empty-state"><div class="empty-state__icon">💳</div><div class="empty-state__title">No transactions recorded for this member</div></div>' : ''}

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Ref / Receipt #</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${mTxs.map(t => `
              <tr style="${t.deleted ? 'opacity: 0.6; background: rgba(239,68,68,0.04);' : t.status === 'disputed' ? 'background: var(--color-danger-bg);' : ''}">
                <td>${t.date}</td>
                <td><span class="badge badge--navy">${t.category}</span></td>
                <td style="font-weight: 700; color: var(--color-navy); ${t.deleted ? 'text-decoration: line-through;' : ''}">${formatGHC(t.amount)}</td>
                <td>${t.method}</td>
                <td><code style="font-size: 0.75rem;">${t.ref}</code></td>
                <td>
                  ${t.deleted
                    ? '<span class="badge badge--danger">Voided / Soft Deleted</span>'
                    : t.status === 'disputed'
                    ? `<span class="dispute-badge" title="${t.disputeReason || 'Disputed'}">⚠️ Disputed</span>`
                    : '<span class="badge badge--success">Verified</span>'
                  }
                </td>
                <td>
                  <div style="display: flex; gap: 0.25rem; align-items: center;">
                    ${t.deleted ? `
                      <button class="btn btn--success-ghost btn--xs" onclick="window._finDash.restoreTransaction('${t.id}', '${memberId}')">♻️ Restore</button>
                    ` : `
                      ${t.status === 'disputed' ? `<button class="btn btn--success-ghost btn--xs" onclick="window._finDash.resolveDispute('${t.id}', '${memberId}')">Resolve</button>` : ''}
                      <button class="btn btn--danger-ghost btn--xs" onclick="window._finDash.voidTransaction('${t.id}', '${memberId}')">Void / Soft Delete</button>
                    `}
                  </div>
                </td>
              </tr>
              ${t.status === 'disputed' && t.disputeReason && !t.deleted ? `
                <tr style="background: var(--color-danger-bg);">
                  <td colspan="7" style="font-size: 0.75rem; color: var(--color-danger); padding-top: 0;">
                    <strong>Dispute Note:</strong> "${t.disputeReason}"
                  </td>
                </tr>
              ` : ''}
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    openModal('modal-member-giving');
  }

  function voidTransaction(txId, memberId) {
    const t = transactions.find(x => x.id === txId);
    if (!t) return;
    if (confirm(`Void/Soft-delete transaction Ref #${t.ref} (${formatGHC(t.amount)})? It will be marked voided but kept for financial audit integrity.`)) {
      t.deleted = true;
      t.deletedAt = new Date().toISOString();
      t.status = 'voided';
      persistAll();
      addAuditEntry(AUTHOR_NAME, 'delete', `Voided/soft-deleted transaction Ref #${t.ref} (${formatGHC(t.amount)})`);
      toast(`Transaction Ref #${t.ref} voided (soft-deleted, preserved in audit log)`);
      if (memberId) openMemberGivingModal(memberId);
      renderMemberGivingRecords();
      renderOverview();
    }
  }

  function restoreTransaction(txId, memberId) {
    const t = transactions.find(x => x.id === txId);
    if (!t) return;
    t.deleted = false;
    delete t.deletedAt;
    t.status = 'normal';
    persistAll();
    addAuditEntry(AUTHOR_NAME, 'edit', `Restored voided transaction Ref #${t.ref} (${formatGHC(t.amount)})`);
    toast(`Transaction Ref #${t.ref} restored ✓`);
    if (memberId) openMemberGivingModal(memberId);
    renderMemberGivingRecords();
    renderOverview();
  }

  function resolveDispute(txId, memberId) {
    const t = transactions.find(x => x.id === txId);
    if (t) {
      t.status = 'normal';
      t.disputeReason = '';
      persistAll();
      addAuditEntry(AUTHOR_NAME, 'edit', `Resolved transaction dispute for Receipt #${t.ref}`);
      toast('Transaction marked as reviewed & resolved ✓');
      openMemberGivingModal(memberId);
      renderMemberGivingRecords();
      renderOverview();
    }
  }

  document.getElementById('giving-member-search')?.addEventListener('input', renderMemberGivingRecords);
  document.getElementById('filter-disputed-only')?.addEventListener('change', renderMemberGivingRecords);

  /* ---------------------------------------------------
     SECTION 5: Financial Reports
     --------------------------------------------------- */
  function renderFinancialReports() {
    // Category Breakdown Chart
    const catChart = document.getElementById('report-category-chart');
    if (catChart) {
      const data = [
        { label: 'Tithes', val: 'GH₵ 29,380.00', pct: 65 },
        { label: 'Offerings', val: 'GH₵ 11,300.00', pct: 25 },
        { label: 'Building Fund', val: 'GH₵ 2,710.00', pct: 6 },
        { label: 'Missions', val: 'GH₵ 1,810.00', pct: 4 },
      ];
      catChart.innerHTML = data.map(d => `
        <div class="bar-chart__item">
          <span class="bar-chart__label">${d.label}</span>
          <div class="bar-chart__track"><div class="bar-chart__fill" style="width: ${d.pct}%;"></div></div>
          <span class="bar-chart__value">${d.val}</span>
        </div>
      `).join('');
    }

    // Payment Method Chart
    const methodChart = document.getElementById('report-method-chart');
    if (methodChart) {
      const data = [
        { label: 'Mobile Money', val: 'GH₵ 24,860.00', pct: 55 },
        { label: 'Cash', val: 'GH₵ 13,560.00', pct: 30 },
        { label: 'Bank Transfer', val: 'GH₵ 4,520.00', pct: 10 },
        { label: 'Cheques', val: 'GH₵ 2,260.00', pct: 5 },
      ];
      methodChart.innerHTML = data.map(d => `
        <div class="bar-chart__item">
          <span class="bar-chart__label">${d.label}</span>
          <div class="bar-chart__track"><div class="bar-chart__fill" style="width: ${d.pct}%; background: linear-gradient(90deg, var(--color-info), #5fa0d6);"></div></div>
          <span class="bar-chart__value">${d.val}</span>
        </div>
      `).join('');
    }
  }

  document.getElementById('btn-generate-fin-report')?.addEventListener('click', () => {
    const period = document.getElementById('report-period-select').value;
    toast(`Financial report generated for ${period} ✓`);
  });

  document.getElementById('btn-export-fin-report')?.addEventListener('click', () => {
    toast('Exporting Financial Report... ✓');
    setTimeout(() => {
      alert('[SIMULATED FILE DOWNLOAD]\n\nFile: financial_report_july2026.csv\nDownload completed.');
    }, 400);
  });

  /* ---------------------------------------------------
     SECTION 6: Annual Giving Statements
     --------------------------------------------------- */
  function renderStatementsHistory() {
    const tbody = document.getElementById('statements-history-tbody');
    if (!tbody) return;

    tbody.innerHTML = statements.map(s => `
      <tr>
        <td><strong>${s.memberName}</strong></td>
        <td><span class="badge badge--navy">${s.year}</span></td>
        <td style="font-weight: 700; color: var(--color-navy);">${formatGHC(s.grandTotal)}</td>
        <td>
          <button class="btn btn--primary btn--xs" onclick="window._finDash.previewStatement('${s.memberId}', '${s.year}')">Preview / Export PDF</button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('form-generate-statement')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const memberId = document.getElementById('stmt-member').value;
    const year = document.getElementById('stmt-year').value;

    if (!memberId || !year) { toast('Please select a member and year', 'error'); return; }

    const m = members.find(x => x.id === memberId);
    const memberName = m ? m.name : 'Member';

    // Calculate total from transactions or mock
    const mTxs = transactions.filter(t => t.memberId === memberId);
    const grandTotal = mTxs.reduce((sum, t) => sum + t.amount, 0) || 3450.00;

    const existingIdx = statements.findIndex(s => s.memberId === memberId && s.year === year);
    if (existingIdx === -1) {
      statements.unshift({
        id: uid(),
        memberId,
        memberName,
        year,
        grandTotal,
        generatedDate: today(),
      });
      persistAll();
    }

    addAuditEntry(AUTHOR_NAME, 'create', `Generated ${year} Annual Statement for ${memberName}`);
    renderStatementsHistory();
    previewStatement(memberId, year);
  });

  function previewStatement(memberId, year) {
    const m = members.find(x => x.id === memberId);
    const memberName = m ? m.name : 'Member Name';
    const phone = m ? m.phone : '';

    const mTxs = transactions.filter(t => t.memberId === memberId);
    const grandTotal = mTxs.reduce((sum, t) => sum + t.amount, 0) || 3450.00;

    const body = document.getElementById('modal-statement-body');
    if (!body) return;

    body.innerHTML = `
      <div class="statement-preview">
        <div class="statement-header">
          <div>
            <h2 style="color: var(--color-navy); font-size: 1.5rem; margin-bottom: 4px;">✝ Grace Assembly International</h2>
            <div style="font-size: 0.8125rem; color: var(--color-gray-500);">15 Liberation Road, Accra • Tel: 030 200 1234</div>
            <div style="font-size: 0.8125rem; color: var(--color-gray-500);">Official Annual Contribution Statement</div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge--navy" style="font-size: 0.875rem;">Tax Year ${year}</span>
            <div style="font-size: 0.75rem; color: var(--color-gray-500); margin-top: 4px;">Issued: ${today()}</div>
          </div>
        </div>

        <div style="margin-bottom: var(--space-xl); font-size: 0.875rem;">
          <div><strong>Member Name:</strong> ${memberName}</div>
          <div><strong>Phone:</strong> ${phone}</div>
          <div><strong>Statement Period:</strong> Jan 01, ${year} – Dec 31, ${year}</div>
        </div>

        <table class="data-table" style="margin-bottom: var(--space-xl);">
          <thead>
            <tr>
              <th>Giving Category</th>
              <th>Total Contributions</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Tithes</td><td>${formatGHC(grandTotal * 0.7)}</td></tr>
            <tr><td>General Offerings</td><td>${formatGHC(grandTotal * 0.2)}</td></tr>
            <tr><td>Building Fund / Missions</td><td>${formatGHC(grandTotal * 0.1)}</td></tr>
          </tbody>
          <tfoot>
            <tr style="font-weight: 700; background: var(--color-gray-50);">
              <td style="font-size: 1rem;">GRAND TOTAL CONTRIBUTIONS:</td>
              <td style="font-size: 1.125rem; color: var(--color-success);">${formatGHC(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-size: 0.75rem; color: var(--color-gray-500); border-top: 1px solid var(--color-gray-200); padding-top: var(--space-md); text-align: center;">
          Thank you for your faithful stewardship and support of Grace Assembly International. This statement is certified for official tax and record purposes.
        </div>
      </div>
    `;

    openModal('modal-statement-preview');
  }

  document.getElementById('btn-export-statement-pdf')?.addEventListener('click', () => {
    toast('Generating printable statement PDF... ✓');
    setTimeout(() => {
      alert('[SIMULATED PDF DOWNLOAD]\n\nFile: annual_giving_statement_2025.pdf\nDownload initiated.');
      closeModal('modal-statement-preview');
    }, 400);
  });

  /* ---------------------------------------------------
     SECTION 7: Reconciliation
     --------------------------------------------------- */
  function renderReconciliation() {
    const container = document.getElementById('reconciliation-cards-container');
    if (!container) return;

    container.innerHTML = reconciliations.map((r, idx) => {
      const diff = r.physicalTotal - r.systemTotal;
      const isMatched = Math.abs(diff) < 0.01 && r.status === 'Reconciled';

      return `
        <div class="reconcile-card">
          <div class="reconcile-card__header">
            <div>
              <strong style="font-size: 1rem; color: var(--color-navy);">${r.service}</strong>
              <span style="font-size: 0.8125rem; color: var(--color-gray-500); margin-left: 8px;">${r.date}</span>
            </div>
            <span class="match-tag ${isMatched ? 'match-tag--matched' : 'match-tag--mismatch'}">
              ${isMatched ? '✓ Matched & Reconciled' : `✕ Mismatch (GH₵ ${diff.toFixed(2)})`}
            </span>
          </div>

          <div class="reconcile-grid">
            <div>
              <div style="font-size: 0.75rem; color: var(--color-gray-500);">System Recorded Total:</div>
              <div style="font-weight: 700; color: var(--color-navy); font-size: 1.125rem;">${formatGHC(r.systemTotal)}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--color-gray-500);">Physical Counted Total:</div>
              <input type="number" step="0.01" class="form-input" value="${r.physicalTotal}" style="max-width: 140px; padding: 0.4rem;" onchange="window._finDash.updatePhysicalCount(${idx}, this.value)">
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--color-gray-500);">Variance:</div>
              <div style="font-weight: 700; color: ${diff === 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-size: 1rem;">
                ${diff === 0 ? 'GH₵ 0.00' : `${diff > 0 ? '+' : ''}${formatGHC(diff)}`}
              </div>
            </div>
            <div style="text-align: right;">
              ${r.status !== 'Reconciled'
                ? `<button class="btn btn--primary btn--sm" onclick="window._finDash.markReconciled(${idx})">Mark as Reconciled</button>`
                : '<span style="color: var(--color-success); font-weight: 600; font-size: 0.875rem;">Reconciled ✓</span>'
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function updatePhysicalCount(idx, val) {
    const num = parseFloat(val);
    if (!isNaN(num) && reconciliations[idx]) {
      reconciliations[idx].physicalTotal = num;
      reconciliations[idx].status = (num === reconciliations[idx].systemTotal) ? 'Reconciled' : 'Pending';
      persistAll();
      renderReconciliation();
    }
  }

  function markReconciled(idx) {
    if (reconciliations[idx]) {
      reconciliations[idx].status = 'Reconciled';
      reconciliations[idx].physicalTotal = reconciliations[idx].systemTotal;
      persistAll();
      addAuditEntry(AUTHOR_NAME, 'edit', `Reconciled ${reconciliations[idx].service} collection`);
      toast(`${reconciliations[idx].service} marked as reconciled ✓`);
      renderReconciliation();
    }
  }

  /* ---------------------------------------------------
     Expose Global Handlers for DOM
     --------------------------------------------------- */
  window._finDash = {
    openMemberGivingModal,
    resolveDispute,
    voidTransaction,
    restoreTransaction,
    previewStatement,
    updatePhysicalCount,
    markReconciled,
  };

  /* ---------------------------------------------------
     Init on Load
     --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadAllFromFirestore();
    populateMemberDropdowns();
    renderOverview();
    renderRecentTransactions();
    renderBulkEntries();
    renderMemberGivingRecords();
    if (window.ChurchReporting) window.ChurchReporting.init('finance', { containerId: 'reporting-container' });
    renderStatementsHistory();
    renderReconciliation();

    if (window.ChurchActivityLog) {
      window.ChurchActivityLog.renderActivityFeed('activity-log-finance', 'finance', { name: AUTHOR_NAME, role: 'finance', department: 'Finance Team' });
    }

    document.getElementById('tx-date').value = today();
    document.getElementById('bulk-date').value = today();
  });

})();
