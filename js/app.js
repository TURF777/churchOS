/* ===================================================
   ChurchOS — Shared Application JavaScript
   Now uses Firebase Auth + Firestore (replaces PHP/MySQL)
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Constants — Firebase replaces the old API_BASE
     --------------------------------------------------- */
  const ROLES = window.ChurchOS.ROLES;
  const auth  = window.ChurchOS.auth;
  const phoneToEmail = window.ChurchOS.phoneToEmail;

  /* ---------------------------------------------------
     Validation helpers
     --------------------------------------------------- */
  function validatePhone(phone) {
    // Ghanaian format: 0XX XXX XXXX or +233 XX XXX XXXX (digits only, 10-13 chars)
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^(\+233|0)\d{9}$/.test(cleaned);
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePassword(pw) {
    return pw.length >= 6;
  }

  function showError(input, msg) {
    input.classList.add('error');
    const errEl = input.closest('.form-group')?.querySelector('.form-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.add('visible');
    }
  }

  function clearError(input) {
    input.classList.remove('error');
    const errEl = input.closest('.form-group')?.querySelector('.form-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.remove('visible');
    }
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.form-input, .form-select').forEach(i => clearError(i));
  }

  function showAlert(id, message, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert--${type} visible`;
    el.innerHTML = `<span>${type === 'error' ? '⚠' : '✓'}</span> ${message}`;
  }

  function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  }

  /* ---------------------------------------------------
     Navbar — mobile toggle + scroll shadow
     --------------------------------------------------- */
  function initNavbar() {
    const toggle = document.querySelector('.navbar__toggle');
    const menu = document.querySelector('.navbar__menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        menu.classList.toggle('open');
      });
      // Close on link click
      menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          toggle.classList.remove('active');
          menu.classList.remove('open');
        });
      });
    }

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
      });
    }
  }

  /* ---------------------------------------------------
     Scroll animations (landing page)
     --------------------------------------------------- */
  function initScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    els.forEach(el => observer.observe(el));
  }

  /* ---------------------------------------------------
     Helper: redirect to the correct dashboard by role
     --------------------------------------------------- */
  function redirectToDashboard(role) {
    const r = ROLES[role];
    if (r) window.location.href = r.dashboard;
  }

  /* ---------------------------------------------------
     Signup page logic — Firebase Auth
     --------------------------------------------------- */
  function initSignup() {
    const page = document.getElementById('signup-page');
    if (!page) return;

    let selectedRole = null;

    // Step navigation
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const stepDots = document.querySelectorAll('.signup-step');
    const stepLines = document.querySelectorAll('.signup-step__line');

    function goToStep(num) {
      [step1, step2, step3].forEach(s => s?.classList.remove('active'));
      if (num === 1) step1?.classList.add('active');
      if (num === 2) step2?.classList.add('active');
      if (num === 3) step3?.classList.add('active');

      // Update step indicators
      stepDots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 < num) dot.classList.add('completed');
        if (i + 1 === num) dot.classList.add('active');
      });
      stepLines.forEach((line, i) => {
        line.classList.toggle('completed', i + 1 < num);
      });
    }

    // Role selection
    const roleOptions = document.querySelectorAll('.role-option');
    const continueBtn = document.getElementById('btn-continue-role');

    roleOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        roleOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedRole = opt.dataset.role;
        if (continueBtn) continueBtn.disabled = false;
      });
    });

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (!selectedRole) return;
        showRoleFields(selectedRole);
        goToStep(2);
      });
    }

    // Back button
    const backBtn = document.getElementById('btn-back-role');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        goToStep(1);
      });
    }

    // Show/hide role-specific fields
    function showRoleFields(role) {
      document.querySelectorAll('.role-fields').forEach(el => {
        el.style.display = 'none';
      });
      const roleField = document.getElementById(`fields-${role}`);
      if (roleField) roleField.style.display = 'block';

      // Email required for all except member
      const emailLabel = document.querySelector('label[for="signup-email"] .required');
      if (role === 'member') {
        if (emailLabel) emailLabel.style.display = 'none';
      } else {
        if (emailLabel) emailLabel.style.display = 'inline';
      }
    }

    // Form submission — Firebase Auth + Firestore
    const form = document.getElementById('signup-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors(form);
        hideAlert('signup-alert');

        const name = document.getElementById('signup-name');
        const phone = document.getElementById('signup-phone');
        const email = document.getElementById('signup-email');
        const password = document.getElementById('signup-password');
        const confirm = document.getElementById('signup-confirm');
        const terms = document.getElementById('signup-terms');

        let valid = true;

        if (!name.value.trim()) { showError(name, 'Full name is required'); valid = false; }
        if (!validatePhone(phone.value)) { showError(phone, 'Enter a valid Ghanaian phone number'); valid = false; }
        if (selectedRole !== 'member' && email.value && !validateEmail(email.value)) {
          showError(email, 'Enter a valid email address'); valid = false;
        }
        if (selectedRole !== 'member' && !email.value.trim()) {
          showError(email, 'Email is required for this role'); valid = false;
        }
        if (!validatePassword(password.value)) { showError(password, 'Password must be at least 6 characters'); valid = false; }
        if (password.value !== confirm.value) { showError(confirm, 'Passwords do not match'); valid = false; }
        if (!terms.checked) {
          showAlert('signup-alert', 'You must accept the Terms & Conditions', 'error');
          valid = false;
        }

        // Role-specific validation
        if (selectedRole === 'admin') {
          const cn = document.getElementById('admin-church-name');
          const ca = document.getElementById('admin-church-address');
          if (cn && !cn.value.trim()) { showError(cn, 'Church name is required'); valid = false; }
          if (ca && !ca.value.trim()) { showError(ca, 'Church address is required'); valid = false; }
        }

        if (selectedRole === 'pastor') {
          const cn = document.getElementById('pastor-church-name');
          if (cn && !cn.value.trim()) { showError(cn, 'Church name is required'); valid = false; }
        }

        if (selectedRole === 'finance') {
          const cn = document.getElementById('finance-church-name');
          if (cn && !cn.value.trim()) { showError(cn, 'Church name is required'); valid = false; }
        }

        if (!valid) return;

        // Disable submit button while loading
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating Account...';
        }

        try {
          // 1. Create Firebase Auth user with synthetic email from phone
          const syntheticEmail = phoneToEmail(phone.value);
          const userCredential = await auth.createUserWithEmailAndPassword(
            syntheticEmail,
            password.value
          );
          const uid = userCredential.user.uid;

          // 2. Build role-specific profile data
          const roleObj = ROLES[selectedRole] || ROLES.member;
          const profileData = {
            name:             name.value.trim(),
            phone:            phone.value.trim(),
            email:            email.value.trim(),
            role:             selectedRole,
            roleLabel:        roleObj.label,
            dashboard:        roleObj.dashboard,
            churchName:       '',
            churchAddress:    '',
            department:       '',
            preferredService: '',
            referral:         '',
          };

          // Add role-specific data
          if (selectedRole === 'admin') {
            profileData.churchName    = document.getElementById('admin-church-name')?.value.trim() || '';
            profileData.churchAddress = document.getElementById('admin-church-address')?.value.trim() || '';
          } else if (selectedRole === 'pastor') {
            profileData.churchName = document.getElementById('pastor-church-name')?.value.trim() || '';
          } else if (selectedRole === 'leader') {
            profileData.department = document.getElementById('leader-department')?.value.trim() || 'Pending Assignment';
          } else if (selectedRole === 'finance') {
            profileData.churchName = document.getElementById('finance-church-name')?.value.trim() || '';
          } else if (selectedRole === 'member') {
            profileData.preferredService = document.getElementById('member-service')?.value || '';
            profileData.referral         = document.getElementById('member-referral')?.value.trim() || '';
          }

          // 3. Write user profile to Firestore (keyed by uid)
          await window.ChurchOS.dbSet('users', uid, profileData);

          // 4. Cache user locally for immediate use
          const userForStorage = { id: uid, ...profileData };
          localStorage.setItem('churchos_current_user', JSON.stringify(userForStorage));

          // 5. Show success state
          goToStep(3);

          // Auto-redirect after 3 seconds
          setTimeout(() => {
            redirectToDashboard(selectedRole);
          }, 3000);

        } catch (err) {
          console.error('[ChurchOS] Signup error — code:', err.code, '| message:', err.message, '| full:', err);

          // Map Firebase error codes to user-friendly messages
          const errorMessages = {
            'auth/email-already-in-use':      'This phone number is already registered. Please log in instead.',
            'auth/weak-password':             'Password is too weak. Use at least 6 characters.',
            'auth/invalid-email':             'Invalid phone number format. Please check and try again.',
            'auth/network-request-failed':    'Network error. Please check your internet connection and try again.',
            'auth/unauthorized-domain':       'This website domain is not authorized for sign-up. Please contact the administrator.',
            'auth/operation-not-allowed':     'Email/Password sign-in is not enabled. Please contact the administrator.',
            'auth/configuration-not-found':   'Firebase is not configured correctly. Please contact the administrator.',
            'auth/too-many-requests':         'Too many attempts. Please wait a few minutes and try again.',
            'auth/internal-error':            'An internal error occurred. Please try again later.',
          };

          let message = errorMessages[err.code];
          if (!message) {
            // Check for Firestore permission errors (from dbSet)
            if (err.code === 'permission-denied' || (err.message && err.message.includes('Missing or insufficient permissions'))) {
              message = 'Account created but profile could not be saved (permission error). Please contact the administrator.';
            } else {
              message = `Registration failed: ${err.code || err.message || 'Unknown error'}. Please try again.`;
            }
          }

          showAlert('signup-alert', message, 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
          }
        }
      });
    }
  }

  /* ---------------------------------------------------
     Login page logic — Firebase Auth
     --------------------------------------------------- */
  function initLogin() {
    const page = document.getElementById('login-page');
    if (!page) return;

    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(form);
      hideAlert('login-alert');

      const identifier = document.getElementById('login-identifier');
      const password = document.getElementById('login-password');

      let valid = true;

      if (!identifier.value.trim()) {
        showError(identifier, 'Phone number or email is required');
        valid = false;
      }

      if (!password.value) {
        showError(password, 'Password is required');
        valid = false;
      }

      if (!valid) return;

      // Disable submit button while loading
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
      }

      try {
        // Determine if the identifier is a phone or email
        const identifierValue = identifier.value.trim();
        let loginEmail;

        if (validateEmail(identifierValue)) {
          // User typed an actual email — try to find the user by email in Firestore
          // to get their synthetic email, or try logging in directly
          const usersWithEmail = await window.ChurchOS.dbGetAll('users', [
            { field: 'email', op: '==', value: identifierValue }
          ]);
          if (usersWithEmail.length > 0) {
            // Found user by real email — use their phone to construct synthetic email
            loginEmail = phoneToEmail(usersWithEmail[0].phone);
          } else {
            // Try using the email directly (in case it's the synthetic email)
            loginEmail = identifierValue;
          }
        } else {
          // Assume it's a phone number — construct synthetic email
          loginEmail = phoneToEmail(identifierValue);
        }

        // Sign in with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(
          loginEmail,
          password.value
        );
        const uid = userCredential.user.uid;

        // Fetch user profile from Firestore
        const userProfile = await window.ChurchOS.dbGet('users', uid);

        if (!userProfile) {
          throw new Error('User profile not found in database.');
        }

        // Cache user locally for immediate use
        localStorage.setItem('churchos_current_user', JSON.stringify(userProfile));

        showAlert('login-alert', 'Login successful! Redirecting...', 'success');
        setTimeout(() => {
          redirectToDashboard(userProfile.role);
        }, 1000);

      } catch (err) {
        console.error('[ChurchOS] Login error — code:', err.code, '| message:', err.message, '| full:', err);

        // Map Firebase error codes to user-friendly messages
        const errorMessages = {
          'auth/user-not-found':           'No account found with this phone number or email. Please sign up first.',
          'auth/invalid-credential':       'No account found with this phone number or email. Please sign up first.',
          'auth/wrong-password':           'Invalid password. Please try again.',
          'auth/too-many-requests':        'Too many failed attempts. Please wait a few minutes and try again.',
          'auth/network-request-failed':   'Network error. Please check your internet connection.',
          'auth/unauthorized-domain':      'This website domain is not authorized for login. Please contact the administrator.',
          'auth/operation-not-allowed':    'Email/Password sign-in is not enabled. Please contact the administrator.',
          'auth/configuration-not-found':  'Firebase is not configured correctly. Please contact the administrator.',
          'auth/user-disabled':            'This account has been disabled. Please contact the administrator.',
          'auth/internal-error':           'An internal error occurred. Please try again later.',
        };

        let message = errorMessages[err.code];
        if (!message) {
          // Include the actual error for debugging but keep it user-readable
          message = `Login failed: ${err.code || err.message || 'Unknown error'}. Please try again.`;
        }

        showAlert('login-alert', message, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      }
    });

    // Forgot password modal
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotClose = document.getElementById('forgot-modal-close');
    const forgotForm = document.getElementById('forgot-password-form');

    if (forgotLink && forgotModal) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotModal.classList.add('active');
      });

      forgotClose?.addEventListener('click', () => {
        forgotModal.classList.remove('active');
      });

      forgotModal.addEventListener('click', (e) => {
        if (e.target === forgotModal) forgotModal.classList.remove('active');
      });

      forgotForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneInput = document.getElementById('forgot-phone');
        if (phoneInput && validatePhone(phoneInput.value)) {
          // Send password reset email to the synthetic email address
          try {
            const syntheticEmail = phoneToEmail(phoneInput.value);
            await auth.sendPasswordResetEmail(syntheticEmail);
          } catch (err) {
            // Silently handle — Firebase may not deliver to synthetic emails,
            // but we still show the UI step for consistency
            console.warn('[ChurchOS] Password reset (synthetic email):', err.message);
          }
          document.getElementById('forgot-step-1').style.display = 'none';
          document.getElementById('forgot-step-2').style.display = 'block';
        } else if (phoneInput) {
          showError(phoneInput, 'Enter a valid phone number');
        }
      });
    }
  }

  /* ---------------------------------------------------
     Dashboard — sidebar, logout, user display
     Uses Firebase Auth (onAuthStateChanged) + Firestore
     --------------------------------------------------- */
  async function initDashboard() {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;

    // Use Firebase Auth state to check if user is logged in
    let user = null;

    // Try to get cached user first for instant rendering
    try {
      const cached = localStorage.getItem('churchos_current_user');
      if (cached) user = JSON.parse(cached);
    } catch (e) {
      // ignore
    }

    // Set up Firebase Auth state listener for ongoing session management
    auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in — fetch fresh profile from Firestore
        try {
          const freshProfile = await window.ChurchOS.dbGet('users', firebaseUser.uid);
          if (freshProfile) {
            user = freshProfile;
            localStorage.setItem('churchos_current_user', JSON.stringify(user));
            populateUserInfo(user);
          }
        } catch (err) {
          console.warn('[ChurchOS] Failed to fetch fresh user profile:', err);
          // Continue with cached data
        }
      } else {
        // Not signed in — redirect to login (unless we have cached data for offline)
        if (!user) {
          console.warn('[ChurchOS] No authenticated user and no cached profile. Redirecting to login.');
          window.location.href = 'login.html';
          return;
        }
      }
    });

    // If we have cached user data, populate immediately (don't wait for network)
    if (user) {
      populateUserInfo(user);
    }
    // If no cached user, the onAuthStateChanged handler above will either
    // populate from Firestore or redirect to login — no demo fallback in production

    // Populate user info across the dashboard
    function populateUserInfo(u) {
      document.querySelectorAll('.js-user-name').forEach(el => {
        el.textContent = u.name || 'User';
      });
      document.querySelectorAll('.js-user-role').forEach(el => {
        el.textContent = u.roleLabel || u.role;
      });
      document.querySelectorAll('.js-user-initials').forEach(el => {
        const names = (u.name || 'U').split(' ');
        el.textContent = names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
      });
      document.querySelectorAll('.js-user-email').forEach(el => {
        el.textContent = u.email || '—';
      });
      document.querySelectorAll('.js-user-phone').forEach(el => {
        el.textContent = u.phone || '—';
      });
      document.querySelectorAll('.js-church-name').forEach(el => {
        el.textContent = u.churchName || 'My Church';
      });
      document.querySelectorAll('.js-user-department').forEach(el => {
        el.textContent = u.department || 'General';
      });
      document.querySelectorAll('.js-user-service').forEach(el => {
        el.textContent = u.preferredService || 'Not set';
      });
    }

    // Sidebar toggle (mobile)
    const sidebarToggle = document.querySelector('.topbar__toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    function toggleSidebar() {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('active');
    }

    sidebarToggle?.addEventListener('click', toggleSidebar);
    overlay?.addEventListener('click', toggleSidebar);

    // Logout — Firebase Auth signOut
    document.querySelectorAll('.js-logout').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await auth.signOut();
        } catch (err) {
          console.warn('[ChurchOS] Logout error:', err);
        }
        localStorage.removeItem('churchos_current_user');
        window.location.href = 'index.html';
      });
    });
  }

  /* ---------------------------------------------------
     Password visibility toggle
     --------------------------------------------------- */
  function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁';
      });
    });
  }

  /* ---------------------------------------------------
     Real-time input validation (clear errors on typing)
     --------------------------------------------------- */
  function initLiveValidation() {
    document.querySelectorAll('.form-input, .form-select').forEach(input => {
      input.addEventListener('input', () => clearError(input));
      input.addEventListener('change', () => clearError(input));
    });
  }

  /* ---------------------------------------------------
     Smooth scroll for anchor links
     --------------------------------------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ---------------------------------------------------
     Global Soft Delete & Audit Utilities
     Now writes to Firestore activityLog collection
     --------------------------------------------------- */
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('churchos_current_user') || '{}');
    } catch (e) {
      return {};
    }
  }

  function getCurrentUserRole() {
    return getCurrentUser().name || 'System User';
  }

  function addGlobalAuditLog(actorName, actionType, recordDescription) {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const currentUser = getCurrentUser();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: nowStr,
      user: actorName || currentUser.name || 'System User',
      role: currentUser.role || 'system',
      department: currentUser.department || 'Administration',
      action: actionType || 'delete',
      module: 'System',
      record: recordDescription,
      recordId: '',
      isMemberFacing: false,
      memberSummary: '',
    };

    // Write to Firestore (fire-and-forget for performance)
    window.ChurchOS.dbAdd('activityLog', entry).catch(err => {
      console.warn('[ChurchOS] Failed to write audit log to Firestore:', err);
    });

    // Also dispatch local event for any open tabs
    window.dispatchEvent(new CustomEvent('churchos:activity_updated', { detail: entry }));

    return entry;
  }

  function softDeleteRecord(item, actorName, recordType, recordTitle) {
    if (!item) return false;
    item.deleted = true;
    item.deletedAt = new Date().toISOString();
    const title = recordTitle || item.name || item.title || item.record || 'Record';
    addGlobalAuditLog(actorName || getCurrentUserRole(), 'delete', `Soft-deleted ${recordType || 'record'}: ${title}`);
    return true;
  }

  function restoreRecord(item, actorName, recordType, recordTitle) {
    if (!item) return false;
    item.deleted = false;
    delete item.deletedAt;
    if (item.status === 'archived') item.status = 'active';
    const title = recordTitle || item.name || item.title || item.record || 'Record';
    addGlobalAuditLog(actorName || getCurrentUserRole(), 'edit', `Restored ${recordType || 'record'}: ${title}`);
    return true;
  }

  window.SoftDeleteUtils = {
    addGlobalAuditLog,
    softDeleteRecord,
    restoreRecord,
    getCurrentUserRole
  };

  /* ---------------------------------------------------
     Init everything on DOMContentLoaded
     --------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();
    initSmoothScroll();
    initPasswordToggles();
    initLiveValidation();

    // Page-specific
    initSignup();
    initLogin();
    initDashboard();
  });

})();
