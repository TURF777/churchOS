/* ===================================================
   ChurchOS — Firebase Configuration
   Central Firebase initialization for Auth + Firestore.
   Replace the placeholder values below with your
   actual Firebase project config from the Firebase Console.
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Firebase Project Configuration
     Get this from: Firebase Console → Project Settings → Web App
     --------------------------------------------------- */
  const firebaseConfig = {
    apiKey:            'AIzaSyBswdznmC4bhyWqsjBtU1xhlnTZvy6o3qs',
    authDomain:        'churchos-8c8bd.firebaseapp.com',
    projectId:         'churchos-8c8bd',
    storageBucket:     'churchos-8c8bd.firebasestorage.app',
    messagingSenderId: '383429762768',
    appId:             '1:383429762768:web:5710892968eb0d25ff88d5',
  };

  /* ---------------------------------------------------
     Runtime check — fail fast if config is still placeholder
     --------------------------------------------------- */
  const isPlaceholder = firebaseConfig.apiKey.startsWith('YOUR_');
  if (isPlaceholder) {
    const msg = [
      '🚨 [ChurchOS] Firebase config has PLACEHOLDER values!',
      '   → Open js/firebase-config.js and replace the YOUR_* values',
      '   → Get your config from: Firebase Console → Project Settings → Web App',
      '   → Auth, Firestore, and all data operations will fail until this is fixed.',
    ].join('\n');
    console.error(msg);
    // Show a visible on-page warning for non-technical users
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 20px;background:#DC2626;color:#fff;font:600 14px/1.4 system-ui,sans-serif;text-align:center;';
      banner.textContent = '⚠️ Firebase is not configured. See browser console (F12) for setup instructions.';
      document.body.prepend(banner);
    });
  }

  /* ---------------------------------------------------
     Initialize Firebase
     --------------------------------------------------- */
  firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db   = firebase.firestore();

  /* ---------------------------------------------------
     Enable Firestore Offline Persistence
     Firestore uses IndexedDB under the hood. Once enabled,
     reads/writes work offline and auto-sync when reconnected.
     --------------------------------------------------- */
  db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('[ChurchOS] Firestore offline persistence enabled.');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open — persistence can only be enabled in one tab at a time
        console.warn('[ChurchOS] Firestore persistence unavailable: multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        // Browser doesn't support persistence
        console.warn('[ChurchOS] Firestore persistence unavailable: browser not supported.');
      }
    });

  /* ---------------------------------------------------
     Auth Persistence — LOCAL means session survives
     browser restarts (same as the old PHP session cookie behavior)
     --------------------------------------------------- */
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  /* ---------------------------------------------------
     Synthetic Email Helper
     Firebase Auth requires an email for email/password auth.
     We construct one from the phone number so members
     can keep using their phone as the login identifier.
     e.g. "024 555 0101" → "phone_0245550101@churchos.local"
     --------------------------------------------------- */
  function phoneToEmail(phone) {
    const digits = (phone || '').replace(/[^0-9]/g, '');
    return `phone_${digits}@churchos.local`;
  }

  /* ---------------------------------------------------
     Role Constants (matches existing ROLES in app.js)
     --------------------------------------------------- */
  const ROLES = {
    admin:   { key: 'admin',   label: 'Church Administrator', dashboard: 'dashboard-admin.html' },
    pastor:  { key: 'pastor',  label: 'Senior Pastor',        dashboard: 'dashboard-pastor.html' },
    leader:  { key: 'leader',  label: 'Leader / Dept Head',   dashboard: 'dashboard-leader.html' },
    finance: { key: 'finance', label: 'Finance Team',         dashboard: 'dashboard-finance.html' },
    member:  { key: 'member',  label: 'Member',               dashboard: 'dashboard-member.html' },
  };

  /* ---------------------------------------------------
     Expose Globals
     --------------------------------------------------- */
  window.ChurchOS = window.ChurchOS || {};
  window.ChurchOS.auth         = auth;
  window.ChurchOS.db           = db;
  window.ChurchOS.phoneToEmail = phoneToEmail;
  window.ChurchOS.ROLES        = ROLES;
  window.ChurchOS.firebase     = firebase;

})();
